import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CreditCard, FileUp, ReceiptText } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, MetricCard } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { expenseService, type IndividualStatementFilters } from '../services/finance.service';
import type { ExpenseStatus, IndividualStatementSource } from '../types/finance';
import { brDate, currentMonth, label, money, numberValue } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';

const sources: Array<{ value: IndividualStatementSource; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'INDIVIDUAL', label: 'Individuais' },
  { value: 'SHARED', label: 'Casal - minha parte' },
];

function validSource(value: string | null): IndividualStatementSource {
  return value === 'INDIVIDUAL' || value === 'SHARED' ? value : 'ALL';
}

type StatusFilter = 'ALL' | Extract<ExpenseStatus, 'PAID' | 'PENDING' | 'OVERDUE'>;

function cardFilterKey(cardName: string | null | undefined, paymentMethod: string) {
  return cardName?.trim() || label(paymentMethod);
}

function SummaryButton({
  label: buttonLabel,
  value,
  active,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  tone?: 'neutral' | 'good' | 'warning' | 'danger' | 'navy';
  onClick: () => void;
}) {
  const tones = {
    neutral: active
      ? 'border-slate-500 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-950 hover:bg-slate-50',
    good: active
      ? 'border-emerald-700 bg-emerald-700 text-white'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
    warning: active
      ? 'border-amber-700 bg-amber-600 text-white'
      : 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100',
    danger: active
      ? 'border-red-700 bg-red-700 text-white'
      : 'border-red-200 bg-red-50 text-red-950 hover:bg-red-100',
    navy: active
      ? 'border-[#071A3D] bg-[#071A3D] text-white'
      : 'border-[#103B73]/20 bg-white text-[#071A3D] hover:bg-blue-50',
  };

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-w-0 rounded-2xl border p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2 ${tones[tone]}`}
    >
      <span className={`text-xs font-semibold uppercase ${active ? 'text-white/80' : 'text-slate-500'}`}>
        {buttonLabel}
      </span>
      <span className="mt-2 block break-words text-2xl font-bold tracking-normal">{value}</span>
    </button>
  );
}

export function IndividualStatementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [cardFilter, setCardFilter] = useState<string>('ALL');
  const [filters, setFilters] = useState<IndividualStatementFilters>({
    month: searchParams.get('month') ?? currentMonth(),
    name: searchParams.get('name') ?? '',
    source: validSource(searchParams.get('source')),
  });

  const { data, loading, error, reload } = useAsyncData(
    () => expenseService.individualStatement(filters),
    [filters.month, filters.name, filters.source],
  );

  function updateFilters(patch: Partial<IndividualStatementFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);

    const params = new URLSearchParams();
    if (next.month) params.set('month', next.month);
    if (next.name) params.set('name', next.name);
    if (next.source && next.source !== 'ALL') params.set('source', next.source);
    setSearchParams(params, { replace: true });
    setStatusFilter('ALL');
    setCardFilter('ALL');
  }

  const statusItems = useMemo(() => {
    if (!data) return [];
    if (statusFilter === 'ALL') return data.items;
    return data.items.filter((item) => item.status === statusFilter);
  }, [data, statusFilter]);

  const visibleItems = useMemo(() => {
    if (cardFilter === 'ALL') return statusItems;
    return statusItems.filter((item) => {
      const isCard =
        !!item.cardName ||
        item.paymentMethod === 'CREDIT_CARD' ||
        item.paymentMethod === 'DEBIT_CARD';
      return isCard && cardFilterKey(item.cardName, item.paymentMethod) === cardFilter;
    });
  }, [cardFilter, statusItems]);

  const cardTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of statusItems) {
      const isCard =
        !!item.cardName ||
        item.paymentMethod === 'CREDIT_CARD' ||
        item.paymentMethod === 'DEBIT_CARD';
      if (!isCard) continue;
      const key = cardFilterKey(item.cardName, item.paymentMethod);
      totals.set(key, (totals.get(key) ?? 0) + numberValue(item.amount));
    }
    return [...totals.entries()]
      .map(([card, total]) => ({ card, total }))
      .sort((a, b) => b.total - a.total);
  }, [statusItems]);

  return (
    <div className="space-y-6">
      <Card
        title="Extrato individual"
        subtitle="Histórico mensal com despesas individuais e sua parte nas contas do casal."
        action={
          <Link to="/expenses/new">
            <Button type="button">
              <ReceiptText className="h-4 w-4" />
              Lançar
            </Button>
          </Link>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(160px,220px)_minmax(180px,260px)_minmax(220px,1fr)]">
          <Input
            label="Mês"
            type="month"
            value={filters.month ?? ''}
            onChange={(event) => updateFilters({ month: event.target.value })}
          />
          <Select
            label="Origem"
            value={filters.source ?? 'ALL'}
            onChange={(event) =>
              updateFilters({ source: event.target.value as IndividualStatementSource })
            }
          >
            {sources.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </Select>
          <Input
            label="Nome da conta"
            value={filters.name ?? ''}
            placeholder="Buscar por título, categoria ou cartão"
            onChange={(event) => updateFilters({ name: event.target.value })}
          />
        </div>
      </Card>

      {loading && <Spinner label="Carregando extrato..." />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            <MetricCard label="Individual" value={money(data.individualTotal)} />
            <MetricCard label="Casal - minha parte" value={money(data.sharedResponsibilityTotal)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryButton
              label="Todos"
              value={money(data.totalAmount)}
              tone="navy"
              active={statusFilter === 'ALL'}
              onClick={() => {
                setStatusFilter('ALL');
                setCardFilter('ALL');
              }}
            />
            <SummaryButton
              label="Pago"
              value={money(data.paidTotal)}
              tone="good"
              active={statusFilter === 'PAID'}
              onClick={() => {
                setStatusFilter('PAID');
                setCardFilter('ALL');
              }}
            />
            <SummaryButton
              label="Pendente"
              value={money(data.pendingTotal)}
              tone="warning"
              active={statusFilter === 'PENDING'}
              onClick={() => {
                setStatusFilter('PENDING');
                setCardFilter('ALL');
              }}
            />
            <SummaryButton
              label="Vencido"
              value={money(data.overdueTotal)}
              tone="danger"
              active={statusFilter === 'OVERDUE'}
              onClick={() => {
                setStatusFilter('OVERDUE');
                setCardFilter('ALL');
              }}
            />
          </div>

          <Card title="Gasto por cartão" subtitle="Clique em um cartão para filtrar a tabela">
            {cardTotals.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cardTotals.map((row) => (
                  <button
                    key={row.card}
                    type="button"
                    aria-pressed={cardFilter === row.card}
                    onClick={() => setCardFilter(cardFilter === row.card ? 'ALL' : row.card)}
                    className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2 ${
                      cardFilter === row.card
                        ? 'border-[#071A3D] bg-[#071A3D] text-white'
                        : 'border-slate-200 bg-white text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CreditCard className={`h-4 w-4 ${cardFilter === row.card ? 'text-white' : 'text-[#0B2D5C]'}`} />
                      <span className="truncate">{row.card}</span>
                    </div>
                    <p className={`mt-2 text-xl font-bold ${cardFilter === row.card ? 'text-white' : 'text-slate-950'}`}>
                      {money(row.total)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhum lançamento em cartão para o filtro atual.</p>
            )}
          </Card>

          {!visibleItems.length ? (
            <EmptyState
              title="Nenhum lançamento encontrado"
              message="Ajuste o mês, a busca ou o filtro de status."
            />
          ) : (
            <Card title={`${visibleItems.length} lançamento(s)`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-3 pr-4">Conta</th>
                      <th className="py-3 pr-4">Origem</th>
                      <th className="py-3 pr-4">Categoria</th>
                      <th className="py-3 pr-4">Vencimento</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Pagamento</th>
                      <th className="py-3 pr-4 text-right">Valor no extrato</th>
                      <th className="py-3 text-right">Valor lançado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-950">{item.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {item.installmentNumber && item.totalInstallments && (
                              <span>
                                {item.installmentNumber}/{item.totalInstallments}
                              </span>
                            )}
                            {item.cardName && (
                              <span className="inline-flex items-center gap-1">
                                <CreditCard className="h-3.5 w-3.5" />
                                {item.cardName}
                              </span>
                            )}
                            {item.createdBy && <span>Lançado por {item.createdBy.name}</span>}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={item.source}>{item.sourceLabel}</Badge>
                        </td>
                        <td className="py-3 pr-4">{item.category}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {brDate(item.dueDate)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={item.status}>{label(item.status)}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {item.paymentDate ? brDate(item.paymentDate) : label(item.paymentMethod)}
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-950">
                          {money(item.amount)}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {item.source === 'SHARED' ? money(item.originalAmount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {data.bankItems && data.bankItems.length > 0 && filters.source !== 'SHARED' && (
            <Card
              title="Lançamentos do extrato bancário"
              subtitle={`Importados automaticamente · saídas ${money(data.bankDebitTotal ?? 0)}`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Detalhes do cartão/conta importados via CSV ou OFX. Não substituem despesas
                  cadastradas manualmente.
                </p>
                <Link
                  to="/statement/import"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#071A3D] hover:bg-slate-50"
                >
                  <FileUp className="h-4 w-4" />
                  Importar extrato
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-3 pr-4">Descrição</th>
                      <th className="py-3 pr-4">Banco</th>
                      <th className="py-3 pr-4">Categoria</th>
                      <th className="py-3 pr-4">Data</th>
                      <th className="py-3 pr-4">Tipo</th>
                      <th className="py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bankItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-950">{item.title}</td>
                        <td className="py-3 pr-4">{item.bankLabel}</td>
                        <td className="py-3 pr-4">{item.category}</td>
                        <td className="py-3 pr-4">{brDate(item.transactionDate)}</td>
                        <td className="py-3 pr-4">
                          {item.direction === 'DEBIT' ? 'Saída' : 'Entrada'}
                        </td>
                        <td
                          className={`py-3 text-right font-bold ${
                            item.direction === 'DEBIT' ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {item.direction === 'DEBIT' ? '-' : '+'}
                          {money(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
