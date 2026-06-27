import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, MetricCard } from '../components/ui/Card';
import { ErrorState, Spinner } from '../components/ui/States';
import { MonthPicker } from '../components/ui/MonthPicker';
import { Badge } from '../components/ui/Badge';
import { CategoryPie, IncomeExpenseBars, EvolutionLine } from '../components/finance/DashboardCharts';
import { ReconciliationPanel } from '../components/finance/ReconciliationPanel';
import { dashboardService } from '../services/finance.service';
import { brDate, currentMonth, money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';

function addMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}

export function IndividualDashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, reload } = useAsyncData(
    () => dashboardService.individual(month),
    [month],
  );

  if (loading) return <Spinner label="Carregando dashboard individual..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusTone =
    data.status === 'NEGATIVE' ? 'danger' : data.status === 'ATTENTION' ? 'warning' : 'good';
  const projection =
    data.futureProjection?.map((row) => ({
      month: row.month,
      total: row.balance ?? row.projectedBalance ?? 0,
    })) ?? [];
  const statementLink = (source: 'ALL' | 'INDIVIDUAL' | 'SHARED') =>
    `/statement/individual?month=${encodeURIComponent(month)}${
      source === 'ALL' ? '' : `&source=${source}`
    }`;
  const quickMonths = Array.from({ length: 6 }, (_, index) => addMonths(currentMonth(), index));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-[#0B2D5C]">Resumo individual</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Seu mês financeiro</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe seu saldo, receitas e despesas do mês escolhido.
          </p>
        </div>
        <div className="w-full md:w-56">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={data.hasStatementData ? 'Saldo confirmado' : 'Saldo'}
          value={money(
            data.hasStatementData
              ? (data.balanceConfirmedMonth ?? data.balanceMonth)
              : data.balanceMonth,
          )}
          hint={
            data.hasStatementData
              ? `Projetado ${money(data.balanceMonth)}`
              : data.status
          }
          tone={statusTone}
        />
        <MetricCard
          label="Receitas"
          value={money(data.totalIncomeMonth)}
          hint={
            data.salaryOverridden
              ? `Salário ajustado ${money(data.baseSalaryMonth)} (base ${money(data.defaultBaseSalary ?? data.baseSalaryMonth)})`
              : `Salário ${money(data.baseSalaryMonth)}`
          }
        />
        <Link className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2" to={statementLink('ALL')}>
          <MetricCard
            label="Despesas previstas"
            value={money(data.totalExpensesMonth)}
            hint={
              data.expensesPendingMonth
                ? `Pendentes ${money(data.expensesPendingMonth)}`
                : 'Cadastro manual'
            }
          />
        </Link>
        {data.hasStatementData ? (
          <MetricCard
            label="Consumo confirmado"
            value={money(data.expensesConfirmedMonth ?? 0)}
            hint={`Conta ${money(data.statement?.confirmedAccountDebits ?? 0)} · Cartão ${money(data.statement?.confirmedCardDebits ?? 0)}`}
            tone="navy"
          />
        ) : (
          <Link className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2" to="/statement/import">
            <MetricCard label="Extrato" value="Importar" hint="Confirme gastos reais" />
          </Link>
        )}
        <Link className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2" to={statementLink('SHARED')}>
          <MetricCard label="Casal (minha parte)" value={money(data.totalSharedExpensesResponsibilityMonth)} />
        </Link>
        <Link className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2" to="/statement/import">
          <MetricCard
            label="Quitadas no extrato"
            value={String(data.reconciledCount ?? 0)}
            hint="Pix/débito confirmados automaticamente"
          />
        </Link>
        <MetricCard
          label="Investimento individual"
          value={money(data.investmentSummary?.monthTotal ?? 0)}
          hint={`Acumulado ${money(data.investmentSummary?.allTimeTotal ?? 0)}`}
        />
        <MetricCard label="Renda extra" value={money(data.extraIncomeMonth)} />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase text-slate-500">Status financeiro</p>
          <div className="mt-3">
            <Badge tone={data.status}>{data.status}</Badge>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {data.hasStatementData
              ? 'Saldo confirmado usa consumo real dos extratos (conta + cartão). Despesas previstas vêm do cadastro manual.'
              : 'Importe extratos de conta e cartão para confirmar gastos e quitar contas automaticamente.'}
          </p>
        </div>
      </div>

      <ReconciliationPanel month={month} hasStatementData={data.hasStatementData} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Receitas x despesas" subtitle="Comparativo do mês selecionado">
          <IncomeExpenseBars
            income={data.totalIncomeMonth}
            expenses={
              data.hasStatementData
                ? (data.expensesConfirmedMonth ?? data.totalExpensesMonth)
                : data.totalExpensesMonth
            }
          />
        </Card>
        <Card title="Despesas por categoria" subtitle={data.hasStatementData ? 'Previsto (cadastro) — use extrato para consumo confirmado' : 'Distribuição das suas despesas no mês'}>
          {data.hasStatementData && data.statement?.expensesByCategoryConfirmed?.length ? (
            <CategoryPie
              data={data.statement.expensesByCategoryConfirmed.map((row) => ({
                category: row.category,
                amount: row.amount,
              }))}
            />
          ) : data.expensesByCategory?.length ? (
            <CategoryPie data={data.expensesByCategory} />
          ) : (
            <IncomeExpenseBars income={0} expenses={data.totalExpensesMonth} />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Próximas contas" subtitle="Lançamentos abertos do mês selecionado, ordenados por vencimento">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {quickMonths.map((quickMonth) => (
              <button
                key={quickMonth}
                type="button"
                onClick={() => setMonth(quickMonth)}
                className={`min-h-9 shrink-0 rounded-xl border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2 ${
                  quickMonth === month
                    ? 'border-[#071A3D] bg-[#071A3D] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {monthLabel(quickMonth)}
              </button>
            ))}
          </div>
          {data.upcomingBills?.length ? (
            <div className="space-y-3">
              {data.upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{bill.title ?? 'Conta sem título'}</p>
                    <p className="text-sm text-slate-500">{brDate(bill.dueDate)} • {bill.status}</p>
                  </div>
                  <span className="shrink-0 font-bold">{money(bill.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma conta aberta encontrada para este mês.</p>
          )}
        </Card>
        <Card title="Contas quitadas" subtitle="Pagamentos baixados no mês selecionado">
          {data.paidBills?.length ? (
            <div className="space-y-3">
              {data.paidBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{bill.title ?? 'Conta sem título'}</p>
                    <p className="text-sm text-emerald-700">
                      Quitada {bill.paymentDate ? `em ${brDate(bill.paymentDate)}` : 'neste mês'}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-emerald-800">{money(bill.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma conta quitada foi encontrada para este mês.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-1">
        <Card title="Projeção futura" subtitle="Estimativa do saldo dos próximos meses">
          {projection.length ? (
            <EvolutionLine data={projection} />
          ) : (
            <p className="text-sm text-slate-500">Sem projeção disponível.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
