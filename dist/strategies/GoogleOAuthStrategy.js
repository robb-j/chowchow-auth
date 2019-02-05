"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const google_auth_library_1 = require("google-auth-library");
const path_1 = require("path");
// The environment variables this strategy requires
const requiredEnvVars = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'];
/** An authentication strategy that verifies the client using google oauth */
class GoogleOAuthStrategy {
    constructor() {
        this.auth = null;
        this.client = null;
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
        this.client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET, this.auth.makeAbsoluteLink('google', 'callback'));
        // Get the base url using the auth module's base
        const base = path_1.join(this.auth.endpointPrefix, 'google');
        // Add our roues to chowchow
        this.auth.app.applyRoutes((app, r) => {
            // GET: /{auth.endpointPrefix}/email/request ?mode=
            app.get(path_1.join(base, 'request'), r(ctx => this.requestRoute(ctx)));
            // GET: /{auth.endpointPrefix}/email/callback ?code=&state=
            app.get(path_1.join(base, 'callback'), r(ctx => this.checkRoute(ctx)));
        });
    }
    /** AuthStrategy#clearStrategy */
    clearStrategy() { }
    /** AuthStrategy#extendExpress */
    extendExpress(server) { }
    //
    // Authentication endpoints
    //
    /** A route to request a google oauth login redirect */
    requestRoute(ctx) {
        const { utils } = this.auth;
        const scopes = ['https://www.googleapis.com/auth/userinfo.email'];
        // Validate the mode parameter
        let mode = this.auth.validateAuthMode(ctx.req.query.mode);
        // Create a state to pass through the oauth
        let state = utils.jwtSign({ typ: 'reg', mode });
        // Generate an auth url to redirect to
        const authorizeUrl = this.client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
            state
        });
        // Redirect to the link
        ctx.res.redirect(302, authorizeUrl);
    }
    /** A route to handle the oauth callback and authenticate */
    async checkRoute(ctx) {
        const { utils } = this.auth;
        try {
            const { code, state } = ctx.req.query;
            // Check the correct paremeters were sent
            if (typeof code !== 'string')
                throw new Error(`Bad 'code'`);
            if (typeof state !== 'string')
                throw new Error(`Bad 'state'`);
            // Check the jwt was signed by us and that it's a registration
            const { typ, mode } = utils.jwtVerify(state);
            if (typ !== 'reg')
                throw new Error(`Bad Auth`);
            // Use the code parameter to get an access token
            const { tokens } = await this.client.getToken(code);
            const accessToken = tokens.access_token;
            // Fail if it didn't return an accessToken
            if (!accessToken)
                throw new Error(`Bad Auth`);
            // Use the access token to get an email
            const email = await this.fetchProfile(accessToken);
            // Validate the email against the whitelist
            this.auth.validateEmail(email);
            // Finish the authentication
            this.auth.finishAuth(ctx, this.auth.utils.hashEmail(email), mode);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    /** An internal method to fetch a user's profile using https
        a request library was not used to keep this module agnostic */
    fetchProfile(accessToken) {
        const profileUrl = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`;
        // Create a promise to fetch, recieve, parse and extract the email
        return new Promise((resolve, reject) => {
            https_1.default
                .get(profileUrl, res => {
                // Create an array of payload strings
                let body = new Array();
                res.on('data', data => body.push(data));
                // On finish, join all the strings and parse the email from the JSON
                res.on('end', () => {
                    try {
                        let json = JSON.parse(body.join(''));
                        if (!json.email)
                            throw new Error('Bad Auth');
                        resolve(json.email);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            })
                .on('error', err => reject(err));
        });
    }
}
exports.GoogleOAuthStrategy = GoogleOAuthStrategy;
//# sourceMappingURL=GoogleOAuthStrategy.js.map