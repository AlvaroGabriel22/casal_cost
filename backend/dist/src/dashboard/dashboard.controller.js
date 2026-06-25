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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const financial_calculation_service_1 = require("../financial/financial-calculation.service");
const financial_projection_service_1 = require("../financial/financial-projection.service");
const permission_service_1 = require("../permission/permission.service");
const investments_service_1 = require("../investments/investments.service");
const api_response_1 = require("../common/api-response");
let DashboardController = class DashboardController {
    constructor(calc, projection, permission, investments) {
        this.calc = calc;
        this.projection = projection;
        this.permission = permission;
        this.investments = investments;
    }
    defaultYm() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`;
    }
    async individual(user, month) {
        const m = month ?? this.defaultYm();
        const [dash, futureProjection, investmentSummary] = await Promise.all([
            this.calc.calculateIndividualMonth(user.id, m),
            this.projection.projectMonths(user.id, 6),
            this.investments.summarizeScope(user.id, client_1.InvestmentScope.INDIVIDUAL, m),
        ]);
        return (0, api_response_1.ok)({ ...dash, futureProjection, investmentSummary }, 'Operation completed successfully');
    }
    async couple(user, month) {
        const couple = await this.permission.getActiveCoupleForUser(user.id);
        if (!couple) {
            return (0, api_response_1.ok)(null, 'Operation completed successfully');
        }
        const m = month ?? this.defaultYm();
        const [data, investmentSummary] = await Promise.all([
            this.calc.calculateCoupleMonth(couple.coupleId, m),
            this.investments.summarizeScope(user.id, client_1.InvestmentScope.COUPLE, m),
        ]);
        return (0, api_response_1.ok)({ ...data, investmentSummary }, 'Operation completed successfully');
    }
    async proj(user, months) {
        const n = months ? parseInt(months, 10) : 6;
        const rows = await this.projection.projectMonths(user.id, n);
        return (0, api_response_1.ok)(rows, 'Operation completed successfully');
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('individual'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "individual", null);
__decorate([
    (0, common_1.Get)('couple'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "couple", null);
__decorate([
    (0, common_1.Get)('projection'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('months')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "proj", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [financial_calculation_service_1.FinancialCalculationService,
        financial_projection_service_1.FinancialProjectionService,
        permission_service_1.PermissionService,
        investments_service_1.InvestmentsService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map