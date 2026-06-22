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
exports.InstallmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
const permission_service_1 = require("../permission/permission.service");
const expenses_service_1 = require("../expenses/expenses.service");
let InstallmentsService = class InstallmentsService {
    constructor(prisma, permission, expenses) {
        this.prisma = prisma;
        this.permission = permission;
        this.expenses = expenses;
    }
    async create(userId, dto) {
        const body = {
            title: dto.title,
            description: dto.description,
            category: dto.category,
            totalAmount: dto.totalAmount,
            expenseType: client_1.ExpenseType.INSTALLMENT,
            paymentMethod: dto.paymentMethod,
            cardName: dto.cardName,
            paidByUserId: dto.paidByUserId,
            installment: {
                totalInstallments: dto.totalInstallments,
                firstReferenceMonth: dto.firstReferenceMonth,
            },
        };
        if (dto.scope === client_1.ExpenseScope.SHARED) {
            return this.expenses.createShared(userId, body);
        }
        return this.expenses.createIndividual(userId, body);
    }
    async list(userId) {
        const couple = await this.permission.getActiveCoupleForUser(userId);
        const groups = await this.prisma.installmentGroup.findMany({
            where: {
                OR: [
                    { userId },
                    ...(couple ? [{ coupleId: couple.coupleId }] : []),
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                expenses: {
                    include: {
                        occurrences: { where: { deletedAt: null } },
                        paidBy: { select: { id: true, name: true, username: true } },
                    },
                },
            },
        });
        return (0, api_response_1.ok)(groups, 'Operation completed successfully');
    }
    async one(userId, id) {
        const couple = await this.permission.getActiveCoupleForUser(userId);
        const g = await this.prisma.installmentGroup.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    ...(couple ? [{ coupleId: couple.coupleId }] : []),
                ],
            },
            include: {
                expenses: {
                    include: {
                        paidBy: { select: { id: true, name: true, username: true } },
                    },
                },
            },
        });
        if (!g)
            throw new common_1.NotFoundException();
        return (0, api_response_1.ok)(g, 'Operation completed successfully');
    }
    async findEditableGroup(userId, id) {
        const couple = await this.permission.getActiveCoupleForUser(userId);
        const group = await this.prisma.installmentGroup.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    ...(couple ? [{ coupleId: couple.coupleId }] : []),
                ],
            },
            include: {
                expenses: {
                    include: {
                        occurrences: { where: { deletedAt: null } },
                    },
                },
            },
        });
        if (!group)
            throw new common_1.NotFoundException();
        for (const expense of group.expenses) {
            await this.permission.assertExpenseEditable(userId, expense);
        }
        return group;
    }
    async update(userId, id, dto) {
        const group = await this.findEditableGroup(userId, id);
        const currentExpense = group.expenses[0];
        if (!currentExpense)
            throw new common_1.NotFoundException();
        const amount = dto.totalAmount !== undefined
            ? new client_1.Prisma.Decimal(dto.totalAmount)
            : group.totalAmount;
        const totalInstallments = dto.totalInstallments ?? group.totalInstallments;
        const installmentAmount = amount.div(totalInstallments);
        await this.prisma.installmentGroup.update({
            where: { id },
            data: {
                title: dto.title,
                totalAmount: amount,
                totalInstallments,
            },
            include: {
                expenses: {
                    include: {
                        occurrences: { where: { deletedAt: null } },
                        paidBy: { select: { id: true, name: true, username: true } },
                    },
                },
            },
        });
        await this.prisma.expense.updateMany({
            where: { installmentGroupId: group.id, deletedAt: null },
            data: {
                title: dto.title,
                description: dto.description,
                category: dto.category,
                totalAmount: amount,
                paymentMethod: dto.paymentMethod,
                cardName: dto.cardName,
                paidByUserId: dto.paidByUserId,
            },
        });
        await this.rebuildInstallmentOccurrences({
            expenseId: currentExpense.id,
            userId: currentExpense.ownerUserId,
            coupleId: currentExpense.coupleId,
            firstReferenceMonth: group.firstReferenceMonth,
            totalInstallments,
            installmentAmount,
        });
        const updated = await this.prisma.installmentGroup.findUnique({
            where: { id },
            include: {
                expenses: {
                    include: {
                        occurrences: { where: { deletedAt: null } },
                        paidBy: { select: { id: true, name: true, username: true } },
                    },
                },
            },
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    monthAt(y, monthIndex0) {
        return new Date(Date.UTC(y, monthIndex0, 1));
    }
    dueDateFor(ref, day = 10) {
        const y = ref.getUTCFullYear();
        const m = ref.getUTCMonth();
        const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        return new Date(Date.UTC(y, m, Math.min(day, lastDay)));
    }
    async rebuildInstallmentOccurrences(params) {
        const y0 = params.firstReferenceMonth.getUTCFullYear();
        const m0 = params.firstReferenceMonth.getUTCMonth();
        for (let i = 0; i < params.totalInstallments; i++) {
            const ref = this.monthAt(y0, m0 + i);
            const existing = await this.prisma.expenseOccurrence.findUnique({
                where: {
                    expenseId_referenceMonth: {
                        expenseId: params.expenseId,
                        referenceMonth: ref,
                    },
                },
            });
            const data = {
                installmentNumber: i + 1,
                totalInstallments: params.totalInstallments,
                amount: params.installmentAmount,
                dueDate: this.dueDateFor(ref),
                deletedAt: null,
            };
            if (existing) {
                await this.prisma.expenseOccurrence.update({
                    where: { id: existing.id },
                    data: existing.status === client_1.ExpenseStatus.PAID
                        ? {
                            installmentNumber: data.installmentNumber,
                            totalInstallments: data.totalInstallments,
                            deletedAt: null,
                        }
                        : data,
                });
            }
            else {
                await this.prisma.expenseOccurrence.create({
                    data: {
                        expenseId: params.expenseId,
                        userId: params.userId,
                        coupleId: params.coupleId,
                        referenceMonth: ref,
                        dueDate: data.dueDate,
                        amount: params.installmentAmount,
                        status: client_1.ExpenseStatus.PENDING,
                        installmentNumber: i + 1,
                        totalInstallments: params.totalInstallments,
                    },
                });
            }
        }
        const lastRef = this.monthAt(y0, m0 + params.totalInstallments - 1);
        await this.prisma.expenseOccurrence.updateMany({
            where: {
                expenseId: params.expenseId,
                referenceMonth: { gt: lastRef },
                deletedAt: null,
                status: { not: client_1.ExpenseStatus.PAID },
            },
            data: { deletedAt: new Date() },
        });
    }
    async pay(userId, id) {
        const group = await this.findEditableGroup(userId, id);
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.expenseOccurrence.updateMany({
                where: {
                    expense: { installmentGroupId: group.id },
                    deletedAt: null,
                    status: { not: client_1.ExpenseStatus.CANCELLED },
                },
                data: { status: client_1.ExpenseStatus.PAID, paymentDate: now },
            }),
            this.prisma.expense.updateMany({
                where: { installmentGroupId: group.id, deletedAt: null },
                data: { status: client_1.ExpenseStatus.PAID },
            }),
        ]);
        const updated = await this.prisma.installmentGroup.findUnique({
            where: { id },
            include: { expenses: true },
        });
        return (0, api_response_1.ok)(updated, 'Operation completed successfully');
    }
    async remove(userId, id, dto) {
        await this.expenses.assertPassword(userId, dto.password);
        const group = await this.findEditableGroup(userId, id);
        await this.prisma.$transaction([
            this.prisma.expenseOccurrence.updateMany({
                where: { expense: { installmentGroupId: group.id } },
                data: { deletedAt: new Date() },
            }),
            this.prisma.expense.updateMany({
                where: { installmentGroupId: group.id },
                data: { deletedAt: new Date() },
            }),
            this.prisma.installmentGroup.delete({ where: { id } }),
        ]);
        return (0, api_response_1.ok)({ id }, 'Operation completed successfully');
    }
};
exports.InstallmentsService = InstallmentsService;
exports.InstallmentsService = InstallmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_service_1.PermissionService,
        expenses_service_1.ExpensesService])
], InstallmentsService);
//# sourceMappingURL=installments.service.js.map