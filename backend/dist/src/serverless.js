"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const create_app_1 = require("./create-app");
let cachedHandler;
let initPromise;
async function buildHandler() {
    const app = await (0, create_app_1.createConfiguredApp)();
    await app.init();
    return app.getHttpAdapter().getInstance();
}
async function handler(req, res) {
    if (!cachedHandler) {
        if (!initPromise) {
            initPromise = buildHandler();
        }
        cachedHandler = await initPromise;
    }
    cachedHandler(req, res);
}
//# sourceMappingURL=serverless.js.map