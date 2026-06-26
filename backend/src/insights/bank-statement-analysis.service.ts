import { Injectable } from '@nestjs/common';
import { BankStatementEntry, DetectedBank } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankMovementType,
  classifyBankMovement,
  movementTypeLabel,
} from './bank-movement.classifier';
import { inferSpendingCategory, isInvestmentMovement } from '../statement-imports/parsers/category-guess';
import {
  ContextRuleLike,
  findMatchingRule,
  normalizeMatchLabel,
} from '../finance-context/finance-context.matcher';

/* ------------------------------------------------------------------ */
/* Public types — mirrored on the frontend                            */
/* ------------------------------------------------------------------ */

export interface BankAnalysisInsight {
  id: string;
  tone: 'POSITIVE' | 'ATTENTION' | 'CRITICAL' | 'INFO';
  title: string;
  message: string;
  tip?: string;
}

export interface BankMonthBreakdown {
  month: string;
  totalIn: number;
  totalOut: number;
  net: number;
  investedApplied: number;
  investedRedeemed: number;
  netInvested: number;
  savedInAccount: number;
  untouchedInflow: number;
  transactionCount: number;
}

export interface InvestmentRedemptionEvent {
  date: string;
  month: string;
  amount: number;
}

export interface InvestmentLotTracking {
  id: string;
  appliedDate: string;
  appliedMonth: string;
  originalAmount: number;
  remainingAmount: number;
  status: 'ACTIVE' | 'PARTIAL' | 'REDEEMED';
  monthsHeldBeforeFirstRedemption: number;
  redemptions: InvestmentRedemptionEvent[];
  narrative: string;
}

export interface BankRecurringExpense {
  id: string;
  label: string;
  category: string;
  averageAmount: number;
  totalInPeriod: number;
  occurrences: number;
  monthsActive: number;
  isCrossMonthRecurring: boolean;
  annualizedEstimate: number;
  lastSeenMonth: string;
}

export interface BankSpendingCategoryRow {
  category: string;
  total: number;
  count: number;
  sharePercent: number;
}

export interface BankSpendingDetail {
  date: string;
  amount: number;
  merchant: string;
  category: string;
  detail: string;
  isRecurring: boolean;
  userMotive?: string;
  matchLabel?: string;
}

export interface BankSpendingAnalysis {
  referenceMonth: string;
  totalIncome: number;
  totalSpent: number;
  balance: number;
  spentMoreThanEarned: boolean;
  overspendAmount: number;
  deficitReason: string;
  topCategories: BankSpendingCategoryRow[];
  expenseDetails: BankSpendingDetail[];
  largestExpense: {
    date: string;
    amount: number;
    label: string;
    description: string;
    category: string;
  } | null;
  recurringExpenses: BankRecurringExpense[];
  /** Até 3 ações diretas — o que fazer para reduzir ou prestar atenção. */
  actions: string[];
}

export interface BankStatementAnalysis {
  hasData: boolean;
  referenceMonth: string;
  banks: string[];
  monthsCovered: string[];
  totalMovements: number;
  currentlyInvested: number;
  totalAppliedAllTime: number;
  totalRedeemedAllTime: number;
  savedInAccountTotal: number;
  referenceMonthBreakdown: BankMonthBreakdown | null;
  monthlyBreakdown: BankMonthBreakdown[];
  investmentLots: InvestmentLotTracking[];
  spendingAnalysis: BankSpendingAnalysis | null;
  /** Até 3 frases curtas sobre investimentos e fluxo — substituem dezenas de cards. */
  movementSummary: string[];
  insights: BankAnalysisInsight[];
  recommendations: string[];
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

interface ClassifiedEntry {
  id: string;
  date: Date;
  month: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  description: string;
  bank: DetectedBank;
  category: string | null;
  type: BankMovementType;
}

interface InternalLot {
  id: string;
  appliedDate: Date;
  appliedMonth: string;
  originalAmount: number;
  remaining: number;
  redemptions: InvestmentRedemptionEvent[];
  firstRedemptionDate: Date | null;
}

interface RecurringGroup {
  key: string;
  label: string;
  category: string;
  amounts: number[];
  months: Set<string>;
  entries: ClassifiedEntry[];
}

const SPENDING_DEBIT_TYPES: BankMovementType[] = [
  'EXPENSE',
  'TRANSFER_OUT',
  'CARD_BILL',
  'OTHER',
];

const SMALL_EXPENSE_THRESHOLD = 120;

const BANK_LABELS: Record<DetectedBank, string> = {
  NUBANK: 'Nubank',
  INTER: 'Banco Inter',
  BRADESCO: 'Bradesco',
  PICPAY: 'PicPay',
  ITAU: 'Itaú',
  SANTANDER: 'Santander',
  CAIXA: 'Caixa',
  GENERIC: 'Outro banco',
};

@Injectable()
export class BankStatementAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(
    userId: string,
    referenceMonth: string,
    contextRules: ContextRuleLike[] = [],
  ): Promise<BankStatementAnalysis> {
    const empty = this.emptyAnalysis(referenceMonth);

    const rows = await this.prisma.bankStatementEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    });

    if (rows.length === 0) return empty;

    const entries = rows.map((row) => this.classify(row));
    const monthsCovered = [
      ...new Set(entries.map((e) => e.month)),
    ].sort();
    const banks = [
      ...new Set(entries.map((e) => BANK_LABELS[e.bank] ?? e.bank)),
    ];

    const monthlyBreakdown = this.buildMonthlyBreakdown(entries, monthsCovered);
    const { lots, currentlyInvested, totalApplied, totalRedeemed } =
      this.trackInvestmentLots(entries);
    const investmentLots = lots.map((lot) => this.lotToTracking(lot, entries));
    const savedInAccountTotal = monthlyBreakdown.reduce(
      (sum, m) => sum + Math.max(m.savedInAccount, 0),
      0,
    );

    const refBreakdown =
      monthlyBreakdown.find((m) => m.month === referenceMonth) ?? null;

    const spendingAnalysis = this.composeSpendingAnalysis({
      referenceMonth,
      refBreakdown,
      entries,
      monthsCovered,
      contextRules,
    });

    const movementSummary = this.composeMovementSummary({
      referenceMonth,
      refBreakdown,
      currentlyInvested,
    });

    const insights = this.composeInsights({
      referenceMonth,
      monthlyBreakdown,
      refBreakdown,
      investmentLots,
      currentlyInvested,
      totalApplied,
      totalRedeemed,
      entries,
      skipSpending: !!spendingAnalysis,
    });
    const recommendations = this.composeRecommendations({
      refBreakdown,
      currentlyInvested,
      monthlyBreakdown,
      investmentLots,
      spendingAnalysis,
    }).slice(0, 3);

    return {
      hasData: true,
      referenceMonth,
      banks,
      monthsCovered,
      totalMovements: entries.length,
      currentlyInvested,
      totalAppliedAllTime: totalApplied,
      totalRedeemedAllTime: totalRedeemed,
      savedInAccountTotal,
      referenceMonthBreakdown: refBreakdown,
      monthlyBreakdown,
      investmentLots,
      spendingAnalysis,
      movementSummary,
      insights,
      recommendations,
    };
  }

  /** Text summary for RAG / chat context */
  formatForRag(analysis: BankStatementAnalysis): string[] {
    if (!analysis.hasData) return [];

    const docs: string[] = [];
    docs.push(
      `[Análise do extrato bancário] ${analysis.totalMovements} movimentações em ${analysis.monthsCovered.length} mês(es) (${analysis.banks.join(', ')}). Investido atualmente: ${this.brl(analysis.currentlyInvested)}. Total aplicado: ${this.brl(analysis.totalAppliedAllTime)}. Total resgatado: ${this.brl(analysis.totalRedeemedAllTime)}. Guardado em conta (acumulado): ${this.brl(analysis.savedInAccountTotal)}.`,
    );

    for (const month of analysis.monthlyBreakdown) {
      docs.push(
        `[Extrato ${month.month}] entradas: ${this.brl(month.totalIn)} | saídas: ${this.brl(month.totalOut)} | saldo: ${this.brl(month.net)} | aplicado em investimentos: ${this.brl(month.investedApplied)} | resgatado: ${this.brl(month.investedRedeemed)} | guardado em conta: ${this.brl(month.savedInAccount)} | ${month.transactionCount} lançamentos.`,
      );
    }

    for (const lot of analysis.investmentLots.filter((l) => l.status !== 'REDEEMED').slice(0, 20)) {
      docs.push(`[Investimento RDB] ${lot.narrative}`);
    }

    for (const insight of analysis.insights.slice(0, 16)) {
      docs.push(`[Insight extrato] ${insight.title}: ${insight.message}${insight.tip ? ` Dica: ${insight.tip}` : ''}`);
    }

    const spend = analysis.spendingAnalysis;
    if (spend) {
      docs.push(
        `[Gastos extrato ${spend.referenceMonth}] entradas ${this.brl(spend.totalIncome)} | gastos ${this.brl(spend.totalSpent)} | saldo ${this.brl(spend.balance)}${spend.spentMoreThanEarned ? ` | déficit ${this.brl(spend.overspendAmount)}` : ''}. ${spend.deficitReason}`,
      );
      for (const cat of spend.topCategories.slice(0, 5)) {
        docs.push(
          `[Gasto por categoria ${cat.category}] ${this.brl(cat.total)} (${cat.sharePercent.toFixed(0)}% dos gastos, ${cat.count} lançamentos).`,
        );
      }
      for (const rec of spend.recurringExpenses.slice(0, 12)) {
        docs.push(
          `[Gasto recorrente] ${rec.label} (${rec.category}): ${rec.occurrences}x, média ${this.brl(rec.averageAmount)}, total ${this.brl(rec.totalInPeriod)}${rec.isCrossMonthRecurring ? ', em vários meses' : ''}.`,
        );
      }
      const taught = spend.expenseDetails.filter((d) => d.userMotive);
      for (const detail of taught) {
        docs.push(
          `[Gasto explicado pelo usuário] ${detail.date} ${detail.merchant} ${this.brl(detail.amount)} [${detail.category}]: ${detail.userMotive}`,
        );
      }
      for (const action of spend.actions) {
        docs.push(`[Ação recomendada extrato] ${action}`);
      }
      for (const detail of spend.expenseDetails.slice(0, 40)) {
        docs.push(
          `[Gasto ${detail.category}] ${detail.date} ${detail.merchant} ${this.brl(detail.amount)} — ${detail.detail}${detail.isRecurring ? ' (recorrente)' : ''}`,
        );
      }
    }

    return docs;
  }

  private classify(row: BankStatementEntry): ClassifiedEntry {
    const amount = Number(row.amount);
    const direction = row.direction as 'DEBIT' | 'CREDIT';
    const date = row.transactionDate;
    return {
      id: row.id,
      date,
      month: this.ym(date),
      amount,
      direction,
      description: row.description,
      bank: row.bank,
      category: row.category,
      type: classifyBankMovement(row.description, direction),
    };
  }

  private buildMonthlyBreakdown(
    entries: ClassifiedEntry[],
    months: string[],
  ): BankMonthBreakdown[] {
    return months.map((month) => {
      const monthEntries = entries.filter((e) => e.month === month);
      let totalIn = 0;
      let totalOut = 0;
      let investedApplied = 0;
      let investedRedeemed = 0;
      let inflowNotInvested = 0;

      for (const e of monthEntries) {
        if (e.direction === 'CREDIT') totalIn += e.amount;
        else totalOut += e.amount;

        if (e.type === 'INVESTMENT_APPLY') investedApplied += e.amount;
        if (e.type === 'INVESTMENT_REDEEM') investedRedeemed += e.amount;

        if (
          e.direction === 'CREDIT' &&
          e.type !== 'INVESTMENT_REDEEM' &&
          e.type !== 'CARD_BILL'
        ) {
          inflowNotInvested += e.amount;
        }
      }

      const operationalIn = totalIn - investedRedeemed;
      const operationalOut = totalOut - investedApplied;
      const net = totalIn - totalOut;
      const savedInAccount = Math.max(operationalIn - operationalOut, 0);
      const untouchedInflow = Math.max(inflowNotInvested - (operationalOut - investedApplied > 0 ? operationalOut - investedApplied : 0), 0);

      return {
        month,
        totalIn: this.round(totalIn),
        totalOut: this.round(totalOut),
        net: this.round(net),
        investedApplied: this.round(investedApplied),
        investedRedeemed: this.round(investedRedeemed),
        netInvested: this.round(investedApplied - investedRedeemed),
        savedInAccount: this.round(savedInAccount),
        untouchedInflow: this.round(untouchedInflow),
        transactionCount: monthEntries.length,
      };
    });
  }

  private trackInvestmentLots(entries: ClassifiedEntry[]) {
    const lots: InternalLot[] = [];
    let totalApplied = 0;
    let totalRedeemed = 0;

    for (const entry of entries) {
      if (entry.type === 'INVESTMENT_APPLY') {
        totalApplied += entry.amount;
        lots.push({
          id: entry.id,
          appliedDate: entry.date,
          appliedMonth: entry.month,
          originalAmount: entry.amount,
          remaining: entry.amount,
          redemptions: [],
          firstRedemptionDate: null,
        });
      }

      if (entry.type === 'INVESTMENT_REDEEM') {
        totalRedeemed += entry.amount;
        let left = entry.amount;
        for (const lot of lots) {
          if (left <= 0) break;
          if (lot.remaining <= 0) continue;
          const take = Math.min(left, lot.remaining);
          lot.remaining = this.round(lot.remaining - take);
          if (!lot.firstRedemptionDate) lot.firstRedemptionDate = entry.date;
          lot.redemptions.push({
            date: this.ymd(entry.date),
            month: entry.month,
            amount: this.round(take),
          });
          left = this.round(left - take);
        }
      }
    }

    const currentlyInvested = this.round(
      lots.reduce((sum, lot) => sum + lot.remaining, 0),
    );

    return {
      lots,
      currentlyInvested,
      totalApplied: this.round(totalApplied),
      totalRedeemed: this.round(totalRedeemed),
    };
  }

  private lotToTracking(lot: InternalLot, allEntries: ClassifiedEntry[]): InvestmentLotTracking {
    const redeemed = this.round(lot.originalAmount - lot.remaining);
    const status: InvestmentLotTracking['status'] =
      lot.remaining <= 0 ? 'REDEEMED' : redeemed > 0 ? 'PARTIAL' : 'ACTIVE';

    let monthsHeld = 0;
    if (lot.firstRedemptionDate) {
      monthsHeld = this.monthDiff(lot.appliedMonth, this.ym(lot.firstRedemptionDate));
    } else if (lot.remaining > 0) {
      const lastMonth = allEntries[allEntries.length - 1]?.month ?? lot.appliedMonth;
      monthsHeld = this.monthDiff(lot.appliedMonth, lastMonth);
    }

    const appliedLabel = this.monthLabel(lot.appliedMonth);
    let narrative: string;

    if (status === 'ACTIVE') {
      narrative =
        monthsHeld > 0
          ? `${this.brl(lot.originalAmount)} aplicados em ${appliedLabel} e mantidos investidos por ${monthsHeld} mês(es) — ainda ${this.brl(lot.remaining)} no RDB.`
          : `${this.brl(lot.originalAmount)} aplicados em ${appliedLabel} — ainda investidos (${this.brl(lot.remaining)}).`;
    } else if (status === 'PARTIAL') {
      const firstRedeem = lot.redemptions[0];
      const heldLabel = this.monthLabel(firstRedeem.month);
      narrative =
        monthsHeld >= 1
          ? `${this.brl(lot.originalAmount)} aplicados em ${appliedLabel}, permaneceram investidos por ${monthsHeld} mês(es) antes do primeiro resgate em ${heldLabel} (${this.brl(firstRedeem.amount)}). Restam ${this.brl(lot.remaining)} investidos.`
          : `${this.brl(lot.originalAmount)} aplicados em ${appliedLabel}; resgate parcial de ${this.brl(redeemed)}. Restam ${this.brl(lot.remaining)} investidos.`;
    } else {
      const totalRedeemed = lot.redemptions.reduce((s, r) => s + r.amount, 0);
      narrative = `${this.brl(lot.originalAmount)} aplicados em ${appliedLabel} — totalmente resgatados (${this.brl(totalRedeemed)}).`;
    }

    return {
      id: lot.id,
      appliedDate: this.ymd(lot.appliedDate),
      appliedMonth: lot.appliedMonth,
      originalAmount: lot.originalAmount,
      remainingAmount: lot.remaining,
      status,
      monthsHeldBeforeFirstRedemption: monthsHeld,
      redemptions: lot.redemptions,
      narrative,
    };
  }

  private composeInsights(input: {
    referenceMonth: string;
    monthlyBreakdown: BankMonthBreakdown[];
    refBreakdown: BankMonthBreakdown | null;
    investmentLots: InvestmentLotTracking[];
    currentlyInvested: number;
    totalApplied: number;
    totalRedeemed: number;
    entries: ClassifiedEntry[];
    skipSpending?: boolean;
  }): BankAnalysisInsight[] {
    const insights: BankAnalysisInsight[] = [];
    let seq = 0;
    const add = (
      tone: BankAnalysisInsight['tone'],
      title: string,
      message: string,
      tip?: string,
    ) => {
      insights.push({
        id: `bank-insight-${++seq}`,
        tone,
        title,
        message,
        tip,
      });
    };

    const refLabel = this.monthLabel(input.referenceMonth);

    if (input.refBreakdown) {
      const m = input.refBreakdown;
      if (m.investedApplied > 0) {
        add(
          'POSITIVE',
          `Investimento em ${refLabel}`,
          `Aplicou ${this.brl(m.investedApplied)} em RDB${m.investedRedeemed > 0 ? ` e resgatou ${this.brl(m.investedRedeemed)}` : ''}.`,
        );
      }
      if (m.investedRedeemed > m.investedApplied && m.investedRedeemed > 0) {
        add(
          'ATTENTION',
          `Resgates acima de aplicações em ${refLabel}`,
          `Resgatou ${this.brl(m.investedRedeemed)} e aplicou ${this.brl(m.investedApplied)}.`,
        );
      }
    }

    if (input.currentlyInvested > 0) {
      add(
        'POSITIVE',
        'Patrimônio investido no RDB',
        `Há ${this.brl(input.currentlyInvested)} ainda aplicados, rastreados a partir do extrato.`,
      );
    }

    return insights.slice(0, 3);
  }

  private composeRecommendations(input: {
    refBreakdown: BankMonthBreakdown | null;
    currentlyInvested: number;
    monthlyBreakdown: BankMonthBreakdown[];
    investmentLots: InvestmentLotTracking[];
    spendingAnalysis: BankSpendingAnalysis | null;
  }): string[] {
    const tips: string[] = [];

    if (!input.refBreakdown) {
      return ['Importe extratos de mais meses para a IA rastrear investimentos entre períodos.'];
    }

    const m = input.refBreakdown;

    if (m.net < 0 && !input.spendingAnalysis?.spentMoreThanEarned) {
      tips.push(
        'O fluxo bruto fechou negativo por resgates/aplicações — seu consumo real está na análise de gastos.',
      );
    }

    if (input.investmentLots.some((l) => l.status === 'PARTIAL')) {
      tips.push('Evite resgates parciais antes do prazo para não perder rendimento.');
    }

    return tips.slice(0, 2);
  }

  private composeSpendingAnalysis(input: {
    referenceMonth: string;
    refBreakdown: BankMonthBreakdown | null;
    entries: ClassifiedEntry[];
    monthsCovered: string[];
    contextRules: ContextRuleLike[];
  }): BankSpendingAnalysis | null {
    if (!input.refBreakdown) return null;

    const refLabel = this.monthLabel(input.referenceMonth);
    const monthSpending = input.entries.filter(
      (e) =>
        e.month === input.referenceMonth &&
        e.direction === 'DEBIT' &&
        this.isConsumptionDebit(e),
    );
    const monthIncome = input.entries.filter(
      (e) =>
        e.month === input.referenceMonth &&
        e.direction === 'CREDIT' &&
        e.type !== 'INVESTMENT_REDEEM',
    );

    const totalIncome = this.round(
      monthIncome.reduce((s, e) => s + e.amount, 0),
    );
    const totalSpent = this.round(
      monthSpending.reduce((s, e) => s + e.amount, 0),
    );
    const balance = this.round(totalIncome - totalSpent);
    const spentMoreThanEarned = balance < 0;
    const overspendAmount = spentMoreThanEarned ? this.round(Math.abs(balance)) : 0;

    const recurringKeys = new Set<string>();
    const allSpending = input.entries.filter(
      (e) => e.direction === 'DEBIT' && this.isConsumptionDebit(e),
    );
    const recurringGroups = this.groupRecurringExpenses(allSpending, input.contextRules);
    const recurringExpenses = recurringGroups
      .filter((g) => g.occurrences >= 2)
      .map((g, i) => {
        recurringKeys.add(g.key);
        return this.toRecurringExpense(`rec-${i}`, g);
      })
      .sort((a, b) => b.totalInPeriod - a.totalInPeriod);

    const enrichedSpending = monthSpending.map((e) => {
      const merchant = this.merchantLabel(e.description);
      const rule = findMatchingRule(input.contextRules, e.description, merchant);
      const fromDesc = inferSpendingCategory(e.description);
      const inferred =
        fromDesc !== 'Outros' ? fromDesc : inferSpendingCategory(merchant);
      const category = rule?.category ?? inferred;
      const key = `${merchant}|${category}`;
      return {
        ...e,
        merchant,
        category,
        recurring: recurringKeys.has(key),
        userMotive: rule?.motive,
        matchLabel: normalizeMatchLabel(merchant),
      };
    });

    const categoryMap = new Map<string, { total: number; count: number }>();
    for (const e of enrichedSpending) {
      const cur = categoryMap.get(e.category) ?? { total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      categoryMap.set(e.category, cur);
    }

    const topCategories: BankSpendingCategoryRow[] = [...categoryMap.entries()]
      .map(([category, data]) => ({
        category,
        total: this.round(data.total),
        count: data.count,
        sharePercent: totalSpent > 0 ? this.round((data.total / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const expenseDetails: BankSpendingDetail[] = enrichedSpending
      .sort((a, b) => b.amount - a.amount)
      .map((e) => ({
        date: this.ymd(e.date),
        amount: e.amount,
        merchant: e.merchant,
        category: e.category,
        detail: e.userMotive
          ? this.buildSmartExpenseDetail(e.category, e.merchant, e.userMotive)
          : this.expenseDetailLabel(e.category, e.merchant),
        isRecurring: e.recurring,
        userMotive: e.userMotive,
        matchLabel: e.matchLabel,
      }));

    const largest = enrichedSpending.reduce<(typeof enrichedSpending)[0] | null>(
      (max, e) => (!max || e.amount > max.amount ? e : max),
      null,
    );
    const largestExpense = largest
      ? {
          date: this.ymd(largest.date),
          amount: largest.amount,
          label: largest.merchant,
          description: largest.description,
          category: largest.category,
        }
      : null;

    const knownLabels = new Set(
      input.contextRules.map((r) => r.matchLabel),
    );
    const smallRecurringLeaks = recurringExpenses
      .filter(
        (r) =>
          r.averageAmount <= SMALL_EXPENSE_THRESHOLD &&
          r.occurrences >= 2 &&
          r.annualizedEstimate >= 50 &&
          !knownLabels.has(normalizeMatchLabel(r.label)),
      )
      .sort((a, b) => b.annualizedEstimate - a.annualizedEstimate);

    const deficitReason = this.buildDeficitReason({
      refLabel,
      spentMoreThanEarned,
      overspendAmount,
      totalIncome,
      totalSpent,
      topCategories,
      largestExpense,
      refBreakdown: input.refBreakdown,
      monthSpending: enrichedSpending,
    });

    const actions = this.buildDirectActions({
      spentMoreThanEarned,
      overspendAmount,
      topCategories,
      largestExpense,
      smallRecurringLeaks,
      recurringExpenses: recurringExpenses.filter(
        (r) => r.lastSeenMonth === input.referenceMonth,
      ),
      expenseDetails,
    });

    return {
      referenceMonth: input.referenceMonth,
      totalIncome,
      totalSpent,
      balance,
      spentMoreThanEarned,
      overspendAmount,
      deficitReason,
      topCategories,
      expenseDetails,
      largestExpense,
      recurringExpenses,
      actions,
    };
  }

  /** Resume o motivo ensinado pelo usuário — não repete o texto cru. */
  private buildSmartExpenseDetail(
    category: string,
    merchant: string,
    motive: string,
  ): string {
    const m = motive.trim();
    const name = this.shortMerchantName(merchant);
    const lower = m.toLowerCase();

    const parcelaAmount =
      lower.match(/parcela[^.]*?(\d{2,5})\s*reais?/) ??
      lower.match(/parcela\s*(?:é|e|de)\s*(\d{2,5})/);
    const monthEnd = lower.match(
      /(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(\d{4})/,
    );
    if (/terreno|financi|parcela|imóvel|imovel/.test(lower) && parcelaAmount) {
      const until = monthEnd
        ? `${monthEnd[1].slice(0, 3)}/${monthEnd[2]}`
        : null;
      const base = `Parcela terreno · ${this.brl(Number(parcelaAmount[1]))}/mês`;
      return until ? `${base} (até ${until})` : base;
    }

    if (/curso|aula|reforço|reforco|graduação|faculdade|certifica/.test(lower)) {
      if (/inteligência artificial|inteligencia artificial|\bia\b/.test(lower)) {
        return `Curso de IA — ${name}`;
      }
      if (/inglês|ingles/.test(lower)) {
        return `Reforço de inglês — ${name}`;
      }
      return `Curso/educação — ${name}`;
    }

    if (
      category === 'Assinaturas' ||
      /plano|assinatura|telefone|internet|claro|vivo|tim/.test(lower)
    ) {
      if (/noiva|esposa|marido|cônjuge|conjuge|compartilh/.test(lower)) {
        return `Plano compartilhado — ${name}`;
      }
      return `Assinatura fixa — ${name}`;
    }

    if (/conveniência|conveniencia|lanchonete|padaria/.test(lower)) {
      return `Conveniência recorrente — ${name}`;
    }

    if (/cartório|cartorio|taxa|condomínio|condominio|aluguel/.test(lower)) {
      const gist = this.motiveGist(m, 50);
      return gist.length > 12 ? gist : `Despesa ${category.toLowerCase()} — ${name}`;
    }

    if (/transfer|pix|mesada|ajuda/.test(lower) && category === 'Transferências') {
      const gist = this.motiveGist(m, 48);
      return gist.length > 10 ? `${gist} — ${name}` : `Transferência recorrente — ${name}`;
    }

    const gist = this.motiveGist(m, 55);
    if (gist.length >= 8 && gist.length <= 55) {
      return `${gist} — ${name}`;
    }

    return this.expenseDetailLabel(category, merchant);
  }

  private motiveGist(motive: string, maxLen = 55): string {
    let s = motive.split(/[.!\n]/)[0]?.trim() ?? motive;
    s = s
      .replace(/^(a|o|as|os)\s+/i, '')
      .replace(/^estou\s+fazendo\s+(um|uma)\s+/i, '')
      .replace(/^comprei\s+(um|uma)\s+/i, '')
      .replace(/^é\s+(o|a)\s+meu[a]?\s+/i, '')
      .replace(/^a\s+claro\s+é\s+/i, '')
      .replace(/\s*esse\s+plano\s+cobre.*$/i, '')
      .trim();
    if (s.length > maxLen) s = `${s.slice(0, maxLen - 1).trim()}…`;
    if (!s) return motive.slice(0, maxLen);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private shortMerchantName(merchant: string): string {
    const cleaned = merchant
      .replace(/\(\d{3,4}\).*$/i, '')
      .replace(/\d{2}\.\d{3}\.\d+\/\d{4}-\d{2}.*/i, '')
      .trim();
    if (cleaned.length <= 26) return cleaned;
    return `${cleaned.slice(0, 23).trim()}…`;
  }

  private expenseDetailLabel(category: string, merchant: string): string {
    if (category === 'Combustível') return `Gasolina — ${merchant}`;
    if (category === 'Saúde') return `Farmácia/saúde — ${merchant}`;
    if (category === 'Alimentação') return `Alimentação — ${merchant}`;
    if (category === 'Mercado') return `Mercado — ${merchant}`;
    if (category === 'Transferências') return `Transferência — ${merchant}`;
    if (category === 'Assinaturas') return `Assinatura — ${merchant}`;
    if (category === 'Fatura cartão') return `Fatura cartão — ${merchant}`;
    if (category === 'Investimentos') return `Investimento — ${merchant}`;
    return `${category} — ${merchant}`;
  }

  private isConsumptionDebit(e: ClassifiedEntry): boolean {
    if (e.direction !== 'DEBIT') return false;
    if (e.type === 'INVESTMENT_APPLY') return false;
    if (!SPENDING_DEBIT_TYPES.includes(e.type)) return false;
    if (isInvestmentMovement(e.description)) return false;
    if (inferSpendingCategory(e.description) === 'Investimentos') return false;
    const merchant = this.merchantLabel(e.description);
    if (inferSpendingCategory(merchant) === 'Investimentos') return false;
    return true;
  }

  private composeMovementSummary(input: {
    referenceMonth: string;
    refBreakdown: BankMonthBreakdown | null;
    currentlyInvested: number;
  }): string[] {
    const bullets: string[] = [];
    const m = input.refBreakdown;
    if (!m) return bullets;

    const refLabel = this.monthLabel(input.referenceMonth);

    if (m.investedApplied > 0 || m.investedRedeemed > 0) {
      bullets.push(
        `Em ${refLabel}: aplicou ${this.brl(m.investedApplied)} e resgatou ${this.brl(m.investedRedeemed)} no RDB.`,
      );
    }

    if (input.currentlyInvested > 0) {
      bullets.push(`${this.brl(input.currentlyInvested)} ainda aplicados no RDB.`);
    }

    if (m.net < 0) {
      bullets.push(
        `Fluxo bruto negativo (${this.brl(Math.abs(m.net))}) — inclui investimentos; consumo está na análise acima.`,
      );
    }

    return bullets.slice(0, 3);
  }

  private buildDirectActions(input: {
    spentMoreThanEarned: boolean;
    overspendAmount: number;
    topCategories: BankSpendingCategoryRow[];
    largestExpense: BankSpendingAnalysis['largestExpense'];
    smallRecurringLeaks: BankRecurringExpense[];
    recurringExpenses: BankRecurringExpense[];
    expenseDetails: BankSpendingDetail[];
  }): string[] {
    const candidates: Array<{ score: number; text: string }> = [];

    if (input.spentMoreThanEarned) {
      const top = input.topCategories.find((c) => c.category !== 'Investimentos');
      if (top) {
        const examples = input.expenseDetails
          .filter((d) => d.category === top.category)
          .slice(0, 2)
          .map((d) => d.detail)
          .join(', ');
        candidates.push({
          score: 100 + top.sharePercent,
          text: `Corte ${top.category} (${this.brl(top.total)}, ${top.sharePercent}% do mês)${examples ? ` — comece por ${examples}` : ''}.`,
        });
      }
    }

    const worstLeak = input.smallRecurringLeaks[0];
    if (worstLeak) {
      candidates.push({
        score: 80 + worstLeak.annualizedEstimate / 10,
        text: `Pare ou limite ${worstLeak.label} — ${worstLeak.occurrences} vezes, ~${this.brl(worstLeak.annualizedEstimate)}/ano (${worstLeak.category}).`,
      });
    }

    const crossMonth = input.recurringExpenses
      .filter((r) => r.isCrossMonthRecurring && r.averageAmount > SMALL_EXPENSE_THRESHOLD)
      .sort((a, b) => b.totalInPeriod - a.totalInPeriod)[0];
    if (crossMonth) {
      candidates.push({
        score: 70 + crossMonth.totalInPeriod / 10,
        text: `Renegocie ou corte ${crossMonth.label} — recorrente há ${crossMonth.monthsActive} meses (${this.brl(crossMonth.totalInPeriod)} no total).`,
      });
    }

    if (
      input.largestExpense &&
      input.largestExpense.amount >= 200 &&
      !candidates.some((c) => c.text.includes(input.largestExpense!.label))
    ) {
      const le = input.largestExpense;
      if (le.category === 'Transferências') {
        candidates.push({
          score: 60 + le.amount / 20,
          text: `Evite repetir Pix de ${this.brl(le.amount)} para ${le.label} — foi o maior gasto isolado do mês.`,
        });
      } else {
        candidates.push({
          score: 55 + le.amount / 20,
          text: `Atenção a ${this.expenseDetailLabel(le.category, le.label)} (${this.brl(le.amount)}) — confirme se era essencial ou pode adiar.`,
        });
      }
    }

    if (candidates.length === 0) {
      return [];
    }

    return [...candidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c) => c.text);
  }

  private buildDeficitReason(input: {
    refLabel: string;
    spentMoreThanEarned: boolean;
    overspendAmount: number;
    totalIncome: number;
    totalSpent: number;
    topCategories: BankSpendingCategoryRow[];
    largestExpense: BankSpendingAnalysis['largestExpense'];
    refBreakdown: BankMonthBreakdown;
    monthSpending: ClassifiedEntry[];
  }): string {
    if (!input.spentMoreThanEarned) {
      return '';
    }

    const parts: string[] = [
      `Em ${input.refLabel} saíram ${this.brl(input.totalSpent)} e entraram ${this.brl(input.totalIncome)} — déficit de ${this.brl(input.overspendAmount)}.`,
    ];

    if (input.topCategories.length > 0) {
      const top3 = input.topCategories.slice(0, 3);
      parts.push(
        `Principais destinos: ${top3
          .map((c) => `${c.category} (${this.brl(c.total)}, ${c.sharePercent}%)`)
          .join('; ')}.`,
      );
    }

    const transfers = input.monthSpending
      .filter((e) => e.type === 'TRANSFER_OUT')
      .reduce((s, e) => s + e.amount, 0);
    const cardBill = input.monthSpending
      .filter((e) => e.type === 'CARD_BILL')
      .reduce((s, e) => s + e.amount, 0);
    const invested = input.refBreakdown.investedApplied;

    if (transfers > input.overspendAmount * 0.3) {
      parts.push(
        `Pix/transferências enviadas somaram ${this.brl(transfers)} — parte relevante do excesso de saída.`,
      );
    }
    if (cardBill > 0) {
      parts.push(`Pagamento de fatura do cartão: ${this.brl(cardBill)}.`);
    }
    if (invested > 0) {
      parts.push(
        `Houve também ${this.brl(invested)} aplicados em RDB (investimento, não consumo).`,
      );
    }
    if (input.largestExpense && input.largestExpense.amount >= input.overspendAmount * 0.4) {
      parts.push(
        `O maior lançamento isolado foi ${this.brl(input.largestExpense.amount)} (${input.largestExpense.label}).`,
      );
    }

    return parts.join(' ');
  }

  private groupRecurringExpenses(
    entries: ClassifiedEntry[],
    contextRules: ContextRuleLike[],
  ): Array<
    RecurringGroup & { occurrences: number; totalInPeriod: number; averageAmount: number }
  > {
    const map = new Map<string, RecurringGroup>();

    for (const e of entries) {
      const label = this.merchantLabel(e.description);
      const rule = findMatchingRule(contextRules, e.description, label);
      const fromDesc = inferSpendingCategory(e.description);
      const inferred = fromDesc !== 'Outros' ? fromDesc : inferSpendingCategory(label);
      const category = rule?.category ?? inferred;
      const key = `${label}|${category}`;
      const group = map.get(key) ?? {
        key,
        label,
        category,
        amounts: [],
        months: new Set<string>(),
        entries: [],
      };
      group.amounts.push(e.amount);
      group.months.add(e.month);
      group.entries.push(e);
      map.set(key, group);
    }

    return [...map.values()].map((g) => ({
      ...g,
      occurrences: g.amounts.length,
      totalInPeriod: this.round(g.amounts.reduce((s, a) => s + a, 0)),
      averageAmount: this.round(
        g.amounts.reduce((s, a) => s + a, 0) / Math.max(g.amounts.length, 1),
      ),
    }));
  }

  private toRecurringExpense(
    id: string,
    g: RecurringGroup & {
      occurrences: number;
      totalInPeriod: number;
      averageAmount: number;
    },
  ): BankRecurringExpense {
    const monthsActive = g.months.size;
    const isCrossMonthRecurring = monthsActive >= 2;
    const lastSeenMonth = [...g.months].sort().pop() ?? '';
    const monthlyFreq = g.occurrences / Math.max(monthsActive, 1);
    const annualizedEstimate = this.round(g.averageAmount * monthlyFreq * 12);

    return {
      id,
      label: g.label,
      category: g.category,
      averageAmount: g.averageAmount,
      totalInPeriod: g.totalInPeriod,
      occurrences: g.occurrences,
      monthsActive,
      isCrossMonthRecurring,
      annualizedEstimate,
      lastSeenMonth,
    };
  }

  private merchantLabel(description: string): string {
    const parts = description
      .split(' - ')
      .map((p) => p.trim())
      .filter(Boolean);
    let name = parts.length >= 2 ? parts[1] : parts[0] ?? description;
    name = name
      .replace(/\(\d{3,4}\).*$/i, '')
      .replace(/•••\.\d+\.\d+-••.*$/i, '')
      .replace(/\d{2}\.\d{3}\.\d+\/\d{4}-\d{2}.*$/i, '')
      .replace(/\s+Agência:.*$/i, '')
      .trim();
    if (name.length > 56) name = `${name.slice(0, 53)}…`;
    return name || this.shortDesc(description);
  }

  private summarizeExpenses(entries: ClassifiedEntry[], month: string) {
    const map = new Map<BankMovementType, { total: number; count: number }>();
    for (const e of entries) {
      if (e.month !== month || e.direction !== 'DEBIT') continue;
      if (e.type === 'INVESTMENT_APPLY') continue;
      const cur = map.get(e.type) ?? { total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      map.set(e.type, cur);
    }
    return [...map.entries()]
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total);
  }

  /** Exactly 3 observations for the health score — sourced only from bank imports. */
  buildHealthObservations(analysis: BankStatementAnalysis): BankAnalysisInsight[] {
    if (!analysis.hasData) {
      return [
        {
          id: 'bank-no-data',
          tone: 'INFO',
          title: 'Nenhum extrato importado',
          message:
            'Importe seus extratos bancários para insights baseados nos lançamentos reais.',
          tip: 'Envie CSV ou OFX do Nubank ou outro banco na área de importação.',
        },
        {
          id: 'bank-no-data-2',
          tone: 'INFO',
          title: 'Análise só do extrato',
          message:
            'Esta seção usa exclusivamente movimentações reais do banco — não despesas cadastradas manualmente.',
          tip: 'Quanto mais meses importados, melhor a leitura de padrões e recorrentes.',
        },
        {
          id: 'bank-no-data-3',
          tone: 'INFO',
          title: 'Ensine a IA no detalhamento',
          message:
            'Depois de importar, use "Ensinar" em cada gasto para a IA entender Pix e transferências.',
          tip: 'Ex.: explicar que um Pix recorrente é curso, aluguel ou assinatura.',
        },
      ];
    }

    const candidates: BankAnalysisInsight[] = [];
    let seq = 0;
    const add = (
      tone: BankAnalysisInsight['tone'],
      title: string,
      message: string,
      tip?: string,
    ) => {
      candidates.push({
        id: `health-bank-${++seq}`,
        tone,
        title,
        message,
        tip,
      });
    };

    const spend = analysis.spendingAnalysis;
    const ref = analysis.referenceMonthBreakdown;
    const refLabel = this.monthLabel(analysis.referenceMonth);

    if (spend?.spentMoreThanEarned) {
      add(
        'CRITICAL',
        'Gastos acima das entradas no extrato',
        spend.deficitReason,
        spend.actions[0],
      );
    }

    if (spend?.topCategories[0]) {
      const top = spend.topCategories[0];
      if (top.sharePercent >= 25) {
        add(
          'ATTENTION',
          `${top.category} concentra seus gastos`,
          `${this.brl(top.total)} (${top.sharePercent.toFixed(0)}%) do consumo em ${refLabel} — ${top.count} lançamentos no extrato.`,
          spend.actions.find((a) =>
            a.toLowerCase().includes(top.category.toLowerCase()),
          ) ?? `Revise os lançamentos em ${top.category} no extrato.`,
        );
      }
    }

    if (spend) {
      const topRec = [...spend.recurringExpenses]
        .filter((r) => r.occurrences >= 2)
        .sort((a, b) => b.totalInPeriod - a.totalInPeriod)[0];
      if (topRec) {
        add(
          'ATTENTION',
          `Recorrente no extrato: ${topRec.label}`,
          `${topRec.occurrences}x identificado(s), média ${this.brl(topRec.averageAmount)} — impacto anual ~${this.brl(topRec.annualizedEstimate)}.`,
          `Confira se ${topRec.label} ainda faz sentido ou se dá para negociar.`,
        );
      }
    }

    if (spend?.largestExpense && spend.largestExpense.amount >= 100) {
      const l = spend.largestExpense;
      add(
        'INFO',
        'Maior gasto do mês no extrato',
        `${l.label}: ${this.brl(l.amount)} em ${this.brDate(l.date)} [${l.category}].`,
        spend.actions[0],
      );
    }

    if (ref && ref.totalIn > 0 && ref.net > 0) {
      const savedPct = Math.round((ref.net / ref.totalIn) * 100);
      if (savedPct >= 8) {
        add(
          'POSITIVE',
          'Sobra no extrato este mês',
          `Entradas ${this.brl(ref.totalIn)}, saídas ${this.brl(ref.totalOut)} — sobraram ${this.brl(ref.net)} (${savedPct}% das entradas).`,
        );
      }
    }

    if (analysis.currentlyInvested > 0) {
      add(
        'POSITIVE',
        'Patrimônio aplicado (extrato)',
        `${this.brl(analysis.currentlyInvested)} ainda investidos em RDB, rastreados pelos lançamentos importados.`,
        analysis.recommendations[0],
      );
    }

    if (ref && ref.investedApplied > 0) {
      add(
        ref.investedRedeemed > ref.investedApplied ? 'ATTENTION' : 'POSITIVE',
        `Movimentação de investimento em ${refLabel}`,
        `Aplicou ${this.brl(ref.investedApplied)}${ref.investedRedeemed > 0 ? ` e resgatou ${this.brl(ref.investedRedeemed)}` : ''} — dados do extrato.`,
        'Evite resgates parciais antes do prazo para não perder rendimento.',
      );
    }

    for (const insight of analysis.insights) {
      if (!candidates.some((c) => c.title === insight.title)) {
        candidates.push({ ...insight });
      }
    }

    for (const line of analysis.movementSummary.slice(0, 2)) {
      if (!candidates.some((c) => c.message === line)) {
        add('INFO', 'Fluxo bancário', line, analysis.recommendations[0]);
      }
    }

    if (spend) {
      for (const action of spend.actions) {
        if (
          candidates.length >= 8 ||
          candidates.some((c) => c.tip === action || c.message === action)
        ) {
          continue;
        }
        add('ATTENTION', 'Sugestão com base no extrato', action, action);
      }
    }

    const toneOrder: Record<BankAnalysisInsight['tone'], number> = {
      CRITICAL: 0,
      ATTENTION: 1,
      INFO: 2,
      POSITIVE: 3,
    };
    candidates.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);

    const seen = new Set<string>();
    const picked: BankAnalysisInsight[] = [];
    for (const c of candidates) {
      const key = c.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(c);
      if (picked.length >= 3) break;
    }

    if (picked.length < 3 && analysis.totalMovements > 0) {
      const filler: BankAnalysisInsight = {
        id: 'health-bank-summary',
        tone: 'INFO',
        title: 'Extrato analisado',
        message: `${analysis.totalMovements} movimentações em ${analysis.monthsCovered.length} mês(es) (${analysis.banks.join(', ')}).`,
        tip: 'Use o detalhamento abaixo para ensinar a IA sobre gastos específicos.',
      };
      if (!picked.some((p) => p.title === filler.title)) {
        picked.push(filler);
      }
    }

    return picked.slice(0, 3);
  }

  buildHealthSummary(
    scoreValue: number,
    delta: number,
    trend: 'UP' | 'DOWN' | 'STABLE',
    analysis: BankStatementAnalysis,
  ): string {
    let summary: string;
    if (scoreValue >= 75) {
      summary = `Saúde financeira em ${scoreValue}/100 — situação sólida.`;
    } else if (scoreValue >= 50) {
      summary = `Saúde financeira em ${scoreValue}/100 — equilíbrio razoável, com pontos a ajustar.`;
    } else {
      summary = `Saúde financeira em ${scoreValue}/100 — priorize cortes antes de novos compromissos.`;
    }

    if (trend === 'UP' && delta > 2) {
      summary += ` Melhorou ${delta} pts vs mês anterior.`;
    } else if (trend === 'DOWN' && delta < -2) {
      summary += ` Caiu ${Math.abs(delta)} pts vs mês anterior.`;
    }

    if (analysis.hasData) {
      summary += ` Insights abaixo vêm exclusivamente do extrato (${analysis.banks.join(', ')}).`;
    } else {
      summary += ' Importe extratos bancários para insights personalizados.';
    }

    return summary;
  }

  private emptyAnalysis(referenceMonth: string): BankStatementAnalysis {
    return {
      hasData: false,
      referenceMonth,
      banks: [],
      monthsCovered: [],
      totalMovements: 0,
      currentlyInvested: 0,
      totalAppliedAllTime: 0,
      totalRedeemedAllTime: 0,
      savedInAccountTotal: 0,
      referenceMonthBreakdown: null,
      monthlyBreakdown: [],
      investmentLots: [],
      spendingAnalysis: null,
      movementSummary: [],
      insights: [
        {
          id: 'bank-no-data',
          tone: 'INFO',
          title: 'Nenhum extrato importado',
          message:
            'Importe seus extratos bancários (CSV/OFX) para a IA analisar entradas, saídas, investimentos e resgates entre meses.',
          tip: 'Acesse Importar extrato e envie os arquivos do Nubank.',
        },
      ],
      recommendations: [
        'Importe extratos dos últimos meses para habilitar rastreamento de investimentos RDB.',
      ],
    };
  }

  private shortDesc(description: string): string {
    const part = description.split(' - ')[0]?.trim() ?? description;
    return part.length > 48 ? `${part.slice(0, 45)}…` : part;
  }

  private brDate(ymd: string): string {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }

  private ym(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private monthLabel(monthYm: string): string {
    const [y, m] = monthYm.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private monthDiff(fromYm: string, toYm: string): number {
    const [fy, fm] = fromYm.split('-').map(Number);
    const [ty, tm] = toYm.split('-').map(Number);
    return Math.max(0, (ty - fy) * 12 + (tm - fm));
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private brl(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
