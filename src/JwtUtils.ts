/*
 *  Utility functions for creating & verifying Json web tokens (jwt)
 */

import jwtParser from 'express-jwt'
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken'
import crypto from 'crypto'

/** A class for handling jwt, just pass the secret once when created */
export class JwtUtils {
  constructor(public secret: string, public cookieName?: string) {}

  /** Get config for `express-jwt`s parser, adding a custom parser function */
  get jwtParserConfig(): jwtParser.Options {
    return {
      secret: this.secret,
      credentialsRequired: false,
      getToken: req => {
        let { headers = {}, signedCookies = {}, query = {} } = req

        // Try a signed cookie
        if (this.cookieName && signedCookies[this.cookieName]) {
          return req.signedCookies[this.cookieName]
        }

        // Try an auth header, "Authorization: Bearer $TOKEN"
        if ((headers.authorization || '').startsWith('Bearer ')) {
          return headers.authorization!.split(' ')[1]
        }

        // Try the query string, ?token=
        if (query.token) return query.token

        // If all else failed, we couldn't find a token
        return null
      }
    }
  }

  /** Sign a JWT payload into a string */
  jwtSign(payload: Object, options?: SignOptions): string {
    return jwt.sign(payload, this.secret, options)
  }

  /** Verify a jwt was signed by us and return the payload */
  jwtVerify(token: string, options?: VerifyOptions): string | object {
    return jwt.verify(token, this.secret, options)
  }

  /** one-way hash an email using sha256 */
  hashEmail(email: string): string {
    return crypto
      .createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('base64')
  }
}
