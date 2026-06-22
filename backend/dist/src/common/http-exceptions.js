"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwForbiddenAccess = throwForbiddenAccess;
const common_1 = require("@nestjs/common");
const api_response_1 = require("./api-response");
function throwForbiddenAccess(message) {
    throw new common_1.HttpException((0, api_response_1.err)('UNAUTHORIZED_ACCESS', message), common_1.HttpStatus.FORBIDDEN);
}
//# sourceMappingURL=http-exceptions.js.map