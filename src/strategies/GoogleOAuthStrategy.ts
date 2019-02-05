import https from 'https'
import { BaseContext } from '@robb_j/chowchow'
import { OAuth2Client } from 'google-auth-library'
import { Application } from 'express'
import { join } from 'path'

import { AuthStrategy, AuthModule } from '../AuthModule'

// The environment variables this strategy requires
const requiredEnvVars = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']

/** An authentication strategy that verifies the client using google oauth */
export class GoogleOAuthStrategy implements AuthStrategy {
  auth: AuthModule = null as any
  client: OAuth2Client = null as any

  //
  // AuthStrategy implementation
  //

  /** AuthStrategy#checkEnvironment */
  checkEnvironment(): void {
    let missing = requiredEnvVars.filter(n => !process.env[n])

    // Fail if any environment variables are missing
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }
  }

  /** AuthStrategy#setupStrategy */
  setupStrategy(): void | Promise<void> {
    this.client = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID!,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      this.auth.makeAbsoluteLink('google', 'callback')
    )

    // Get the base url using the auth module's base
    const base = join(this.auth.endpointPrefix, 'google')

    // Add our roues to chowchow
    this.auth.app.applyRoutes((app, r) => {
      // GET: /{auth.endpointPrefix}/email/request ?mode=
      app.get(join(base, 'request'), r(ctx => this.requestRoute(ctx)))

      // GET: /{auth.endpointPrefix}/email/callback ?code=&state=
      app.get(join(base, 'callback'), r(ctx => this.checkRoute(ctx)))
    })
  }

  /** AuthStrategy#clearStrategy */
  clearStrategy(): void | Promise<void> {}

  /** AuthStrategy#extendExpress */
  extendExpress(server: Application): void {}

  //
  // Authentication endpoints
  //

  /** A route to request a google oauth login redirect */
  protected requestRoute(ctx: BaseContext) {
    const { utils } = this.auth
    const scopes = ['https://www.googleapis.com/auth/userinfo.email']

    // Validate the mode parameter
    let mode = this.auth.validateAuthMode(ctx.req.query.mode)

    // Create a state to pass through the oauth
    let state = utils.jwtSign({ typ: 'reg', mode })

    // Generate an auth url to redirect to
    const authorizeUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      state
    })

    // Redirect to the link
    ctx.res.redirect(302, authorizeUrl)
  }

  /** A route to handle the oauth callback and authenticate */
  protected async checkRoute(ctx: BaseContext) {
    const { utils } = this.auth
    try {
      const { code, state } = ctx.req.query

      // Check the correct paremeters were sent
      if (typeof code !== 'string') throw new Error(`Bad 'code'`)
      if (typeof state !== 'string') throw new Error(`Bad 'state'`)

      // Check the jwt was signed by us and that it's a registration
      const { typ, mode } = utils.jwtVerify(state) as any
      if (typ !== 'reg') throw new Error(`Bad Auth`)

      // Use the code parameter to get an access token
      const { tokens } = await this.client.getToken(code)
      const accessToken = tokens.access_token

      // Fail if it didn't return an accessToken
      if (!accessToken) throw new Error(`Bad Auth`)

      // Use the access token to get an email
      const email = await this.fetchProfile(accessToken)

      // Validate the email against the whitelist
      this.auth.validateEmail(email)

      // Finish the authentication
      this.auth.finishAuth(ctx, this.auth.utils.hashEmail(email), mode)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  /** An internal method to fetch a user's profile using https
      a request library was not used to keep this module agnostic */
  protected fetchProfile(accessToken: string): Promise<string> {
    const profileUrl = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`

    // Create a promise to fetch, recieve, parse and extract the email
    return new Promise<string>((resolve, reject) => {
      https
        .get(profileUrl, res => {
          // Create an array of payload strings
          let body = new Array<string>()
          res.on('data', data => body.push(data))

          // On finish, join all the strings and parse the email from the JSON
          res.on('end', () => {
            try {
              let json = JSON.parse(body.join(''))
              if (!json.email) throw new Error('Bad Auth')
              resolve(json.email)
            } catch (error) {
              reject(error)
            }
          })
        })
        .on('error', err => reject(err))
    })
  }
}
