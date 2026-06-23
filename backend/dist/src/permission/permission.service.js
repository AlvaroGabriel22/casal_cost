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
exports.PermissionService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const http_exceptions_1 = require("../common/http-exceptions");
let PermissionService = class PermissionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActiveCoupleForUser(userId) {
        const c = await this.prisma.couple.findFirst({
            where: {
                status: client_1.CoupleStatus.ACTIVE,
                OR: [{ userAId: userId }, { userBId: userId }],
            },
        });
        if (!c)
            return null;
        const partnerId = c.userAId === userId ? c.userBId : c.userAId;
        return { coupleId: c.id, partnerId };
    }
    async assertCoupleMembership(userId, coupleId) {
        const c = await this.prisma.couple.findFirst({
            where: {
                id: coupleId,
                status: client_1.CoupleStatus.ACTIVE,
                OR: [{ userAId: userId }, { userBId: userId }],
            },
        });
        if (!c) {
            (0, http_exceptions_1.throwForbiddenAccess)('Você não faz parte deste casal.');
        }
    }
    async canViewIndividualAccount(viewerId, ownerId) {
        if (viewerId === ownerId)
            return true;
        const row = await this.prisma.individualAccountAccess.findUnique({
            where: {
                ownerUserId_allowedUserId: {
                    ownerUserId: ownerId,
                    allowedUserId: viewerId,
                },
            },
        });
        return !!row?.canView;
    }
    async canEditIndividualAccount(editorId, ownerId) {
        if (editorId === ownerId)
            return true;
        const row = await this.prisma.individualAccountAccess.findUnique({
            where: {
                ownerUserId_allowedUserId: {
                    ownerUserId: ownerId,
                    allowedUserId: editorId,
                },
            },
        });
        return !!row?.canEdit;
    }
    async assertIndividualAccess(viewerId, ownerId, requireEdit) {
        if (viewerId === ownerId)
            return;
        const ok = requireEdit
            ? await this.canEditIndividualAccount(viewerId, ownerId)
            : await this.canViewIndividualAccount(viewerId, ownerId);
        if (!ok) {
            (0, http_exceptions_1.throwForbiddenAccess)('Você não tem permissão para acessar estas finanças individuais.');
        }
    }
    async assertExpenseReadable(userId, expense) {
        if (expense.scope === client_1.ExpenseScope.SHARED) {
            if (!expense.coupleId)
                throw new common_1.NotFoundException('Despesa compartilhada sem casal associado.');
            await this.assertCoupleMembership(userId, expense.coupleId);
            return;
        }
        if (!expense.ownerUserId)
            throw new common_1.NotFoundException('Despesa inválida.');
        await this.assertIndividualAccess(userId, expense.ownerUserId, false);
    }
    async assertExpenseEditable(userId, expense) {
        if (expense.scope === client_1.ExpenseScope.SHARED) {
            if (!expense.coupleId)
                throw new common_1.NotFoundException('Despesa compartilhada sem casal associado.');
            await this.assertCoupleMembership(userId, expense.coupleId);
            return;
        }
        if (!expense.ownerUserId)
            throw new common_1.NotFoundException('Despesa inválida.');
        await this.assertIndividualAccess(userId, expense.ownerUserId, true);
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionService);
//# sourceMappingURL=permission.service.js.map