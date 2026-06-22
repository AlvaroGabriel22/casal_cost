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
exports.ExpensesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const expenses_service_1 = require("./expenses.service");
const financial_calculation_service_1 = require("../financial/financial-calculation.service");
const create_expense_dto_1 = require("./dto/create-expense.dto");
const expense_query_dto_1 = require("./dto/expense-query.dto");
const api_response_1 = require("../common/api-response");
let ExpensesController = class ExpensesController {
    constructor(expenses, calc) {
        this.expenses = expenses;
        this.calc = calc;
    }
    defaultYm() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`;
    }
    create(user, dto) {
        return this.expenses.createIndividual(user.id, dto);
    }
    list(user, query) {
        return this.expenses.list(user.id, query);
    }
    async statement(user, query) {
        const data = await this.calc.getIndividualStatement(user.id, {
            monthYm: query.month ?? this.defaultYm(),
            name: query.name,
            source: query.source,
        });
        return (0, api_response_1.ok)(data, 'Operation completed successfully');
    }
    one(user, id) {
        return this.expenses.getOne(user.id, id);
    }
    update(user, id, dto) {
        return this.expenses.updateOne(user.id, id, dto);
    }
    remove(user, id, dto) {
        return this.expenses.softDelete(user.id, id, dto);
    }
    pay(user, id, dto) {
        return this.expenses.pay(user.id, id, dto);
    }
    payMyShare(user, id, dto) {
        return this.expenses.payMyShare(user.id, id, dto);
    }
    cancel(user, id, dto) {
        return this.expenses.cancel(user.id, id, dto);
    }
};
exports.ExpensesController = ExpensesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_expense_dto_1.CreateExpenseDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, expense_query_dto_1.ExpenseListQueryDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('statement/individual'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, expense_query_dto_1.IndividualStatementQueryDto]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "statement", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "one", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.UpdateExpenseDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.ConfirmPasswordDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.ExpensePaymentDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "pay", null);
__decorate([
    (0, common_1.Patch)(':id/pay-my-share'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.PayMyShareDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "payMyShare", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.ExpensePaymentDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "cancel", null);
exports.ExpensesController = ExpensesController = __decorate([
    (0, common_1.Controller)('expenses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [expenses_service_1.ExpensesService,
        financial_calculation_service_1.FinancialCalculationService])
], ExpensesController);
//# sourceMappingURL=expenses.controller.js.map