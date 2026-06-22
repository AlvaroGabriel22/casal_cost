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
exports.CouplesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const couples_service_1 = require("./couples.service");
const couple_dto_1 = require("./dto/couple.dto");
let CouplesController = class CouplesController {
    constructor(couples) {
        this.couples = couples;
    }
    invite(user, dto) {
        return this.couples.invite(user.id, dto.partnerUsername);
    }
    accept(user) {
        return this.couples.accept(user.id);
    }
    me(user) {
        return this.couples.me(user.id);
    }
    remove(user, id) {
        return this.couples.disable(user.id, id);
    }
};
exports.CouplesController = CouplesController;
__decorate([
    (0, common_1.Post)('invite'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, couple_dto_1.InvitePartnerDto]),
    __metadata("design:returntype", void 0)
], CouplesController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)('accept'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouplesController.prototype, "accept", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouplesController.prototype, "me", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CouplesController.prototype, "remove", null);
exports.CouplesController = CouplesController = __decorate([
    (0, common_1.Controller)('couples'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [couples_service_1.CouplesService])
], CouplesController);
//# sourceMappingURL=couples.controller.js.map