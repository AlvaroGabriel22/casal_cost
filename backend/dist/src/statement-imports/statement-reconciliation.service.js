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
var StatementReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const bank_movement_classifier_1 = require("../insights/bank-movement.classifier");
const RECONCILABLE_METHODS = [
    client_1.PaymentMethod.PIX,
    client_1.PaymentMethod.BOLETO,
    client_1.PaymentMethod.TRANSFER,
    client_1.PaymentMethod.DEBIT_CARD,
    client_1.PaymentMethod.CASH,
    client_1.PaymentMethod.OTHER,
];
const AMOUNT_TOLERANCE = 0.02;
const DATE_BEFORE_DAYS = 7;
const DATE_AFTER_DAYS = 21;
let StatementReconciliationService = StatementReconciliationService_1 = class StatementReconciliationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(StatementReconciliationService_1.name);
    }
    async reconcileAfterAccountImport(userId, monthsCovered) {
        let matched = 0;
        let skipped = 0;
        for (const monthYm of monthsCovered) {
            const result = await this.reconcileMonth(userId, monthYm);
            matched += result.matched;
            skipped += result.skipped;
        }
        return { matched, skipped };
    }
    async getOverview(userId, monthYm) {
        const [y, m] = monthYm.split('-').map(Number);
        const refMonth = new Date(Date.UTC(y, m - 1, 1));
        const [awaitingRows, entries, confirmedRows] = await Promise.all([
            this.prisma.expenseOccurrence.findMany({
                where: {
                    deletedAt: null,
                    referenceMonth: refMonth,
                    status: { in: [client_1.ExpenseStatus.PENDING, client_1.ExpenseStatus.OVERDUE] },
                    reconciliation: null,
                    expense: {
                        deletedAt: null,
                        paymentMethod: { in: RECONCILABLE_METHODS },
                        scope: client_1.ExpenseScope.INDIVIDUAL,
                        ownerUserId: userId,
                    },
                },
                include: { expense: true },
                orderBy: { dueDate: 'asc' },
            }),
            this.prisma.bankStatementEntry.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    sourceType: client_1.StatementSourceType.BANK_ACCOUNT,
                    referenceMonth: refMonth,
                    direction: 'DEBIT',
                },
                include: { reconciliation: true },
                orderBy: { transactionDate: 'desc' },
            }),
            this.prisma.statementReconciliation.findMany({
                where: {
                    userId,
                    occurrence: { referenceMonth: refMonth },
                },
                include: {
                    occurrence: { include: { expense: true } },
                    entry: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const unmatchedStatementDebits = entries
            .filter((e) => {
            if (e.reconciliation)
                return false;
            const type = (0, bank_movement_classifier_1.classifyBankMovement)(e.description, 'DEBIT');
            return type !== 'INVESTMENT_APPLY' && type !== 'CARD_BILL';
        })
            .map((e) => ({
            entryId: e.id,
            description: e.description,
            amount: Number(e.amount).toFixed(2),
            transactionDate: e.transactionDate.toISOString().slice(0, 10),
        }));
        const awaitingExtract = awaitingRows.map((occ) => ({
            occurrenceId: occ.id,
            title: occ.expense.title,
            amount: Number(occ.amount).toFixed(2),
            dueDate: occ.dueDate.toISOString().slice(0, 10),
            paymentMethod: occ.expense.paymentMethod,
            status: occ.status,
        }));
        const confirmedMatches = confirmedRows.map((row) => ({
            matchId: row.id,
            title: row.occurrence.expense.title,
            entryDescription: row.entry.description,
            amount: Number(row.occurrence.amount).toFixed(2),
            matchType: row.matchType,
            confidence: row.confidence,
            paidAt: (row.occurrence.paymentDate ?? row.entry.transactionDate)
                .toISOString()
                .slice(0, 10),
        }));
        const awaitingTotal = awaitingExtract.reduce((s, r) => s + Number(r.amount), 0);
        const unmatchedTotal = unmatchedStatementDebits.reduce((s, r) => s + Number(r.amount), 0);
        return {
            month: monthYm,
            summary: {
                awaitingCount: awaitingExtract.length,
                awaitingTotal: awaitingTotal.toFixed(2),
                unmatchedCount: unmatchedStatementDebits.length,
                unmatchedTotal: unmatchedTotal.toFixed(2),
                confirmedCount: confirmedMatches.length,
            },
            awaitingExtract,
            unmatchedStatementDebits,
            confirmedMatches,
        };
    }
    async reconcileMonth(userId, monthYm) {
        const [y, m] = monthYm.split('-').map(Number);
        const refMonth = new Date(Date.UTC(y, m - 1, 1));
        const [entries, occurrences] = await Promise.all([
            this.prisma.bankStatementEntry.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    sourceType: client_1.StatementSourceType.BANK_ACCOUNT,
                    referenceMonth: refMonth,
                    direction: 'DEBIT',
                },
                include: { reconciliation: true },
            }),
            this.prisma.expenseOccurrence.findMany({
                where: {
                    deletedAt: null,
                    referenceMonth: refMonth,
                    status: { in: [client_1.ExpenseStatus.PENDING, client_1.ExpenseStatus.OVERDUE] },
                    expense: {
                        deletedAt: null,
                        paymentMethod: { in: RECONCILABLE_METHODS },
                        OR: [{ scope: client_1.ExpenseScope.INDIVIDUAL, ownerUserId: userId }],
                    },
                    reconciliation: null,
                },
                include: { expense: true },
            }),
        ]);
        const eligibleEntries = entries.filter((e) => {
            if (e.reconciliation)
                return false;
            const type = (0, bank_movement_classifier_1.classifyBankMovement)(e.description, 'DEBIT');
            return type !== 'INVESTMENT_APPLY' && type !== 'CARD_BILL';
        });
        const usedOccurrenceIds = new Set();
        let matched = 0;
        let skipped = eligibleEntries.length;
        for (const entry of eligibleEntries) {
            const entryAmount = Number(entry.amount);
            const entryDate = entry.transactionDate;
            const candidates = occurrences
                .filter((occ) => !usedOccurrenceIds.has(occ.id))
                .map((occ) => {
                const occAmount = Number(occ.amount);
                const amountDiff = Math.abs(occAmount - entryAmount);
                if (amountDiff > AMOUNT_TOLERANCE)
                    return null;
                const due = occ.dueDate;
                const minDate = new Date(due);
                minDate.setUTCDate(minDate.getUTCDate() - DATE_BEFORE_DAYS);
                const maxDate = new Date(due);
                maxDate.setUTCDate(maxDate.getUTCDate() + DATE_AFTER_DAYS);
                if (entryDate < minDate || entryDate > maxDate)
                    return null;
                const titleScore = this.titleMatchScore(occ.expense.title, entry.description);
                const confidence = amountDiff < 0.001 ? 90 + titleScore : 70 + titleScore;
                return { occ, confidence, amountDiff };
            })
                .filter((c) => c !== null)
                .sort((a, b) => b.confidence - a.confidence || a.amountDiff - b.amountDiff);
            const best = candidates[0];
            if (!best || best.confidence < 65)
                continue;
            await this.prisma.$transaction([
                this.prisma.statementReconciliation.create({
                    data: {
                        userId,
                        bankStatementEntryId: entry.id,
                        expenseOccurrenceId: best.occ.id,
                        matchType: client_1.ReconciliationMatchType.AUTO,
                        confidence: Math.min(100, Math.round(best.confidence)),
                    },
                }),
                this.prisma.expenseOccurrence.update({
                    where: { id: best.occ.id },
                    data: {
                        status: client_1.ExpenseStatus.PAID,
                        paymentDate: entry.transactionDate,
                    },
                }),
            ]);
            usedOccurrenceIds.add(best.occ.id);
            matched += 1;
            skipped -= 1;
        }
        if (matched > 0) {
            this.logger.log(`Reconciliados ${matched} lançamento(s) em ${monthYm} para usuário ${userId}`);
        }
        return { matched, skipped };
    }
    async revertForImport(userId, importId) {
        const entryIds = (await this.prisma.bankStatementEntry.findMany({
            where: { importId, userId },
            select: { id: true },
        })).map((e) => e.id);
        if (entryIds.length === 0)
            return 0;
        const links = await this.prisma.statementReconciliation.findMany({
            where: {
                userId,
                bankStatementEntryId: { in: entryIds },
                matchType: client_1.ReconciliationMatchType.AUTO,
            },
        });
        if (links.length === 0)
            return 0;
        await this.prisma.$transaction([
            this.prisma.expenseOccurrence.updateMany({
                where: {
                    id: { in: links.map((l) => l.expenseOccurrenceId) },
                    status: client_1.ExpenseStatus.PAID,
                },
                data: {
                    status: client_1.ExpenseStatus.PENDING,
                    paymentDate: null,
                },
            }),
            this.prisma.statementReconciliation.deleteMany({
                where: { id: { in: links.map((l) => l.id) } },
            }),
        ]);
        return links.length;
    }
    titleMatchScore(title, description) {
        const normalize = (s) => s
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length >= 3);
        const titleWords = normalize(title);
        const descWords = new Set(normalize(description));
        if (titleWords.length === 0)
            return 0;
        const hits = titleWords.filter((w) => descWords.has(w)).length;
        return Math.min(10, hits * 5);
    }
};
exports.StatementReconciliationService = StatementReconciliationService;
exports.StatementReconciliationService = StatementReconciliationService = StatementReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatementReconciliationService);
//# sourceMappingURL=statement-reconciliation.service.js.map