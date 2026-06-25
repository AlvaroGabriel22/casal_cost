import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Lightbulb,
  Minus,
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
import { money } from '../../utils/format';
import type {
  AssistantOverview,
  ChallengeProgress,
  HabitsScore,
  HealthObservation,
  HealthScore,
  InsightChallenge,
  InsightPriority,
  InvestmentAnalysis,
  MicroExpense,
} from '../../services/insights.service';

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

const OBSERVATION_STYLE: Record<
  HealthObservation['tone'],
  { border: string; bg: string; icon: typeof CheckCircle2; iconCls: string }
> = {
  POSITIVE: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    icon: CheckCircle2,
    iconCls: 'text-emerald-600',
  },
  ATTENTION: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    icon: AlertTriangle,
    iconCls: 'text-amber-600',
  },
  CRITICAL: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    icon: AlertTriangle,
    iconCls: 'text-red-600',
  },
  INFO: {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    icon: Lightbulb,
    iconCls: 'text-slate-600',
  },
};

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

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            O que observamos nos seus dados
          </p>
          {score.observations.map((obs) => {
            const style = OBSERVATION_STYLE[obs.tone];
            const Icon = style.icon;
            return (
              <article
                key={obs.id}
                className={`rounded-xl border p-4 ${style.border} ${style.bg}`}
              >
                <div className="flex gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconCls}`} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-950">{obs.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{obs.message}</p>
                    {obs.tip && (
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        <span className="font-semibold text-slate-800">Sugestão: </span>
                        {obs.tip}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
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

export function MicroExpensesPanel({ items }: { items: MicroExpense[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhum gasto pequeno recorrente identificado nos últimos meses.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="text-xs text-slate-500">
              {item.category} · {item.occurrences}x · média {money(item.amount)}
            </p>
            <p className="mt-1 text-xs text-amber-800">{item.insight}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-red-700">{money(item.annualImpact)}</p>
            <p className="text-[11px] text-slate-500">/ ano</p>
          </div>
        </li>
      ))}
    </ul>
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
