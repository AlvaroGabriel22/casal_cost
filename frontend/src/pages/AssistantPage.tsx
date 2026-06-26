import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { MonthPicker } from '../components/ui/MonthPicker';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { currentMonth } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { insightsService } from '../services/insights.service';
import {
  AssistantHeader,
  BankAnalysisPanel,
  ChallengesPanel,
  HabitsCard,
  HealthScoreCard,
  InvestmentPanel,
} from '../components/assistant/AssistantWidgets';

export function AssistantPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, reload } = useAsyncData(
    () => insightsService.overview(month),
    [month],
  );

  if (loading) {
    return <Spinner label="Analisando seus dados financeiros..." />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }
  if (!data) {
    return (
      <EmptyState
        title="Sem dados ainda"
        message="Cadastre receitas, despesas e aportes para receber análises."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <AssistantHeader overview={data} />
        </div>
        <div className="w-full max-w-xs shrink-0">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Mês de referência
          </label>
          <div className="mt-1">
            <MonthPicker value={month} onChange={setMonth} />
          </div>
        </div>
      </div>

      {!data.hasEnoughData && (
        <EmptyState
          title="Histórico ainda insuficiente"
          message="Cadastre movimentações em pelo menos dois meses para análises mais precisas."
        />
      )}

      <HealthScoreCard score={data.healthScore} />

      <InvestmentPanel investments={data.investments} />

      {!data.investments.individual.hasRegisteredContributions &&
        !data.investments.couple?.hasRegisteredContributions && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Registre seus aportes para análises precisas</p>
          <p className="mt-1">
            A IA considera apenas valores informados nas telas de investimento. Sem registro, o score
            de aportes fica incompleto.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/investments/individual"
              className="rounded-xl bg-[#071A3D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B2D5C]"
            >
              Investimento individual
            </Link>
            <Link
              to="/investments/couple"
              className="rounded-xl border border-[#071A3D] px-4 py-2 text-xs font-semibold text-[#071A3D] hover:bg-white"
            >
              Investimento do casal
            </Link>
          </div>
        </div>
      )}

      <Card
        title="Desafios e metas de economia"
        subtitle="Missões estilo jogo com progresso, XP e badges — complete para melhorar suas finanças."
      >
        <ChallengesPanel challenges={data.challenges} />
      </Card>

      <Card
        title="Score de hábitos financeiros"
        subtitle="Disciplina de aportes, controle de despesas e consistência mensal."
      >
        <HabitsCard habits={data.habits} />
      </Card>

      <Card
        title="Análise do extrato bancário"
        subtitle="IA lê todas as movimentações importadas — entradas, saídas, investimentos e resgates entre meses."
      >
        <BankAnalysisPanel
          analysis={data.bankAnalysis}
          contextRules={data.financeContext.rules}
          onContextSaved={reload}
        />
      </Card>
    </div>
  );
}
