import { Module, ChowChow, BaseContext } from '@robb_j/chowchow'
import { JsonEnvelopeContext } from '@robb_j/chowchow-json-envelope'
import { Application } from 'express'
import cookieParser from 'cookie-parser'
import jwtParser from 'express-jwt'
import { JwtUtils } from './JwtUtils'
import { join } from 'path'

type Context = BaseContext & JsonEnvelopeContext

export type AuthConfig = {
  loginRedir: string
  publicUrl: string
  endpointPrefix?: string
  cookieName?: string
  whitelist?: string[]
  cookieDuration?: number
}

/** An authentication jwt */
export type AuthJwt = {
  sub: string
}

/** The AuthModule's extension to the module */
export type AuthContext = {
  jwt: AuthJwt | null
}

/** The different authentication modes
- cookie: Returns the client to `loginRedir` with a Set-Cookie
- redir:  Redirect's the the client to `loginRedir` with ?token= set
- token:  Output's the token in the response body (for dev really)
*/
export type AuthMode = 'cookie' | 'redir' | 'token'

/** An interface for an authentication strategy */
export interface AuthStrategy {
  auth: AuthModule
  checkEnvironment(): void
  setupStrategy(): void | Promise<void>
  clearStrategy(): void | Promise<void>
  extendExpress(server: Application): void
}

/** a very simple check for an email */
export const isEmail = (value: string) => /^\S+@\S+$/i.test(value)

/** A ChowChow module to add authentication endpoints
  and add an auth jwt to the context */
export class AuthModule implements Module {
  strategies: AuthStrategy[]
  config: AuthConfig
  app!: ChowChow
  utils: JwtUtils

  /** What path to put strategy endpoints under (default: '/auth')*/
  get endpointPrefix() {
    return this.config.endpointPrefix || '/auth'
  }

  /** What to set the cookie to (default: [])*/
  get cookieName() {
    return this.config.cookieName || 'access_token'
  }

  /** Emails to whitelist for authentication (default: []) */
  get whitelist() {
    return (this.config.whitelist || []).map(e => e.toLowerCase().trim())
  }

  /** How long cookies last for, in milliseconds (default: 3 months) */
  get cookieDuration() {
    return this.config.cookieDuration || (365 / 4) * 24 * 60 * 60 * 1000
  }

  /** Create a new AuthModule with config and strategies */
  constructor(config: AuthConfig, strategies: AuthStrategy[]) {
    this.strategies = strategies
    this.config = config
    for (let strategy of this.strategies) strategy.auth = this
    this.utils = new JwtUtils(process.env.JWT_SECRET!, this.cookieName)
  }

  //
  // Module implementation
  //

  /** Module#checkEnvironment() */
  checkEnvironment() {
    let missing = ['JWT_SECRET', 'COOKIE_SECRET'].filter(n => !process.env[n])

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }

    for (let strategy of this.strategies) strategy.checkEnvironment()
  }

  /** Module#setupModule() */
  setupModule() {
    for (let strategy of this.strategies) strategy.setupStrategy()
  }

  /** Module#clearModule() */
  clearModule() {
    for (let strategy of this.strategies) strategy.clearStrategy()
  }

  /** Module#extendExpress(app) */
  extendExpress(server: Application) {
    server.use(cookieParser(process.env.COOKIE_SECRET!))
    server.use(jwtParser(this.utils.jwtParserConfig))
    for (let strategy of this.strategies) strategy.extendExpress(server)
  }

  /** Module#extendEndpointContext(ctx) */
  extendEndpointContext(ctx: BaseContext): AuthContext {
    // Don't pass if not set
    let jwt = (ctx.req as any).user as AuthJwt

    // Don't pass the jwt ctx  if its not a valid auth
    if (!jwt || (jwt as any).typ !== 'auth') return { jwt: null }

    // Pass the auth token
    return { jwt }
  }

  //
  // Strategy Helpers
  //

  /** Hook for strategies to finish an authentication */
  finishAuth(ctx: BaseContext, emailHash: string, mode: AuthMode) {
    // Create an authentication token
    const newToken = this.utils.jwtSign({
      sub: emailHash,
      typ: 'auth'
    })

    // Proceed baed on the mode passed
    if (mode === 'cookie') {
      ctx.res.cookie(this.cookieName, newToken, {
        signed: true,
        httpOnly: true,
        secure: ctx.req.protocol === 'https',
        expires: new Date(Date.now() + this.cookieDuration)
      })
      ctx.res.redirect(302, this.config.loginRedir)
    } else if (mode === 'redir') {
      ctx.res.redirect(302, `${this.config.loginRedir}?token=${newToken}`)
    } else {
      this.sendData(ctx, { token: newToken })
    }
  }

  /** Helper method for strategies to send a json response */
  sendData(ctx: any, payload: any) {
    let { sendData, res } = ctx as Context
    if (sendData) sendData(payload)
    else res.send(payload)
  }

  /** Helper method for strategies to validate an authentication mode */
  validateAuthMode(mode: any): AuthMode {
    if (!['cookie', 'token', 'redir'].includes(mode)) {
      throw new Error(`Bad 'mode'`)
    }
    return mode
  }

  /** Helper method for strategies to validate an email */
  validateEmail(email: any) {
    // Check its an allowed email
    if (typeof email !== 'string' || !isEmail(email)) {
      throw new Error(`Bad 'email'`)
    }

    // Remove whitespace and lower-case the email
    email = email.trim().toLowerCase()

    // If using a whitelist, check its allowed
    if (this.whitelist.length > 0 && !this.whitelist.includes(email)) {
      throw new Error(`Bad 'email'`)
    }

    return email
  }

  /** Helper for strategies to form a full public url */
  makeAbsoluteLink(...paths: string[]) {
    return (
      this.config.publicUrl.replace(/\/$/, '') +
      join(this.endpointPrefix, ...paths)
    )
  }
}
