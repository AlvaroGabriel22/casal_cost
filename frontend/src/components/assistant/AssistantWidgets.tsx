import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Landmark,
  Lightbulb,
  Minus,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { brDate, money } from '../../utils/format';
import type {
  AssistantOverview,
  BankSpendingAnalysis,
  BankStatementAnalysis,
  ChallengeProgress,
  HabitsScore,
  HealthScore,
  InsightChallenge,
  InsightPriority,
  InvestmentAnalysis,
} from '../../services/insights.service';
import { TeachExpenseModal } from './TeachExpenseModal';
import { RotatingInsightCards } from './RotatingInsightCards';
import type { FinanceContextRule } from '../../services/finance-context.service';

const PRIORITY_LABEL: Record<InsightPriority, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

const PRIORITY_TONE: Record<InsightPriority, string> = {
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
};

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'danger';
}) {
  const cls =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'danger'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-slate-200 bg-white text-slate-900';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${cls}`}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

export function AssistantHeader({ overview }: { overview: AssistantOverview }) {
  const generated = new Date(overview.generatedAt);
  return (
    <header className="flex flex-col gap-3 rounded-3xl border border-[#103B73]/20 bg-gradient-to-br from-[#071A3D] to-[#0B2D5C] p-6 text-white shadow-lg lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Assistente financeiro</h1>
          <p className="mt-1 text-sm text-blue-100">
            Foco em score, aportes registrados e desafios para cortar gastos. Atualizado em{' '}
            {generated.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs text-blue-100">
        <div className="rounded-xl bg-white/10 p-3 text-center">
          <p className="text-[11px] uppercase opacity-80">Meses analisados</p>
          <p className="mt-1 text-base font-bold text-white">{overview.monthsAnalyzed}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3 text-center">
          <p className="text-[11px] uppercase opacity-80">Transações</p>
          <p className="mt-1 text-base font-bold text-white">{overview.transactionsAnalyzed}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3 text-center">
          <p className="text-[11px] uppercase opacity-80">Mês de referência</p>
          <p className="mt-1 text-base font-bold text-white">{monthLabel(overview.referenceMonth)}</p>
        </div>
      </div>
    </header>
  );
}

function trendLabel(trend: HealthScore['trend'], delta: number) {
  if (trend === 'UP') return `Melhorou ${delta} pts vs mês anterior`;
  if (trend === 'DOWN') return `Caiu ${Math.abs(delta)} pts vs mês anterior`;
  return 'Estável em relação ao mês anterior';
}

export function HealthScoreCard({ score }: { score: HealthScore }) {
  const tone =
    score.value >= 75
      ? 'from-emerald-500 to-emerald-700'
      : score.value >= 50
        ? 'from-amber-400 to-amber-600'
        : 'from-red-500 to-red-700';
  const TrendIcon =
    score.trend === 'UP' ? TrendingUp : score.trend === 'DOWN' ? TrendingDown : Minus;

  return (
    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[260px_1fr]">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-6 text-white`}>
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide opacity-90">
          <Brain className="h-4 w-4" />
          Saúde financeira
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-6xl font-extrabold leading-none">{score.value}</span>
          <span className="text-lg font-semibold opacity-80">/100</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <TrendIcon className="h-4 w-4" />
          {trendLabel(score.trend, score.delta)}
        </div>
        <div className="mt-5 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={score.history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="healthArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" hide />
              <YAxis hide domain={[0, 100]} />
              <Area type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={2} fill="url(#healthArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-[#071A3D]/15 bg-[#071A3D]/5 px-4 py-3 text-sm leading-relaxed text-slate-800">
          {score.summary}
        </p>

        <RotatingInsightCards observations={score.observations} />
      </div>
    </section>
  );
}

function progressPercent(progress: ChallengeProgress) {
  if (progress.unit === 'BRL' && progress.target === 0) {
    return progress.current <= 0 ? 100 : 0;
  }
  if (progress.target <= 0) return 0;
  return Math.min(100, Math.round((progress.current / progress.target) * 100));
}

function formatProgress(progress: ChallengeProgress) {
  if (progress.unit === 'BRL') {
    return `${money(progress.current)} / ${money(progress.target)}`;
  }
  if (progress.unit === 'PERCENT') {
    return `${progress.current.toFixed(0)}% / ${progress.target.toFixed(0)}%`;
  }
  return `${progress.current} / ${progress.target}`;
}

export function InvestmentPanel({ investments }: { investments: InvestmentAnalysis }) {
  const ind = investments.individual;
  const couple = investments.couple;
  const indProgress = Math.min(
    100,
    investments.targetPercent > 0
      ? (ind.percentOfIncome / investments.targetPercent) * 100
      : 0,
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Aportes registrados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Individual e conjunto são calculados separadamente — sem somar valores misturados.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Investimento individual
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="No mês" value={money(ind.monthTotal)} />
          <SummaryStat label="Acumulado" value={money(ind.allTimeTotal)} tone="good" />
          <SummaryStat
            label="% da sua renda"
            value={`${ind.percentOfIncome.toFixed(0)}% (meta ${investments.targetPercent}%)`}
          />
          <SummaryStat label="Sequência" value={`${ind.consecutiveMonths} mês(es)`} />
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Meta individual de aportes</span>
            <span>{Math.round(indProgress)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${indProgress}%` }} />
          </div>
          {ind.vsPreviousMonth !== 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {ind.vsPreviousMonth > 0 ? '↑' : '↓'} {money(Math.abs(ind.vsPreviousMonth))} vs mês
              anterior · média {money(ind.averageMonthly)}/mês
            </p>
          )}
        </div>
      </div>

      {couple && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Investimento conjunto (casal)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Total somado de todos os parceiros — ambos veem o mesmo valor.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryStat label="No mês (casal)" value={money(couple.monthTotal)} tone="good" />
            <SummaryStat label="Acumulado (casal)" value={money(couple.allTimeTotal)} />
            <SummaryStat label="Sequência conjunta" value={`${couple.consecutiveMonths} mês(es)`} />
          </div>
          {couple.byPartner && couple.byPartner.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {couple.byPartner.map((partner) => (
                <div
                  key={partner.userId}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-slate-900">{partner.name}</span>
                  <span className="text-slate-600">
                    {' '}
                    · {money(partner.monthAmount)} no mês · {money(partner.allTimeAmount)} total
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function ChallengesPanel({ challenges }: { challenges: InsightChallenge[] }) {
  if (challenges.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhum desafio no momento. Registre despesas e aportes para receber tarefas personalizadas.
      </p>
    );
  }

  const totalXp = challenges.reduce((sum, c) => sum + c.xp, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#071A3D]/20 bg-gradient-to-r from-[#071A3D]/5 to-emerald-50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Modo desafio</p>
          <p className="text-sm font-semibold text-slate-900">
            {challenges.length} missão(ões) ativa(s)
          </p>
        </div>
        <div className="rounded-xl bg-[#071A3D] px-4 py-2 text-center text-white">
          <p className="text-[10px] font-semibold uppercase opacity-80">XP disponível</p>
          <p className="text-lg font-bold">{totalXp}</p>
        </div>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const pct = challenge.progress ? progressPercent(challenge.progress) : undefined;
          return (
            <article
              key={challenge.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-[#071A3D] text-white">
                    <span className="text-[10px] font-bold leading-none">Nv</span>
                    <span className="text-sm font-bold leading-none">{challenge.level}</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      {challenge.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{challenge.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-800">
                    +{challenge.xp} XP
                  </span>
                  {challenge.badge && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                      🏅 {challenge.badge}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_TONE[challenge.priority]}`}
                  >
                    {PRIORITY_LABEL[challenge.priority]}
                  </span>
                </div>
              </div>

              {challenge.progress && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{challenge.progress.label}</span>
                    <span>{formatProgress(challenge.progress)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{pct ?? 0}% concluído</p>
                </div>
              )}

              {challenge.estimatedSaving > 0 && (
                <p className="mt-3 text-xs font-semibold text-emerald-700">
                  Economia estimada: {money(challenge.estimatedSaving)}/ano
                  {challenge.category ? ` · ${challenge.category}` : ''}
                </p>
              )}

              <ol className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {challenge.tasks.map((task, taskIndex) => (
                  <li key={task} className="flex gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[11px] font-bold text-emerald-800">
                      {taskIndex + 1}
                    </span>
                    <span>{task}</span>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function HabitsCard({ habits }: { habits: HabitsScore }) {
  const data = [{ name: 'Hábitos', value: habits.value, rest: 100 - habits.value }];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Disciplina financeira</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-950">{habits.value}/100</p>
          </div>
          <div className="h-12 w-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" hide />
                <Bar dataKey="value" stackId="a" radius={[8, 0, 0, 8]}>
                  <Cell fill="#0B2D5C" />
                </Bar>
                <Bar dataKey="rest" stackId="a" radius={[0, 8, 8, 0]}>
                  <Cell fill="#e2e8f0" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Pontos positivos</p>
          <ul className="mt-2 space-y-1">
            {(habits.positives.length ? habits.positives : ['Aguardando mais dados.']).map((line) => (
              <li key={line} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Pontos de atenção</p>
          <ul className="mt-2 space-y-1">
            {(habits.attentions.length ? habits.attentions : ['Nenhum hábito preocupante.']).map((line) => (
              <li key={line} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


function normalizeLabel(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function findRuleForMerchant(
  rules: FinanceContextRule[],
  merchant: string,
  matchLabel?: string,
): FinanceContextRule | undefined {
  const keys = [matchLabel, normalizeLabel(merchant)].filter(Boolean) as string[];
  return rules.find((r) =>
    keys.some(
      (k) => k === r.matchLabel || k.includes(r.matchLabel) || r.matchLabel.includes(k),
    ),
  );
}

function SpendingAnalysisSection({
  spend,
  contextRules,
  onContextSaved,
}: {
  spend: BankSpendingAnalysis;
  contextRules: FinanceContextRule[];
  onContextSaved?: () => void;
}) {
  const [teachTarget, setTeachTarget] = useState<{
    merchant: string;
    category: string;
    matchLabel?: string;
  } | null>(null);

  const existingRule = teachTarget
    ? findRuleForMerchant(contextRules, teachTarget.merchant, teachTarget.matchLabel)
    : null;

  return (
    <div className="space-y-4 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-orange-950">
        <TrendingDown className="h-4 w-4" />
        Análise de gastos do extrato
      </p>

      {spend.spentMoreThanEarned && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">
            Déficit de {money(spend.overspendAmount)} no mês
          </p>
          {spend.deficitReason && <p className="mt-1">{spend.deficitReason}</p>}
        </div>
      )}

      {spend.topCategories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Onde mais gastou</p>
          <ul className="mt-2 space-y-2">
            {spend.topCategories.slice(0, 5).map((cat) => (
              <li
                key={cat.category}
                className="flex items-center justify-between rounded-lg border border-white bg-white/80 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{cat.category}</span>
                <span className="text-right">
                  <span className="font-bold text-red-700">{money(cat.total)}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {cat.sharePercent.toFixed(0)}% · {cat.count}x
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {spend.expenseDetails.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Detalhamento dos gastos</p>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {spend.expenseDetails.map((item, i) => (
              <li
                key={`${item.date}-${item.merchant}-${i}`}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.detail}</p>
                  <p className="text-xs text-slate-500">
                    {item.userMotive ? (
                      <>
                        <span className="rounded bg-[#103B73]/8 px-1.5 py-0.5 text-[10px] font-medium text-[#103B73]">
                          {item.category}
                        </span>
                        {' · '}
                        {brDate(item.date)}
                        {item.isRecurring ? ' · recorrente' : ''}
                      </>
                    ) : (
                      <>
                        {brDate(item.date)}
                        {item.isRecurring ? ' · recorrente' : ''}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTeachTarget({
                        merchant: item.merchant,
                        category: item.category,
                        matchLabel: item.matchLabel,
                      })
                    }
                    className="rounded-md border border-[#103B73]/20 px-2 py-1 text-[10px] font-semibold uppercase text-[#103B73] hover:bg-[#103B73]/5"
                  >
                    {item.userMotive ? 'Editar' : 'Ensinar'}
                  </button>
                  <span className="font-semibold text-red-700">{money(item.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {spend.actions.length > 0 && (
        <div className="rounded-lg border border-[#103B73]/20 bg-[#103B73]/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#103B73]">
            <Lightbulb className="h-3.5 w-3.5" />
            O que fazer
          </p>
          <ol className="mt-2 space-y-2">
            {spend.actions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-800">
                <span className="font-bold text-[#103B73]">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <TeachExpenseModal
        open={!!teachTarget}
        merchant={teachTarget?.merchant ?? ''}
        defaultCategory={teachTarget?.category}
        existingRule={existingRule}
        onClose={() => setTeachTarget(null)}
        onSaved={() => onContextSaved?.()}
      />
    </div>
  );
}

export function BankAnalysisPanel({
  analysis,
  contextRules = [],
  onContextSaved,
}: {
  analysis: BankStatementAnalysis;
  contextRules?: FinanceContextRule[];
  onContextSaved?: () => void;
}) {
  const ref = analysis.referenceMonthBreakdown;

  return (
    <div className="space-y-4">
      {!analysis.hasData ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Importe seu extrato bancário</p>
          <p className="mt-1">
            A IA analisa entradas, saídas e gastos reais — separados de investimentos no RDB.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Landmark className="h-4 w-4" />
            <span>
              {analysis.banks.join(', ')} · {analysis.totalMovements} movimentações ·{' '}
              {analysis.monthsCovered.length} mês(es)
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label="Entradas (mês ref.)"
              value={money(ref?.totalIn ?? 0)}
              tone="good"
            />
            <SummaryStat
              label="Saídas (mês ref.)"
              value={money(ref?.totalOut ?? 0)}
              tone="danger"
            />
            <SummaryStat
              label="Investido no RDB"
              value={money(analysis.currentlyInvested)}
              tone="good"
            />
          </div>

          {analysis.spendingAnalysis && (
            <SpendingAnalysisSection
              spend={analysis.spendingAnalysis}
              contextRules={contextRules}
              onContextSaved={onContextSaved}
            />
          )}

          {(analysis.movementSummary.length > 0 || analysis.recommendations.length > 0) && (
            <div className="rounded-xl border border-[#103B73]/15 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#071A3D]">
                <PiggyBank className="h-4 w-4" />
                Investimentos e fluxo
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {analysis.movementSummary.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-[#103B73]">•</span>
                    <span>{line}</span>
                  </li>
                ))}
                {analysis.recommendations.map((tip) => (
                  <li key={tip} className="flex gap-2 font-medium text-[#103B73]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.monthlyBreakdown.length > 1 && (
            <details className="rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                Ver histórico mês a mês
              </summary>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Mês</th>
                      <th className="px-3 py-2 text-right">Entradas</th>
                      <th className="px-3 py-2 text-right">Saídas</th>
                      <th className="px-3 py-2 text-right">Aplicado</th>
                      <th className="px-3 py-2 text-right">Resgatado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.monthlyBreakdown.map((row) => (
                      <tr key={row.month} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium capitalize">{monthLabel(row.month)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">
                          <span className="inline-flex items-center gap-1">
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            {money(row.totalIn)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-red-700">
                          <span className="inline-flex items-center gap-1">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            {money(row.totalOut)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{money(row.investedApplied)}</td>
                        <td className="px-3 py-2 text-right">{money(row.investedRedeemed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
