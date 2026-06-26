"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceContextModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const finance_context_controller_1 = require("./finance-context.controller");
const finance_context_service_1 = require("./finance-context.service");
let FinanceContextModule = class FinanceContextModule {
};
exports.FinanceContextModule = FinanceContextModule;
exports.FinanceContextModule = FinanceContextModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [finance_context_controller_1.FinanceContextController],
        providers: [finance_context_service_1.FinanceContextService],
        exports: [finance_context_service_1.FinanceContextService],
    })
], FinanceContextModule);
//# sourceMappingURL=finance-context.module.js.map