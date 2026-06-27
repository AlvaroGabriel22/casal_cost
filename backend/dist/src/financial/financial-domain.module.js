"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDomainModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const statement_imports_module_1 = require("../statement-imports/statement-imports.module");
const permission_service_1 = require("../permission/permission.service");
const audit_log_service_1 = require("../audit/audit-log.service");
const financial_calculation_service_1 = require("./financial-calculation.service");
const financial_projection_service_1 = require("./financial-projection.service");
const occurrence_generation_service_1 = require("./occurrence-generation.service");
let FinancialDomainModule = class FinancialDomainModule {
};
exports.FinancialDomainModule = FinancialDomainModule;
exports.FinancialDomainModule = FinancialDomainModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, statement_imports_module_1.StatementImportsModule],
        providers: [
            permission_service_1.PermissionService,
            audit_log_service_1.AuditLogService,
            financial_calculation_service_1.FinancialCalculationService,
            financial_projection_service_1.FinancialProjectionService,
            occurrence_generation_service_1.OccurrenceGenerationService,
        ],
        exports: [
            permission_service_1.PermissionService,
            audit_log_service_1.AuditLogService,
            financial_calculation_service_1.FinancialCalculationService,
            financial_projection_service_1.FinancialProjectionService,
            occurrence_generation_service_1.OccurrenceGenerationService,
        ],
    })
], FinancialDomainModule);
//# sourceMappingURL=financial-domain.module.js.map