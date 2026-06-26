"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const financial_domain_module_1 = require("../financial/financial-domain.module");
const ai_module_1 = require("../ai/ai.module");
const insights_module_1 = require("../insights/insights.module");
const finance_context_module_1 = require("../finance-context/finance-context.module");
const chat_service_1 = require("./chat.service");
const chat_controller_1 = require("./chat.controller");
const finance_rag_service_1 = require("./finance-rag.service");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, financial_domain_module_1.FinancialDomainModule, ai_module_1.AiModule, insights_module_1.InsightsModule, finance_context_module_1.FinanceContextModule],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_service_1.ChatService, finance_rag_service_1.FinanceRagService],
        exports: [chat_service_1.ChatService, finance_rag_service_1.FinanceRagService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map