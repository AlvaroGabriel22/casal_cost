"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const serverless_http_1 = require("serverless-http");
const create_app_1 = require("./create-app");
let cached;
async function handler(req, res) {
    if (!cached) {
        const app = await (0, create_app_1.createConfiguredApp)();
        await app.init();
        cached = (0, serverless_http_1.default)(app.getHttpAdapter().getInstance());
    }
    await cached(req, res);
}
//# sourceMappingURL=serverless.js.map