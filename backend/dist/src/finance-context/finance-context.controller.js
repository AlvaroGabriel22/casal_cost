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
exports.FinanceContextController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const api_response_1 = require("../common/api-response");
const finance_context_service_1 = require("./finance-context.service");
const finance_context_dto_1 = require("./dto/finance-context.dto");
let FinanceContextController = class FinanceContextController {
    constructor(financeContext) {
        this.financeContext = financeContext;
    }
    async list(user) {
        const data = await this.financeContext.getPayload(user.id);
        return (0, api_response_1.ok)(data, 'Operation completed successfully');
    }
    async createRule(user, dto) {
        const data = await this.financeContext.createRule(user.id, dto);
        return (0, api_response_1.ok)(data, 'Contexto salvo — a IA usará nas próximas análises');
    }
    async updateRule(user, id, dto) {
        const data = await this.financeContext.updateRule(user.id, id, dto);
        return (0, api_response_1.ok)(data, 'Contexto atualizado');
    }
    async deleteRule(user, id) {
        const data = await this.financeContext.deleteRule(user.id, id);
        return (0, api_response_1.ok)(data, 'Contexto removido');
    }
    async answerQuestion(user, id, dto) {
        const data = await this.financeContext.answerQuestion(user.id, id, dto);
        return (0, api_response_1.ok)(data, 'Obrigado — a IA aprendeu com sua resposta');
    }
    async dismissQuestion(user, id) {
        const data = await this.financeContext.dismissQuestion(user.id, id);
        return (0, api_response_1.ok)(data, 'Pergunta ignorada');
    }
};
exports.FinanceContextController = FinanceContextController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceContextController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, finance_context_dto_1.UpsertFinanceContextRuleDto]),
    __metadata("design:returntype", Promise)
], FinanceContextController.prototype, "createRule", null);
__decorate([
    (0, common_1.Patch)('rules/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, finance_context_dto_1.UpsertFinanceContextRuleDto]),
    __metadata("design:returntype", Promise)
], FinanceContextController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceContextController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Post)('questions/:id/answer'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, finance_context_dto_1.AnswerFinanceContextQuestionDto]),
    __metadata("design:returntype", Promise)
], FinanceContextController.prototype, "answerQuestion", null);
__decorate([
    (0, common_1.Post)('questions/:id/dismiss'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceContextController.prototype, "dismissQuestion", null);
exports.FinanceContextController = FinanceContextController = __decorate([
    (0, common_1.Controller)('assistant/finance-context'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [finance_context_service_1.FinanceContextService])
], FinanceContextController);
//# sourceMappingURL=finance-context.controller.js.map