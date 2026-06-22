"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndividualAccessModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const financial_domain_module_1 = require("../financial/financial-domain.module");
const individual_access_controller_1 = require("./individual-access.controller");
const individual_access_service_1 = require("./individual-access.service");
let IndividualAccessModule = class IndividualAccessModule {
};
exports.IndividualAccessModule = IndividualAccessModule;
exports.IndividualAccessModule = IndividualAccessModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, financial_domain_module_1.FinancialDomainModule],
        controllers: [individual_access_controller_1.IndividualAccessController],
        providers: [individual_access_service_1.IndividualAccessService],
    })
], IndividualAccessModule);
//# sourceMappingURL=individual-access.module.js.map