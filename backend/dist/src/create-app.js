"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfiguredApp = createConfiguredApp;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function createConfiguredApp() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: process.env.VERCEL ? ['error', 'warn'] : undefined,
    });
    app.setGlobalPrefix('api');
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
    }));
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    return app;
}
//# sourceMappingURL=create-app.js.map