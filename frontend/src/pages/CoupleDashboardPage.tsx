import { useState } from 'react';
import { Card, MetricCard } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { MonthPicker } from '../components/ui/MonthPicker';
import { CategoryPie, EvolutionLine } from '../components/finance/DashboardCharts';
import { dashboardService } from '../services/finance.service';
import { currentMonth, money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';

export function CoupleDashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, reload } = useAsyncData(() => dashboardService.couple(month), [month]);

  if (loading) return <Spinner label="Carregando dashboard do casal..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const categoryData = data?.expensesByCategory ?? data?.categoryDistribution ?? [];
  const evolutionData = data?.evolution ?? data?.monthlyEvolution ?? [];
  const responsibilityEntries = data?.partnerResponsibilities?.length
    ? data.partnerResponsibilities
    : Object.entries(data?.partnerResponsibility ?? {}).map(([id, total], index) => ({
        id,
        name: undefined,
        username: `Parceiro ${index + 1}`,
        total,
      }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-[#0B2D5C]">Conta compartilhada</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Resumo financeiro do casal</h2>
          <p className="mt-1 text-sm text-slate-500">
            Exibimos apenas as despesas compartilhadas e os dados que vocês decidiram dividir.
          </p>
        </div>
        <div className="w-full md:w-56">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      {!data ? (
        <EmptyState
          title="Nenhum casal ativo"
          message="Crie ou aceite um convite na tela Casal para habilitar o painel compartilhado."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Compartilhadas" value={money(data.totalSharedExpenses)} tone="navy" />
            <MetricCard label="Pagas" value={money(data.paidTotal)} tone="good" />
            <MetricCard label="Pendentes" value={money(data.pendingTotal)} tone="warning" />
            <MetricCard label="Vencidas" value={money(data.overdueTotal)} tone="danger" />
            <MetricCard label="Responsabilidade mensal" value={money(data.totalMonthlyResponsibility ?? data.totalSharedExpenses)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Categorias compartilhadas" subtitle="Agrupamento das despesas do casal">
              {categoryData.length ? (
                <CategoryPie data={categoryData} />
              ) : (
                <p className="text-sm text-slate-500">Ainda não há despesas categorizadas para este mês.</p>
              )}
            </Card>
            <Card title="Evolução mensal" subtitle="Histórico dos últimos meses do casal">
              {evolutionData.length ? (
                <EvolutionLine data={evolutionData} />
              ) : (
                <EvolutionLine data={[{ month, total: data.totalSharedExpenses }]} />
              )}
            </Card>
          </div>

          <Card title="Responsabilidade por parceiro">
            {responsibilityEntries.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {responsibilityEntries.map((row, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{row.name ?? row.username ?? `Parceiro ${index + 1}`}</p>
                    {row.name && row.username && (
                      <p className="text-sm text-slate-500">@{row.username}</p>
                    )}
                    <p className="mt-1 text-xl font-bold text-slate-950">{money(row.total)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Ainda não há divisão detalhada por parceiro neste mês.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
