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
exports.InstallmentsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const installments_service_1 = require("./installments.service");
const installment_dto_1 = require("./dto/installment.dto");
let InstallmentsController = class InstallmentsController {
    constructor(installments) {
        this.installments = installments;
    }
    create(user, dto) {
        return this.installments.create(user.id, dto);
    }
    list(user) {
        return this.installments.list(user.id);
    }
    one(user, id) {
        return this.installments.one(user.id, id);
    }
    update(user, id, dto) {
        return this.installments.update(user.id, id, dto);
    }
    pay(user, id, dto) {
        return this.installments.pay(user.id, id, dto);
    }
    remove(user, id, dto) {
        return this.installments.remove(user.id, id, dto);
    }
};
exports.InstallmentsController = InstallmentsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, installment_dto_1.CreateInstallmentDto]),
    __metadata("design:returntype", void 0)
], InstallmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstallmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InstallmentsController.prototype, "one", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, installment_dto_1.UpdateInstallmentDto]),
    __metadata("design:returntype", void 0)
], InstallmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, installment_dto_1.PayInstallmentDto]),
    __metadata("design:returntype", void 0)
], InstallmentsController.prototype, "pay", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, installment_dto_1.DeleteInstallmentDto]),
    __metadata("design:returntype", void 0)
], InstallmentsController.prototype, "remove", null);
exports.InstallmentsController = InstallmentsController = __decorate([
    (0, common_1.Controller)('installments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [installments_service_1.InstallmentsService])
], InstallmentsController);
//# sourceMappingURL=installments.controller.js.map