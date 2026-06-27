import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, HelpCircle, Link2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/States';
import { brDate, money } from '../../utils/format';
import { useAsyncData } from '../../hooks/useAsyncData';
import { statementImportService } from '../../services/statement-import.service';

type ReconciliationPanelProps = {
  month: string;
  hasStatementData?: boolean;
};

export function ReconciliationPanel({ month, hasStatementData }: ReconciliationPanelProps) {
  const { data: overview, loading } = useAsyncData(
    () => statementImportService.reconciliationOverview(month),
    [month],
  );

  if (!hasStatementData) return null;
  if (loading) return <Spinner label="Carregando reconciliação..." />;
  if (!overview) return null;

  const { summary } = overview;
  const hasActivity =
    summary.awaitingCount > 0 ||
    summary.unmatchedCount > 0 ||
    summary.confirmedCount > 0;

  if (!hasActivity) return null;

  return (
    <Card
      title="Planejado vs extrato"
      subtitle="Contas manuais Pix/débito cruzadas com o extrato da conta corrente"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase text-amber-800">Aguardando extrato</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">{summary.awaitingCount}</p>
          <p className="text-xs text-amber-700">{money(summary.awaitingTotal)} previstos</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase text-blue-800">Sem conta cadastrada</p>
          <p className="mt-1 text-2xl font-bold text-blue-950">{summary.unmatchedCount}</p>
          <p className="text-xs text-blue-700">{money(summary.unmatchedTotal)} no extrato</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase text-emerald-800">Confirmadas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-950">{summary.confirmedCount}</p>
          <p className="text-xs text-emerald-700">quitadas pelo extrato</p>
        </div>
      </div>

      {overview.awaitingExtract.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Clock className="h-4 w-4 text-amber-600" />
            Contas aguardando confirmação no extrato
          </div>
          <ul className="space-y-2">
            {overview.awaitingExtract.slice(0, 6).map((row) => (
              <li
                key={row.occurrenceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <p className="text-xs text-slate-500">
                    Vence {brDate(row.dueDate)} · {row.paymentMethod}
                  </p>
                </div>
                <Badge tone="PENDING">{money(row.amount)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {overview.unmatchedStatementDebits.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            Lançamentos no extrato sem conta cadastrada
          </div>
          <ul className="space-y-2">
            {overview.unmatchedStatementDebits.slice(0, 6).map((row) => (
              <li
                key={row.entryId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{row.description}</p>
                  <p className="text-xs text-slate-500">{brDate(row.transactionDate)}</p>
                </div>
                <Badge>{money(row.amount)}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Cadastre a despesa manualmente ou ignore se for transferência/investimento.
          </p>
        </section>
      )}

      {overview.confirmedMatches.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Confirmadas automaticamente
          </div>
          <ul className="space-y-2">
            {overview.confirmedMatches.slice(0, 5).map((row) => (
              <li
                key={row.matchId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    <Link2 className="mr-1 inline h-3 w-3" />
                    {row.entryDescription} · pago {brDate(row.paidAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone="PAID">{money(row.amount)}</Badge>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {row.matchType === 'AUTO' ? 'auto' : 'manual'} · {row.confidence}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/statement/import" className="font-semibold text-[#103B73] underline">
          Reimportar extrato da conta
        </Link>
        <Link to={`/statement/individual?month=${month}`} className="font-semibold text-[#103B73] underline">
          Ver extrato individual
        </Link>
      </div>
    </Card>
  );
}
