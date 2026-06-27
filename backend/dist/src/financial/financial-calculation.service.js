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
exports.FinancialCalculationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const permission_service_1 = require("../permission/permission.service");
const occurrence_generation_service_1 = require("./occurrence-generation.service");
const statement_consolidation_service_1 = require("../statement-imports/statement-consolidation.service");
let FinancialCalculationService = class FinancialCalculationService {
    constructor(prisma, permission, occurrences, statementConsolidation) {
        this.prisma = prisma;
        this.permission = permission;
        this.occurrences = occurrences;
        this.statementConsolidation = statementConsolidation;
    }
    monthStart(ym) {
        const [y, m] = ym.split('-').map(Number);
        if (!y || !m || m < 1 || m > 12)
            throw new Error('Invalid month YYYY-MM');
        return new Date(Date.UTC(y, m - 1, 1));
    }
    atStartOfDay(d) {
        const x = new Date(d);
        x.setUTCHours(0, 0, 0, 0);
        return x;
    }
    atMonthStart(d) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
    effectiveOccurrenceStatus(status, dueDate, asOf = new Date()) {
        if (status !== client_1.ExpenseStatus.PENDING)
            return status;
        if (this.atStartOfDay(dueDate) < this.atStartOfDay(asOf))
            return client_1.ExpenseStatus.OVERDUE;
        return status;
    }
    async calculateSharedExpenseResponsibility(expenseId, fullAmount, userId) {
        const splits = await this.prisma.sharedExpenseSplit.findMany({
            where: { expenseId },
        });
        if (splits.length === 0) {
            return fullAmount.div(2);
        }
        const mine = splits.find((s) => s.userId === userId);
        if (!mine) {
            throw new Error('Split rows must include both partners');
        }
        if (mine.splitType === client_1.SplitType.FIXED_AMOUNT && mine.fixedAmount) {
            return mine.fixedAmount;
        }
        if (mine.splitType === client_1.SplitType.PERCENTAGE && mine.percentage) {
            return fullAmount.mul(mine.percentage).div(100);
        }
        if (mine.splitType === client_1.SplitType.EQUAL) {
            return fullAmount.div(splits.length);
        }
        return fullAmount.div(2);
    }
    incomeAppliesToMonth(row, month) {
        const m0 = this.atMonthStart(month);
        if (!row.isRecurring) {
            return (row.referenceMonth.getUTCFullYear() === m0.getUTCFullYear() &&
                row.referenceMonth.getUTCMonth() === m0.getUTCMonth());
        }
        const start = row.recurrenceStartDate
            ? this.atMonthStart(row.recurrenceStartDate)
            : this.atMonthStart(row.referenceMonth);
        const end = row.recurrenceEndDate
            ? this.atMonthStart(row.recurrenceEndDate)
            : null;
        if (m0 < start)
            return false;
        if (end && m0 > end)
            return false;
        return true;
    }
    async ensureRecurringOccurrencesForIndividualMonth(userId, coupleId, month) {
        const rules = await this.prisma.recurrenceRule.findMany({
            where: {
                frequency: client_1.RecurrenceFrequency.MONTHLY,
                expense: {
                    deletedAt: null,
                    OR: [
                        { scope: client_1.ExpenseScope.INDIVIDUAL, ownerUserId: userId },
                        ...(coupleId ? [{ scope: client_1.ExpenseScope.SHARED, coupleId }] : []),
                    ],
                },
            },
            select: { expenseId: true },
        });
        for (const rule of rules) {
            await this.occurrences.expandRecurringForMonth(rule.expenseId, month);
        }
    }
    async ensureRecurringOccurrencesForCoupleMonth(coupleId, month) {
        const rules = await this.prisma.recurrenceRule.findMany({
            where: {
                frequency: client_1.RecurrenceFrequency.MONTHLY,
                expense: {
                    deletedAt: null,
                    scope: client_1.ExpenseScope.SHARED,
                    coupleId,
                },
            },
            select: { expenseId: true },
        });
        for (const rule of rules) {
            await this.occurrences.expandRecurringForMonth(rule.expenseId, month);
        }
    }
    getFinancialStatus(totalIncome, totalExpenses) {
        const balance = totalIncome.sub(totalExpenses);
        if (balance.lt(0))
            return 'NEGATIVE';
        if (totalIncome.eq(0))
            return 'POSITIVE';
        const ratio = totalExpenses.div(totalIncome);
        if (ratio.greaterThanOrEqualTo(0.8))
            return 'ATTENTION';
        return 'POSITIVE';
    }
    async calculateIncome(userId, month, baseSalary) {
        const incomes = await this.prisma.income.findMany({
            where: { userId, deletedAt: null },
        });
        let extraMonth = new client_1.Prisma.Decimal(0);
        let salaryExtras = new client_1.Prisma.Decimal(0);
        for (const inc of incomes) {
            if (!this.incomeAppliesToMonth(inc, month))
                continue;
            if (inc.type === client_1.IncomeType.SALARY) {
                salaryExtras = salaryExtras.add(inc.amount);
            }
            else {
                extraMonth = extraMonth.add(inc.amount);
            }
        }
        const totalIncome = baseSalary.add(extraMonth).add(salaryExtras);
        return {
            baseSalaryMonth: baseSalary,
            extraIncomeMonth: extraMonth.add(salaryExtras),
            totalIncomeMonth: totalIncome,
        };
    }
    async calculateIndividualMonth(userId, monthYm) {
        const month = this.monthStart(monthYm);
        const settings = await this.prisma.financialSettings.findUnique({
            where: { userId },
        });
        const baseSalary = settings?.baseSalary ?? new client_1.Prisma.Decimal(0);
        const incomeBlock = await this.calculateIncome(userId, month, baseSalary);
        const couple = await this.permission.getActiveCoupleForUser(userId);
        await this.ensureRecurringOccurrencesForIndividualMonth(userId, couple?.coupleId ?? null, month);
        const occurrences = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: month,
            },
            include: {
                expense: {
                    include: { sharedSplits: true },
                },
            },
        });
        let totalIndividual = new client_1.Prisma.Decimal(0);
        let totalSharedResp = new client_1.Prisma.Decimal(0);
        let pendingIndividual = new client_1.Prisma.Decimal(0);
        let pendingSharedResp = new client_1.Prisma.Decimal(0);
        const byCat = new Map();
        for (const occ of occurrences) {
            const ex = occ.expense;
            if (ex.deletedAt)
                continue;
            if (ex.scope === client_1.ExpenseScope.INDIVIDUAL) {
                if (ex.ownerUserId !== userId)
                    continue;
                const st = this.effectiveOccurrenceStatus(occ.status, occ.dueDate);
                if (st === client_1.ExpenseStatus.CANCELLED)
                    continue;
                totalIndividual = totalIndividual.add(occ.amount);
                if (st === client_1.ExpenseStatus.PENDING || st === client_1.ExpenseStatus.OVERDUE) {
                    pendingIndividual = pendingIndividual.add(occ.amount);
                }
                byCat.set(ex.category, (byCat.get(ex.category) ?? new client_1.Prisma.Decimal(0)).add(occ.amount));
                continue;
            }
            if (ex.scope === client_1.ExpenseScope.SHARED) {
                if (!couple || ex.coupleId !== couple.coupleId)
                    continue;
                const st = this.effectiveOccurrenceStatus(occ.status, occ.dueDate);
                if (st === client_1.ExpenseStatus.CANCELLED)
                    continue;
                const share = await this.calculateSharedExpenseResponsibility(ex.id, occ.amount, userId);
                totalSharedResp = totalSharedResp.add(share);
                if (st === client_1.ExpenseStatus.PENDING || st === client_1.ExpenseStatus.OVERDUE) {
                    pendingSharedResp = pendingSharedResp.add(share);
                }
                byCat.set(ex.category, (byCat.get(ex.category) ?? new client_1.Prisma.Decimal(0)).add(share));
            }
        }
        const totalExpensesMonth = totalIndividual.add(totalSharedResp);
        const expensesPendingMonth = pendingIndividual.add(pendingSharedResp);
        const [confirmed, reconciledCount] = await Promise.all([
            this.statementConsolidation.getConfirmedConsumption(userId, monthYm),
            this.prisma.statementReconciliation.count({
                where: {
                    userId,
                    occurrence: { referenceMonth: month },
                },
            }),
        ]);
        const confirmedTotal = new client_1.Prisma.Decimal(confirmed.total);
        const hasStatementData = confirmed.entryCount > 0;
        const balanceMonth = incomeBlock.totalIncomeMonth.sub(totalExpensesMonth);
        const balanceConfirmedMonth = hasStatementData
            ? incomeBlock.totalIncomeMonth.sub(confirmedTotal)
            : balanceMonth;
        const status = this.getFinancialStatus(incomeBlock.totalIncomeMonth, totalExpensesMonth);
        const upcomingBills = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: month,
                status: { in: [client_1.ExpenseStatus.PENDING, client_1.ExpenseStatus.OVERDUE] },
                dueDate: { gte: new Date() },
                expense: {
                    deletedAt: null,
                    OR: [
                        { scope: client_1.ExpenseScope.INDIVIDUAL, ownerUserId: userId },
                        ...(couple
                            ? [{ scope: client_1.ExpenseScope.SHARED, coupleId: couple.coupleId }]
                            : []),
                    ],
                },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
            include: {
                expense: { include: { sharedSplits: true } },
                userPayments: { where: { userId } },
            },
        });
        const paidOccurrences = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: month,
                status: client_1.ExpenseStatus.PAID,
                expense: {
                    deletedAt: null,
                    OR: [
                        { scope: client_1.ExpenseScope.INDIVIDUAL, ownerUserId: userId },
                        ...(couple
                            ? [{ scope: client_1.ExpenseScope.SHARED, coupleId: couple.coupleId }]
                            : []),
                    ],
                },
            },
            orderBy: { paymentDate: 'desc' },
            take: 10,
            include: {
                expense: {
                    include: { sharedSplits: true },
                },
                userPayments: { where: { userId, status: client_1.ExpenseStatus.PAID } },
            },
        });
        const paidBills = await Promise.all(paidOccurrences.map(async (o) => {
            const amount = o.expense.scope === client_1.ExpenseScope.SHARED
                ? await this.calculateSharedExpenseResponsibility(o.expenseId, o.amount, userId)
                : o.amount;
            const paymentDate = o.expense.scope === client_1.ExpenseScope.SHARED
                ? (o.userPayments[0]?.paymentDate ?? o.paymentDate)
                : o.paymentDate;
            return {
                id: o.id,
                title: o.expense.title,
                dueDate: o.dueDate,
                paymentDate,
                amount: amount.toFixed(2),
                status: client_1.ExpenseStatus.PAID,
            };
        }));
        const expensesByCategory = [...byCat.entries()].map(([category, amount]) => ({
            category,
            amount: amount.toFixed(2),
        }));
        return {
            month: monthYm,
            totalIncomeMonth: incomeBlock.totalIncomeMonth.toFixed(2),
            baseSalaryMonth: incomeBlock.baseSalaryMonth.toFixed(2),
            extraIncomeMonth: incomeBlock.extraIncomeMonth.toFixed(2),
            totalIndividualExpensesMonth: totalIndividual.toFixed(2),
            totalSharedExpensesResponsibilityMonth: totalSharedResp.toFixed(2),
            totalExpensesMonth: totalExpensesMonth.toFixed(2),
            expensesPendingMonth: expensesPendingMonth.toFixed(2),
            expensesConfirmedMonth: confirmed.total.toFixed(2),
            balanceMonth: balanceMonth.toFixed(2),
            balanceConfirmedMonth: balanceConfirmedMonth.toFixed(2),
            hasStatementData,
            reconciledCount,
            statement: {
                confirmedAccountDebits: confirmed.accountDebits.toFixed(2),
                confirmedCardDebits: confirmed.cardDebits.toFixed(2),
                excludedCardBillTotal: confirmed.excludedCardBillTotal.toFixed(2),
                expensesByCategoryConfirmed: confirmed.byCategory.map((row) => ({
                    category: row.category,
                    amount: row.amount.toFixed(2),
                })),
            },
            status,
            upcomingBills: (await Promise.all(upcomingBills.map(async (o) => {
                if (o.expense.scope === client_1.ExpenseScope.SHARED &&
                    o.userPayments.some((p) => p.status === client_1.ExpenseStatus.PAID)) {
                    return null;
                }
                const amount = o.expense.scope === client_1.ExpenseScope.SHARED
                    ? await this.calculateSharedExpenseResponsibility(o.expenseId, o.amount, userId)
                    : o.amount;
                return {
                    id: o.id,
                    title: o.expense.title,
                    dueDate: o.dueDate,
                    amount: amount.toFixed(2),
                    status: this.effectiveOccurrenceStatus(o.status, o.dueDate),
                };
            }))).filter((bill) => bill !== null),
            paidBills,
            expensesByCategory,
            futureProjection: [],
        };
    }
    async getIndividualStatement(userId, params) {
        const month = this.monthStart(params.monthYm);
        const source = params.source ?? 'ALL';
        const search = params.name?.trim();
        const couple = await this.permission.getActiveCoupleForUser(userId);
        await this.ensureRecurringOccurrencesForIndividualMonth(userId, couple?.coupleId ?? null, month);
        const scopeFilters = [];
        if (source === 'ALL' || source === 'INDIVIDUAL') {
            scopeFilters.push({
                scope: client_1.ExpenseScope.INDIVIDUAL,
                ownerUserId: userId,
            });
        }
        if ((source === 'ALL' || source === 'SHARED') && couple) {
            scopeFilters.push({
                scope: client_1.ExpenseScope.SHARED,
                coupleId: couple.coupleId,
            });
        }
        if (scopeFilters.length === 0) {
            return {
                month: params.monthYm,
                source,
                totalAmount: '0.00',
                individualTotal: '0.00',
                sharedResponsibilityTotal: '0.00',
                paidTotal: '0.00',
                pendingTotal: '0.00',
                overdueTotal: '0.00',
                bankDebitTotal: '0.00',
                bankCreditTotal: '0.00',
                items: [],
                bankItems: [],
            };
        }
        const occurrences = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: month,
                expense: {
                    deletedAt: null,
                    AND: [
                        { OR: scopeFilters },
                        ...(search
                            ? [
                                {
                                    OR: [
                                        { title: { contains: search, mode: 'insensitive' } },
                                        { category: { contains: search, mode: 'insensitive' } },
                                        { cardName: { contains: search, mode: 'insensitive' } },
                                    ],
                                },
                            ]
                            : []),
                    ],
                },
            },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
            include: {
                expense: {
                    include: {
                        owner: { select: { id: true, name: true, username: true } },
                        sharedSplits: true,
                    },
                },
                userPayments: { where: { userId } },
                reconciliation: true,
            },
        });
        let individualTotal = new client_1.Prisma.Decimal(0);
        let sharedResponsibilityTotal = new client_1.Prisma.Decimal(0);
        let paidTotal = new client_1.Prisma.Decimal(0);
        let pendingTotal = new client_1.Prisma.Decimal(0);
        let overdueTotal = new client_1.Prisma.Decimal(0);
        const items = [];
        for (const occurrence of occurrences) {
            const expense = occurrence.expense;
            const occurrenceStatus = this.effectiveOccurrenceStatus(occurrence.status, occurrence.dueDate);
            if (occurrenceStatus === client_1.ExpenseStatus.CANCELLED)
                continue;
            const isShared = expense.scope === client_1.ExpenseScope.SHARED;
            const personalPayment = isShared
                ? occurrence.userPayments.find((payment) => payment.userId === userId)
                : null;
            const status = personalPayment?.status === client_1.ExpenseStatus.PAID
                ? client_1.ExpenseStatus.PAID
                : occurrenceStatus;
            const amount = isShared
                ? await this.calculateSharedExpenseResponsibility(expense.id, occurrence.amount, userId)
                : occurrence.amount;
            if (isShared) {
                sharedResponsibilityTotal = sharedResponsibilityTotal.add(amount);
            }
            else {
                individualTotal = individualTotal.add(amount);
            }
            if (status === client_1.ExpenseStatus.PAID)
                paidTotal = paidTotal.add(amount);
            else if (status === client_1.ExpenseStatus.OVERDUE)
                overdueTotal = overdueTotal.add(amount);
            else
                pendingTotal = pendingTotal.add(amount);
            items.push({
                id: occurrence.id,
                occurrenceId: occurrence.id,
                expenseId: expense.id,
                title: expense.title,
                description: expense.description,
                category: expense.category,
                source: isShared ? 'SHARED' : 'INDIVIDUAL',
                sourceLabel: isShared ? 'Casal - minha parte' : 'Individual',
                amount: amount.toFixed(2),
                originalAmount: occurrence.amount.toFixed(2),
                dueDate: occurrence.dueDate,
                paymentDate: personalPayment?.paymentDate ?? occurrence.paymentDate,
                referenceMonth: occurrence.referenceMonth,
                status,
                expenseType: expense.expenseType,
                paymentMethod: expense.paymentMethod,
                cardName: expense.cardName,
                installmentNumber: occurrence.installmentNumber,
                totalInstallments: occurrence.totalInstallments,
                createdBy: expense.owner
                    ? {
                        id: expense.owner.id,
                        name: expense.owner.name,
                        username: expense.owner.username,
                    }
                    : null,
                confirmedByStatement: !!occurrence.reconciliation,
                reconciliationMatchType: occurrence.reconciliation?.matchType ?? null,
            });
        }
        const totalAmount = individualTotal.add(sharedResponsibilityTotal);
        let bankItems = [];
        let bankDebitTotal = new client_1.Prisma.Decimal(0);
        let bankCreditTotal = new client_1.Prisma.Decimal(0);
        if (source !== 'SHARED') {
            const bankEntries = await this.prisma.bankStatementEntry.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    referenceMonth: month,
                    ...(search
                        ? { description: { contains: search, mode: 'insensitive' } }
                        : {}),
                },
                orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
            });
            const bankLabels = {
                NUBANK: 'Nubank',
                INTER: 'Banco Inter',
                BRADESCO: 'Bradesco',
                PICPAY: 'PicPay',
                ITAU: 'Itaú',
                SANTANDER: 'Santander',
                CAIXA: 'Caixa',
                GENERIC: 'Banco',
            };
            const sourceTypeLabels = {
                BANK_ACCOUNT: 'Conta',
                CREDIT_CARD: 'Cartão',
            };
            for (const entry of bankEntries) {
                if (entry.direction === 'DEBIT') {
                    bankDebitTotal = bankDebitTotal.add(entry.amount);
                }
                else {
                    bankCreditTotal = bankCreditTotal.add(entry.amount);
                }
                const typeLabel = sourceTypeLabels[entry.sourceType] ?? 'Conta';
                bankItems.push({
                    id: entry.id,
                    title: entry.description,
                    description: entry.description,
                    category: entry.category ?? 'Outros',
                    source: 'BANK_IMPORT',
                    sourceLabel: `Extrato ${bankLabels[entry.bank] ?? entry.bank} (${typeLabel})`,
                    sourceType: entry.sourceType,
                    amount: entry.amount.toFixed(2),
                    transactionDate: entry.transactionDate,
                    referenceMonth: entry.referenceMonth,
                    direction: entry.direction,
                    bank: entry.bank,
                    bankLabel: bankLabels[entry.bank] ?? entry.bank,
                    paymentMethod: entry.paymentMethod,
                });
            }
        }
        const confirmed = await this.statementConsolidation.getConfirmedConsumption(userId, params.monthYm);
        return {
            month: params.monthYm,
            source,
            totalAmount: totalAmount.toFixed(2),
            individualTotal: individualTotal.toFixed(2),
            sharedResponsibilityTotal: sharedResponsibilityTotal.toFixed(2),
            paidTotal: paidTotal.toFixed(2),
            pendingTotal: pendingTotal.toFixed(2),
            overdueTotal: overdueTotal.toFixed(2),
            bankDebitTotal: bankDebitTotal.toFixed(2),
            bankCreditTotal: bankCreditTotal.toFixed(2),
            expensesConfirmedMonth: confirmed.total.toFixed(2),
            confirmedAccountDebits: confirmed.accountDebits.toFixed(2),
            confirmedCardDebits: confirmed.cardDebits.toFixed(2),
            items,
            bankItems,
        };
    }
    async calculateCoupleMonth(coupleId, monthYm) {
        const month = this.monthStart(monthYm);
        await this.ensureRecurringOccurrencesForCoupleMonth(coupleId, month);
        const occs = await this.prisma.expenseOccurrence.findMany({
            where: {
                coupleId,
                deletedAt: null,
                referenceMonth: month,
            },
            include: { expense: true },
        });
        let totalShared = new client_1.Prisma.Decimal(0);
        let paid = new client_1.Prisma.Decimal(0);
        let pending = new client_1.Prisma.Decimal(0);
        let overdue = new client_1.Prisma.Decimal(0);
        let cancelled = new client_1.Prisma.Decimal(0);
        const byCategory = new Map();
        for (const o of occs) {
            const ex = o.expense;
            if (ex.deletedAt || ex.scope !== client_1.ExpenseScope.SHARED)
                continue;
            const st = this.effectiveOccurrenceStatus(o.status, o.dueDate);
            if (st === client_1.ExpenseStatus.PAID)
                paid = paid.add(o.amount);
            else if (st === client_1.ExpenseStatus.PENDING)
                pending = pending.add(o.amount);
            else if (st === client_1.ExpenseStatus.OVERDUE)
                overdue = overdue.add(o.amount);
            else if (st === client_1.ExpenseStatus.CANCELLED) {
                cancelled = cancelled.add(o.amount);
                continue;
            }
            totalShared = totalShared.add(o.amount);
            byCategory.set(ex.category, (byCategory.get(ex.category) ?? new client_1.Prisma.Decimal(0)).add(o.amount));
        }
        const couple = await this.prisma.couple.findUnique({
            where: { id: coupleId },
            include: { userA: true, userB: true },
        });
        const responsibility = {};
        const partnerResponsibilities = [];
        if (couple) {
            for (const person of [couple.userA, couple.userB]) {
                let sum = new client_1.Prisma.Decimal(0);
                for (const o of occs) {
                    if (o.expense.deletedAt || o.expense.scope !== client_1.ExpenseScope.SHARED)
                        continue;
                    const st = this.effectiveOccurrenceStatus(o.status, o.dueDate);
                    if (st === client_1.ExpenseStatus.CANCELLED)
                        continue;
                    sum = sum.add(await this.calculateSharedExpenseResponsibility(o.expenseId, o.amount, person.id));
                }
                responsibility[person.id] = sum.toFixed(2);
                partnerResponsibilities.push({
                    id: person.id,
                    name: person.name,
                    username: person.username,
                    total: sum.toFixed(2),
                });
            }
        }
        return {
            month: monthYm,
            totalSharedExpenses: totalShared.toFixed(2),
            paidTotal: paid.toFixed(2),
            pendingTotal: pending.toFixed(2),
            overdueTotal: overdue.toFixed(2),
            cancelledTotal: cancelled.toFixed(2),
            categoryDistribution: [...byCategory.entries()].map(([c, a]) => ({
                category: c,
                amount: a.toFixed(2),
            })),
            partnerResponsibility: responsibility,
            partnerResponsibilities,
            monthlyEvolution: [],
        };
    }
    async calculateRecurringExpenses(expenseId, month) {
        const occ = await this.prisma.expenseOccurrence.findFirst({
            where: { expenseId, referenceMonth: month },
        });
        return occ?.amount ?? new client_1.Prisma.Decimal(0);
    }
    async calculateInstallments(userId, month) {
        const occs = await this.prisma.expenseOccurrence.findMany({
            where: {
                userId,
                referenceMonth: month,
                deletedAt: null,
                installmentNumber: { not: null },
            },
        });
        return occs.reduce((s, o) => s.add(o.amount), new client_1.Prisma.Decimal(0));
    }
};
exports.FinancialCalculationService = FinancialCalculationService;
exports.FinancialCalculationService = FinancialCalculationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_service_1.PermissionService,
        occurrence_generation_service_1.OccurrenceGenerationService,
        statement_consolidation_service_1.StatementConsolidationService])
], FinancialCalculationService);
//# sourceMappingURL=financial-calculation.service.js.map