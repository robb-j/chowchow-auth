import { Module, ChowChow, BaseContext } from '@robb_j/chowchow';
import { Application } from 'express';
import { JwtUtils } from './JwtUtils';
export declare type AuthConfig = {
    loginRedir: string;
    publicUrl: string;
    endpointPrefix?: string;
    cookieName?: string;
    whitelist?: string[];
};
/** An authentication jwt */
export declare type AuthJwt = {
    sub: string;
};
/** The AuthModule's extension to the module */
export declare type AuthContext = {
    jwt: AuthJwt | null;
};
/** The different authentication modes
- cookie: Returns the client to `loginRedir` with a Set-Cookie
- redir:  Redirect's the the client to `loginRedir` with ?token= set
- token:  Output's the token in the response body (for dev really)
*/
export declare type AuthMode = 'cookie' | 'redir' | 'token';
/** An interface for an authentication strategy */
export interface AuthStrategy {
    auth: AuthModule;
    checkEnvironment(): void;
    setupStrategy(): void | Promise<void>;
    clearStrategy(): void | Promise<void>;
    extendExpress(server: Application): void;
}
/** a very simple check for an email */
export declare const isEmail: (value: string) => boolean;
/** A ChowChow module to add authentication endpoints
  and add an auth jwt to the context */
export declare class AuthModule implements Module {
    strategies: AuthStrategy[];
    config: AuthConfig;
    app: ChowChow;
    utils: JwtUtils;
    readonly endpointPrefix: string;
    readonly cookieName: string;
    readonly whitelist: string[];
    constructor(config: AuthConfig, strategies: AuthStrategy[]);
    /** Module#checkEnvironment() */
    checkEnvironment(): void;
    /** Module#setupModule() */
    setupModule(): void;
    /** Module#clearModule() */
    clearModule(): void;
    /** Module#extendExpress(app) */
    extendExpress(server: Application): void;
    /** Module#extendEndpointContext(ctx) */
    extendEndpointContext(ctx: BaseContext): AuthContext;
    /** Hook for strategies to finish an authentication */
    finishAuth(ctx: BaseContext, emailHash: string, mode: AuthMode): void;
    /** Helper method for strategies to send a json response */
    sendData(ctx: any, payload: any): void;
    /** Helper method for strategies to validate an authentication mode */
    validateAuthMode(mode: any): AuthMode;
    /** Helper method for strategies to validate an email */
    validateEmail(email: any): any;
    /** Helper for strategies to form a full public url */
    makeAbsoluteLink(...paths: string[]): string;
}
