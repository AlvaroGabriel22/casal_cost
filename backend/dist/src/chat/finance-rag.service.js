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
var FinanceRagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceRagService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const financial_calculation_service_1 = require("../financial/financial-calculation.service");
const ai_service_1 = require("../ai/ai.service");
const bank_statement_analysis_service_1 = require("../insights/bank-statement-analysis.service");
const finance_context_service_1 = require("../finance-context/finance-context.service");
const finance_context_matcher_1 = require("../finance-context/finance-context.matcher");
let FinanceRagService = FinanceRagService_1 = class FinanceRagService {
    constructor(prisma, financial, ai, bankAnalysis, financeContext) {
        this.prisma = prisma;
        this.financial = financial;
        this.ai = ai;
        this.bankAnalysis = bankAnalysis;
        this.financeContext = financeContext;
        this.logger = new common_1.Logger(FinanceRagService_1.name);
    }
    brl(value) {
        const n = Number(value ?? 0);
        return `R$ ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
    }
    ym(d) {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    ymd(d) {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    currentYm() {
        return this.ym(new Date());
    }
    addMonths(ym, delta) {
        const [y, m] = ym.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1 + delta, 1));
        return this.ym(d);
    }
    merchantFromDescription(description) {
        const parts = description
            .split(' - ')
            .map((p) => p.trim())
            .filter(Boolean);
        let name = parts.length >= 2 ? parts[1] : parts[0] ?? description;
        return name
            .replace(/\(\d{3,4}\).*$/i, '')
            .replace(/•••\.\d+\.\d+-••.*$/i, '')
            .trim();
    }
    isBankStatementQuery(query) {
        return /extrato|banc[aá]ri|nubank|inter|bradesco|pix|transfer|invest|rdb|cdb|aplic|resgat|lan[cç]amento|gasto|d[eé]bito|cr[eé]dito|saldo|moviment/i.test(query);
    }
    async getActiveCoupleId(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                status: 'ACTIVE',
                OR: [{ userAId: userId }, { userBId: userId }],
            },
            select: { id: true },
        });
        return couple?.id ?? null;
    }
    async computeSignature(userId) {
        const coupleId = await this.getActiveCoupleId(userId);
        const expenseWhere = {
            deletedAt: null,
            OR: [
                { ownerUserId: userId },
                ...(coupleId ? [{ coupleId }] : []),
            ],
        };
        const [expense, occurrence, income, settings, bankEntries, contextRules] = await Promise.all([
            this.prisma.expense.aggregate({
                where: expenseWhere,
                _count: true,
                _max: { updatedAt: true },
            }),
            this.prisma.expenseOccurrence.aggregate({
                where: {
                    deletedAt: null,
                    OR: [{ userId }, ...(coupleId ? [{ coupleId }] : [])],
                },
                _count: true,
                _max: { updatedAt: true },
            }),
            this.prisma.income.aggregate({
                where: { userId, deletedAt: null },
                _count: true,
                _max: { updatedAt: true },
            }),
            this.prisma.financialSettings.findUnique({ where: { userId } }),
            this.prisma.bankStatementEntry.aggregate({
                where: { userId, deletedAt: null },
                _count: true,
                _max: { updatedAt: true },
            }),
            this.prisma.financeContextRule.aggregate({
                where: { userId },
                _count: true,
                _max: { updatedAt: true },
            }),
        ]);
        return JSON.stringify({
            e: [expense._count, expense._max.updatedAt],
            o: [occurrence._count, occurrence._max.updatedAt],
            i: [income._count, income._max.updatedAt],
            s: settings?.updatedAt ?? null,
            b: [bankEntries._count, bankEntries._max.updatedAt],
            c: [contextRules._count, contextRules._max.updatedAt],
        });
    }
    async buildDocuments(userId) {
        const docs = [];
        const coupleId = await this.getActiveCoupleId(userId);
        const settings = await this.prisma.financialSettings.findUnique({
            where: { userId },
        });
        if (settings) {
            docs.push({
                kind: 'settings',
                refId: settings.id,
                content: `[Configuração financeira] salário base: ${this.brl(settings.baseSalary)} | dia do pagamento do salário: ${settings.salaryPaymentDay} | moeda: ${settings.defaultCurrency}.`,
            });
        }
        const contextRules = await this.financeContext.listRules(userId);
        for (const line of this.financeContext.formatRulesForRag(contextRules)) {
            docs.push({
                kind: 'user_context',
                refId: null,
                content: line,
            });
        }
        const incomes = await this.prisma.income.findMany({
            where: { userId, deletedAt: null },
            orderBy: { referenceMonth: 'desc' },
            take: 200,
        });
        for (const income of incomes) {
            docs.push({
                kind: 'income',
                refId: income.id,
                content: `[Renda] tipo: ${income.type} | valor: ${this.brl(income.amount)} | mês de referência: ${this.ym(income.referenceMonth)} | recorrente: ${income.isRecurring ? 'sim' : 'não'}${income.description ? ` | descrição: ${income.description}` : ''}.`,
            });
        }
        const expenses = await this.prisma.expense.findMany({
            where: {
                deletedAt: null,
                OR: [{ ownerUserId: userId }, ...(coupleId ? [{ coupleId }] : [])],
            },
            include: {
                occurrences: {
                    where: { deletedAt: null },
                    orderBy: { referenceMonth: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
        for (const expense of expenses) {
            const occ = expense.occurrences
                .map((o) => `${this.ym(o.referenceMonth)} venc ${this.ymd(o.dueDate)} ${this.brl(o.amount)} (${o.status}${o.installmentNumber
                ? `, parcela ${o.installmentNumber}/${o.totalInstallments ?? '?'}`
                : ''})`)
                .join('; ');
            docs.push({
                kind: 'expense',
                refId: expense.id,
                content: `[Despesa ${expense.scope}] "${expense.title}" — categoria: ${expense.category} | tipo: ${expense.expenseType} | pagamento: ${expense.paymentMethod}${expense.cardName ? ` | cartão: ${expense.cardName}` : ''} | valor total: ${this.brl(expense.totalAmount)} | status: ${expense.status}${expense.description ? ` | descrição: ${expense.description}` : ''}. Lançamentos: ${occ || 'nenhum'}.`,
            });
        }
        const base = this.currentYm();
        const months = [-5, -4, -3, -2, -1, 0, 1].map((d) => this.addMonths(base, d));
        for (const monthYm of months) {
            try {
                const m = await this.financial.calculateIndividualMonth(userId, monthYm);
                const categories = (m.expensesByCategory ?? [])
                    .map((c) => `${c.category}: ${this.brl(c.amount)}`)
                    .join(', ');
                docs.push({
                    kind: 'monthly_summary',
                    refId: monthYm,
                    content: `[Resumo do mês ${monthYm}] renda total: ${this.brl(m.totalIncomeMonth)} | salário base: ${this.brl(m.baseSalaryMonth)} | renda extra: ${this.brl(m.extraIncomeMonth)} | despesas individuais: ${this.brl(m.totalIndividualExpensesMonth)} | parte em despesas compartilhadas: ${this.brl(m.totalSharedExpensesResponsibilityMonth)} | total de despesas: ${this.brl(m.totalExpensesMonth)} | saldo do mês: ${this.brl(m.balanceMonth)} | situação: ${m.status}${categories ? ` | gastos por categoria: ${categories}` : ''}.`,
                });
            }
            catch (err) {
                this.logger.warn(`Falha ao montar resumo de ${monthYm}: ${err}`);
            }
        }
        const bankLines = await this.prisma.bankStatementEntry.findMany({
            where: { userId, deletedAt: null },
            orderBy: { transactionDate: 'desc' },
            take: 2000,
        });
        for (const line of bankLines) {
            const merchant = this.merchantFromDescription(line.description);
            const rule = (0, finance_context_matcher_1.findMatchingRule)(contextRules, line.description, merchant);
            docs.push({
                kind: 'bank_import',
                refId: line.id,
                content: `[Extrato bancário ${line.bank}] ${this.ymd(line.transactionDate)} | ${line.direction === 'DEBIT' ? 'saída' : 'entrada'}: ${this.brl(line.amount)} | ${line.description} | categoria: ${rule?.category ?? line.category ?? 'Outros'} | mês ref: ${this.ym(line.referenceMonth)}.${rule ? ` Explicado pelo usuário: ${rule.motive}` : ''}`,
            });
        }
        try {
            const analysis = await this.bankAnalysis.analyze(userId, base, contextRules);
            for (const [index, text] of this.bankAnalysis.formatForRag(analysis).entries()) {
                docs.push({
                    kind: 'bank_analysis',
                    refId: `bank-analysis-${index}`,
                    content: text,
                });
            }
        }
        catch (err) {
            this.logger.warn(`Falha ao montar análise de extrato: ${err}`);
        }
        return docs;
    }
    async reindex(userId) {
        if (!this.ai.enabled)
            return 0;
        const docs = await this.buildDocuments(userId);
        await this.prisma.$executeRaw `DELETE FROM "FinanceEmbedding" WHERE "userId" = ${userId}::uuid`;
        if (docs.length > 0) {
            const batchSize = 96;
            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = docs.slice(i, i + batchSize);
                const vectors = await this.ai.embed(batch.map((d) => d.content));
                for (let j = 0; j < batch.length; j++) {
                    const doc = batch[j];
                    const literal = `[${vectors[j].join(',')}]`;
                    await this.prisma.$executeRaw `
            INSERT INTO "FinanceEmbedding" ("id","userId","kind","refId","content","embedding","createdAt")
            VALUES (gen_random_uuid(), ${userId}::uuid, ${doc.kind}, ${doc.refId}, ${doc.content}, ${literal}::vector, now())
          `;
                }
            }
        }
        const signature = await this.computeSignature(userId);
        await this.prisma.financeIndexState.upsert({
            where: { userId },
            create: { userId, signature },
            update: { signature },
        });
        return docs.length;
    }
    async ensureIndex(userId) {
        if (!this.ai.enabled)
            return;
        const [state, signature] = await Promise.all([
            this.prisma.financeIndexState.findUnique({ where: { userId } }),
            this.computeSignature(userId),
        ]);
        if (!state || state.signature !== signature) {
            await this.reindex(userId);
        }
    }
    async retrieve(userId, queryEmbedding, k = 8) {
        const literal = `[${queryEmbedding.join(',')}]`;
        const limit = Math.max(1, Math.min(20, Math.floor(k)));
        const rows = await this.prisma.$queryRaw `
      SELECT "content"
      FROM "FinanceEmbedding"
      WHERE "userId" = ${userId}::uuid AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${literal}::vector
      LIMIT ${limit}
    `;
        return rows.map((r) => r.content);
    }
    async retrieveForChat(userId, queryEmbedding, query) {
        const isBank = this.isBankStatementQuery(query);
        const k = isBank ? 12 : 8;
        const literal = `[${queryEmbedding.join(',')}]`;
        const [contextRows, semantic, bankRows] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT "content" FROM "FinanceEmbedding"
        WHERE "userId" = ${userId}::uuid AND "kind" = 'user_context'
        LIMIT 30
      `,
            this.retrieve(userId, queryEmbedding, k),
            isBank
                ? this.prisma.$queryRaw `
            SELECT "content" FROM "FinanceEmbedding"
            WHERE "userId" = ${userId}::uuid
              AND "kind" IN ('bank_analysis', 'bank_import')
              AND "embedding" IS NOT NULL
            ORDER BY "embedding" <=> ${literal}::vector
            LIMIT 16
          `
                : Promise.resolve([]),
        ]);
        const seen = new Set();
        const merged = [];
        for (const c of [
            ...contextRows.map((r) => r.content),
            ...bankRows.map((r) => r.content),
            ...semantic,
        ]) {
            if (!seen.has(c)) {
                seen.add(c);
                merged.push(c);
            }
        }
        return merged.slice(0, 22);
    }
    async buildBankStatementContext(userId) {
        const base = this.currentYm();
        const contextRules = await this.financeContext.listRules(userId);
        try {
            const analysis = await this.bankAnalysis.analyze(userId, base, contextRules);
            if (!analysis.hasData) {
                return contextRules.length
                    ? `Contexto ensinado pelo usuário (sem extrato importado ainda):\n${this.financeContext.formatRulesForRag(contextRules).join('\n')}`
                    : 'Nenhum extrato bancário importado.';
            }
            const parts = [];
            if (contextRules.length) {
                parts.push('=== Contexto ensinado pelo usuário (prioridade máxima) ===');
                parts.push(...this.financeContext.formatRulesForRag(contextRules));
            }
            parts.push('=== Análise do extrato bancário ===');
            parts.push(...this.bankAnalysis.formatForRag(analysis));
            const spend = analysis.spendingAnalysis;
            if (spend?.expenseDetails.length) {
                parts.push(`=== Gastos detalhados (${spend.referenceMonth}) ===`);
                for (const d of spend.expenseDetails.slice(0, 50)) {
                    parts.push(`${d.date} | ${d.merchant} | ${this.brl(d.amount)} | ${d.category}${d.userMotive ? ` | explicado: ${d.userMotive}` : ''}${d.isRecurring ? ' | recorrente' : ''}`);
                }
            }
            return parts.join('\n');
        }
        catch (err) {
            this.logger.warn(`Falha ao montar contexto de extrato: ${err}`);
            return '';
        }
    }
    async buildLiveSummary(userId) {
        const base = this.currentYm();
        const contextRules = await this.financeContext.listRules(userId);
        const months = [this.addMonths(base, -1), base, this.addMonths(base, 1)];
        const parts = [];
        for (const monthYm of months) {
            try {
                const m = await this.financial.calculateIndividualMonth(userId, monthYm);
                const upcoming = (m.upcomingBills ?? [])
                    .slice(0, 8)
                    .map((b) => `${b.title} (${this.brl(b.amount)}, venc ${this.ymd(new Date(b.dueDate))}, ${b.status})`)
                    .join('; ');
                parts.push(`Mês ${monthYm}: renda ${this.brl(m.totalIncomeMonth)}, despesas ${this.brl(m.totalExpensesMonth)}, saldo ${this.brl(m.balanceMonth)}, situação ${m.status}.${upcoming ? ` Próximas contas: ${upcoming}.` : ''}`);
            }
            catch {
            }
        }
        if (contextRules.length) {
            parts.push(`Regras ensinadas pelo usuário (${contextRules.length}): ${contextRules
                .map((r) => `"${r.displayLabel}" = ${r.motive}`)
                .join('; ')}.`);
        }
        try {
            const analysis = await this.bankAnalysis.analyze(userId, base, contextRules);
            if (analysis.hasData) {
                parts.push(`Extrato bancário (${analysis.banks.join(', ')}): ${analysis.totalMovements} movimentações. Investido: ${this.brl(analysis.currentlyInvested)}.`);
                const spend = analysis.spendingAnalysis;
                if (spend) {
                    parts.push(`Consumo ${spend.referenceMonth}: gastos ${this.brl(spend.totalSpent)}, entradas ${this.brl(spend.totalIncome)}${spend.spentMoreThanEarned ? `, déficit ${this.brl(spend.overspendAmount)}` : ''}. Top categorias: ${spend.topCategories
                        .slice(0, 4)
                        .map((c) => `${c.category} ${this.brl(c.total)}`)
                        .join(', ')}.`);
                    const taught = spend.expenseDetails.filter((d) => d.userMotive).slice(0, 8);
                    if (taught.length) {
                        parts.push(`Gastos já explicados: ${taught.map((d) => `${d.merchant} (${d.userMotive})`).join('; ')}.`);
                    }
                }
                for (const lot of analysis.investmentLots.filter((l) => l.status !== 'REDEEMED').slice(0, 5)) {
                    parts.push(lot.narrative);
                }
            }
        }
        catch {
        }
        return parts.join('\n');
    }
};
exports.FinanceRagService = FinanceRagService;
exports.FinanceRagService = FinanceRagService = FinanceRagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        financial_calculation_service_1.FinancialCalculationService,
        ai_service_1.AiService,
        bank_statement_analysis_service_1.BankStatementAnalysisService,
        finance_context_service_1.FinanceContextService])
], FinanceRagService);
//# sourceMappingURL=finance-rag.service.js.map