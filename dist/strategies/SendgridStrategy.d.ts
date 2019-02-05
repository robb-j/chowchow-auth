import { BaseContext } from '@robb_j/chowchow';
import { Application } from 'express';
import { AuthStrategy, AuthModule } from '../AuthModule';
/** The configuration to create a SendgridStrategy */
export declare type SendgridConfig = {
    fromEmail: string;
    emailSubject: string;
    emailBody: (email: string, link: string) => string;
};
/** An authentication strategy that verify's a client by sending them
    an email (using sendgrid) with a link in it */
export declare class SendgridStrategy implements AuthStrategy {
    config: SendgridConfig;
    auth: AuthModule;
    constructor(config: SendgridConfig);
    /** AuthStrategy#checkEnvironment */
    checkEnvironment(): void;
    /** AuthStrategy#setupStrategy */
    setupStrategy(): void;
    /** AuthStrategy#clearStrategy */
    clearStrategy(): void;
    /** AuthStrategy#extendExpress */
    extendExpress(server: Application): void;
    /** A route to request a login email be sent */
    protected requestRoute(ctx: BaseContext): Promise<void>;
    /** A route to authenticate from a login email */
    protected checkRoute(ctx: BaseContext): Promise<void>;
}
