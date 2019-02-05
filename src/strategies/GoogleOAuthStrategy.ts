import https from 'https'
import { BaseContext } from '@robb_j/chowchow'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { Application } from 'express'
import { join } from 'path'

import { AuthStrategy, AuthModule } from '../AuthModule'

const envVars = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']

export class GoogleOAuthStrategy implements AuthStrategy {
  auth: AuthModule = null as any
  client: OAuth2Client = null as any

  checkEnvironment(): void {
    let missing = envVars.filter(n => !process.env[n])

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }
  }

  setupStrategy(): void | Promise<void> {
    this.client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID!,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      this.auth.makeAbsoluteLink('google', 'callback')
    )
    google.options({ auth: this.client })

    const base = join(this.auth.endpointPrefix, 'google')

    this.auth.app.applyRoutes((app, r) => {
      app.get(join(base, 'request'), r(ctx => this.requestRoute(ctx)))
      app.get(join(base, 'callback'), r(ctx => this.checkRoute(ctx)))
    })
  }

  clearStrategy(): void | Promise<void> {
    // ...
  }

  extendExpress(server: Application): void {
    // ...
  }

  protected requestRoute(ctx: BaseContext) {
    const { utils } = this.auth
    const scopes = ['https://www.googleapis.com/auth/userinfo.email']

    let mode = this.auth.validateRequestMode(ctx.req.query.mode)

    let state = utils.jwtSign({ typ: 'reg', mode })

    const authorizeUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      state
    })

    ctx.res.redirect(302, authorizeUrl)
  }

  protected async checkRoute(ctx: BaseContext) {
    const { utils } = this.auth
    try {
      const { code, state } = ctx.req.query
      if (typeof code !== 'string') throw new Error(`Bad 'code'`)
      if (typeof state !== 'string') throw new Error(`Bad 'state'`)

      const { tokens } = await this.client.getToken(code)
      console.log({ tokens })

      const { typ, mode } = utils.jwtVerify(state) as any

      if (typ !== 'reg') throw new Error(`Bad Auth`)
      this.auth.validateRequestMode(mode)

      const accessToken = tokens.access_token

      if (!accessToken) throw new Error(`Bad Auth`)

      const email = await this.fetchProfile(accessToken)

      this.auth.finishAuth(ctx, this.auth.utils.hashEmail(email), mode)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  protected fetchProfile(accessToken: string): Promise<string> {
    const profileUrl = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`

    return new Promise<string>((resolve, reject) => {
      https
        .get(profileUrl, res => {
          let body = new Array<string>()
          res.on('data', data => body.push(data))
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
