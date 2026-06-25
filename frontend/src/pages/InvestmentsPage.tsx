import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, TrendingUp } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ActionButton } from '../components/ui/ActionButton';
import { Input } from '../components/ui/Field';
import { MonthPicker } from '../components/ui/MonthPicker';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { EvolutionLine } from '../components/finance/DashboardCharts';
import { investmentService, type InvestmentScope } from '../services/investment.service';
import { brDate, currentMonth, money, monthToDate } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

const schema = z.object({
  amount: z.coerce.number().min(0.01, 'Informe o valor do aporte.'),
  referenceMonth: z.string().min(7),
  contributedAt: z.string().optional(),
  description: z.string().max(500).optional(),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const copy: Record<
  InvestmentScope,
  {
    title: string;
    subtitle: string;
    formHint: string;
    empty: string;
    metricLabel: string;
    allTimeLabel: string;
  }
> = {
  INDIVIDUAL: {
    title: 'Investimentos individuais',
    subtitle: 'Registre cada aporte pessoal. A IA usa apenas estes valores para analisar seus investimentos.',
    formHint: 'Valor que você investiu por conta própria neste mês.',
    empty: 'Nenhum aporte individual registrado ainda.',
    metricLabel: 'Aportes no mês (individual)',
    allTimeLabel: 'Total investido (individual)',
  },
  COUPLE: {
    title: 'Investimentos do casal',
    subtitle: 'Registre aportes conjuntos. Ambos os parceiros veem o total somado de todos os aportes.',
    formHint: 'Valor investido em conjunto neste mês (soma de todos os parceiros).',
    empty: 'Nenhum aporte conjunto registrado ainda.',
    metricLabel: 'Aportes no mês (casal)',
    allTimeLabel: 'Total investido (casal)',
  },
};

export function InvestmentsPage({ scope }: { scope: InvestmentScope }) {
  const texts = copy[scope];
  const [month, setMonth] = useState(currentMonth());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data, loading, error, reload } = useAsyncData(
    () => investmentService.list(scope, month),
    [scope, month],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { referenceMonth: month, amount: '' as unknown as number },
  });

  const chartData = useMemo(
    () =>
      (data?.history ?? []).map((row) => ({
        month: row.month,
        total: Number(row.amount),
      })),
    [data?.history],
  );

  async function onSubmit(values: FormData) {
    setToast(null);
    try {
      await investmentService.create({
        scope,
        amount: values.amount,
        referenceMonth: monthToDate(values.referenceMonth),
        contributedAt: values.contributedAt || undefined,
        description: values.description?.trim() || undefined,
      });
      reset({ referenceMonth: values.referenceMonth, amount: '' as unknown as number });
      setToast({ message: 'Aporte registrado com sucesso.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({
        message: formatAxiosError(err, 'Não foi possível registrar o aporte.'),
        type: 'error',
      });
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir este aporte?')) return;
    try {
      await investmentService.remove(id);
      setToast({ message: 'Aporte excluído.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({
        message: formatAxiosError(err, 'Não foi possível excluir o aporte.'),
        type: 'error',
      });
    }
  }

  if (loading) return <Spinner label="Carregando aportes..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0B2D5C]">
            <TrendingUp className="h-4 w-4" />
            {texts.title}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{texts.subtitle}</p>
        </div>
        <div className="w-full md:w-56">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={texts.allTimeLabel}
          value={money(data?.allTimeTotal ?? 0)}
          tone="navy"
        />
        <MetricCard
          label={texts.metricLabel}
          value={money(data?.monthTotal ?? 0)}
          tone="good"
        />
        <MetricCard
          label="Aportes no mês selecionado"
          value={String(data?.contributionsInMonth ?? items.length)}
        />
        <MetricCard
          label="Tipo"
          value={scope === 'INDIVIDUAL' ? 'Individual' : 'Conjunto (casal)'}
          hint="Usado pelo Assistente de IA"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card title="Novo aporte" subtitle={texts.formHint}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Valor do aporte *"
              type="number"
              step="0.01"
              min="0.01"
              error={errors.amount?.message}
              {...register('amount')}
            />
            <Input
              label="Mês de referência *"
              type="month"
              error={errors.referenceMonth?.message}
              {...register('referenceMonth')}
            />
            <Input label="Data do aporte" type="date" {...register('contributedAt')} />
            <Input label="Observação" placeholder="Ex.: Tesouro Selic, CDB, fundo..." {...register('description')} />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Registrar aporte
            </Button>
          </form>
        </Card>

        <Card title="Histórico de aportes" subtitle={`Referência: ${month}`}>
          {items.length === 0 ? (
            <EmptyState title="Sem aportes" message={texts.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{money(item.amount)}</p>
                    <p className="text-sm text-slate-500">
                      {item.description?.trim() || 'Sem observação'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Ref. {brDate(item.referenceMonth)}
                      {item.contributedAt ? ` · Aporte em ${brDate(item.contributedAt)}` : ''}
                      {scope === 'COUPLE' && item.user
                        ? ` · Registrado por ${item.user.name}`
                        : ''}
                    </p>
                  </div>
                  <ActionButton
                    type="button"
                    tone="delete"
                    label="Excluir aporte"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => void remove(item.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card title="Evolução dos aportes" subtitle="Soma mensal registrada nesta tela.">
          <EvolutionLine data={chartData} />
        </Card>
      )}

      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
