"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementImportsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const financial_domain_module_1 = require("../financial/financial-domain.module");
const auth_module_1 = require("../auth/auth.module");
const statement_imports_controller_1 = require("./statement-imports.controller");
const statement_imports_service_1 = require("./statement-imports.service");
let StatementImportsModule = class StatementImportsModule {
};
exports.StatementImportsModule = StatementImportsModule;
exports.StatementImportsModule = StatementImportsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, financial_domain_module_1.FinancialDomainModule, auth_module_1.AuthModule],
        controllers: [statement_imports_controller_1.StatementImportsController],
        providers: [statement_imports_service_1.StatementImportsService],
        exports: [statement_imports_service_1.StatementImportsService],
    })
], StatementImportsModule);
//# sourceMappingURL=statement-imports.module.js.map