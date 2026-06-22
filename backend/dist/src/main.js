"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_app_1 = require("./create-app");
async function bootstrap() {
    const app = await (0, create_app_1.createConfiguredApp)();
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map