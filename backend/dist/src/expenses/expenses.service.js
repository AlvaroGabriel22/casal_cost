"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const permission_service_1 = require("../permission/permission.service");
const occurrence_generation_service_1 = require("../financial/occurrence-generation.service");
const audit_log_service_1 = require("../audit/audit-log.service");
let ExpensesService = class ExpensesService {
    constructor(prisma, permission, occurrences, audit) {
        this.prisma = prisma;
        this.permission = permission;
        this.occurrences = occurrences;
        this.audit = audit;
    }
    monthStartFromYm(ym) {
        const [y, m] = ym.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, 1));
    }
    defaultYm() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`;
    }
    dueDateFromMonth(referenceMonth, dueDay) {
        const y = referenceMonth.getUTCFullYear();
        const m = referenceMonth.getUTCMonth();
        const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const day = Math.min(dueDay, lastDay);
        return new Date(Date.UTC(y, m, day));
    }
    async resolveCardDueDay(userId, paymentMethod, cardName) {
        if (!cardName ||
            (paymentMethod !== client_1.PaymentMethod.CREDIT_CARD &&
                paymentMethod !== client_1.PaymentMethod.DEBIT_CARD)) {
            return undefined;
        }
        const card = await this.prisma.userCard.findUnique({
            where: { userId_name: { userId, name: cardName } },
        });
        return card?.dueDay;
    }
    async resolveCardDueDate(userId, paymentMethod, cardName, referenceMonth, fallback) {
        const dueDay = await this.resolveCardDueDay(userId, paymentMethod, cardName);
        if (dueDay === undefined)
            return fallback;
        return this.dueDateFromMonth(referenceMonth, dueDay);
    }
    assertCoupleMember(couple, currentUserId, userId) {
        if (!userId)
            return;
        if (userId !== currentUserId && userId !== couple.partnerId) {
            throw new common_1.BadRequestException('Selecione um membro do casal ativo para registrar quem realizou o pagamento.');
        }
    }
    async createIndividual(userId, dto) {
        const amount = new client_1.Prisma.Decimal(dto.totalAmount);
        const couple = await this.permission.getActiveCoupleForUser(userId);
        if (dto.expenseType === client_1.ExpenseType.ONE_TIME) {
            const ym = dto.referenceMonth ?? this.defaultYm();
            const ref = this.monthStartFromYm(ym);
            const due = await this.resolveCardDueDate(userId, dto.paymentMethod, dto.cardName, ref, dto.dueDate ? new Date(dto.dueDate) : ref);
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    scope: client_1.ExpenseScope.INDIVIDUAL,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: dto.expenseType,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                },
            });
            await this.occurrences.createOneTimeOccurrence({
                expenseId: exp.id,
                userId,
                coupleId: null,
                referenceMonth: ref,
                amount,
                dueDate: due,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'INDIVIDUAL', type: dto.expenseType },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        if (dto.expenseType === client_1.ExpenseType.FIXED ||
            dto.expenseType === client_1.ExpenseType.RECURRING) {
            if (!dto.recurrence) {
                throw new common_1.BadRequestException('Informe os dados de recorrência para esta despesa.');
            }
            if (dto.recurrence.frequency !== client_1.RecurrenceFrequency.MONTHLY) {
                throw new common_1.BadRequestException('No momento, apenas recorrência mensal é suportada.');
            }
            const start = new Date(dto.recurrence.startDate);
            const ym = dto.referenceMonth ?? this.defaultYm();
            const ref = this.monthStartFromYm(ym);
            const cardDueDay = await this.resolveCardDueDay(userId, dto.paymentMethod, dto.cardName);
            const dayOfMonth = cardDueDay ?? dto.recurrence.dayOfMonth ?? start.getUTCDate();
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    scope: client_1.ExpenseScope.INDIVIDUAL,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: dto.expenseType,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                    recurrenceRule: {
                        create: {
                            frequency: dto.recurrence.frequency,
                            startDate: start,
                            endDate: dto.recurrence.endDate
                                ? new Date(dto.recurrence.endDate)
                                : null,
                            dayOfMonth,
                        },
                    },
                },
            });
            await this.occurrences.ensureMonthlyOccurrence({
                expenseId: exp.id,
                userId,
                coupleId: null,
                referenceMonth: ref,
                amount,
                dueDay: dayOfMonth,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'INDIVIDUAL', type: dto.expenseType },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        if (dto.expenseType === client_1.ExpenseType.INSTALLMENT) {
            if (!dto.installment) {
                throw new common_1.BadRequestException('Informe o número de parcelas e o mês inicial.');
            }
            const n = dto.installment.totalInstallments;
            const first = this.monthStartFromYm(dto.installment.firstReferenceMonth);
            const per = amount.div(n);
            const ig = await this.prisma.installmentGroup.create({
                data: {
                    userId,
                    title: dto.title,
                    totalAmount: amount,
                    totalInstallments: n,
                    firstReferenceMonth: first,
                },
            });
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    scope: client_1.ExpenseScope.INDIVIDUAL,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: client_1.ExpenseType.INSTALLMENT,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                    installmentGroupId: ig.id,
                },
            });
            const cardDueDay = await this.resolveCardDueDay(userId, dto.paymentMethod, dto.cardName);
            await this.occurrences.generateInstallmentOccurrences({
                expenseId: exp.id,
                userId,
                coupleId: null,
                installmentAmount: per,
                totalInstallments: n,
                firstReferenceMonth: first,
                dueDay: dto.installment.dueDay ?? cardDueDay,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'INDIVIDUAL', type: 'INSTALLMENT' },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        if (dto.expenseType === client_1.ExpenseType.FUTURE_CREDIT_CARD) {
            const ym = dto.referenceMonth ?? this.defaultYm();
            const ref = this.monthStartFromYm(ym);
            const due = await this.resolveCardDueDate(userId, dto.paymentMethod, dto.cardName, ref, dto.dueDate ? new Date(dto.dueDate) : ref);
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    scope: client_1.ExpenseScope.INDIVIDUAL,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: client_1.ExpenseType.FUTURE_CREDIT_CARD,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                },
            });
            await this.occurrences.createOneTimeOccurrence({
                expenseId: exp.id,
                userId,
                coupleId: null,
                referenceMonth: ref,
                amount,
                dueDate: due,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'INDIVIDUAL', type: 'FUTURE_CREDIT_CARD' },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        throw new common_1.BadRequestException('Tipo de despesa não suportado.');
    }
    async createShared(userId, dto) {
        const couple = await this.permission.getActiveCoupleForUser(userId);
        if (!couple) {
            throw new common_1.BadRequestException('Ative um casal antes de criar despesas compartilhadas.');
        }
        const amount = new client_1.Prisma.Decimal(dto.totalAmount);
        this.assertCoupleMember(couple, userId, dto.paidByUserId);
        if (dto.expenseType === client_1.ExpenseType.ONE_TIME) {
            const ym = dto.referenceMonth ?? this.defaultYm();
            const ref = this.monthStartFromYm(ym);
            const due = await this.resolveCardDueDate(userId, dto.paymentMethod, dto.cardName, ref, dto.dueDate ? new Date(dto.dueDate) : ref);
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    coupleId: couple.coupleId,
                    scope: client_1.ExpenseScope.SHARED,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: dto.expenseType,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                },
            });
            await this.occurrences.createOneTimeOccurrence({
                expenseId: exp.id,
                userId,
                coupleId: couple.coupleId,
                referenceMonth: ref,
                amount,
                dueDate: due,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'SHARED', type: dto.expenseType },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        if (dto.expenseType === client_1.ExpenseType.FIXED ||
            dto.expenseType === client_1.ExpenseType.RECURRING) {
            if (!dto.recurrence) {
                throw new common_1.BadRequestException('Informe os dados de recorrência para esta despesa.');
            }
            const start = new Date(dto.recurrence.startDate);
            const ym = dto.referenceMonth ?? this.defaultYm();
            const ref = this.monthStartFromYm(ym);
            const cardDueDay = await this.resolveCardDueDay(userId, dto.paymentMethod, dto.cardName);
            const dayOfMonth = cardDueDay ?? dto.recurrence.dayOfMonth ?? start.getUTCDate();
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    coupleId: couple.coupleId,
                    scope: client_1.ExpenseScope.SHARED,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: dto.expenseType,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                    recurrenceRule: {
                        create: {
                            frequency: dto.recurrence.frequency,
                            startDate: start,
                            endDate: dto.recurrence.endDate
                                ? new Date(dto.recurrence.endDate)
                                : null,
                            dayOfMonth,
                        },
                    },
                },
            });
            await this.occurrences.ensureMonthlyOccurrence({
                expenseId: exp.id,
                userId,
                coupleId: couple.coupleId,
                referenceMonth: ref,
                amount,
                dueDay: dayOfMonth,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'SHARED', type: dto.expenseType },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        if (dto.expenseType === client_1.ExpenseType.INSTALLMENT) {
            if (!dto.installment) {
                throw new common_1.BadRequestException('Informe o número de parcelas e o mês inicial.');
            }
            const n = dto.installment.totalInstallments;
            const first = this.monthStartFromYm(dto.installment.firstReferenceMonth);
            const per = amount.div(n);
            const ig = await this.prisma.installmentGroup.create({
                data: {
                    coupleId: couple.coupleId,
                    title: dto.title,
                    totalAmount: amount,
                    totalInstallments: n,
                    firstReferenceMonth: first,
                },
            });
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    coupleId: couple.coupleId,
                    scope: client_1.ExpenseScope.SHARED,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: client_1.ExpenseType.INSTALLMENT,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                    installmentGroupId: ig.id,
                },
            });
            const cardDueDay = await this.resolveCardDueDay(userId, dto.paymentMethod, dto.cardName);
            await this.occurrences.generateInstallmentOccurrences({
                expenseId: exp.id,
                userId,
                coupleId: couple.coupleId,
                installmentAmount: per,
                totalInstallments: n,
                firstReferenceMonth: first,
                dueDay: dto.installment.dueDay ?? cardDueDay,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'SHARED', type: 'INSTALLMENT' },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        if (dto.expenseType === client_1.ExpenseType.FUTURE_CREDIT_CARD) {
            const ym = dto.referenceMonth ?? this.defaultYm();
            const ref = this.monthStartFromYm(ym);
            const due = await this.resolveCardDueDate(userId, dto.paymentMethod, dto.cardName, ref, dto.dueDate ? new Date(dto.dueDate) : ref);
            const exp = await this.prisma.expense.create({
                data: {
                    ownerUserId: userId,
                    coupleId: couple.coupleId,
                    scope: client_1.ExpenseScope.SHARED,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    totalAmount: amount,
                    expenseType: client_1.ExpenseType.FUTURE_CREDIT_CARD,
                    paymentMethod: dto.paymentMethod,
                    cardName: dto.cardName,
                    paidByUserId: dto.paidByUserId,
                    status: client_1.ExpenseStatus.PENDING,
                },
            });
            await this.occurrences.createOneTimeOccurrence({
                expenseId: exp.id,
                userId,
                coupleId: couple.coupleId,
                referenceMonth: ref,
                amount,
                dueDate: due,
            });
            await this.audit.log({
                userId,
                entity: 'Expense',
                entityId: exp.id,
                action: 'CREATE',
                newValue: { scope: 'SHARED', type: 'FUTURE_CREDIT_CARD' },
            });
            return (0, api_response_1.ok)(exp, 'Operation completed successfully');
        }
        throw new common_1.BadRequestException('Tipo de despesa não suportado.');
    }
    async list(userId, query) {
        const { skip, take, page, limit } = (0, pagination_dto_1.paginate)(query.page, query.limit);
        const grants = await this.prisma.individualAccountAccess.findMany({
            where: { allowedUserId: userId, canView: true },
            select: { ownerUserId: true },
        });
        const owners = [userId, ...grants.map((g) => g.ownerUserId)];
        const where = {
            deletedAt: null,
            scope: client_1.ExpenseScope.INDIVIDUAL,
            ownerUserId: { in: owners },
        };
        if (query.category)
            where.category = query.category;
        if (query.expenseType)
            where.expenseType = query.expenseType;
        if (query.paymentMethod)
            where.paymentMethod = query.paymentMethod;
        if (query.status)
            where.status = query.status;
        if (query.month) {
            const m0 = this.monthStartFromYm(query.month);
            where.occurrences = { some: { referenceMonth: m0, deletedAt: null } };
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.expense.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    occurrences: { where: { deletedAt: null } },
                },
            }),
            this.prisma.expense.count({ where }),
        ]);
        return (0, api_response_1.ok)({
            items,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }, 'Operation completed successfully');
    }
    async listShared(userId, query) {
        const couple = await this.permission.getActiveCoupleForUser(userId);
        if (!couple) {
            return (0, api_response_1.ok)({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 }, 'Operation completed successfully');
        }
        const { skip, take, page, limit } = (0, pagination_dto_1.paginate)(query.page, query.limit);
        const where = {
            deletedAt: null,
            scope: client_1.ExpenseScope.SHARED,
            coupleId: couple.coupleId,
        };
        if (query.category)
            where.category = query.category;
        if (query.expenseType)
            where.expenseType = query.expenseType;
        if (query.paymentMethod)
            where.paymentMethod = query.paymentMethod;
        if (query.status)
            where.status = query.status;
        if (query.month) {
            const m0 = this.monthStartFromYm(query.month);
            where.occurrences = { some: { referenceMonth: m0, deletedAt: null } };
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.expense.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    occurrences: { where: { deletedAt: null } },
                    sharedSplits: true,
                    paidBy: {
                        select: { id: true, name: true, username: true },
                    },
                },
            }),
            this.prisma.expense.count({ where }),
        ]);
        return (0, api_response_1.ok)({
            items,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }, 'Operation completed successfully');
    }
    async getOne(userId, id) {
        const exp = await this.prisma.expense.findFirst({
            where: { id, deletedAt: null },
            include: {
                occurrences: true,
                recurrenceRule: true,
                sharedSplits: true,
                installmentGroup: true,
                paidBy: {
                    select: { id: true, name: true, username: true },
                },
            },
        });
        if (!exp)
            throw new common_1.NotFoundException('Despesa não encontrada.');
        await this.permission.assertExpenseReadable(userId, exp);
        return (0, api_response_1.ok)(exp, 'Operation completed successfully');
    }
    async updateOne(userId, id, dto) {
        const exp = await this.prisma.expense.findFirst({
            where: { id, deletedAt: null },
        });
        if (!exp)
            throw new common_1.NotFoundException();
        await this.permission.assertExpenseEditable(userId, exp);
        if (exp.status === client_1.ExpenseStatus.PAID) {
            throw new common_1.BadRequestException('Não é possível editar uma despesa já quitada.');
        }
        if (dto.paidByUserId && exp.scope === client_1.ExpenseScope.SHARED) {
            const couple = await this.permission.getActiveCoupleForUser(userId);
            if (!couple || couple.coupleId !== exp.coupleId) {
                throw new common_1.BadRequestException('Esta despesa não está vinculada a um casal ativo.');
            }
            this.assertCoupleMember(couple, userId, dto.paidByUserId);
        }
        const updated = await this.prisma.expense.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                category: dto.category,
                totalAmount: dto.totalAmount !== undefined
                    ? new client_1.Prisma.Decimal(dto.totalAmount)
                    : undefined,
                paymentMethod: dto.paymentMethod,
                cardName: dto.cardName,
                paidByUserId: dto.paidByUserId,
            },
        });
        await this.audit.log({
            userId,
            entity: 'Expense',
            entityId: id,
            action: 'UPDATE',
            newValue: dto,
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    async assertPassword(userId, password) {
        if (!password) {
            throw new common_1.UnauthorizedException('Confirme sua senha para concluir esta ação.');
        }
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: { passwordHash: true },
        });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Senha incorreta. Verifique e tente novamente.');
        }
    }
    async softDelete(userId, id, dto) {
        await this.assertPassword(userId, dto?.password);
        const exp = await this.prisma.expense.findFirst({
            where: { id, deletedAt: null },
        });
        if (!exp)
            throw new common_1.NotFoundException();
        await this.permission.assertExpenseEditable(userId, exp);
        const updated = await this.prisma.expense.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.prisma.expenseOccurrence.updateMany({
            where: { expenseId: id },
            data: { deletedAt: new Date() },
        });
        await this.audit.log({
            userId,
            entity: 'Expense',
            entityId: id,
            action: 'SOFT_DELETE',
            oldValue: exp,
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    monthStartFromMaybeDate(value) {
        return value.length === 7
            ? this.monthStartFromYm(value)
            : this.monthStartFromYm(value.slice(0, 7));
    }
    async syncExpenseStatus(id) {
        const occurrences = await this.prisma.expenseOccurrence.findMany({
            where: { expenseId: id, deletedAt: null },
            select: { status: true },
        });
        if (occurrences.length === 0)
            return;
        const nextStatus = occurrences.every((o) => o.status === client_1.ExpenseStatus.CANCELLED)
            ? client_1.ExpenseStatus.CANCELLED
            : occurrences.every((o) => o.status === client_1.ExpenseStatus.PAID)
                ? client_1.ExpenseStatus.PAID
                : client_1.ExpenseStatus.PENDING;
        await this.prisma.expense.update({
            where: { id },
            data: { status: nextStatus },
        });
    }
    async occurrenceWhereForAction(id, dto) {
        if (dto?.occurrenceId) {
            const occurrence = await this.prisma.expenseOccurrence.findFirst({
                where: { id: dto.occurrenceId, expenseId: id, deletedAt: null },
            });
            if (!occurrence)
                throw new common_1.NotFoundException('Lançamento mensal não encontrado.');
            return { id: occurrence.id };
        }
        if (dto?.referenceMonth) {
            const referenceMonth = this.monthStartFromMaybeDate(dto.referenceMonth);
            const occurrence = await this.prisma.expenseOccurrence.findFirst({
                where: { expenseId: id, referenceMonth, deletedAt: null },
            });
            if (!occurrence)
                throw new common_1.NotFoundException('Lançamento mensal não encontrado.');
            return { id: occurrence.id };
        }
        return {
            expenseId: id,
            deletedAt: null,
            status: { not: client_1.ExpenseStatus.CANCELLED },
        };
    }
    async pay(userId, id, dto) {
        const exp = await this.prisma.expense.findFirst({
            where: { id, deletedAt: null },
        });
        if (!exp)
            throw new common_1.NotFoundException();
        await this.permission.assertExpenseEditable(userId, exp);
        const now = new Date();
        const where = await this.occurrenceWhereForAction(id, dto);
        await this.prisma.$transaction([
            this.prisma.expenseOccurrence.updateMany({
                where,
                data: { status: client_1.ExpenseStatus.PAID, paymentDate: now },
            }),
        ]);
        await this.syncExpenseStatus(id);
        const updated = await this.prisma.expense.findUnique({
            where: { id },
            include: { occurrences: { where: { deletedAt: null } } },
        });
        await this.audit.log({
            userId,
            entity: 'Expense',
            entityId: id,
            action: 'PAYMENT',
            newValue: { paymentDate: now, occurrenceId: dto?.occurrenceId },
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    async payMyShare(userId, id, dto) {
        await this.assertPassword(userId, dto.password);
        const exp = await this.prisma.expense.findFirst({
            where: { id, deletedAt: null },
        });
        if (!exp)
            throw new common_1.NotFoundException();
        if (exp.scope !== client_1.ExpenseScope.SHARED) {
            throw new common_1.BadRequestException('Esta opção é válida apenas para despesas compartilhadas.');
        }
        await this.permission.assertExpenseReadable(userId, exp);
        const where = await this.occurrenceWhereForAction(id, dto);
        const occurrence = await this.prisma.expenseOccurrence.findFirst({
            where,
            include: { expense: true },
        });
        if (!occurrence)
            throw new common_1.NotFoundException('Lançamento mensal não encontrado.');
        if (occurrence.status === client_1.ExpenseStatus.CANCELLED) {
            throw new common_1.BadRequestException('Este lançamento foi cancelado e não pode ser quitado.');
        }
        const now = new Date();
        const payment = await this.prisma.expenseOccurrencePayment.upsert({
            where: {
                occurrenceId_userId: {
                    occurrenceId: occurrence.id,
                    userId,
                },
            },
            create: {
                occurrenceId: occurrence.id,
                userId,
                status: client_1.ExpenseStatus.PAID,
                paymentDate: now,
            },
            update: {
                status: client_1.ExpenseStatus.PAID,
                paymentDate: now,
            },
        });
        await this.audit.log({
            userId,
            entity: 'ExpenseOccurrencePayment',
            entityId: payment.id,
            action: 'PAY_MY_SHARE',
            newValue: { expenseId: id, occurrenceId: occurrence.id, paymentDate: now },
        });
        return (0, api_response_1.ok)(payment, 'Operation completed successfully');
    }
    async cancel(userId, id, dto) {
        const exp = await this.prisma.expense.findFirst({
            where: { id, deletedAt: null },
        });
        if (!exp)
            throw new common_1.NotFoundException();
        await this.permission.assertExpenseEditable(userId, exp);
        const where = await this.occurrenceWhereForAction(id, dto);
        await this.prisma.$transaction([
            this.prisma.expenseOccurrence.updateMany({
                where,
                data: { status: client_1.ExpenseStatus.CANCELLED },
            }),
        ]);
        await this.syncExpenseStatus(id);
        const updated = await this.prisma.expense.findUnique({
            where: { id },
            include: { occurrences: { where: { deletedAt: null } } },
        });
        await this.audit.log({
            userId,
            entity: 'Expense',
            entityId: id,
            action: 'CANCEL',
            newValue: { occurrenceId: dto?.occurrenceId },
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_service_1.PermissionService,
        occurrence_generation_service_1.OccurrenceGenerationService,
        audit_log_service_1.AuditLogService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map