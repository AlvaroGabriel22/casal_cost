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
exports.IndividualAccessService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const permission_service_1 = require("../permission/permission.service");
const audit_log_service_1 = require("../audit/audit-log.service");
let IndividualAccessService = class IndividualAccessService {
    constructor(prisma, permission, audit) {
        this.prisma = prisma;
        this.permission = permission;
        this.audit = audit;
    }
    async create(ownerId, body) {
        if (!body.canView && body.canEdit) {
            throw new common_1.BadRequestException('canEdit requires canView');
        }
        const partner = await this.permission.getActiveCoupleForUser(ownerId);
        if (!partner || partner.partnerId !== body.allowedUserId) {
            throw new common_1.BadRequestException('You can only grant access to your active partner.');
        }
        const row = await this.prisma.individualAccountAccess.upsert({
            where: {
                ownerUserId_allowedUserId: {
                    ownerUserId: ownerId,
                    allowedUserId: body.allowedUserId,
                },
            },
            create: {
                ownerUserId: ownerId,
                allowedUserId: body.allowedUserId,
                canView: body.canView,
                canEdit: body.canEdit,
            },
            update: {
                canView: body.canView,
                canEdit: body.canEdit,
            },
        });
        await this.audit.log({
            userId: ownerId,
            entity: 'IndividualAccountAccess',
            entityId: row.id,
            action: 'CREATE',
            newValue: row,
        });
        return (0, api_response_1.ok)(row, 'Operation completed successfully');
    }
    async update(ownerId, id, body) {
        const row = await this.prisma.individualAccountAccess.findFirst({
            where: { id, ownerUserId: ownerId },
        });
        if (!row)
            throw new common_1.NotFoundException();
        const canView = body.canView ?? row.canView;
        const canEdit = body.canEdit ?? row.canEdit;
        if (!canView && canEdit) {
            throw new common_1.BadRequestException('canEdit requires canView');
        }
        const updated = await this.prisma.individualAccountAccess.update({
            where: { id },
            data: { canView, canEdit },
        });
        await this.audit.log({
            userId: ownerId,
            entity: 'IndividualAccountAccess',
            entityId: id,
            action: 'UPDATE',
            newValue: updated,
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    async remove(ownerId, id) {
        const row = await this.prisma.individualAccountAccess.findFirst({
            where: { id, ownerUserId: ownerId },
        });
        if (!row)
            throw new common_1.NotFoundException();
        await this.prisma.individualAccountAccess.delete({ where: { id } });
        await this.audit.log({
            userId: ownerId,
            entity: 'IndividualAccountAccess',
            entityId: id,
            action: 'DELETE',
            oldValue: row,
        });
        return (0, api_response_1.ok)({ id }, 'Operation completed successfully');
    }
    async listForMe(userId) {
        const grantedToMe = await this.prisma.individualAccountAccess.findMany({
            where: { allowedUserId: userId },
            include: {
                owner: { select: { id: true, name: true, username: true } },
            },
        });
        const grantedByMe = await this.prisma.individualAccountAccess.findMany({
            where: { ownerUserId: userId },
            include: {
                allowed: { select: { id: true, name: true, username: true } },
            },
        });
        return (0, api_response_1.ok)({ grantedToMe, grantedByMe }, 'Operation completed successfully');
    }
};
exports.IndividualAccessService = IndividualAccessService;
exports.IndividualAccessService = IndividualAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_service_1.PermissionService,
        audit_log_service_1.AuditLogService])
], IndividualAccessService);
//# sourceMappingURL=individual-access.service.js.map