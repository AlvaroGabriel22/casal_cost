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
exports.CoupleExpensesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const expenses_service_1 = require("../expenses/expenses.service");
const create_expense_dto_1 = require("../expenses/dto/create-expense.dto");
const expense_query_dto_1 = require("../expenses/dto/expense-query.dto");
let CoupleExpensesController = class CoupleExpensesController {
    constructor(expenses) {
        this.expenses = expenses;
    }
    create(user, dto) {
        return this.expenses.createShared(user.id, dto);
    }
    list(user, query) {
        return this.expenses.listShared(user.id, query);
    }
    update(user, id, dto) {
        return this.expenses.updateOne(user.id, id, dto);
    }
    pay(user, id, dto) {
        return this.expenses.pay(user.id, id, dto);
    }
    cancel(user, id, dto) {
        return this.expenses.cancel(user.id, id, dto);
    }
    remove(user, id, dto) {
        return this.expenses.softDelete(user.id, id, dto);
    }
};
exports.CoupleExpensesController = CoupleExpensesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_expense_dto_1.CreateExpenseDto]),
    __metadata("design:returntype", void 0)
], CoupleExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, expense_query_dto_1.ExpenseListQueryDto]),
    __metadata("design:returntype", void 0)
], CoupleExpensesController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.UpdateExpenseDto]),
    __metadata("design:returntype", void 0)
], CoupleExpensesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.ExpensePaymentDto]),
    __metadata("design:returntype", void 0)
], CoupleExpensesController.prototype, "pay", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.ExpensePaymentDto]),
    __metadata("design:returntype", void 0)
], CoupleExpensesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_expense_dto_1.ConfirmPasswordDto]),
    __metadata("design:returntype", void 0)
], CoupleExpensesController.prototype, "remove", null);
exports.CoupleExpensesController = CoupleExpensesController = __decorate([
    (0, common_1.Controller)('couple/expenses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [expenses_service_1.ExpensesService])
], CoupleExpensesController);
//# sourceMappingURL=couple-expenses.controller.js.map