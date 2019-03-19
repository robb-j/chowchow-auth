"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_jwt_1 = __importDefault(require("express-jwt"));
const JwtUtils_1 = require("./JwtUtils");
const path_1 = require("path");
/** a very simple check for an email */
exports.isEmail = (value) => /^\S+@\S+$/i.test(value);
/** A ChowChow module to add authentication endpoints
  and add an auth jwt to the context */
class AuthModule {
    /** What path to put strategy endpoints under (default: '/auth')*/
    get endpointPrefix() {
        return this.config.endpointPrefix || '/auth';
    }
    /** What to set the cookie to (default: [])*/
    get cookieName() {
        return this.config.cookieName || 'access_token';
    }
    /** Emails to whitelist for authentication (default: []) */
    get whitelist() {
        return (this.config.whitelist || []).map(e => e.toLowerCase().trim());
    }
    /** How long cookies last for, in milliseconds (default: 3 months) */
    get cookieDuration() {
        return this.config.cookieDuration || (365 / 4) * 24 * 60 * 60 * 1000;
    }
    /** Create a new AuthModule with config and strategies */
    constructor(config, strategies) {
        this.strategies = strategies;
        this.config = config;
        for (let strategy of this.strategies)
            strategy.auth = this;
        this.utils = new JwtUtils_1.JwtUtils(process.env.JWT_SECRET, this.cookieName);
    }
    //
    // Module implementation
    //
    /** Module#checkEnvironment() */
    checkEnvironment() {
        let missing = ['JWT_SECRET', 'COOKIE_SECRET'].filter(n => !process.env[n]);
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        for (let strategy of this.strategies)
            strategy.checkEnvironment();
    }
    /** Module#setupModule() */
    setupModule() {
        for (let strategy of this.strategies)
            strategy.setupStrategy();
    }
    /** Module#clearModule() */
    clearModule() {
        for (let strategy of this.strategies)
            strategy.clearStrategy();
    }
    /** Module#extendExpress(app) */
    extendExpress(server) {
        server.use(cookie_parser_1.default(process.env.COOKIE_SECRET));
        server.use(express_jwt_1.default(this.utils.jwtParserConfig));
        for (let strategy of this.strategies)
            strategy.extendExpress(server);
    }
    /** Module#extendEndpointContext(ctx) */
    extendEndpointContext(ctx) {
        // Don't pass if not set
        let jwt = ctx.req.user;
        // Don't pass the jwt ctx  if its not a valid auth
        if (!jwt || jwt.typ !== 'auth')
            return { jwt: null };
        // Pass the auth token
        return { jwt };
    }
    //
    // Strategy Helpers
    //
    /** Hook for strategies to finish an authentication */
    finishAuth(ctx, emailHash, mode) {
        // Create an authentication token
        const newToken = this.utils.jwtSign({
            sub: emailHash,
            typ: 'auth'
        });
        // Proceed baed on the mode passed
        if (mode === 'cookie') {
            ctx.res.cookie(this.cookieName, newToken, {
                signed: true,
                httpOnly: true,
                secure: ctx.req.protocol === 'https',
                expires: new Date(Date.now() + this.cookieDuration)
            });
            ctx.res.redirect(302, this.config.loginRedir);
        }
        else if (mode === 'redir') {
            ctx.res.redirect(302, `${this.config.loginRedir}?token=${newToken}`);
        }
        else {
            this.sendData(ctx, { token: newToken });
        }
    }
    /** Helper method for strategies to send a json response */
    sendData(ctx, payload) {
        let { sendData, res } = ctx;
        if (sendData)
            sendData(payload);
        else
            res.send(payload);
    }
    /** Helper method for strategies to validate an authentication mode */
    validateAuthMode(mode) {
        if (!['cookie', 'token', 'redir'].includes(mode)) {
            throw new Error(`Bad 'mode'`);
        }
        return mode;
    }
    /** Helper method for strategies to validate an email */
    validateEmail(email) {
        // Check its an allowed email
        if (typeof email !== 'string' || !exports.isEmail(email)) {
            throw new Error(`Bad 'email'`);
        }
        // Remove whitespace and lower-case the email
        email = email.trim().toLowerCase();
        // If using a filter, check its allowed
        // Only check the whitelist if the filter isn't set
        if (this.config.filter) {
            // Fail if the email didn't pass the filter
            if (!this.config.filter(email))
                throw new Error(`Bad 'email'`);
        }
        else if (this.whitelist.length > 0 && !this.whitelist.includes(email)) {
            throw new Error(`Bad 'email'`);
        }
        return email;
    }
    /** Helper for strategies to form a full public url */
    makeAbsoluteLink(...paths) {
        return (this.config.publicUrl.replace(/\/$/, '') +
            path_1.join(this.endpointPrefix, ...paths));
    }
}
exports.AuthModule = AuthModule;
//# sourceMappingURL=AuthModule.js.map