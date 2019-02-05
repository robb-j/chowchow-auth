import { BaseContext } from '@robb_j/chowchow'
import sendgrid from '@sendgrid/mail'
import { Application } from 'express'
import { join } from 'path'

import { AuthStrategy, AuthModule } from '../AuthModule'

export const isEmail = (value: string) => /^\S+@\S+$/i.test(value)

export type SendgridConfig = {
  fromEmail: string
  emailSubject: string
  emailBody: (link: string) => string
}

export class SendgridStrategy implements AuthStrategy {
  auth: AuthModule = null as any

  constructor(public config: SendgridConfig) {}

  checkEnvironment() {
    let missing = ['SENDGRID_TOKEN'].filter(n => !process.env[n])

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }
  }
  setupStrategy() {
    sendgrid.setApiKey(process.env.SENDGRID_TOKEN as string)

    const base = join(this.auth.endpointPrefix, 'email')

    this.auth.app.applyRoutes((app, r) => {
      app.get(join(base, 'request'), r(ctx => this.requestRoute(ctx)))
      app.get(join(base, 'check'), r(ctx => this.checkRoute(ctx)))
    })
  }
  clearStrategy() {}
  extendExpress(server: Application) {}

  protected async requestRoute(ctx: BaseContext) {
    const { utils } = this.auth

    let mode = this.auth.validateRequestMode(ctx.req.query.mode)
    let email = this.auth.validateEmail(ctx.req.query.email)

    const auth = utils.jwtSign({
      sub: utils.hashEmail(email),
      typ: 'reg',
      mode: mode
    })

    const link = this.auth.makeAbsoluteLink('email', `check?token=${auth}`)

    try {
      await sendgrid.send({
        to: email,
        from: this.config.fromEmail,
        subject: this.config.emailSubject,
        html: this.config.emailBody(link)
      })
      this.auth.sendData(ctx, 'Email sent')
    } catch (error) {
      throw new Error('Failed to send auth email')
    }
  }

  protected async checkRoute(ctx: BaseContext) {
    const { token } = ctx.req.query
    const { utils } = this.auth

    if (typeof token !== 'string') throw new Error(`Bad 'token'`)

    const { sub, typ, mode } = utils.jwtVerify(token) as any

    if (typ !== 'reg') throw new Error(`Bad 'token'`)

    this.auth.validateRequestMode(mode)
    this.auth.finishAuth(ctx, sub, mode)
  }
}
