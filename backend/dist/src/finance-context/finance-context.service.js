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
exports.FinanceContextService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const category_guess_1 = require("../statement-imports/parsers/category-guess");
const finance_context_matcher_1 = require("./finance-context.matcher");
let FinanceContextService = class FinanceContextService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listRules(userId) {
        const rows = await this.prisma.financeContextRule.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => this.toRuleDto(r));
    }
    async getPayload(userId) {
        const [rules, questions] = await Promise.all([
            this.listRules(userId),
            this.listOpenQuestions(userId),
        ]);
        return { rules, questions };
    }
    async listOpenQuestions(userId) {
        const rows = await this.prisma.financeContextQuestion.findMany({
            where: { userId, status: 'OPEN' },
            orderBy: [{ occurrences: 'desc' }, { updatedAt: 'desc' }],
            take: 8,
        });
        return rows.map((q) => this.toQuestionDto(q));
    }
    async createRule(userId, dto) {
        const matchLabel = (0, finance_context_matcher_1.normalizeMatchLabel)(dto.displayLabel);
        const row = await this.prisma.financeContextRule.upsert({
            where: { userId_matchLabel: { userId, matchLabel } },
            create: {
                userId,
                matchLabel,
                displayLabel: dto.displayLabel.trim(),
                category: dto.category?.trim() || null,
                motive: dto.motive.trim(),
                isRecurring: dto.isRecurring ?? true,
            },
            update: {
                displayLabel: dto.displayLabel.trim(),
                category: dto.category?.trim() || null,
                motive: dto.motive.trim(),
                isRecurring: dto.isRecurring ?? true,
            },
        });
        await this.prisma.financeContextQuestion.updateMany({
            where: { userId, matchLabel, status: 'OPEN' },
            data: { status: 'ANSWERED' },
        });
        await this.touchRuleSideEffects(userId);
        return this.toRuleDto(row);
    }
    async updateRule(userId, ruleId, dto) {
        const existing = await this.prisma.financeContextRule.findFirst({
            where: { id: ruleId, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException('Regra não encontrada');
        const matchLabel = (0, finance_context_matcher_1.normalizeMatchLabel)(dto.displayLabel);
        const row = await this.prisma.financeContextRule.update({
            where: { id: ruleId },
            data: {
                matchLabel,
                displayLabel: dto.displayLabel.trim(),
                category: dto.category?.trim() || null,
                motive: dto.motive.trim(),
                isRecurring: dto.isRecurring ?? true,
            },
        });
        await this.touchRuleSideEffects(userId);
        return this.toRuleDto(row);
    }
    async deleteRule(userId, ruleId) {
        const existing = await this.prisma.financeContextRule.findFirst({
            where: { id: ruleId, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException('Regra não encontrada');
        await this.prisma.financeContextRule.delete({ where: { id: ruleId } });
        await this.touchRuleSideEffects(userId);
        return { deleted: true };
    }
    async answerQuestion(userId, questionId, dto) {
        const question = await this.prisma.financeContextQuestion.findFirst({
            where: { id: questionId, userId, status: 'OPEN' },
        });
        if (!question)
            throw new common_1.NotFoundException('Pergunta não encontrada');
        const rule = await this.createRule(userId, {
            displayLabel: dto.displayLabel || question.displayLabel,
            motive: dto.motive,
            category: dto.category,
            isRecurring: dto.isRecurring ?? true,
        });
        await this.prisma.financeContextQuestion.update({
            where: { id: questionId },
            data: { status: 'ANSWERED' },
        });
        return rule;
    }
    async dismissQuestion(userId, questionId) {
        const question = await this.prisma.financeContextQuestion.findFirst({
            where: { id: questionId, userId, status: 'OPEN' },
        });
        if (!question)
            throw new common_1.NotFoundException('Pergunta não encontrada');
        await this.prisma.financeContextQuestion.update({
            where: { id: questionId },
            data: { status: 'DISMISSED' },
        });
        return { dismissed: true };
    }
    async syncQuestionsFromSpending(userId, spending) {
        if (!spending)
            return;
        const rules = await this.prisma.financeContextRule.findMany({
            where: { userId },
            select: { matchLabel: true },
        });
        const known = new Set(rules.map((r) => r.matchLabel));
        const dismissed = await this.prisma.financeContextQuestion.findMany({
            where: { userId, status: 'DISMISSED' },
            select: { matchLabel: true },
        });
        const dismissedSet = new Set(dismissed.map((d) => d.matchLabel));
        const candidates = this.pickQuestionCandidates(spending.recurringExpenses, known, dismissedSet);
        for (const c of candidates) {
            const existing = await this.prisma.financeContextQuestion.findUnique({
                where: { userId_matchLabel: { userId, matchLabel: c.matchLabel } },
            });
            if (existing?.status === 'DISMISSED')
                continue;
            await this.prisma.financeContextQuestion.upsert({
                where: { userId_matchLabel: { userId, matchLabel: c.matchLabel } },
                create: {
                    userId,
                    matchLabel: c.matchLabel,
                    displayLabel: c.displayLabel,
                    sampleAmount: c.sampleAmount,
                    occurrences: c.occurrences,
                    status: 'OPEN',
                },
                update: {
                    displayLabel: c.displayLabel,
                    sampleAmount: c.sampleAmount,
                    occurrences: c.occurrences,
                    ...(existing?.status === 'ANSWERED' ? {} : { status: 'OPEN' }),
                },
            });
        }
    }
    formatRulesForRag(rules) {
        return rules.map((r) => `[Gasto explicado pelo usuário] "${r.displayLabel}": ${r.motive}${r.category ? ` | categoria: ${r.category}` : ''}${r.isRecurring ? ' | recorrente' : ''}. Use esta explicação ao responder sobre transferências ou estabelecimentos com esse nome.`);
    }
    async invalidateRagIndex(userId) {
        await this.prisma.financeIndexState.deleteMany({ where: { userId } });
    }
    async touchRuleSideEffects(userId) {
        await this.invalidateRagIndex(userId);
    }
    pickQuestionCandidates(recurring, known, dismissed) {
        const out = [];
        for (const rec of recurring) {
            if (rec.occurrences < 2)
                continue;
            const matchLabel = (0, finance_context_matcher_1.normalizeMatchLabel)(rec.label);
            if (!matchLabel || known.has(matchLabel) || dismissed.has(matchLabel))
                continue;
            const autoCategory = (0, category_guess_1.inferSpendingCategory)(rec.label);
            const isTransfer = rec.category === 'Transferências' || autoCategory === 'Transferências';
            const isUnknown = rec.category === 'Outros' || autoCategory === 'Outros';
            if (!isTransfer && !isUnknown)
                continue;
            let score = rec.totalInPeriod;
            if (isTransfer)
                score += 500;
            if (rec.isCrossMonthRecurring)
                score += 300;
            out.push({
                matchLabel,
                displayLabel: rec.label,
                sampleAmount: rec.averageAmount,
                occurrences: rec.occurrences,
                score,
            });
        }
        return out
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
    }
    toRuleDto(row) {
        return {
            id: row.id,
            matchLabel: row.matchLabel,
            displayLabel: row.displayLabel,
            category: row.category,
            motive: row.motive,
            isRecurring: row.isRecurring,
            createdAt: row.createdAt.toISOString(),
        };
    }
    toQuestionDto(row) {
        const amount = row.sampleAmount != null ? Number(row.sampleAmount) : null;
        const amountText = amount != null ? ` (~${this.brl(amount)} por vez)` : '';
        return {
            id: row.id,
            matchLabel: row.matchLabel,
            displayLabel: row.displayLabel,
            sampleAmount: amount,
            occurrences: row.occurrences,
            prompt: `Você paga ${row.displayLabel} com frequência${amountText} (${row.occurrences}x). Qual o motivo?`,
        };
    }
    brl(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }
};
exports.FinanceContextService = FinanceContextService;
exports.FinanceContextService = FinanceContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceContextService);
//# sourceMappingURL=finance-context.service.js.map