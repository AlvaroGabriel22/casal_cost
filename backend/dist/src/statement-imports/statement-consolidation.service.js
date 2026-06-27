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
exports.StatementConsolidationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const bank_movement_classifier_1 = require("../insights/bank-movement.classifier");
const billing_cycle_1 = require("./billing-cycle");
const category_guess_1 = require("./parsers/category-guess");
const SPENDING_TYPES = [
    'EXPENSE',
    'TRANSFER_OUT',
    'CARD_BILL',
    'OTHER',
];
let StatementConsolidationService = class StatementConsolidationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    monthStart(ym) {
        const [y, m] = ym.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, 1));
    }
    async resolveDueDay(userId) {
        const card = await this.prisma.userCard.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
        return card?.dueDay ?? 1;
    }
    async monthsWithCardData(userId, monthYms) {
        const where = {
            userId,
            deletedAt: null,
            sourceType: client_1.StatementSourceType.CREDIT_CARD,
        };
        if (monthYms?.length) {
            where.referenceMonth = {
                in: monthYms.map((ym) => this.monthStart(ym)),
            };
        }
        const rows = await this.prisma.bankStatementEntry.findMany({
            where,
            select: { referenceMonth: true },
            distinct: ['referenceMonth'],
        });
        return new Set(rows.map((r) => `${r.referenceMonth.getUTCFullYear()}-${String(r.referenceMonth.getUTCMonth() + 1).padStart(2, '0')}`));
    }
    isConsumptionEntry(entry, monthsWithCard, monthYm, dueDay) {
        if (entry.direction !== 'DEBIT')
            return false;
        const movementType = (0, bank_movement_classifier_1.classifyBankMovement)(entry.description, entry.direction);
        if (movementType === 'INVESTMENT_APPLY')
            return false;
        if ((0, category_guess_1.isInvestmentMovement)(entry.description))
            return false;
        if ((0, category_guess_1.inferSpendingCategory)(entry.description) === 'Investimentos')
            return false;
        if (entry.sourceType === client_1.StatementSourceType.BANK_ACCOUNT &&
            movementType === 'CARD_BILL' &&
            monthsWithCard.has(monthYm)) {
            return false;
        }
        if (entry.sourceType === client_1.StatementSourceType.CREDIT_CARD) {
            if (entry.bank === client_1.DetectedBank.NUBANK) {
                if (!(0, billing_cycle_1.isWithinNubankBillingPeriod)(entry.transactionDate, monthYm, dueDay)) {
                    return false;
                }
            }
            return SPENDING_TYPES.includes(movementType) || movementType === 'EXPENSE';
        }
        if (entry.sourceType === client_1.StatementSourceType.BANK_ACCOUNT) {
            return SPENDING_TYPES.includes(movementType);
        }
        return false;
    }
    async getConfirmedConsumption(userId, monthYm) {
        const month = this.monthStart(monthYm);
        const [entries, monthsWithCard, dueDay] = await Promise.all([
            this.prisma.bankStatementEntry.findMany({
                where: { userId, deletedAt: null, referenceMonth: month },
            }),
            this.monthsWithCardData(userId, [monthYm]),
            this.resolveDueDay(userId),
        ]);
        let accountDebits = 0;
        let cardDebits = 0;
        let excludedCardBillTotal = 0;
        const byCategory = new Map();
        for (const entry of entries) {
            const amount = Number(entry.amount);
            const movementType = (0, bank_movement_classifier_1.classifyBankMovement)(entry.description, entry.direction);
            if (entry.sourceType === client_1.StatementSourceType.BANK_ACCOUNT &&
                movementType === 'CARD_BILL' &&
                monthsWithCard.has(monthYm)) {
                excludedCardBillTotal += amount;
                continue;
            }
            if (!this.isConsumptionEntry(entry, monthsWithCard, monthYm, dueDay))
                continue;
            if (entry.sourceType === client_1.StatementSourceType.CREDIT_CARD) {
                cardDebits += amount;
            }
            else {
                accountDebits += amount;
            }
            const category = entry.category ?? (0, category_guess_1.inferSpendingCategory)(entry.description);
            byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
        }
        const total = accountDebits + cardDebits;
        return {
            month: monthYm,
            total,
            accountDebits,
            cardDebits,
            excludedCardBillTotal,
            byCategory: [...byCategory.entries()]
                .map(([category, amount]) => ({ category, amount: this.round(amount) }))
                .sort((a, b) => b.amount - a.amount),
            entryCount: entries.filter((e) => this.isConsumptionEntry(e, monthsWithCard, monthYm, dueDay)).length,
        };
    }
    async getCardStatementOutflows(userId, monthYm) {
        const month = this.monthStart(monthYm);
        const entries = await this.prisma.bankStatementEntry.findMany({
            where: {
                userId,
                deletedAt: null,
                sourceType: client_1.StatementSourceType.CREDIT_CARD,
                referenceMonth: month,
                direction: 'DEBIT',
            },
        });
        const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
        return { total: this.round(total), entryCount: entries.length };
    }
    round(n) {
        return Math.round(n * 100) / 100;
    }
};
exports.StatementConsolidationService = StatementConsolidationService;
exports.StatementConsolidationService = StatementConsolidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatementConsolidationService);
//# sourceMappingURL=statement-consolidation.service.js.map