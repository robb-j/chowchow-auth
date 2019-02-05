"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chowchow_1 = require("@robb_j/chowchow");
const chowchow_json_envelope_1 = require("@robb_j/chowchow-json-envelope");
const AuthModule_1 = require("./AuthModule");
const SendgridStrategy_1 = require("./strategies/SendgridStrategy");
const GoogleOAuthStrategy_1 = require("./strategies/GoogleOAuthStrategy");
(async () => {
    let chow = chowchow_1.ChowChow.create()
        .use(new chowchow_json_envelope_1.JsonEnvelopeModule({ handleErrors: true }))
        .use(new AuthModule_1.AuthModule({ loginRedir: '/', publicUrl: 'http://localhost:3000' }, [
        new SendgridStrategy_1.SendgridStrategy({
            fromEmail: 'noreply@r0b.io',
            emailSubject: 'Your Login',
            emailBody: (link, email) => `Here is your r0b.io login link: ${email}`
        }),
        new GoogleOAuthStrategy_1.GoogleOAuthStrategy()
    ]));
    chow.applyRoutes((app, r) => {
        app.get('/', r(({ sendData, jwt }) => sendData({ jwt })));
    });
    await chow.start();
    console.log('Listening on :3000');
})();
//# sourceMappingURL=experiment.js.map