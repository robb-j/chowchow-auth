"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuthModule_1 = require("../AuthModule");
describe('sample', () => {
    let auth;
    beforeEach(() => {
        auth = new AuthModule_1.AuthModule({ loginRedir: '/', publicUrl: 'http://lh:3000' }, []);
    });
    it('should exist', async () => {
        expect(auth).toBeDefined();
    });
});
//# sourceMappingURL=AuthModule.spec.js.map