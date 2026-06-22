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
exports.CouplesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const audit_log_service_1 = require("../audit/audit-log.service");
let CouplesService = class CouplesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async invite(userId, partnerUsername) {
        const me = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!me)
            throw new common_1.NotFoundException('User not found');
        if (partnerUsername === me.username) {
            throw new common_1.BadRequestException('Cannot invite yourself');
        }
        const partner = await this.prisma.user.findFirst({
            where: { username: partnerUsername, deletedAt: null },
        });
        if (!partner)
            throw new common_1.NotFoundException('Partner user not found');
        const existing = await this.prisma.couple.findFirst({
            where: {
                OR: [
                    { userAId: userId, userBId: partner.id },
                    { userAId: partner.id, userBId: userId },
                ],
                status: { in: [client_1.CoupleStatus.PENDING, client_1.CoupleStatus.ACTIVE] },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Invitation or couple already exists');
        }
        const couple = await this.prisma.couple.create({
            data: {
                userAId: userId,
                userBId: partner.id,
                status: client_1.CoupleStatus.PENDING,
            },
        });
        await this.audit.log({
            userId,
            entity: 'Couple',
            entityId: couple.id,
            action: 'CREATE',
            newValue: { status: client_1.CoupleStatus.PENDING },
        });
        return (0, api_response_1.ok)(couple, 'Operation completed successfully');
    }
    async accept(userId) {
        const pending = await this.prisma.couple.findFirst({
            where: { userBId: userId, status: client_1.CoupleStatus.PENDING },
        });
        if (!pending) {
            throw new common_1.NotFoundException('No pending invitation');
        }
        const updated = await this.prisma.couple.update({
            where: { id: pending.id },
            data: { status: client_1.CoupleStatus.ACTIVE },
        });
        await this.audit.log({
            userId,
            entity: 'Couple',
            entityId: updated.id,
            action: 'UPDATE',
            newValue: { status: client_1.CoupleStatus.ACTIVE },
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    async me(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                status: client_1.CoupleStatus.ACTIVE,
            },
            include: {
                userA: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                    },
                },
                userB: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return (0, api_response_1.ok)(couple, 'Operation completed successfully');
    }
    async disable(userId, coupleId) {
        const c = await this.prisma.couple.findFirst({
            where: {
                id: coupleId,
                OR: [{ userAId: userId }, { userBId: userId }],
                status: client_1.CoupleStatus.ACTIVE,
            },
        });
        if (!c)
            throw new common_1.NotFoundException('Couple not found');
        const updated = await this.prisma.couple.update({
            where: { id: coupleId },
            data: { status: client_1.CoupleStatus.DISABLED },
        });
        await this.audit.log({
            userId,
            entity: 'Couple',
            entityId: coupleId,
            action: 'UPDATE',
            newValue: { status: client_1.CoupleStatus.DISABLED },
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
};
exports.CouplesService = CouplesService;
exports.CouplesService = CouplesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], CouplesService);
//# sourceMappingURL=couples.service.js.map