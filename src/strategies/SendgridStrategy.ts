import { BaseContext } from '@robb_j/chowchow'
import sendgrid from '@sendgrid/mail'
import { Application } from 'express'
import { join } from 'path'

import { AuthStrategy, AuthModule } from '../AuthModule'

/** The configuration to create a SendgridStrategy */
export type SendgridConfig = {
  fromEmail: string
  emailSubject: string
  emailBody: (email: string, link: string) => string
}

// The environment variables this strategy requires
const requiredEnvVars = ['SENDGRID_TOKEN']

/** An authentication strategy that verify's a client by sending them
    an email (using sendgrid) with a link in it */
export class SendgridStrategy implements AuthStrategy {
  auth!: AuthModule

  constructor(public config: SendgridConfig) {}

  //
  // AuthStrategy implementation
  //

  /** AuthStrategy#checkEnvironment */
  checkEnvironment() {
    let missing = requiredEnvVars.filter(n => !process.env[n])

    // Fail if any environment variables are missing
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }
  }

  /** AuthStrategy#setupStrategy */
  setupStrategy() {
    sendgrid.setApiKey(process.env.SENDGRID_TOKEN as string)

    // Get the base url using the auth module's base
    const base = join(this.auth.endpointPrefix, 'email')

    // Add our routes to chowchow
    this.auth.app.applyRoutes((app, r) => {
      // GET: /{auth.endpointPrefix}/email/request ?email=&mode=
      app.get(join(base, 'request'), r(ctx => this.requestRoute(ctx)))

      // GET: /{auth.endpointPrefix}/email/check ?token=
      app.get(join(base, 'check'), r(ctx => this.checkRoute(ctx)))
    })
  }

  /** AuthStrategy#clearStrategy */
  clearStrategy() {}

  /** AuthStrategy#extendExpress */
  extendExpress(server: Application) {}

  //
  // Authentication endpoints
  //

  /** A route to request a login email be sent */
  protected async requestRoute(ctx: BaseContext) {
    const { utils } = this.auth

    // Validate the mode and email
    let mode = this.auth.validateAuthMode(ctx.req.query.mode)
    let email = this.auth.validateEmail(ctx.req.query.email)

    // Create an registration token
    const auth = utils.jwtSign(
      {
        typ: 'reg',
        mode: mode
      },
      {
        subject: utils.hashEmail(email)
      }
    )

    // Generate the link (JWTs should be url safe)
    const link = this.auth.makeAbsoluteLink('email', `check?token=${auth}`)

    // Send the email and return an 'ok' response
    try {
      await sendgrid.send({
        to: email,
        from: this.config.fromEmail,
        subject: this.config.emailSubject,
        html: this.config.emailBody(email, link)
      })
      this.auth.sendData(ctx, 'Email sent')
    } catch (error) {
      throw new Error('Failed to send auth email')
    }
  }

  /** A route to authenticate from a login email */
  protected async checkRoute(ctx: BaseContext) {
    const { token } = ctx.req.query
    const { utils } = this.auth

    // Check the token was passed
    if (typeof token !== 'string') throw new Error(`Bad 'token'`)

    // Check the jwt was signed by us and that it's a registration
    const { sub, typ, mode } = utils.jwtVerify(token) as any
    if (typ !== 'reg') throw new Error(`Bad 'token'`)

    // Finish the authentication (mode was set by us so should be trusted)
    this.auth.finishAuth(ctx, sub, mode)
  }
}
