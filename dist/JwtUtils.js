"use strict";
/*
 *  Utility functions for creating & verifying Json web tokens (jwt)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
/** A class for handling jwt, just pass the secret once when created */
class JwtUtils {
    constructor(secret, cookieName) {
        this.secret = secret;
        this.cookieName = cookieName;
    }
    /** Get config for `express-jwt`s parser, adding a custom parser function */
    get jwtParserConfig() {
        return {
            secret: this.secret,
            credentialsRequired: false,
            getToken: (req) => {
                let { headers = {}, signedCookies = {}, query = {} } = req;
                // Try a signed cookie
                if (this.cookieName && signedCookies[this.cookieName]) {
                    return req.signedCookies[this.cookieName];
                }
                // Try an auth header, "Authorization: Bearer $TOKEN"
                if ((headers.authorization || '').startsWith('Bearer ')) {
                    return headers.authorization.split(' ')[1];
                }
                // Try the query string, ?token=
                if (query.token)
                    return query.token;
                // If all else failed, we couldn't find a token
                return null;
            }
        };
    }
    /** Sign a JWT payload into a string */
    jwtSign(payload) {
        return jsonwebtoken_1.default.sign(payload, this.secret);
    }
    /** Verify a jwt was signed by us and return the payload */
    jwtVerify(token) {
        return jsonwebtoken_1.default.verify(token, this.secret);
    }
    /** one-way hash an email using sha256 */
    hashEmail(email) {
        return crypto_1.default
            .createHash('sha256')
            .update(email.trim().toLowerCase())
            .digest('base64');
    }
}
exports.JwtUtils = JwtUtils;
//# sourceMappingURL=JwtUtils.js.map