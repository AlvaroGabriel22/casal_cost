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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const audit_log_service_1 = require("../audit/audit-log.service");
const financial_calculation_service_1 = require("../financial/financial-calculation.service");
let UsersService = class UsersService {
    constructor(prisma, audit, calc) {
        this.prisma = prisma;
        this.audit = audit;
        this.calc = calc;
    }
    async getMe(userId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            include: { financialSettings: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        return (0, api_response_1.ok)({
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            financialSettings: user.financialSettings,
        }, 'Operation completed successfully');
    }
    async updateMe(userId, body) {
        if (body.email) {
            const clash = await this.prisma.user.findFirst({
                where: { email: body.email, NOT: { id: userId }, deletedAt: null },
            });
            if (clash)
                throw new common_1.ConflictException('Este email já está em uso por outra conta.');
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: body.name,
                email: body.email,
            },
        });
        await this.audit.log({
            userId,
            entity: 'User',
            entityId: userId,
            action: 'UPDATE',
            newValue: body,
        });
        return (0, api_response_1.ok)({
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
        }, 'Operation completed successfully');
    }
    async updateSalary(userId, body) {
        let settings = await this.prisma.financialSettings.findUnique({
            where: { userId },
        });
        if (!settings) {
            settings = await this.prisma.financialSettings.create({
                data: {
                    userId,
                    baseSalary: String(body.baseSalary),
                    salaryPaymentDay: body.salaryPaymentDay ?? 1,
                },
            });
        }
        else {
            const old = { baseSalary: settings.baseSalary.toString() };
            settings = await this.prisma.financialSettings.update({
                where: { userId },
                data: {
                    baseSalary: String(body.baseSalary),
                    salaryPaymentDay: body.salaryPaymentDay ?? settings.salaryPaymentDay,
                },
            });
            await this.audit.log({
                userId,
                entity: 'FinancialSettings',
                entityId: settings.id,
                action: 'UPDATE',
                oldValue: old,
                newValue: { baseSalary: settings.baseSalary.toString() },
            });
        }
        return (0, api_response_1.ok)(settings, 'Operation completed successfully');
    }
    async listSalaryOverrides(userId, month) {
        if (month) {
            const referenceMonth = this.calc.monthStart(month);
            const row = await this.prisma.monthlySalaryOverride.findUnique({
                where: {
                    userId_referenceMonth: { userId, referenceMonth },
                },
            });
            return (0, api_response_1.ok)(row ? [this.mapSalaryOverride(row)] : [], 'Operation completed successfully');
        }
        const rows = await this.prisma.monthlySalaryOverride.findMany({
            where: { userId },
            orderBy: { referenceMonth: 'desc' },
            take: 24,
        });
        return (0, api_response_1.ok)(rows.map((row) => this.mapSalaryOverride(row)), 'Operation completed successfully');
    }
    async upsertSalaryOverride(userId, body) {
        const referenceMonth = this.calc.monthStart(body.month);
        const existing = await this.prisma.monthlySalaryOverride.findUnique({
            where: {
                userId_referenceMonth: { userId, referenceMonth },
            },
        });
        const row = await this.prisma.monthlySalaryOverride.upsert({
            where: {
                userId_referenceMonth: { userId, referenceMonth },
            },
            create: {
                userId,
                referenceMonth,
                amount: String(body.amount),
                note: body.note?.trim() || null,
            },
            update: {
                amount: String(body.amount),
                note: body.note?.trim() || null,
            },
        });
        await this.audit.log({
            userId,
            entity: 'MonthlySalaryOverride',
            entityId: row.id,
            action: existing ? 'UPDATE' : 'CREATE',
            oldValue: existing
                ? { amount: existing.amount.toString(), note: existing.note }
                : undefined,
            newValue: { amount: row.amount.toString(), note: row.note, month: body.month },
        });
        return (0, api_response_1.ok)(this.mapSalaryOverride(row), 'Operation completed successfully');
    }
    async deleteSalaryOverride(userId, month) {
        const referenceMonth = this.calc.monthStart(month);
        const existing = await this.prisma.monthlySalaryOverride.findUnique({
            where: {
                userId_referenceMonth: { userId, referenceMonth },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Ajuste de salário não encontrado para este mês.');
        }
        await this.prisma.monthlySalaryOverride.delete({
            where: { id: existing.id },
        });
        await this.audit.log({
            userId,
            entity: 'MonthlySalaryOverride',
            entityId: existing.id,
            action: 'DELETE',
            oldValue: {
                amount: existing.amount.toString(),
                note: existing.note,
                month,
            },
        });
        return (0, api_response_1.ok)({ month }, 'Operation completed successfully');
    }
    mapSalaryOverride(row) {
        const month = row.referenceMonth.toISOString().slice(0, 7);
        return {
            id: row.id,
            month,
            amount: row.amount.toString(),
            note: row.note,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        financial_calculation_service_1.FinancialCalculationService])
], UsersService);
//# sourceMappingURL=users.service.js.map