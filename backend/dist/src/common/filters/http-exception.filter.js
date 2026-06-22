"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const api_response_1 = require("../api-response");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_ERROR';
        let message = 'Unexpected error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exResponse = exception.getResponse();
            if (typeof exResponse === 'object' &&
                exResponse !== null &&
                'success' in exResponse) {
                return res.status(status).json(exResponse);
            }
            if (typeof exResponse === 'object' && exResponse !== null) {
                const r = exResponse;
                message = r.message || exception.message;
                if (Array.isArray(r.message)) {
                    message = r.message.join(', ');
                }
                code = r.error || code;
            }
            else if (typeof exResponse === 'string') {
                message = exResponse;
            }
            if (status === common_1.HttpStatus.UNAUTHORIZED)
                code = 'UNAUTHORIZED_ACCESS';
            if (status === common_1.HttpStatus.FORBIDDEN)
                code = 'FORBIDDEN';
            if (status === common_1.HttpStatus.BAD_REQUEST)
                code = 'BAD_REQUEST';
            if (status === common_1.HttpStatus.NOT_FOUND)
                code = 'NOT_FOUND';
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        res.status(status).json((0, api_response_1.err)(code, message));
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map