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
exports.IncomesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const audit_log_service_1 = require("../audit/audit-log.service");
let IncomesService = class IncomesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    refMonth(dto) {
        return new Date(dto.length === 7 ? `${dto}-01` : dto);
    }
    async create(userId, dto) {
        const row = await this.prisma.income.create({
            data: {
                userId,
                type: dto.type,
                description: dto.description,
                amount: new client_1.Prisma.Decimal(dto.amount),
                referenceMonth: this.refMonth(dto.referenceMonth),
                receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : null,
                isRecurring: dto.isRecurring ?? false,
                recurrenceStartDate: dto.recurrenceStartDate
                    ? new Date(dto.recurrenceStartDate)
                    : null,
                recurrenceEndDate: dto.recurrenceEndDate
                    ? new Date(dto.recurrenceEndDate)
                    : null,
            },
        });
        await this.audit.log({
            userId,
            entity: 'Income',
            entityId: row.id,
            action: 'CREATE',
            newValue: row,
        });
        return (0, api_response_1.ok)(row, 'Operation completed successfully');
    }
    async list(userId, page, limit) {
        const { skip, take, page: p, limit: l } = (0, pagination_dto_1.paginate)(page, limit);
        const where = { userId, deletedAt: null };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.income.findMany({
                where,
                skip,
                take,
                orderBy: { referenceMonth: 'desc' },
            }),
            this.prisma.income.count({ where }),
        ]);
        return (0, api_response_1.ok)({
            items,
            page: p,
            limit: l,
            total,
            totalPages: Math.ceil(total / l),
        }, 'Operation completed successfully');
    }
    async update(userId, id, dto) {
        const row = await this.prisma.income.findFirst({
            where: { id, userId, deletedAt: null },
        });
        if (!row)
            throw new common_1.NotFoundException();
        const updated = await this.prisma.income.update({
            where: { id },
            data: {
                type: dto.type,
                description: dto.description,
                amount: dto.amount !== undefined ? new client_1.Prisma.Decimal(dto.amount) : undefined,
                referenceMonth: dto.referenceMonth
                    ? this.refMonth(dto.referenceMonth)
                    : undefined,
            },
        });
        await this.audit.log({
            userId,
            entity: 'Income',
            entityId: id,
            action: 'UPDATE',
            newValue: dto,
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    async remove(userId, id) {
        const row = await this.prisma.income.findFirst({
            where: { id, userId, deletedAt: null },
        });
        if (!row)
            throw new common_1.NotFoundException();
        const updated = await this.prisma.income.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.audit.log({
            userId,
            entity: 'Income',
            entityId: id,
            action: 'SOFT_DELETE',
            oldValue: row,
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
};
exports.IncomesService = IncomesService;
exports.IncomesService = IncomesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], IncomesService);
//# sourceMappingURL=incomes.service.js.map