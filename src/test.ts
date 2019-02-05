import { ChowChow, BaseContext } from '@robb_j/chowchow'
import {
  JsonEnvelopeModule,
  JsonEnvelopeContext
} from '@robb_j/chowchow-json-envelope'

import { AuthModule, AuthContext } from './AuthModule'
import { SendgridStrategy } from './strategies/SendgridStrategy'
import { GoogleOAuthStrategy } from './strategies/GoogleOAuthStrategy'

type Context = BaseContext & JsonEnvelopeContext & AuthContext
// type Context = BaseContext & AuthContext
;(async () => {
  let chow = ChowChow.create<Context>()
    .use(new JsonEnvelopeModule({ handleErrors: true }))
    .use(
      new AuthModule(
        {
          loginRedir: '/',
          publicUrl: 'http://localhost:3000'
        },
        [
          new SendgridStrategy({
            fromEmail: 'noreply@r0b.io',
            emailSubject: 'Your Login',
            emailBody: link => `Here is your r0b.io login link: ${link}`
          }),
          new GoogleOAuthStrategy()
        ]
      )
    )

  chow.applyRoutes((app, r) => {
    app.get('/', r(({ sendData, jwt }) => sendData({ jwt })))
  })

  await chow.start()
  console.log('Listening on :3000')
})()
