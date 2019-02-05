import { Module, ChowChow, BaseContext } from '@robb_j/chowchow'
import { JsonEnvelopeContext } from '@robb_j/chowchow-json-envelope'
import { Application } from 'express'
import cookieParser from 'cookie-parser'
import jwtParser from 'express-jwt'
import { JwtUtils } from './JwtUtils'
import { join } from 'path'

type Context = BaseContext & JsonEnvelopeContext

export type AuthConfig = {
  endpointPrefix?: string
  cookieName?: string
  whitelist?: string[]
  loginRedir: string
  publicUrl: string
  // jwtSecret: string
  // cookieSecret?: string
}

export type AuthJwt = {
  sub: string
  typ: string
}

export type AuthContext = {
  jwt: AuthJwt | null
}

export enum StrategyType {
  sendgridEmail,
  googleOAuth
}

export type AuthMode = 'cookie' | 'token' | 'redir'

export interface AuthStrategy {
  auth: AuthModule
  checkEnvironment(): void
  setupStrategy(): void | Promise<void>
  clearStrategy(): void | Promise<void>
  extendExpress(server: Application): void
}

export const isEmail = (value: string) => /^\S+@\S+$/i.test(value)

// class GoogleOAuthStrategy implements AuthStrategy {
//   constructor(public secret: string) {}
//
//   checkEnvironment() {}
//   setupStrategy() {}
//   clearStrategy() {}
//   extendExpress() {}
// }

export class AuthModule implements Module {
  strategies: AuthStrategy[]
  config: AuthConfig
  app: ChowChow = null as any
  utils: JwtUtils

  get jwtSecret() {
    return process.env.JWT_SECRET as string
  }
  get cookieSecret() {
    return process.env.COOKIE_SECRET as string
  }
  get endpointPrefix() {
    return this.config.endpointPrefix || '/auth'
  }
  get cookieName() {
    return this.config.cookieName || 'access_token'
  }

  get whitelist() {
    return (this.config.whitelist || []).map(e => e.toLowerCase().trim())
  }

  constructor(config: AuthConfig, strategies: AuthStrategy[]) {
    this.strategies = strategies
    this.config = config
    for (let strategy of this.strategies) strategy.auth = this
    this.utils = new JwtUtils(this.jwtSecret, this.cookieName)
  }

  checkEnvironment() {
    let missing = ['JWT_SECRET', 'COOKIE_SECRET'].filter(n => !process.env[n])

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }

    for (let strategy of this.strategies) strategy.checkEnvironment()
  }

  setupModule() {
    for (let strategy of this.strategies) strategy.setupStrategy()
  }

  clearModule() {
    for (let strategy of this.strategies) strategy.clearStrategy()
  }

  extendExpress(server: Application) {
    server.use(jwtParser(this.utils.jwtParserConfig))
    server.use(cookieParser(this.cookieSecret))
    for (let strategy of this.strategies) strategy.extendExpress(server)
  }

  extendEndpointContext(ctx: BaseContext): AuthContext {
    const emptyCtx = { jwt: null }

    // Don't pass if not set
    let jwt = (ctx.req as any).user as AuthJwt

    if (!jwt) return emptyCtx

    // Don't pass if not an auth token
    if (jwt.typ !== 'auth') return emptyCtx

    // Pass the auth token
    return { jwt }
  }

  sendData(ctx: any, payload: any) {
    let { sendData, res } = ctx as Context
    if (sendData) sendData(payload)
    else res.send(payload)
  }

  validateRequestMode(mode: any): AuthMode {
    if (!['cookie', 'token', 'redir'].includes(mode)) {
      throw new Error(`Bad 'mode'`)
    }
    return mode
  }

  validateEmail(email: any, checkWhitelist = true) {
    if (typeof email !== 'string' || !isEmail(email)) {
      throw new Error(`Bad 'email'`)
    }

    if (checkWhitelist) {
      if (this.whitelist.length > 0 && !this.whitelist.includes(email)) {
        throw new Error(`Bad 'email'`)
      }
    }

    return email.trim().toLowerCase()
  }

  finishAuth(ctx: BaseContext, emailHash: string, mode: AuthMode) {
    const newToken = this.utils.jwtSign({
      sub: emailHash,
      typ: 'auth'
    })

    if (mode === 'cookie') {
      ctx.res.cookie(this.cookieName, newToken, {
        signed: true,
        httpOnly: true
      })
      ctx.res.redirect(302, this.config.loginRedir)
    } else if (mode === 'redir') {
      ctx.res.redirect(302, `${this.config.loginRedir}?token=${newToken}`)
    } else {
      this.sendData(ctx, { token: newToken })
    }
  }

  makeAbsoluteLink(...paths: string[]) {
    return (
      this.config.publicUrl.replace(/\/$/, '') +
      join(this.endpointPrefix, ...paths)
    )
  }
}
