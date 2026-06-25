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
var InsightsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const financial_calculation_service_1 = require("../financial/financial-calculation.service");
const investments_service_1 = require("../investments/investments.service");
let InsightsService = InsightsService_1 = class InsightsService {
    constructor(prisma, calc, investments) {
        this.prisma = prisma;
        this.calc = calc;
        this.investments = investments;
        this.logger = new common_1.Logger(InsightsService_1.name);
    }
    async buildOverview(userId, monthYm) {
        const reference = this.normaliseMonth(monthYm);
        const historyMonths = 12;
        const months = this.lastMonths(reference, historyMonths);
        const [snapshots, transactionCount, activeInstallments, investments] = await Promise.all([
            Promise.all(months.map((ym) => this.snapshotMonth(userId, ym))),
            this.countTransactions(userId, months),
            this.activeInstallmentsForUser(userId),
            this.loadInvestmentAnalysis(userId, reference, months),
        ]);
        const hasEnoughData = snapshots.some((m) => m.expenses > 0 || m.income > 0) &&
            transactionCount >= 3;
        const categoryTrends = this.computeCategoryTrends(snapshots);
        const current = snapshots[snapshots.length - 1];
        const healthScore = this.computeHealthScore(snapshots, activeInstallments, investments);
        const habits = this.computeHabits(snapshots, categoryTrends, investments);
        const microExpenses = await this.detectMicroExpenses(userId, months.slice(-3));
        const challenges = this.composeChallenges({
            snapshots,
            categoryTrends,
            investments,
            microExpenses,
            habits,
            currentIncome: current.income,
        });
        const insights = this.challengesToInsights(challenges);
        return {
            generatedAt: new Date().toISOString(),
            referenceMonth: reference,
            monthsAnalyzed: snapshots.length,
            transactionsAnalyzed: transactionCount,
            hasEnoughData,
            healthScore,
            investments,
            habits,
            challenges,
            microExpenses,
            insights,
        };
    }
    async snapshotMonth(userId, monthYm) {
        try {
            const month = await this.calc.calculateIndividualMonth(userId, monthYm);
            const byCategory = {};
            for (const row of month.expensesByCategory ?? []) {
                byCategory[row.category] = Number(row.amount);
            }
            return {
                month: monthYm,
                income: Number(month.totalIncomeMonth),
                expenses: Number(month.totalExpensesMonth),
                individualExpenses: Number(month.totalIndividualExpensesMonth),
                sharedResponsibility: Number(month.totalSharedExpensesResponsibilityMonth),
                balance: Number(month.balanceMonth),
                byCategory,
                status: month.status,
            };
        }
        catch (error) {
            this.logger.warn(`Snapshot failed for ${monthYm}: ${String(error)}`);
            return this.emptyMonth(monthYm);
        }
    }
    emptyMonth(monthYm) {
        return {
            month: monthYm,
            income: 0,
            expenses: 0,
            individualExpenses: 0,
            sharedResponsibility: 0,
            balance: 0,
            byCategory: {},
            status: 'POSITIVE',
        };
    }
    computeHealthScore(snapshots, installments, investments) {
        const recent = snapshots.slice(-6).filter((s) => s.income > 0 || s.expenses > 0);
        const avgIncome = this.avg(recent.map((s) => s.income));
        const avgExpense = this.avg(recent.map((s) => s.expenses));
        const avgBalance = this.avg(recent.map((s) => s.balance));
        const reserveMonths = avgExpense > 0 ? Math.max(avgBalance, 0) / avgExpense : 0;
        const expensesRatio = avgIncome > 0 ? avgExpense / avgIncome : 1;
        const debtRatio = avgIncome > 0 ? installments.totalPending / (avgIncome * 12) : 0;
        const investmentRate = avgIncome > 0 ? investments.individual.averageMonthly / avgIncome : 0;
        const targetRate = investments.targetPercent / 100;
        const expenseStability = recent.length > 1
            ? 1 -
                Math.min(this.coefficientOfVariation(recent.map((s) => s.expenses)), 1)
            : 0.7;
        const cashflowConsistency = recent.length > 0
            ? recent.filter((s) => s.balance >= 0).length / recent.length
            : 0;
        const factors = [
            {
                key: 'reserve',
                label: 'Reserva de emergência',
                weight: 0.15,
                score: this.clamp(reserveMonths / 6) * 100,
                status: reserveMonths >= 6 ? 'GOOD' : reserveMonths >= 3 ? 'WARNING' : 'BAD',
                detail: `${reserveMonths.toFixed(1)} meses cobertos pelo saldo médio.`,
            },
            {
                key: 'investment',
                label: 'Aportes registrados',
                weight: 0.25,
                score: investments.individual.hasRegisteredContributions
                    ? this.clamp(investmentRate / targetRate) * 100
                    : 0,
                status: !investments.individual.hasRegisteredContributions
                    ? 'BAD'
                    : investmentRate >= targetRate
                        ? 'GOOD'
                        : investmentRate >= targetRate * 0.5
                            ? 'WARNING'
                            : 'BAD',
                detail: investments.individual.hasRegisteredContributions
                    ? `${(investmentRate * 100).toFixed(0)}% da renda em aportes individuais (meta ${investments.targetPercent}%).`
                    : 'Nenhum aporte individual registrado.',
            },
            {
                key: 'expenses',
                label: 'Relação receita x despesa',
                weight: 0.2,
                score: this.clamp(1 - expensesRatio / 1.1) * 100,
                status: expensesRatio <= 0.7
                    ? 'GOOD'
                    : expensesRatio <= 0.9
                        ? 'WARNING'
                        : 'BAD',
                detail: `${(expensesRatio * 100).toFixed(0)}% da renda é consumida por despesas.`,
            },
            {
                key: 'debt',
                label: 'Endividamento (parcelamentos)',
                weight: 0.15,
                score: this.clamp(1 - debtRatio / 0.5) * 100,
                status: debtRatio <= 0.1 ? 'GOOD' : debtRatio <= 0.3 ? 'WARNING' : 'BAD',
                detail: `${this.brl(installments.totalPending)} pendentes em parcelas ativas.`,
            },
            {
                key: 'stability',
                label: 'Estabilidade dos gastos',
                weight: 0.15,
                score: expenseStability * 100,
                status: expenseStability >= 0.7
                    ? 'GOOD'
                    : expenseStability >= 0.45
                        ? 'WARNING'
                        : 'BAD',
                detail: `Variação dos últimos ${recent.length} meses ${expenseStability >= 0.7 ? 'controlada' : 'elevada'}.`,
            },
            {
                key: 'cashflow',
                label: 'Fluxo de caixa positivo',
                weight: 0.1,
                score: cashflowConsistency * 100,
                status: cashflowConsistency >= 0.8
                    ? 'GOOD'
                    : cashflowConsistency >= 0.5
                        ? 'WARNING'
                        : 'BAD',
                detail: `${Math.round(cashflowConsistency * 100)}% dos meses terminaram positivos.`,
            },
        ];
        const value = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
        const history = snapshots.map((snap, index) => {
            const slice = snapshots.slice(0, index + 1);
            return {
                month: snap.month,
                value: this.scoreForSlice(slice, installments, investments),
            };
        });
        const previousValue = history.length >= 2 ? history[history.length - 2].value : value;
        const delta = value - previousValue;
        const trend = delta > 2 ? 'UP' : delta < -2 ? 'DOWN' : 'STABLE';
        const positiveMonths = recent.filter((s) => s.balance >= 0).length;
        const { summary, observations } = this.composeHealthObservations({
            recent,
            current: snapshots[snapshots.length - 1],
            avgIncome,
            avgExpense,
            avgBalance,
            reserveMonths,
            expensesRatio,
            debtRatio,
            investmentRate,
            targetRate,
            expenseStability,
            cashflowConsistency,
            positiveMonths,
            value,
            delta,
            trend,
            installments,
            investments,
        });
        return {
            value: Math.round(this.clamp(value / 100) * 100),
            delta,
            trend,
            history,
            summary,
            observations,
        };
    }
    composeHealthObservations(input) {
        const observations = [];
        const { recent, current, avgIncome, avgExpense, reserveMonths, expensesRatio, debtRatio, investmentRate, targetRate, expenseStability, cashflowConsistency, positiveMonths, value, delta, trend, installments, investments, } = input;
        if (recent.length === 0) {
            return {
                summary: 'Ainda não temos dados suficientes. Cadastre receitas e despesas para a análise começar.',
                observations: [
                    {
                        id: 'health-no-data',
                        tone: 'INFO',
                        title: 'Comece registrando seu mês',
                        message: 'Com receitas e despesas lançadas, conseguimos explicar sua situação em linguagem simples e apontar o que merece atenção.',
                        tip: 'Cadastre pelo menos o salário e as contas fixas do mês atual.',
                    },
                ],
            };
        }
        const expensePct = Math.round(expensesRatio * 100);
        const investmentPct = Math.round(investmentRate * 100);
        const targetPct = Math.round(targetRate * 100);
        if (current.balance < 0) {
            observations.push({
                id: 'health-negative-month',
                tone: 'CRITICAL',
                title: 'Este mês está no vermelho',
                message: `Suas despesas superaram as receitas em ${this.brl(Math.abs(current.balance))} neste mês. Antes de investir ou assumir novos gastos, o ideal é recuperar esse saldo.`,
                tip: 'Revise contas pendentes e adie compras não essenciais até voltar ao positivo.',
            });
        }
        else if (current.balance > 0 && current.income > 0) {
            const savedPct = Math.round((current.balance / current.income) * 100);
            observations.push({
                id: 'health-month-balance',
                tone: savedPct >= 15 ? 'POSITIVE' : 'INFO',
                title: savedPct >= 15
                    ? 'Bom! Sobrou dinheiro este mês'
                    : 'Saldo positivo, mas apertado',
                message: savedPct >= 15
                    ? `Você terminou o mês com ${this.brl(current.balance)} sobrando — cerca de ${savedPct}% da sua renda. Isso ajuda a formar reserva e fazer aportes.`
                    : `Sobrou ${this.brl(current.balance)} este mês (${savedPct}% da renda). Positivo, mas uma margem maior traria mais tranquilidade.`,
                tip: savedPct >= 15
                    ? 'Considere destinar parte desse valor a investimentos ou reserva.'
                    : 'Tente reduzir um gasto variável para aumentar a sobra no próximo mês.',
            });
        }
        if (expensesRatio > 0.9) {
            observations.push({
                id: 'health-high-expenses',
                tone: 'CRITICAL',
                title: 'Gastos muito altos em relação à renda',
                message: `Em média, ${expensePct}% da sua renda vai para despesas. Quando passa de 90%, sobra pouco ou nada para imprevistos e investimentos.`,
                tip: 'Identifique 1 ou 2 categorias para cortar ainda neste mês — veja os desafios abaixo.',
            });
        }
        else if (expensesRatio > 0.75) {
            observations.push({
                id: 'health-elevated-expenses',
                tone: 'ATTENTION',
                title: 'Despesas consumindo boa parte da renda',
                message: `Cerca de ${expensePct}% da renda está indo em despesas. O confortável costuma ser abaixo de 75%.`,
                tip: 'Confira se há assinaturas ou gastos pequenos repetidos que dá para eliminar.',
            });
        }
        else if (expensesRatio <= 0.65 && avgIncome > 0) {
            observations.push({
                id: 'health-good-expenses',
                tone: 'POSITIVE',
                title: 'Despesas sob controle',
                message: `Você usa cerca de ${expensePct}% da renda com despesas — uma proporção saudável que deixa margem para poupar.`,
            });
        }
        if (avgExpense > 0) {
            if (reserveMonths < 1 && avgIncome > 0) {
                observations.push({
                    id: 'health-no-reserve',
                    tone: 'CRITICAL',
                    title: 'Sem margem de segurança',
                    message: `Com o saldo médio recente (${this.brl(Math.max(input.avgBalance, 0))}), você cobriria menos de 1 mês de despesas (${this.brl(avgExpense)}/mês). Imprevistos podem virar dívidas.`,
                    tip: 'Priorize juntar o equivalente a 1 salário antes de gastos extras.',
                });
            }
            else if (reserveMonths < 3) {
                observations.push({
                    id: 'health-low-reserve',
                    tone: 'ATTENTION',
                    title: 'Reserva ainda curta',
                    message: `Seu saldo médio cobriria cerca de ${reserveMonths.toFixed(1)} mês(es) de despesas. Especialistas recomendam pelo menos 3 a 6 meses.`,
                    tip: 'Destine parte da sobra mensal para aumentar essa reserva gradualmente.',
                });
            }
            else if (reserveMonths >= 6) {
                observations.push({
                    id: 'health-strong-reserve',
                    tone: 'POSITIVE',
                    title: 'Reserva de emergência sólida',
                    message: `Com o saldo médio atual, você teria cerca de ${reserveMonths.toFixed(1)} meses de despesas cobertos — excelente proteção contra imprevistos.`,
                });
            }
        }
        const ind = investments.individual;
        if (!ind.hasRegisteredContributions) {
            observations.push({
                id: 'health-no-investment',
                tone: 'ATTENTION',
                title: 'Nenhum aporte registrado',
                message: 'Não encontramos aportes individuais cadastrados. A IA só analisa o que você registra na tela de Investimentos.',
                tip: 'Quando investir, informe o valor e o mês — mesmo aportes pequenos contam.',
            });
        }
        else if (investmentPct < targetPct * 0.5) {
            observations.push({
                id: 'health-low-investment',
                tone: 'ATTENTION',
                title: 'Aportes abaixo do ideal',
                message: `Você investe cerca de ${investmentPct}% da renda individualmente (média ${this.brl(ind.averageMonthly)}/mês). A meta sugerida é ${targetPct}%.`,
                tip: `Tente registrar pelo menos ${this.brl(Math.max((targetPct / 100) * avgIncome - ind.monthTotal, 50))} a mais neste mês.`,
            });
        }
        else if (investmentPct >= targetPct) {
            observations.push({
                id: 'health-good-investment',
                tone: 'POSITIVE',
                title: 'Aportes individuais em dia',
                message: `Você investe cerca de ${investmentPct}% da renda (${this.brl(ind.monthTotal)} neste mês, ${this.brl(ind.allTimeTotal)} acumulado).`,
            });
        }
        else {
            observations.push({
                id: 'health-moderate-investment',
                tone: 'INFO',
                title: 'Aportes no caminho certo',
                message: `Investimento individual de ${investmentPct}% da renda — abaixo da meta de ${targetPct}%, mas já é um hábito formado (${ind.consecutiveMonths} mês(es) seguidos).`,
                tip: 'Aumente aos poucos, mês a mês, até chegar na meta.',
            });
        }
        const couple = investments.couple;
        if (couple?.hasRegisteredContributions) {
            const partners = couple.byPartner
                ?.filter((p) => p.monthAmount > 0)
                .map((p) => `${p.name}: ${this.brl(p.monthAmount)}`)
                .join(' · ') ?? '';
            observations.push({
                id: 'health-couple-investment',
                tone: 'INFO',
                title: 'Investimento conjunto do casal',
                message: `Total conjunto: ${this.brl(couple.monthTotal)} neste mês (${this.brl(couple.allTimeTotal)} acumulado).${partners ? ` ${partners}.` : ''} Ambos os parceiros veem o mesmo total.`,
            });
        }
        if (installments.totalPending > 0 && avgIncome > 0) {
            const monthsOfSalary = installments.totalPending / avgIncome;
            if (debtRatio > 0.3 || monthsOfSalary > 4) {
                observations.push({
                    id: 'health-high-debt',
                    tone: 'CRITICAL',
                    title: 'Parcelas pesando no orçamento',
                    message: `Há ${this.brl(installments.totalPending)} em parcelas pendentes — equivalente a ${monthsOfSalary.toFixed(1)} meses de renda. Isso limita sua flexibilidade.`,
                    tip: 'Evite novos parcelamentos até reduzir esse valor.',
                });
            }
            else if (installments.totalPending > avgIncome * 0.5) {
                observations.push({
                    id: 'health-moderate-debt',
                    tone: 'ATTENTION',
                    title: 'Parcelas ativas no radar',
                    message: `${this.brl(installments.totalPending)} ainda em parcelas (${installments.activeGroups} compra(s) parcelada(s)). Fique atento para não acumular.`,
                });
            }
        }
        if (recent.length >= 3) {
            if (cashflowConsistency < 0.5) {
                observations.push({
                    id: 'health-bad-cashflow',
                    tone: 'ATTENTION',
                    title: 'Meses negativos se repetindo',
                    message: `Dos últimos ${recent.length} meses, apenas ${positiveMonths} fecharam no positivo. Vale entender o que está puxando o saldo para baixo.`,
                    tip: 'Compare os meses no dashboard e note em quais categorias os gastos subiram.',
                });
            }
            else if (cashflowConsistency >= 0.8 && positiveMonths >= 3) {
                observations.push({
                    id: 'health-good-cashflow',
                    tone: 'POSITIVE',
                    title: 'Consistência nos meses positivos',
                    message: `${positiveMonths} de ${recent.length} meses recentes terminaram com saldo positivo — sinal de controle financeiro.`,
                });
            }
        }
        if (recent.length >= 4 && expenseStability < 0.45) {
            const highest = [...recent].sort((a, b) => b.expenses - a.expenses)[0];
            const lowest = [...recent].sort((a, b) => a.expenses - b.expenses)[0];
            observations.push({
                id: 'health-unstable-expenses',
                tone: 'ATTENTION',
                title: 'Gastos variando bastante',
                message: `Suas despesas oscilaram entre ${this.brl(lowest.expenses)} e ${this.brl(highest.expenses)} nos últimos meses. Variação alta dificulta planejar.`,
                tip: 'Gastos fixos e pequenos hábitos diários costumam ser os culpados — confira a lista de micro-gastos.',
            });
        }
        if (trend === 'UP' && delta >= 5) {
            observations.push({
                id: 'health-score-up',
                tone: 'POSITIVE',
                title: 'Sua saúde financeira melhorou',
                message: `O score subiu ${delta} pontos em relação ao mês anterior. Continue o que está funcionando.`,
            });
        }
        else if (trend === 'DOWN' && delta <= -5) {
            observations.push({
                id: 'health-score-down',
                tone: 'ATTENTION',
                title: 'Score caiu em relação ao mês passado',
                message: `Sua saúde financeira recuou ${Math.abs(delta)} pontos. Veja as observações acima para entender o que mudou.`,
            });
        }
        const toneOrder = {
            CRITICAL: 0,
            ATTENTION: 1,
            INFO: 2,
            POSITIVE: 3,
        };
        observations.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);
        const picked = observations.slice(0, 6);
        let summary;
        if (value >= 75) {
            summary = `Sua saúde financeira está em ${value}/100 — situação sólida.`;
        }
        else if (value >= 50) {
            summary = `Sua saúde financeira está em ${value}/100 — equilíbrio razoável, com pontos a ajustar.`;
        }
        else {
            summary = `Sua saúde financeira está em ${value}/100 — priorize cortes e reserva antes de novos compromissos.`;
        }
        if (trend === 'UP' && delta > 2) {
            summary += ` Melhorou ${delta} pts vs mês anterior.`;
        }
        else if (trend === 'DOWN' && delta < -2) {
            summary += ` Caiu ${Math.abs(delta)} pts vs mês anterior.`;
        }
        summary += ' Leia as observações abaixo — são personalizadas com base nos seus dados.';
        return { summary, observations: picked };
    }
    scoreForSlice(slice, installments, investments) {
        const recent = slice.slice(-6).filter((s) => s.income > 0 || s.expenses > 0);
        if (recent.length === 0)
            return 50;
        const avgIncome = this.avg(recent.map((s) => s.income));
        const avgExpense = this.avg(recent.map((s) => s.expenses));
        const avgBalance = this.avg(recent.map((s) => s.balance));
        const reserveMonths = avgExpense > 0 ? Math.max(avgBalance, 0) / avgExpense : 0;
        const expensesRatio = avgIncome > 0 ? avgExpense / avgIncome : 1;
        const debtRatio = avgIncome > 0 ? installments.totalPending / (avgIncome * 12) : 0;
        const investmentRate = avgIncome > 0 ? investments.individual.averageMonthly / avgIncome : 0;
        const targetRate = investments.targetPercent / 100;
        const stability = recent.length > 1
            ? 1 -
                Math.min(this.coefficientOfVariation(recent.map((s) => s.expenses)), 1)
            : 0.7;
        const cashflow = recent.filter((s) => s.balance >= 0).length / recent.length;
        const total = this.clamp(reserveMonths / 6) * 15 +
            (investments.individual.hasRegisteredContributions
                ? this.clamp(investmentRate / targetRate) * 25
                : 0) +
            this.clamp(1 - expensesRatio / 1.1) * 20 +
            this.clamp(1 - debtRatio / 0.5) * 15 +
            stability * 15 +
            cashflow * 10;
        return Math.round(this.clamp(total / 100) * 100);
    }
    computeRootCause(previous, current) {
        if (current.expenses <= previous.expenses + 1)
            return null;
        const totalDelta = current.expenses - previous.expenses;
        const categories = new Set([
            ...Object.keys(previous.byCategory),
            ...Object.keys(current.byCategory),
        ]);
        const entries = [];
        for (const category of categories) {
            const before = previous.byCategory[category] ?? 0;
            const after = current.byCategory[category] ?? 0;
            const delta = after - before;
            if (delta <= 0)
                continue;
            entries.push({
                category,
                delta,
                percent: before > 0 ? (delta / before) * 100 : 100,
                contribution: totalDelta > 0 ? (delta / totalDelta) * 100 : 0,
            });
        }
        entries.sort((a, b) => b.delta - a.delta);
        const top = entries.slice(0, 5);
        const summary = top.length === 0
            ? 'As despesas aumentaram de forma distribuída, sem categoria dominante.'
            : `O aumento de ${this.brl(totalDelta)} foi puxado principalmente por ${top
                .slice(0, 2)
                .map((entry) => entry.category)
                .join(' e ')}.`;
        return {
            previousMonth: previous.month,
            currentMonth: current.month,
            totalDelta,
            entries: top,
            summary,
        };
    }
    async computeCashFlow(userId, monthYm, baseSalary) {
        const month = this.calc.monthStart(monthYm);
        const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
        const horizonEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 2, 0));
        const occurrences = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: { gte: month, lte: next },
                status: { not: client_1.ExpenseStatus.CANCELLED },
                expense: {
                    deletedAt: null,
                    OR: [{ ownerUserId: userId }, { scope: client_1.ExpenseScope.SHARED }],
                },
            },
            include: { expense: { include: { sharedSplits: true } } },
            orderBy: { dueDate: 'asc' },
        });
        const settings = await this.prisma.financialSettings.findUnique({
            where: { userId },
        });
        const payDay = settings?.salaryPaymentDay ?? 5;
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const points = [];
        let balance = await this.estimateCurrentBalance(userId, monthYm);
        const startingBalance = balance;
        let lowestBalance = balance;
        let lowestBalanceDate = today.toISOString().slice(0, 10);
        const expensesByDay = new Map();
        for (const occ of occurrences) {
            const due = new Date(occ.dueDate);
            due.setUTCHours(0, 0, 0, 0);
            if (due < today)
                continue;
            const key = due.toISOString().slice(0, 10);
            const isShared = occ.expense.scope === client_1.ExpenseScope.SHARED;
            let amount = Number(occ.amount);
            if (isShared) {
                const share = await this.calc.calculateSharedExpenseResponsibility(occ.expenseId, occ.amount, userId);
                amount = Number(share);
            }
            expensesByDay.set(key, (expensesByDay.get(key) ?? 0) + amount);
        }
        const incomesByDay = new Map();
        for (let d = new Date(today.getTime()); d <= horizonEnd; d.setUTCDate(d.getUTCDate() + 1)) {
            if (d.getUTCDate() === payDay && baseSalary > 0) {
                const key = d.toISOString().slice(0, 10);
                incomesByDay.set(key, (incomesByDay.get(key) ?? 0) + baseSalary);
            }
        }
        for (let d = new Date(today.getTime()); d <= horizonEnd; d.setUTCDate(d.getUTCDate() + 1)) {
            const key = d.toISOString().slice(0, 10);
            const income = incomesByDay.get(key) ?? 0;
            const expense = expensesByDay.get(key) ?? 0;
            balance += income - expense;
            if (balance < lowestBalance) {
                lowestBalance = balance;
                lowestBalanceDate = key;
            }
            if (income > 0 || expense > 0 || points.length === 0) {
                points.push({
                    date: key,
                    income,
                    expense,
                    balance,
                    projected: true,
                });
            }
        }
        return {
            startingBalance,
            points,
            lowestBalance,
            lowestBalanceDate,
            riskOfNegative: lowestBalance < 0,
        };
    }
    async estimateCurrentBalance(userId, monthYm) {
        try {
            const month = await this.calc.calculateIndividualMonth(userId, monthYm);
            const paidExpenses = Number(month.totalExpensesMonth ?? 0);
            const incoming = Number(month.totalIncomeMonth ?? 0);
            return Math.max(incoming - paidExpenses * 0.5, 0);
        }
        catch {
            return 0;
        }
    }
    computeWealthForecast(snapshots) {
        const history = [];
        let cumulative = 0;
        for (const snap of snapshots) {
            cumulative += snap.balance;
            history.push({ month: snap.month, value: Math.max(cumulative, 0) });
        }
        const last = history[history.length - 1]?.value ?? 0;
        const avgBalance = this.avg(snapshots.slice(-6).map((s) => s.balance));
        const horizonMonths = 24;
        const scenarios = [
            this.buildScenario('Conservador', last, avgBalance * 0.7, horizonMonths, snapshots),
            this.buildScenario('Realista', last, avgBalance, horizonMonths, snapshots),
            this.buildScenario('Otimista', last, avgBalance * 1.3, horizonMonths, snapshots),
        ];
        return { history, scenarios };
    }
    buildScenario(label, start, monthlyDelta, horizonMonths, snapshots) {
        const projection = [];
        let value = start;
        const startMonth = snapshots[snapshots.length - 1]?.month ?? this.currentYm();
        for (let i = 1; i <= horizonMonths; i++) {
            value = Math.max(value + monthlyDelta, 0);
            projection.push({ month: this.addMonths(startMonth, i), value });
        }
        return { label, monthlyRate: monthlyDelta, projection };
    }
    computeGoalSimulator(snapshots, trends) {
        const recent = snapshots.slice(-6);
        const avgIncome = this.avg(recent.map((s) => s.income));
        const goalValue = Math.max(avgIncome * 6, 6000);
        const avgBalance = Math.max(this.avg(recent.map((s) => s.balance)), 1);
        const baseMonths = Math.max(Math.ceil(goalValue / avgBalance), 1);
        const topTrend = [...trends]
            .sort((a, b) => b.current - a.current)
            .filter((t) => t.current > 0)
            .slice(0, 1)[0];
        const actions = [];
        actions.push({
            id: 'aporte-extra',
            label: 'Aumentar aporte mensal em R$ 200',
            description: 'Direcionar R$ 200 fixos para a meta acelera o cronograma sem alterar despesas.',
            monthlyDelta: 200,
            monthsAdvance: this.monthsSaved(goalValue, avgBalance, 200),
        });
        actions.push({
            id: 'aporte-extra-500',
            label: 'Aumentar aporte mensal em R$ 500',
            description: 'Cenário mais agressivo, exige reorganizar o orçamento.',
            monthlyDelta: 500,
            monthsAdvance: this.monthsSaved(goalValue, avgBalance, 500),
        });
        if (topTrend) {
            const cut = Math.round(topTrend.current * 0.3);
            actions.push({
                id: `reduzir-${topTrend.category}`,
                label: `Reduzir 30% dos gastos em "${topTrend.category}"`,
                description: `Categoria com maior gasto recente (${this.brl(topTrend.current)} no último mês).`,
                monthlyDelta: cut,
                monthsAdvance: this.monthsSaved(goalValue, avgBalance, cut),
            });
        }
        actions.push({
            id: 'antecipar-quitacao',
            label: 'Quitar parcelamento mais caro antecipadamente',
            description: 'Após a quitação, o valor da parcela libera fôlego mensal contínuo.',
            monthlyDelta: 250,
            monthsAdvance: this.monthsSaved(goalValue, avgBalance, 250),
        });
        actions.sort((a, b) => b.monthsAdvance - a.monthsAdvance);
        return { goalValue, baseMonths, actions };
    }
    monthsSaved(goal, base, extra) {
        const withBase = Math.max(Math.ceil(goal / Math.max(base, 1)), 1);
        const withExtra = Math.max(Math.ceil(goal / Math.max(base + extra, 1)), 1);
        return Math.max(withBase - withExtra, 0);
    }
    async detectAnomalies(userId, months) {
        if (months.length < 4)
            return [];
        const rows = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: {
                    gte: this.calc.monthStart(months[0]),
                    lte: this.calc.monthStart(months[months.length - 1]),
                },
                expense: {
                    deletedAt: null,
                    OR: [
                        { ownerUserId: userId },
                        { scope: client_1.ExpenseScope.SHARED },
                    ],
                },
            },
            include: {
                expense: {
                    select: {
                        id: true,
                        title: true,
                        expenseType: true,
                        scope: true,
                    },
                },
            },
        });
        const grouped = new Map();
        for (const occ of rows) {
            if (occ.expense.expenseType !== 'FIXED' &&
                occ.expense.expenseType !== 'RECURRING') {
                continue;
            }
            const key = `${occ.expense.id}`;
            const ym = this.ym(occ.referenceMonth);
            const entry = grouped.get(key) ?? {
                title: occ.expense.title,
                values: [],
            };
            entry.values.push({ month: ym, amount: Number(occ.amount) });
            grouped.set(key, entry);
        }
        const anomalies = [];
        for (const [id, data] of grouped) {
            const history = data.values
                .slice()
                .sort((a, b) => a.month.localeCompare(b.month));
            if (history.length < 3)
                continue;
            const latest = history[history.length - 1];
            const past = history.slice(0, -1).map((v) => v.amount);
            const mean = this.avg(past);
            if (mean <= 0)
                continue;
            const percent = ((latest.amount - mean) / mean) * 100;
            if (Math.abs(percent) < 25)
                continue;
            anomalies.push({
                id,
                title: data.title,
                expected: mean,
                actual: latest.amount,
                percentChange: percent,
                occurrenceMonth: latest.month,
            });
        }
        anomalies.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
        return anomalies.slice(0, 6);
    }
    computeCategoryTrends(snapshots) {
        if (snapshots.length === 0)
            return [];
        const categories = new Set();
        for (const snap of snapshots) {
            Object.keys(snap.byCategory).forEach((c) => categories.add(c));
        }
        const trends = [];
        for (const category of categories) {
            const series = snapshots.map((s) => s.byCategory[category] ?? 0);
            const current = series[series.length - 1] ?? 0;
            const previous = series[series.length - 2] ?? 0;
            const avg = this.avg(series.filter((value) => value > 0));
            const delta = current - previous;
            const percentChange = previous > 0 ? (delta / previous) * 100 : 0;
            const slope = this.linearSlope(series);
            const slopePercent = avg > 0 ? (slope / avg) * 100 : 0;
            trends.push({
                category,
                series,
                average: avg,
                current,
                previous,
                delta,
                percentChange,
                slope,
                slopePercent,
            });
        }
        trends.sort((a, b) => b.current - a.current);
        return trends;
    }
    computeTrends(category) {
        return category
            .filter((trend) => Math.abs(trend.slopePercent) >= 2)
            .slice(0, 6)
            .map((trend) => ({
            id: `trend-${trend.category}`,
            label: `Gastos com ${trend.category}`,
            monthlyChangePercent: trend.slopePercent,
            projectedAnnualImpact: trend.slope * 12,
            direction: trend.slope > 0 ? 'UP' : trend.slope < 0 ? 'DOWN' : 'STABLE',
        }));
    }
    computeDiscoveries(snapshots, trends) {
        const out = [];
        if (snapshots.length < 4)
            return out;
        const recent = snapshots.slice(-6);
        const positive = recent.filter((s) => s.balance > 0);
        const negative = recent.filter((s) => s.balance <= 0);
        if (positive.length >= 2 && negative.length >= 1) {
            const avgPos = this.avg(positive.map((s) => s.expenses));
            const avgNeg = this.avg(negative.map((s) => s.expenses));
            if (avgNeg > avgPos) {
                const ratio = ((avgNeg - avgPos) / Math.max(avgPos, 1)) * 100;
                out.push({
                    id: 'discovery-balance-gap',
                    title: 'Meses negativos têm despesas significativamente maiores',
                    explanation: `Nos meses com saldo negativo, suas despesas ficam em média ${ratio.toFixed(0)}% acima dos meses com saldo positivo.`,
                    confidence: Math.min(90, 60 + positive.length * 5),
                    evidence: `${positive.length} meses positivos vs ${negative.length} meses negativos avaliados.`,
                    impact: avgNeg - avgPos,
                });
            }
        }
        const growing = [...trends]
            .filter((t) => t.slopePercent >= 5 && t.average > 0)
            .sort((a, b) => b.slopePercent - a.slopePercent)[0];
        if (growing) {
            out.push({
                id: `discovery-growth-${growing.category}`,
                title: `"${growing.category}" cresce de forma consistente`,
                explanation: `Categoria registrou aumento médio de ${growing.slopePercent.toFixed(1)}% ao mês nos últimos ${snapshots.length} meses.`,
                confidence: Math.min(95, 60 + Math.round(growing.slopePercent)),
                evidence: `Média da categoria: ${this.brl(growing.average)} / mês.`,
                impact: growing.slope * 12,
            });
        }
        const incomeCv = this.coefficientOfVariation(recent.map((s) => s.income).filter((value) => value > 0));
        if (incomeCv > 0.15) {
            out.push({
                id: 'discovery-income-volatility',
                title: 'Receita varia mês a mês',
                explanation: `Sua receita oscila aproximadamente ${(incomeCv * 100).toFixed(0)}% em torno da média, o que exige reserva mais robusta.`,
                confidence: 75,
                evidence: `${recent.length} meses analisados.`,
                impact: 0,
            });
        }
        const sharedAvg = this.avg(recent.map((s) => s.sharedResponsibility));
        const indivAvg = this.avg(recent.map((s) => s.individualExpenses));
        if (sharedAvg > 0 && indivAvg > 0) {
            const ratio = sharedAvg / (sharedAvg + indivAvg);
            if (ratio >= 0.45) {
                out.push({
                    id: 'discovery-shared-weight',
                    title: 'Despesas do casal pesam tanto quanto as individuais',
                    explanation: `Sua parte nas despesas compartilhadas representa ${(ratio * 100).toFixed(0)}% do total mensal.`,
                    confidence: 80,
                    evidence: 'Média móvel dos últimos 6 meses.',
                    impact: sharedAvg,
                });
            }
        }
        return out.slice(0, 5);
    }
    computeOpportunities(snapshots, trends, installments) {
        const out = [];
        const top = trends.filter((t) => t.current > 0).slice(0, 3);
        for (const trend of top) {
            const cut = trend.current * 0.15;
            if (cut < 30)
                continue;
            out.push({
                id: `opp-reduce-${trend.category}`,
                title: `Reduzir 15% dos gastos em "${trend.category}"`,
                description: `Categoria registra ${this.brl(trend.current)} no último mês. Pequenos ajustes podem se acumular ao longo do ano.`,
                annualImpact: cut * 12,
                difficulty: trend.slopePercent > 5 ? 'BAIXA' : 'MEDIA',
            });
        }
        if (installments.activeGroups > 0 && installments.totalPending > 1000) {
            out.push({
                id: 'opp-installments',
                title: 'Negociar quitação antecipada de parcelas',
                description: `Há ${installments.activeGroups} parcelamento(s) ativos somando ${this.brl(installments.totalPending)}. Quitar antecipadamente costuma render desconto.`,
                annualImpact: installments.totalPending * 0.05,
                difficulty: 'MEDIA',
            });
        }
        const recent = snapshots.slice(-3);
        const avgBalance = this.avg(recent.map((s) => s.balance));
        if (avgBalance > 500) {
            out.push({
                id: 'opp-emergency-fund',
                title: 'Direcionar parte do saldo para a reserva de emergência',
                description: `Saldo médio dos últimos meses é de ${this.brl(avgBalance)}. Transferir 50% disso fortalece a reserva sem comprometer o orçamento.`,
                annualImpact: avgBalance * 6,
                difficulty: 'MUITO_BAIXA',
            });
        }
        out.sort((a, b) => b.annualImpact - a.annualImpact);
        return out.slice(0, 6);
    }
    composeInsights(input) {
        const now = new Date().toISOString();
        const out = [];
        if (input.cashFlow.riskOfNegative && input.cashFlow.lowestBalanceDate) {
            const days = Math.ceil((new Date(input.cashFlow.lowestBalanceDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24));
            out.push({
                id: 'insight-negative-balance',
                kind: 'WARNING',
                title: 'Saldo pode ficar negativo em breve',
                description: `Projeção indica saldo de ${this.brl(input.cashFlow.lowestBalance)} em ${days} dias se nada mudar.`,
                impact: Math.abs(input.cashFlow.lowestBalance),
                priority: 'HIGH',
                confidence: 88,
                generatedAt: now,
            });
        }
        for (const anomaly of input.anomalies.slice(0, 3)) {
            out.push({
                id: `insight-anomaly-${anomaly.id}`,
                kind: 'WARNING',
                title: `"${anomaly.title}" fora do padrão`,
                description: `Conta ficou ${this.brl(anomaly.actual)}, ${anomaly.percentChange > 0 ? '+' : ''}${anomaly.percentChange.toFixed(0)}% acima da média esperada de ${this.brl(anomaly.expected)}.`,
                impact: Math.abs(anomaly.actual - anomaly.expected),
                priority: 'HIGH',
                confidence: 80,
                generatedAt: now,
            });
        }
        const fastGrowing = input.categoryTrends
            .filter((trend) => trend.percentChange >= 15 && trend.current > 100)
            .slice(0, 2);
        for (const trend of fastGrowing) {
            out.push({
                id: `insight-growth-${trend.category}`,
                kind: 'TREND',
                title: `Gastos com "${trend.category}" cresceram ${trend.percentChange.toFixed(0)}%`,
                description: `Categoria saiu de ${this.brl(trend.previous)} para ${this.brl(trend.current)} no mês mais recente.`,
                impact: trend.delta * 12,
                priority: 'MEDIUM',
                confidence: 78,
                generatedAt: now,
            });
        }
        for (const opportunity of input.opportunities.slice(0, 2)) {
            out.push({
                id: `insight-opportunity-${opportunity.id}`,
                kind: 'OPPORTUNITY',
                title: opportunity.title,
                description: opportunity.description,
                impact: opportunity.annualImpact,
                priority: 'MEDIUM',
                confidence: 70,
                generatedAt: now,
            });
        }
        if (input.healthScore.delta >= 5) {
            out.push({
                id: 'insight-health-up',
                kind: 'POSITIVE',
                title: 'Sua saúde financeira está melhorando',
                description: `Score subiu ${input.healthScore.delta} pontos em relação ao mês anterior.`,
                impact: 0,
                priority: 'LOW',
                confidence: 85,
                generatedAt: now,
            });
        }
        else if (input.healthScore.delta <= -5) {
            out.push({
                id: 'insight-health-down',
                kind: 'WARNING',
                title: 'Sua saúde financeira piorou',
                description: `Score caiu ${Math.abs(input.healthScore.delta)} pontos. Vale revisar despesas variáveis.`,
                impact: 0,
                priority: 'HIGH',
                confidence: 85,
                generatedAt: now,
            });
        }
        const lastBalance = input.snapshots[input.snapshots.length - 1]?.balance ?? 0;
        if (lastBalance > 0) {
            out.push({
                id: 'insight-positive-balance',
                kind: 'POSITIVE',
                title: 'Você fechou o mês no azul',
                description: `Saldo do mês foi de ${this.brl(lastBalance)}. Considere transferir parte para reserva ou aporte.`,
                impact: lastBalance,
                priority: 'LOW',
                confidence: 90,
                generatedAt: now,
            });
        }
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        out.sort((a, b) => {
            if (order[a.priority] !== order[b.priority]) {
                return order[a.priority] - order[b.priority];
            }
            return Math.abs(b.impact) - Math.abs(a.impact);
        });
        return out.slice(0, 8);
    }
    computeLifetimeImpact(snapshots) {
        const horizonYears = 20;
        const months = horizonYears * 12;
        const monthlyDelta = 300;
        const monthlyRate = 0.005;
        const start = snapshots[snapshots.length - 1]?.month ?? this.currentYm();
        const recent = snapshots.slice(-6);
        const avgBalance = Math.max(this.avg(recent.map((s) => s.balance)), 0);
        let current = avgBalance;
        let optimized = avgBalance;
        const series = [];
        for (let i = 1; i <= months; i++) {
            current = current * (1 + monthlyRate) + avgBalance;
            optimized = optimized * (1 + monthlyRate) + avgBalance + monthlyDelta;
            if (i % 6 === 0 || i === months) {
                series.push({
                    month: this.addMonths(start, i),
                    current,
                    optimized,
                });
            }
        }
        return {
            horizonYears,
            current,
            optimized,
            monthlyDeltaApplied: monthlyDelta,
            difference: optimized - current,
            series,
            notes: `Simulação assume aporte mensal extra de ${this.brl(monthlyDelta)} e rentabilidade média de 0,5% ao mês. Valores aproximados.`,
        };
    }
    computeRisk(snapshots, installments, baseSalary) {
        const recent = snapshots.slice(-6).filter((s) => s.expenses > 0 || s.income > 0);
        if (recent.length === 0) {
            return {
                level: 'MEDIO',
                score: 50,
                reasons: ['Histórico financeiro ainda insuficiente para avaliação confiável.'],
            };
        }
        const avgIncome = this.avg(recent.map((s) => s.income));
        const avgExpense = this.avg(recent.map((s) => s.expenses));
        const avgBalance = this.avg(recent.map((s) => s.balance));
        const reserveMonths = avgExpense > 0 ? Math.max(avgBalance, 0) / avgExpense : 0;
        const fixedRatio = avgIncome > 0 ? avgExpense / avgIncome : 1;
        const debtRatio = avgIncome > 0 ? installments.totalPending / (avgIncome * 12) : 0;
        const incomeStability = 1 - Math.min(this.coefficientOfVariation(recent.map((s) => s.income).filter((value) => value > 0)), 1);
        let score = 0;
        const reasons = [];
        score += this.clamp((6 - reserveMonths) / 6) * 35;
        if (reserveMonths < 3) {
            reasons.push(`Reserva cobre apenas ${reserveMonths.toFixed(1)} mês(es) de despesas.`);
        }
        score += this.clamp((fixedRatio - 0.6) / 0.4) * 25;
        if (fixedRatio >= 0.8) {
            reasons.push(`Gastos consomem ${(fixedRatio * 100).toFixed(0)}% da renda.`);
        }
        score += this.clamp(debtRatio / 0.5) * 20;
        if (debtRatio >= 0.2) {
            reasons.push(`Endividamento em parcelas equivale a ${(debtRatio * 100).toFixed(0)}% da renda anual.`);
        }
        score += this.clamp(1 - incomeStability) * 10;
        if (incomeStability < 0.7) {
            reasons.push('Renda mensal apresenta variação relevante.');
        }
        if (baseSalary <= 0) {
            score += 10;
            reasons.push('Salário base não configurado.');
        }
        const finalScore = Math.round(this.clamp(score / 100) * 100);
        const level = finalScore >= 80
            ? 'CRITICO'
            : finalScore >= 60
                ? 'ALTO'
                : finalScore >= 40
                    ? 'MEDIO'
                    : finalScore >= 20
                        ? 'BAIXO'
                        : 'MUITO_BAIXO';
        if (reasons.length === 0) {
            reasons.push('Indicadores principais dentro dos limites saudáveis.');
        }
        return { level, score: finalScore, reasons };
    }
    computeHabits(snapshots, trends, investments) {
        const recent = snapshots.slice(-6).filter((s) => s.income > 0 || s.expenses > 0);
        if (recent.length === 0) {
            return {
                value: 50,
                positives: [],
                attentions: ['Histórico ainda insuficiente para avaliar hábitos.'],
            };
        }
        const positiveMonths = recent.filter((s) => s.balance >= 0).length;
        const consistency = positiveMonths / recent.length;
        const stability = 1 - Math.min(this.coefficientOfVariation(recent.map((s) => s.expenses)), 1);
        const growingCount = trends.filter((t) => t.slopePercent >= 5).length;
        const reducingCount = trends.filter((t) => t.slopePercent <= -5).length;
        const investmentDiscipline = investments.individual.hasRegisteredContributions
            ? Math.min(investments.individual.consecutiveMonths / 6, 1)
            : 0;
        const value = Math.round(this.clamp(consistency * 0.3 +
            stability * 0.3 +
            investmentDiscipline * 0.25 +
            (reducingCount > growingCount ? 0.15 : 0.05)) * 100);
        const positives = [];
        const attentions = [];
        if (consistency >= 0.7)
            positives.push('Mantém saldo positivo na maioria dos meses.');
        else
            attentions.push(`Apenas ${positiveMonths} de ${recent.length} meses fecharam positivos.`);
        if (stability >= 0.7)
            positives.push('Despesas mensais com variação baixa.');
        else
            attentions.push('Despesas variam bastante entre os meses — revise gastos pequenos recorrentes.');
        if (investments.individual.consecutiveMonths >= 3) {
            positives.push(`Investiu individualmente por ${investments.individual.consecutiveMonths} meses seguidos (${this.brl(investments.individual.averageMonthly)}/mês em média).`);
        }
        else if (!investments.individual.hasRegisteredContributions) {
            attentions.push('Nenhum aporte individual registrado. Use a tela Investimentos → Individual.');
        }
        else if (investments.individual.vsPreviousMonth < 0) {
            attentions.push(`Aportes individuais caíram ${this.brl(Math.abs(investments.individual.vsPreviousMonth))} em relação ao mês anterior.`);
        }
        if (investments.couple?.hasRegisteredContributions) {
            positives.push(`Investimento conjunto: ${this.brl(investments.couple.monthTotal)} neste mês (total acumulado ${this.brl(investments.couple.allTimeTotal)}).`);
        }
        if (reducingCount > 0)
            positives.push(`${reducingCount} categoria(s) em redução consistente.`);
        if (growingCount > reducingCount) {
            attentions.push(`${growingCount} categoria(s) em tendência de alta — priorize cortes pontuais.`);
        }
        return { value, positives, attentions };
    }
    scopeMetrics(summary, income) {
        return {
            monthTotal: summary.monthTotal,
            allTimeTotal: summary.allTimeTotal,
            averageMonthly: summary.averageMonthly,
            percentOfIncome: income > 0 ? (summary.monthTotal / income) * 100 : 0,
            consecutiveMonths: summary.consecutiveMonths,
            vsPreviousMonth: summary.monthTotal - summary.previousMonthTotal,
            contributionsInMonth: summary.contributionsInMonth,
            hasRegisteredContributions: summary.contributionsAllTime > 0,
            byPartner: summary.byPartner,
        };
    }
    async loadInvestmentAnalysis(userId, reference, months) {
        const overview = await this.investments.summarizeOverview(userId, reference);
        const refSnapshot = await this.snapshotMonth(userId, reference);
        const income = refSnapshot.income;
        const indHistory = new Map(overview.individual.monthlyHistory.map((h) => [h.month, h.amount]));
        const coupleHistory = new Map((overview.couple?.monthlyHistory ?? []).map((h) => [h.month, h.amount]));
        const history = months.map((month) => ({
            month,
            individual: indHistory.get(month) ?? 0,
            couple: coupleHistory.get(month) ?? 0,
        }));
        return {
            referenceMonth: reference,
            targetPercent: overview.targetPercent,
            individual: this.scopeMetrics(overview.individual, income),
            couple: overview.couple
                ? this.scopeMetrics(overview.couple, income)
                : null,
            history,
        };
    }
    async detectMicroExpenses(userId, months) {
        if (months.length === 0)
            return [];
        const minMonth = this.calc.monthStart(months[0]);
        const maxMonth = this.calc.monthStart(months[months.length - 1]);
        const rows = await this.prisma.expenseOccurrence.findMany({
            where: {
                deletedAt: null,
                referenceMonth: { gte: minMonth, lte: maxMonth },
                status: { not: client_1.ExpenseStatus.CANCELLED },
                expense: {
                    deletedAt: null,
                    OR: [{ ownerUserId: userId }, { scope: client_1.ExpenseScope.SHARED }],
                },
            },
            include: {
                expense: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        expenseType: true,
                    },
                },
            },
        });
        const grouped = new Map();
        for (const occ of rows) {
            const amount = Number(occ.amount);
            if (amount <= 0 || amount > 120)
                continue;
            const key = `${occ.expense.id}`;
            const entry = grouped.get(key) ?? {
                title: occ.expense.title,
                category: occ.expense.category,
                amounts: [],
                expenseType: occ.expense.expenseType,
            };
            entry.amounts.push(amount);
            grouped.set(key, entry);
        }
        const micro = [];
        for (const [id, data] of grouped) {
            const avg = this.avg(data.amounts);
            const total = data.amounts.reduce((sum, value) => sum + value, 0);
            const isRecurring = data.expenseType === 'FIXED' ||
                data.expenseType === 'RECURRING' ||
                data.amounts.length >= 2;
            if (!isRecurring && avg > 80)
                continue;
            const monthlyEstimate = isRecurring ? avg : total / Math.max(months.length, 1);
            if (monthlyEstimate < 15)
                continue;
            micro.push({
                id,
                title: data.title,
                category: data.category,
                amount: avg,
                occurrences: data.amounts.length,
                annualImpact: monthlyEstimate * 12,
                insight: avg <= 40
                    ? 'Gasto pequeno que passa despercebido, mas se repete.'
                    : 'Valor baixo por lançamento, porém relevante no acumulado mensal.',
            });
        }
        micro.sort((a, b) => b.annualImpact - a.annualImpact);
        return micro.slice(0, 8);
    }
    composeChallenges(input) {
        const out = [];
        const current = input.snapshots[input.snapshots.length - 1];
        const ind = input.investments.individual;
        const couple = input.investments.couple;
        const targetPct = input.investments.targetPercent;
        const savingsCurrent = Math.max(0, current.balance);
        const savingsTarget = Math.max(current.expenses * 0.1, 100);
        out.push({
            id: 'challenge-monthly-savings',
            kind: 'SAVINGS',
            title: 'Desafio: meta de economia do mês',
            description: `Guarde pelo menos ${this.brl(savingsTarget)} neste mês. Saldo atual: ${this.brl(savingsCurrent)}.`,
            tasks: [
                'Revise os gastos pequenos listados abaixo e corte 1 assinatura ou hábito.',
                'Antes de compras não essenciais, espere 24 horas.',
                'Registre no app cada economia conseguida para acompanhar o progresso.',
            ],
            estimatedSaving: savingsTarget * 12,
            priority: current.balance < 0 ? 'HIGH' : 'MEDIUM',
            difficulty: 'MODERADO',
            category: 'Economia',
            progress: {
                current: savingsCurrent,
                target: savingsTarget,
                unit: 'BRL',
                label: 'Economia do mês',
            },
            xp: Math.round(Math.min(savingsCurrent / savingsTarget, 1) * 200),
            badge: savingsCurrent >= savingsTarget ? 'Poupador do mês' : undefined,
            level: 2,
        });
        if (!ind.hasRegisteredContributions) {
            out.push({
                id: 'challenge-register-individual',
                kind: 'INVESTMENT',
                title: 'Primeiro aporte individual',
                description: 'Registre seu primeiro aporte na tela Investimentos → Individual para a IA acompanhar sua evolução.',
                tasks: [
                    'Abra Investimentos → Individual.',
                    'Informe valor e mês de referência do aporte.',
                    'Volte ao Assistente para ver score e desafios atualizados.',
                ],
                estimatedSaving: 0,
                priority: 'HIGH',
                difficulty: 'FACIL',
                progress: { current: 0, target: 1, unit: 'COUNT', label: 'Aportes registrados' },
                xp: 50,
                level: 1,
            });
        }
        else if (ind.percentOfIncome < targetPct) {
            const gap = (targetPct / 100) * Math.max(input.currentIncome, 1) - ind.monthTotal;
            out.push({
                id: 'challenge-increase-individual',
                kind: 'INVESTMENT',
                title: 'Subir aportes individuais',
                description: `Individual: ${ind.percentOfIncome.toFixed(0)}% da renda (meta ${targetPct}%). Acumulado: ${this.brl(ind.allTimeTotal)}.`,
                tasks: [
                    `Registre aporte adicional de pelo menos ${this.brl(Math.max(gap, 50))}.`,
                    'Revise despesas variáveis antes de aportar.',
                    'Mantenha o hábito por 3 meses seguidos.',
                ],
                estimatedSaving: 0,
                priority: 'MEDIUM',
                difficulty: 'MODERADO',
                category: 'Investimentos individuais',
                progress: {
                    current: ind.monthTotal,
                    target: (targetPct / 100) * Math.max(input.currentIncome, 1),
                    unit: 'BRL',
                    label: 'Aporte individual no mês',
                },
                xp: 120,
                level: 3,
            });
        }
        if (ind.consecutiveMonths > 0) {
            out.push({
                id: 'challenge-streak-individual',
                kind: 'STREAK',
                title: 'Sequência de aportes individuais',
                description: `${ind.consecutiveMonths} mês(es) seguidos investindo. Meta: 3 meses consecutivos.`,
                tasks: [
                    'Registre o aporte deste mês antes do dia 25.',
                    'Defina lembrete mensal no celular.',
                    'Ao completar 3 meses, aumente o valor em 10%.',
                ],
                estimatedSaving: 0,
                priority: 'LOW',
                difficulty: 'FACIL',
                category: 'Investimentos individuais',
                progress: {
                    current: ind.consecutiveMonths,
                    target: 3,
                    unit: 'COUNT',
                    label: 'Meses consecutivos',
                },
                xp: ind.consecutiveMonths * 40,
                badge: ind.consecutiveMonths >= 3 ? 'Investidor consistente' : undefined,
                level: ind.consecutiveMonths >= 3 ? 3 : 1,
            });
        }
        if (couple) {
            if (!couple.hasRegisteredContributions) {
                out.push({
                    id: 'challenge-register-couple',
                    kind: 'INVESTMENT',
                    title: 'Primeiro aporte conjunto',
                    description: 'Registrem aportes na tela Investimentos do casal. Ambos veem o total somado.',
                    tasks: [
                        'Abra Investimentos → Casal.',
                        'Cada parceiro registra sua parte do aporte conjunto.',
                        'O total exibido soma os aportes de todos os parceiros.',
                    ],
                    estimatedSaving: 0,
                    priority: 'MEDIUM',
                    difficulty: 'FACIL',
                    category: 'Investimentos do casal',
                    progress: { current: 0, target: 1, unit: 'COUNT', label: 'Aportes conjuntos' },
                    xp: 75,
                    level: 1,
                });
            }
            else {
                out.push({
                    id: 'challenge-couple-month',
                    kind: 'INVESTMENT',
                    title: 'Meta conjunta do casal',
                    description: `Total conjunto no mês: ${this.brl(couple.monthTotal)} · Acumulado: ${this.brl(couple.allTimeTotal)}.`,
                    tasks: [
                        ...(couple.byPartner?.map((p) => `${p.name}: ${this.brl(p.monthAmount)} neste mês.`) ?? []),
                        'Combinem um valor mínimo conjunto para o próximo mês.',
                    ].slice(0, 3),
                    estimatedSaving: 0,
                    priority: 'MEDIUM',
                    difficulty: 'MODERADO',
                    category: 'Investimentos do casal',
                    progress: {
                        current: couple.monthTotal,
                        target: Math.max(couple.averageMonthly, couple.monthTotal, 100),
                        unit: 'BRL',
                        label: 'Aporte conjunto no mês',
                    },
                    xp: 100,
                    badge: couple.consecutiveMonths >= 2 ? 'Time investidor' : undefined,
                    level: 2,
                });
            }
        }
        for (const micro of input.microExpenses.slice(0, 3)) {
            out.push({
                id: `challenge-micro-${micro.id}`,
                kind: 'MICRO_EXPENSE',
                title: `Caça: "${micro.title}"`,
                description: `${micro.insight} Impacto anual: ${this.brl(micro.annualImpact)}.`,
                tasks: [
                    `Confira ${micro.occurrences} lançamento(s) de ~${this.brl(micro.amount)}.`,
                    'Cancele, troque ou limite a 1x por semana.',
                    'Marque como concluído quando eliminar o gasto.',
                ],
                estimatedSaving: micro.annualImpact,
                priority: micro.annualImpact >= 600 ? 'HIGH' : 'MEDIUM',
                difficulty: 'FACIL',
                category: micro.category,
                progress: {
                    current: 0,
                    target: micro.amount * micro.occurrences,
                    unit: 'BRL',
                    label: 'Gasto a eliminar',
                },
                xp: Math.min(150, Math.round(micro.annualImpact / 10)),
                badge: 'Caçador de gastos',
                level: 1,
            });
        }
        const wasteful = input.categoryTrends
            .filter((t) => t.current > 200 && t.percentChange >= 10)
            .sort((a, b) => b.delta - a.delta)
            .slice(0, 2);
        for (const trend of wasteful) {
            const cut = Math.round(trend.current * 0.2);
            out.push({
                id: `challenge-cut-${trend.category}`,
                kind: 'CATEGORY_CUT',
                title: `Corte 20% em "${trend.category}"`,
                description: `Subiu ${trend.percentChange.toFixed(0)}% · ${this.brl(trend.current)}/mês.`,
                tasks: [
                    `Liste os 3 maiores gastos de "${trend.category}".`,
                    'Elimine 1 e reduza outro pela metade.',
                    `Meta: economizar ${this.brl(cut)} até o fim do mês.`,
                ],
                estimatedSaving: cut * 12,
                priority: 'MEDIUM',
                difficulty: 'MODERADO',
                category: trend.category,
                progress: { current: 0, target: cut, unit: 'BRL', label: 'Economia na categoria' },
                xp: 180,
                level: 3,
            });
        }
        if (current.balance < 0) {
            out.unshift({
                id: 'challenge-negative-balance',
                kind: 'BALANCE',
                title: 'Estancar saldo negativo',
                description: `Saldo ${this.brl(current.balance)}. Priorize cortes antes de novos aportes.`,
                tasks: [
                    'Pause compras não essenciais por 7 dias.',
                    'Revise assinaturas nos micro-gastos.',
                    'Negocie contas com vencimento próximo.',
                ],
                estimatedSaving: Math.abs(current.balance),
                priority: 'HIGH',
                difficulty: 'MODERADO',
                progress: {
                    current: Math.abs(current.balance),
                    target: 0,
                    unit: 'BRL',
                    label: 'Déficit a zerar',
                },
                xp: 250,
                badge: 'Recuperação financeira',
                level: 4,
            });
        }
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        out.sort((a, b) => {
            if (order[a.priority] !== order[b.priority]) {
                return order[a.priority] - order[b.priority];
            }
            return b.xp - a.xp;
        });
        return out.slice(0, 10);
    }
    challengesToInsights(challenges) {
        const now = new Date().toISOString();
        return challenges.map((challenge) => ({
            id: challenge.id,
            kind: challenge.estimatedSaving > 0 ? 'OPPORTUNITY' : 'NEUTRAL',
            title: challenge.title,
            description: challenge.description,
            impact: challenge.estimatedSaving,
            priority: challenge.priority,
            confidence: 85,
            generatedAt: now,
            tasks: challenge.tasks,
        }));
    }
    async countTransactions(userId, months) {
        if (months.length === 0)
            return 0;
        const min = this.calc.monthStart(months[0]);
        const max = this.calc.monthStart(months[months.length - 1]);
        const [occurrences, incomes] = await Promise.all([
            this.prisma.expenseOccurrence.count({
                where: {
                    deletedAt: null,
                    referenceMonth: { gte: min, lte: max },
                    expense: {
                        deletedAt: null,
                        OR: [{ ownerUserId: userId }, { scope: client_1.ExpenseScope.SHARED }],
                    },
                },
            }),
            this.prisma.income.count({
                where: {
                    deletedAt: null,
                    userId,
                    referenceMonth: { gte: min, lte: max },
                },
            }),
        ]);
        return occurrences + incomes;
    }
    async activeInstallmentsForUser(userId) {
        const groups = await this.prisma.installmentGroup.findMany({
            where: {
                OR: [{ userId }, { couple: { OR: [{ userAId: userId }, { userBId: userId }] } }],
                expenses: {
                    some: {
                        deletedAt: null,
                        occurrences: {
                            some: {
                                deletedAt: null,
                                status: { in: [client_1.ExpenseStatus.PENDING, client_1.ExpenseStatus.OVERDUE] },
                            },
                        },
                    },
                },
            },
            include: {
                expenses: {
                    where: { deletedAt: null },
                    include: {
                        occurrences: {
                            where: {
                                deletedAt: null,
                                status: { in: [client_1.ExpenseStatus.PENDING, client_1.ExpenseStatus.OVERDUE] },
                            },
                        },
                    },
                },
            },
        });
        let total = 0;
        let activeGroups = 0;
        for (const group of groups) {
            const pending = group.expenses
                .flatMap((expense) => expense.occurrences)
                .reduce((sum, occ) => sum.add(occ.amount), new client_1.Prisma.Decimal(0));
            if (pending.gt(0)) {
                total += Number(pending);
                activeGroups += 1;
            }
        }
        return { totalPending: total, activeGroups };
    }
    avg(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    coefficientOfVariation(values) {
        const meaningful = values.filter((value) => Number.isFinite(value));
        if (meaningful.length < 2)
            return 0;
        const mean = this.avg(meaningful);
        if (mean === 0)
            return 0;
        const variance = meaningful.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            meaningful.length;
        return Math.sqrt(variance) / Math.abs(mean);
    }
    linearSlope(values) {
        if (values.length < 2)
            return 0;
        const n = values.length;
        const meanX = (n - 1) / 2;
        const meanY = this.avg(values);
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
            num += (i - meanX) * (values[i] - meanY);
            den += (i - meanX) ** 2;
        }
        return den === 0 ? 0 : num / den;
    }
    clamp(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, value));
    }
    normaliseMonth(monthYm) {
        if (monthYm && /^\d{4}-\d{2}$/.test(monthYm))
            return monthYm;
        return this.currentYm();
    }
    currentYm() {
        const d = new Date();
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    ym(date) {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    addMonths(ym, delta) {
        const [y, m] = ym.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1 + delta, 1));
        return this.ym(d);
    }
    lastMonths(monthYm, count) {
        const out = [];
        for (let i = count - 1; i >= 0; i--) {
            out.push(this.addMonths(monthYm, -i));
        }
        return out;
    }
    brl(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 2,
        }).format(Number.isFinite(value) ? value : 0);
    }
};
exports.InsightsService = InsightsService;
exports.InsightsService = InsightsService = InsightsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        financial_calculation_service_1.FinancialCalculationService,
        investments_service_1.InvestmentsService])
], InsightsService);
//# sourceMappingURL=insights.service.js.map