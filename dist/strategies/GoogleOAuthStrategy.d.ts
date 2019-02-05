import { BaseContext } from '@robb_j/chowchow';
import { OAuth2Client } from 'google-auth-library';
import { Application } from 'express';
import { AuthStrategy, AuthModule } from '../AuthModule';
/** An authentication strategy that verifies the client using google oauth */
export declare class GoogleOAuthStrategy implements AuthStrategy {
    auth: AuthModule;
    client: OAuth2Client;
    /** AuthStrategy#checkEnvironment */
    checkEnvironment(): void;
    /** AuthStrategy#setupStrategy */
    setupStrategy(): void | Promise<void>;
    /** AuthStrategy#clearStrategy */
    clearStrategy(): void | Promise<void>;
    /** AuthStrategy#extendExpress */
    extendExpress(server: Application): void;
    /** A route to request a google oauth login redirect */
    protected requestRoute(ctx: BaseContext): void;
    /** A route to handle the oauth callback and authenticate */
    protected checkRoute(ctx: BaseContext): Promise<void>;
    /** An internal method to fetch a user's profile using https
        a request library was not used to keep this module agnostic */
    protected fetchProfile(accessToken: string): Promise<string>;
}
