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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialProjectionService = void 0;
const common_1 = require("@nestjs/common");
const financial_calculation_service_1 = require("./financial-calculation.service");
let FinancialProjectionService = class FinancialProjectionService {
    constructor(calc) {
        this.calc = calc;
    }
    async projectMonths(userId, months) {
        const n = Math.min(Math.max(months, 1), 36);
        const start = new Date();
        const y = start.getUTCFullYear();
        const m = start.getUTCMonth() + 1;
        const pad = (x) => String(x).padStart(2, '0');
        const rows = [];
        for (let i = 0; i < n; i++) {
            const dt = new Date(Date.UTC(y, m - 1 + i, 1));
            const ym = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
            const dash = await this.calc.calculateIndividualMonth(userId, ym);
            rows.push({
                month: ym,
                income: dash.totalIncomeMonth,
                individualExpenses: dash.totalIndividualExpensesMonth,
                sharedExpensesResponsibility: dash.totalSharedExpensesResponsibilityMonth,
                totalExpenses: dash.totalExpensesMonth,
                balance: dash.balanceMonth,
                status: dash.status,
            });
        }
        return rows;
    }
};
exports.FinancialProjectionService = FinancialProjectionService;
exports.FinancialProjectionService = FinancialProjectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [financial_calculation_service_1.FinancialCalculationService])
], FinancialProjectionService);
//# sourceMappingURL=financial-projection.service.js.map