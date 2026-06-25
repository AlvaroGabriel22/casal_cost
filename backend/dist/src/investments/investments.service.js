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
exports.InvestmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const permission_service_1 = require("../permission/permission.service");
const api_response_1 = require("../common/api-response");
const audit_log_service_1 = require("../audit/audit-log.service");
let InvestmentsService = class InvestmentsService {
    constructor(prisma, permission, audit) {
        this.prisma = prisma;
        this.permission = permission;
        this.audit = audit;
    }
    refMonth(value) {
        return new Date(value.length === 7 ? `${value}-01` : value);
    }
    ym(d) {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    addMonths(ym, delta) {
        const [y, m] = ym.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1 + delta, 1));
        return this.ym(d);
    }
    currentYm() {
        const d = new Date();
        return this.ym(d);
    }
    scopeFilter(userId, scope, coupleId) {
        if (scope === client_1.InvestmentScope.INDIVIDUAL) {
            return {
                deletedAt: null,
                scope: client_1.InvestmentScope.INDIVIDUAL,
                userId,
            };
        }
        if (!coupleId) {
            return { deletedAt: null, id: '__none__' };
        }
        return {
            deletedAt: null,
            scope: client_1.InvestmentScope.COUPLE,
            coupleId,
        };
    }
    async summarizeScope(userId, scope, referenceMonth) {
        const reference = referenceMonth?.match(/^\d{4}-\d{2}$/)
            ? referenceMonth
            : this.currentYm();
        const couple = await this.permission.getActiveCoupleForUser(userId);
        const where = this.scopeFilter(userId, scope, couple?.coupleId ?? null);
        const rows = await this.prisma.investmentContribution.findMany({
            where,
            orderBy: [{ referenceMonth: 'asc' }, { createdAt: 'asc' }],
            include: {
                user: { select: { id: true, name: true } },
            },
        });
        const byMonth = new Map();
        const partnerAllTime = new Map();
        const partnerMonth = new Map();
        let allTimeTotal = 0;
        for (const row of rows) {
            const amount = Number(row.amount);
            const month = this.ym(row.referenceMonth);
            byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
            allTimeTotal += amount;
            if (scope === client_1.InvestmentScope.COUPLE && row.user) {
                const all = partnerAllTime.get(row.userId) ?? {
                    name: row.user.name,
                    total: 0,
                };
                all.total += amount;
                partnerAllTime.set(row.userId, all);
                if (month === reference) {
                    const pm = partnerMonth.get(row.userId) ?? {
                        name: row.user.name,
                        total: 0,
                    };
                    pm.total += amount;
                    partnerMonth.set(row.userId, pm);
                }
            }
        }
        const monthTotal = byMonth.get(reference) ?? 0;
        const previousMonthTotal = byMonth.get(this.addMonths(reference, -1)) ?? 0;
        const monthlyHistory = [...byMonth.entries()]
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month));
        const monthsWithData = monthlyHistory.filter((h) => h.amount > 0);
        const averageMonthly = monthsWithData.length > 0
            ? monthsWithData.reduce((sum, h) => sum + h.amount, 0) /
                monthsWithData.length
            : 0;
        let consecutiveMonths = 0;
        let cursor = reference;
        for (let i = 0; i < 24; i++) {
            if ((byMonth.get(cursor) ?? 0) > 0) {
                consecutiveMonths += 1;
                cursor = this.addMonths(cursor, -1);
            }
            else {
                break;
            }
        }
        const contributionsInMonth = rows.filter((row) => this.ym(row.referenceMonth) === reference).length;
        const byPartner = scope === client_1.InvestmentScope.COUPLE
            ? [...partnerAllTime.entries()].map(([uid, data]) => ({
                userId: uid,
                name: data.name,
                monthAmount: partnerMonth.get(uid)?.total ?? 0,
                allTimeAmount: data.total,
            }))
            : undefined;
        return {
            scope,
            referenceMonth: reference,
            monthTotal,
            previousMonthTotal,
            allTimeTotal,
            averageMonthly,
            consecutiveMonths,
            contributionsInMonth,
            contributionsAllTime: rows.length,
            byPartner,
            monthlyHistory,
        };
    }
    async summarizeOverview(userId, referenceMonth) {
        const reference = referenceMonth?.match(/^\d{4}-\d{2}$/)
            ? referenceMonth
            : this.currentYm();
        const couple = await this.permission.getActiveCoupleForUser(userId);
        const individual = await this.summarizeScope(userId, client_1.InvestmentScope.INDIVIDUAL, reference);
        const coupleSummary = couple
            ? await this.summarizeScope(userId, client_1.InvestmentScope.COUPLE, reference)
            : null;
        return {
            referenceMonth: reference,
            targetPercent: 20,
            individual,
            couple: coupleSummary,
        };
    }
    async create(userId, dto) {
        let coupleId = null;
        if (dto.scope === client_1.InvestmentScope.COUPLE) {
            const couple = await this.permission.getActiveCoupleForUser(userId);
            if (!couple) {
                throw new common_1.BadRequestException('Você precisa ter um casal ativo para registrar investimento conjunto.');
            }
            coupleId = couple.coupleId;
        }
        const row = await this.prisma.investmentContribution.create({
            data: {
                userId,
                coupleId,
                scope: dto.scope,
                amount: new client_1.Prisma.Decimal(dto.amount),
                referenceMonth: this.refMonth(dto.referenceMonth),
                contributedAt: dto.contributedAt ? new Date(dto.contributedAt) : null,
                description: dto.description?.trim() || null,
            },
            include: {
                user: { select: { id: true, name: true, username: true } },
            },
        });
        await this.audit.log({
            userId,
            entity: 'InvestmentContribution',
            entityId: row.id,
            action: 'CREATE',
            newValue: row,
        });
        return (0, api_response_1.ok)(row, 'Aporte registrado com sucesso.');
    }
    async list(userId, scope, month) {
        const couple = await this.permission.getActiveCoupleForUser(userId);
        if (scope === client_1.InvestmentScope.COUPLE && !couple) {
            return (0, api_response_1.ok)({
                items: [],
                contributionsInMonth: 0,
                monthTotal: '0.00',
                allTimeTotal: '0.00',
                history: [],
            }, 'Operation completed successfully');
        }
        const resolvedScope = scope ?? client_1.InvestmentScope.INDIVIDUAL;
        const summary = await this.summarizeScope(userId, resolvedScope, month && /^\d{4}-\d{2}$/.test(month) ? month : undefined);
        const where = this.scopeFilter(userId, resolvedScope, couple?.coupleId ?? null);
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            where.referenceMonth = this.refMonth(month);
        }
        const items = await this.prisma.investmentContribution.findMany({
            where,
            orderBy: [{ referenceMonth: 'desc' }, { createdAt: 'desc' }],
            include: {
                user: { select: { id: true, name: true, username: true } },
            },
        });
        return (0, api_response_1.ok)({
            items,
            contributionsInMonth: summary.contributionsInMonth,
            monthTotal: summary.monthTotal.toFixed(2),
            allTimeTotal: summary.allTimeTotal.toFixed(2),
            history: summary.monthlyHistory.map((row) => ({
                month: row.month,
                amount: row.amount.toFixed(2),
            })),
            summary,
        }, 'Operation completed successfully');
    }
    async update(userId, id, dto) {
        const row = await this.findOwnedOrCoupleRow(userId, id);
        const updated = await this.prisma.investmentContribution.update({
            where: { id },
            data: {
                amount: dto.amount !== undefined ? new client_1.Prisma.Decimal(dto.amount) : undefined,
                referenceMonth: dto.referenceMonth
                    ? this.refMonth(dto.referenceMonth)
                    : undefined,
                contributedAt: dto.contributedAt ? new Date(dto.contributedAt) : undefined,
                description: dto.description !== undefined
                    ? dto.description.trim() || null
                    : undefined,
            },
            include: {
                user: { select: { id: true, name: true, username: true } },
            },
        });
        await this.audit.log({
            userId,
            entity: 'InvestmentContribution',
            entityId: id,
            action: 'UPDATE',
            newValue: dto,
        });
        return (0, api_response_1.ok)(updated, 'Aporte atualizado com sucesso.');
    }
    async remove(userId, id) {
        const row = await this.findOwnedOrCoupleRow(userId, id);
        const updated = await this.prisma.investmentContribution.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.audit.log({
            userId,
            entity: 'InvestmentContribution',
            entityId: id,
            action: 'SOFT_DELETE',
            oldValue: row,
        });
        return (0, api_response_1.ok)(updated, 'Aporte excluído com sucesso.');
    }
    async findOwnedOrCoupleRow(userId, id) {
        const row = await this.prisma.investmentContribution.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw new common_1.NotFoundException('Aporte não encontrado.');
        if (row.scope === client_1.InvestmentScope.INDIVIDUAL) {
            if (row.userId !== userId) {
                throw new common_1.NotFoundException('Aporte não encontrado.');
            }
            return row;
        }
        if (row.coupleId) {
            await this.permission.assertCoupleMembership(userId, row.coupleId);
            return row;
        }
        throw new common_1.NotFoundException('Aporte não encontrado.');
    }
};
exports.InvestmentsService = InvestmentsService;
exports.InvestmentsService = InvestmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_service_1.PermissionService,
        audit_log_service_1.AuditLogService])
], InvestmentsService);
//# sourceMappingURL=investments.service.js.map