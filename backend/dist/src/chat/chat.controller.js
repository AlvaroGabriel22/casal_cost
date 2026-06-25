"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const chat_service_1 = require("./chat.service");
const chat_dto_1 = require("./dto/chat.dto");
let ChatController = class ChatController {
    constructor(chat) {
        this.chat = chat;
    }
    history(user) {
        return this.chat.history(user.id);
    }
    clearHistory(user) {
        return this.chat.clearHistory(user.id);
    }
    ask(user, dto) {
        return this.chat.ask(user.id, dto.message);
    }
    async stream(user, dto, res) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        try {
            for await (const chunk of this.chat.askStream(user.id, dto.message)) {
                res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }
            res.write('data: [DONE]\n\n');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao gerar resposta.';
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        }
        finally {
            res.end();
        }
    }
    reindex(user) {
        return this.chat.reindex(user.id);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "history", null);
__decorate([
    (0, common_1.Delete)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "clearHistory", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.ChatAskDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "ask", null);
__decorate([
    (0, common_1.Post)('stream'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.ChatAskDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "stream", null);
__decorate([
    (0, common_1.Post)('reindex'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "reindex", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map