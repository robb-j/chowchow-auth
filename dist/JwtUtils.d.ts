/// <reference types="node" />
import jwtParser from 'express-jwt';
/** A class for handling jwt, just pass the secret once when created */
export declare class JwtUtils {
    secret: string;
    cookieName?: string | undefined;
    constructor(secret: string, cookieName?: string | undefined);
    /** Get config for `express-jwt`s parser, adding a custom parser function */
    readonly jwtParserConfig: jwtParser.Options;
    /** Sign a JWT payload into a string */
    jwtSign(payload: string | Object | Buffer): string;
    /** Verify a jwt was signed by us and return the payload */
    jwtVerify(token: string): string | object;
    /** one-way hash an email using sha256 */
    hashEmail(email: string): string;
}
