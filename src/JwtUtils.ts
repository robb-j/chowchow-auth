/*
 *  Utility functions for creating & verifying Json web tokens (jwt)
 */

import jwtParser from 'express-jwt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export class JwtUtils {
  constructor(public secret: string, public cookieName?: string) {}

  get jwtParserConfig(): jwtParser.Options {
    return {
      secret: this.secret,
      credentialsRequired: false,
      getToken: (req: any) => {
        let { headers = {}, signedCookies = {}, query = {} } = req

        // Try a signed cookie
        if (this.cookieName && signedCookies[this.cookieName]) {
          return req.signedCookies[this.cookieName]
        }

        // Try an auth header, "Authorization: Bearer $TOKEN"
        if ((headers.authorization || '').startsWith('Bearer ')) {
          return headers.authorization.split(' ')[1]
        }

        // Try the query string, ?token=
        if (query.token) return query.token

        // If all else failed, we couldn't find a token
        return null
      }
    }
  }

  jwtSign(payload: string | Object | Buffer): string {
    return jwt.sign(payload, this.secret)
  }

  jwtVerify(token: string): string | object {
    return jwt.verify(token, this.secret)
  }

  hashEmail(email: string): string {
    return crypto
      .createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('base64')
  }

  makeUserJwt(email: string): string {
    return this.jwtSign({
      usr: this.hashEmail(email.toLowerCase())
    })
  }
}

/** Config for express-jwt to optionally verify a token from the request */
// export function jwtParserConfig(): jwtParser.Options {
//   return {
//     secret: process.env.JWT_SECRET!,
//     credentialsRequired: false,
//     getToken(req: any) {
//       let { headers = {}, signedCookies = {}, query = {} } = req
//
//       // Try a signed cookie
//       if (signedCookies[cookieName]) {
//         return req.signedCookies[cookieName]
//       }
//
//       // Try an auth header, Authorization: Bearer
//       if (
//         headers.authorization &&
//         headers.authorization.startsWith('Bearer ')
//       ) {
//         return headers.authorization.split(' ')[1]
//       }
//
//       // Try the query string, ?token=
//       if (query.token) return query.token
//       return null
//     }
//   }
// }

// (v) Utilities to wrap the use of JWT_SECRET!

// export function jwtSign(payload: string | object | Buffer): string {
//   return jwt.sign(payload, process.env.JWT_SECRET!)
// }
//
// export function jwtVerify(token: string): string | object {
//   return jwt.verify(token, process.env.JWT_SECRET!)
// }
//
// export function makeUserJwt(email: string): string {
//   return jwtSign({
//     usr: hashEmail(email.toLowerCase())
//   })
// }
