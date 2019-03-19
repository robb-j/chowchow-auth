# Chow Chow | Authentication

Bootstraps authentication for [chowchow](https://github.com/robb-j/chowchow), with strategies to verify clients using an email or Google oauth2.

```ts
import { ChowChow, BaseContext } from '@robb_j/chowchow'
import {
  AuthModule,
  AuthContext,
  SendgridStrategy,
  GoogleOAuthStrategy
} from '@robb_j/chowchow-auth'

type Context = BaseContext & AuthContext

// App entrypoint
;(async () => {
  let chow = ChowChow.create<Context>()

  let authConfig = {
    loginRedir: '/',
    publicUrl: 'https://fancydomain.io',
    filter: email => ['me@gmail.com'].includes(email)
  }

  // Apply the module
  chow.use(
    new AuthModule(authConfig, [
      new GoogleOAuthStrategy(),
      new SendgridStrategy({
        fromEmail: 'noreploy@mydomain.io',
        emailSubject: 'mydomain.io Login code',
        emailBody: (link, email) => `Hey ${email}!, login here:\n${link}`
      })
    ])
  )

  // prettier-ignore
  // Use the new `jwt` in your contexts
  chow.applyRoutes((app, r) => {
    app.get('/', r(ctx => {
      if (!ctx.jwt) throw new Error('Bad Auth')
      ctx.res.send(`Welcome back! ${ctx.sub}`)
    }))
  })

  await chow.start()
  console.log('Listening on :3000')
})()
```

## Table of Contents

- [Overview](#overview)
- [Authentication modes](#authentication-modes)
- [Using the authorization](#using-the-authorization)
- [Configuration](#configuration)
- [Strategies](#strategies)
  - [Google OAuth](#google-oauth)
  - [Sendgrid Auth](#sendgrid-auth)
- [Dev Commands](#dev-commands)

## Overview

This module adds endpoints to authenticate clients based on the strategies you provide.
The strategies are based on authenticating the client's email and then signing a
[jwt](https://jwt.io/) with that email hashed in it.
Emails are only ever processed during authentication, then the hash is used after that.

## Authentication modes

Each strategy works differently but they accept a `?mode=` query parameter when starting.
This mode configures how the client is provided with the authorization.
There are currently three modes:

- `cookie` – Redirect the client back to `loginRedir` and set the authorization as a cookie, useful for server rendered apps.
- `redir` – Redirect the client back to `loginRedir` with `?token=...` set, useful for webapps
- `token` – Return the client to a JSON page with the token in it, useful for development.

## Using the authorization

Once authenticated, a client is provided with an authorization based on their `mode`.
This module adds a `jwt` option to the context with that authorization in it.
It will automatically look for it on the request based on:

1. A signed cookie named `access_token`, or whatever you passed to `cookieName`
2. An `Authorization: bearer ...` header
3. A `?token=...` query parameter

If it finds one of those, it will verify it was a jwt signed by our secret
and that it is an object with `{ typ: auth }`.
That payload is then inserted into chowchow's Context.

> See [JwtUtils#jwtParserConfig](/src/JwtUtils.ts#L14) for more info

## Configuration

You need to set 2 [environment variables](https://nodejs.org/api/process.html#process_process_env):

- `JWT_SECRET` – A secret value used to sign json web tokens
- `COOKIE_SECERT` – A secret value used to sign cookies

Use something like [dotenv](https://npmjs.org/package/dotenv) to load environment variables in from a `.env` file
and `.gitignore` that `.env` file from your repository.
If a required variable isn't set, the chowchow will fail to start.

There are then values to be passed to `new AuthModule({ ... }, [])`,
these are the required ones:

- `loginRedir` – Where the client will go after authenticating, e.g. `/home`
- `publicUrl` – The public facing url of this app, e.g. `https://fancydomain.io`

And these are optional values:

- `endpointPrefix` – Where to put the authentication endpoints under (default: `/auth`)
- `cookieName` – What to call the cookie that is set, (default: `access_token`)
- `cookieDuration` – How long an authorization cookie lasts for, in milliseconds (default: `3 months`)
- `filter` – A function to check an email is allowed, (default: `null`)
  - Its signature is `(email: string) => boolean`
  - It won't await a value, it must be synchronous
  - Any email passed is lower-cased and whitespace-trimmed

> There is also `whitelist` (an array of allowed emails) ~ but it is deprecated.

## Strategies

Strategies define endpoints to authenticate the client and may have required environment variables be set.

### Google OAuth

This strategy authenticates a client via Google OAuth2.
It adds an endpoint to redirect to google to authenticate the client
and the another to validate the redirect back and provide authorization.
By default these endpoints will look like:

> Unless you set `endpointPrefix` when creating your AuthModule

- `GET: /auth/google/request?mode=...`
- `GET: /auth/google/callback?code=...&state=...`

You will need to register your callback url against your credentials in the
[Google console](https://console.developers.google.com/apis/credentials).
If you app was on `fancydomain.io`, you'd need to add `https://fancydomain.io/auth/google/callback`.

This strategy requires two environment variables are set,
which you get when creating your oauth app with Google.

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

### Sendgrid Auth

This strategy authenticates the client by sending them an email.
It adds an endpoint to send them an email (via sendgrid) with a verification link in it.
The second endpoint handles the verification link and provides the client with an authorization.

This strategy requires one environment variable is set `SENDGRID_TOKEN`, which is used to send emails through the `@sendgrid/mail` package. You can generate one on the sendgrid website.

There is some required config:

- `fromEmail` – Where emails will appear to come from, e.g. `noreply@fancydomain.io`
- `emailSubject` – The subject of the email to be sent for logins
- `emailBody` – The contents of the email, this one is a function which takes the email and login link and should return a html body

The two endpoints added are:

> Unless you set `endpointPrefix` when creating your AuthModule

- `GET: /auth/email/request?email=...&mode=...`
- `GET: /auth/email/check?token=...`

## Dev Commands

```bash
# Run the unit tests
# -> Looks for .spec.ts files in the src directory
npm test

# Run the dev server to test endpoints
npm run dev

# Lint the source code
npm run lint

# Manually format code
# -> This repo runs prettier on git-stage, so committed code is always formatted
npm run prettier

# Generate code coverage in coverage/
npm run coverage
```
