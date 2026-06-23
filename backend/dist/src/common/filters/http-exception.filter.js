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
const FRIENDLY_GENERIC = 'Não foi possível concluir a operação. Tente novamente em alguns instantes.';
const FRIENDLY_BY_STATUS = {
    [common_1.HttpStatus.BAD_REQUEST]: 'Não foi possível processar os dados informados. Verifique e tente novamente.',
    [common_1.HttpStatus.UNAUTHORIZED]: 'Sua sessão expirou. Faça login novamente para continuar.',
    [common_1.HttpStatus.FORBIDDEN]: 'Você não tem permissão para executar esta ação.',
    [common_1.HttpStatus.NOT_FOUND]: 'Registro não encontrado.',
    [common_1.HttpStatus.CONFLICT]: 'Este registro entra em conflito com um já existente.',
    [common_1.HttpStatus.UNPROCESSABLE_ENTITY]: 'Alguns campos precisam ser revisados antes de continuar.',
    [common_1.HttpStatus.TOO_MANY_REQUESTS]: 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.',
};
let AllExceptionsFilter = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger('HttpException');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_ERROR';
        let message;
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
                if (Array.isArray(r.message)) {
                    message = r.message.join(', ');
                }
                else if (typeof r.message === 'string') {
                    message = r.message;
                }
                if (typeof r.error === 'string') {
                    code = r.error;
                }
            }
            else if (typeof exResponse === 'string') {
                message = exResponse;
            }
        }
        else if (this.isPrismaError(exception)) {
            const mapped = this.mapPrismaError(exception);
            status = mapped.status;
            code = mapped.code;
            message = mapped.message;
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        if (status === common_1.HttpStatus.UNAUTHORIZED)
            code = 'UNAUTHORIZED_ACCESS';
        else if (status === common_1.HttpStatus.FORBIDDEN)
            code = 'FORBIDDEN';
        else if (status === common_1.HttpStatus.BAD_REQUEST)
            code = 'BAD_REQUEST';
        else if (status === common_1.HttpStatus.NOT_FOUND)
            code = 'NOT_FOUND';
        else if (status === common_1.HttpStatus.CONFLICT)
            code = 'CONFLICT';
        if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`${req?.method ?? 'REQ'} ${req?.url ?? ''} → ${status} ${code} :: ${exception?.stack ?? exception?.message ?? exception}`);
            message = FRIENDLY_GENERIC;
        }
        else if (!message || !message.trim()) {
            message = FRIENDLY_BY_STATUS[status] ?? FRIENDLY_GENERIC;
        }
        return res.status(status).json((0, api_response_1.err)(code, message));
    }
    isPrismaError(exception) {
        if (!exception || typeof exception !== 'object')
            return false;
        const e = exception;
        return typeof e.code === 'string' && /^P\d{4}$/.test(e.code);
    }
    mapPrismaError(error) {
        switch (error.code) {
            case 'P2000':
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    code: 'VALUE_TOO_LONG',
                    message: 'Um dos campos excedeu o tamanho permitido.',
                };
            case 'P2002':
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    code: 'UNIQUE_CONSTRAINT',
                    message: 'Já existe um registro com estes dados.',
                };
            case 'P2003':
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    code: 'INVALID_RELATION',
                    message: 'Referência inválida entre registros.',
                };
            case 'P2025':
                return {
                    status: common_1.HttpStatus.NOT_FOUND,
                    code: 'NOT_FOUND',
                    message: 'O registro solicitado não foi encontrado.',
                };
            default:
                return {
                    status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    code: 'DATABASE_ERROR',
                    message: FRIENDLY_GENERIC,
                };
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map