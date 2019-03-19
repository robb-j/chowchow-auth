"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mail_1 = __importDefault(require("@sendgrid/mail"));
const path_1 = require("path");
// The environment variables this strategy requires
const requiredEnvVars = ['SENDGRID_TOKEN'];
/** An authentication strategy that verify's a client by sending them
    an email (using sendgrid) with a link in it */
class SendgridStrategy {
    constructor(config) {
        this.config = config;
    }
    //
    // AuthStrategy implementation
    //
    /** AuthStrategy#checkEnvironment */
    checkEnvironment() {
        let missing = requiredEnvVars.filter(n => !process.env[n]);
        // Fail if any environment variables are missing
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
    }
    /** AuthStrategy#setupStrategy */
    setupStrategy() {
        mail_1.default.setApiKey(process.env.SENDGRID_TOKEN);
        // Get the base url using the auth module's base
        const base = path_1.join(this.auth.endpointPrefix, 'email');
        // Add our routes to chowchow
        this.auth.app.applyRoutes((app, r) => {
            // GET: /{auth.endpointPrefix}/email/request ?email=&mode=
            app.get(path_1.join(base, 'request'), r(ctx => this.requestRoute(ctx)));
            // GET: /{auth.endpointPrefix}/email/check ?token=
            app.get(path_1.join(base, 'check'), r(ctx => this.checkRoute(ctx)));
        });
    }
    /** AuthStrategy#clearStrategy */
    clearStrategy() { }
    /** AuthStrategy#extendExpress */
    extendExpress(server) { }
    //
    // Authentication endpoints
    //
    /** A route to request a login email be sent */
    async requestRoute(ctx) {
        const { utils } = this.auth;
        // Validate the mode and email
        let mode = this.auth.validateAuthMode(ctx.req.query.mode);
        let email = this.auth.validateEmail(ctx.req.query.email);
        // Create an registration token
        const auth = utils.jwtSign({
            sub: utils.hashEmail(email),
            typ: 'reg',
            mode: mode
        });
        // Generate the link (JWTs should be url safe)
        const link = this.auth.makeAbsoluteLink('email', `check?token=${auth}`);
        // Send the email and return an 'ok' response
        try {
            await mail_1.default.send({
                to: email,
                from: this.config.fromEmail,
                subject: this.config.emailSubject,
                html: this.config.emailBody(email, link)
            });
            this.auth.sendData(ctx, 'Email sent');
        }
        catch (error) {
            throw new Error('Failed to send auth email');
        }
    }
    /** A route to authenticate from a login email */
    async checkRoute(ctx) {
        const { token } = ctx.req.query;
        const { utils } = this.auth;
        // Check the token was passed
        if (typeof token !== 'string')
            throw new Error(`Bad 'token'`);
        // Check the jwt was signed by us and that it's a registration
        const { sub, typ, mode } = utils.jwtVerify(token);
        if (typ !== 'reg')
            throw new Error(`Bad 'token'`);
        // Finish the authentication (mode was set by us so should be trusted)
        this.auth.finishAuth(ctx, sub, mode);
    }
}
exports.SendgridStrategy = SendgridStrategy;
//# sourceMappingURL=SendgridStrategy.js.map