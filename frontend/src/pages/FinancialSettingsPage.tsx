import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ActionButton } from '../components/ui/ActionButton';
import { Input } from '../components/ui/Field';
import { MonthPicker } from '../components/ui/MonthPicker';
import { ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { userService } from '../services/finance.service';
import { brDate, currentMonth, money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';
import type { MonthlySalaryOverride } from '../types/finance';

const schema = z.object({
  baseSalary: z.coerce.number().min(0, 'Informe um salário válido.'),
  salaryPaymentDay: z.coerce.number().min(1).max(31).optional(),
});
type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const overrideSchema = z.object({
  month: z.string().min(7, 'Selecione o mês.'),
  amount: z.coerce.number().min(0, 'Informe o valor do salário.'),
  note: z.string().optional(),
});
type OverrideFormInput = z.input<typeof overrideSchema>;
type OverrideFormData = z.output<typeof overrideSchema>;

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function FinancialSettingsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data, loading, error, reload } = useAsyncData(() => userService.me(), []);
  const {
    data: overrides,
    loading: overridesLoading,
    error: overridesError,
    reload: reloadOverrides,
  } = useAsyncData(() => userService.listSalaryOverrides(), []);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({ resolver: zodResolver(schema) });
  const {
    register: registerOverride,
    handleSubmit: handleSubmitOverride,
    reset: resetOverride,
    watch: watchOverride,
    control: overrideControl,
    formState: { errors: overrideErrors, isSubmitting: overrideSubmitting },
  } = useForm<OverrideFormInput, unknown, OverrideFormData>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { month: currentMonth() },
  });
  const selectedMonth = watchOverride('month');

  useEffect(() => {
    if (data?.financialSettings) {
      reset({
        baseSalary: Number(data.financialSettings.baseSalary),
        salaryPaymentDay: data.financialSettings.salaryPaymentDay,
      });
    }
  }, [data, reset]);

  useEffect(() => {
    if (!selectedMonth || !overrides) return;
    const existing = overrides.find((row) => row.month === selectedMonth);
    resetOverride({
      month: selectedMonth,
      amount: existing ? Number(existing.amount) : Number(data?.financialSettings?.baseSalary ?? 0),
      note: existing?.note ?? '',
    });
  }, [selectedMonth, overrides, data, resetOverride]);

  async function onSubmit(values: FormData) {
    try {
      await userService.updateSalary(values);
      setToast({ message: 'Configurações financeiras atualizadas.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível atualizar.'), type: 'error' });
    }
  }

  async function onSubmitOverride(values: OverrideFormData) {
    try {
      await userService.upsertSalaryOverride({
        month: values.month,
        amount: values.amount,
        note: values.note?.trim() || undefined,
      });
      setToast({ message: `Salário de ${monthLabel(values.month)} salvo.`, type: 'success' });
      await reloadOverrides();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível salvar o ajuste.'), type: 'error' });
    }
  }

  async function removeOverride(month: string) {
    try {
      await userService.deleteSalaryOverride(month);
      setToast({ message: 'Ajuste removido. O salário base volta a valer neste mês.', type: 'success' });
      await reloadOverrides();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível remover o ajuste.'), type: 'error' });
    }
  }

  if (loading) return <Spinner label="Carregando configurações..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const baseSalary = Number(data?.financialSettings?.baseSalary ?? 0);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Card title="Salário e preferências" subtitle="O salário base alimenta os cálculos do dashboard individual.">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Salário base" type="number" step="0.01" error={errors.baseSalary?.message} {...register('baseSalary')} />
              <Input label="Dia de pagamento" type="number" min={1} max={31} error={errors.salaryPaymentDay?.message} {...register('salaryPaymentDay')} />
              <Button type="submit" loading={isSubmitting}>Salvar configurações</Button>
            </form>
          </Card>

          <Card
            title="Ajuste por mês"
            subtitle="Use quando houver descontos ou valores diferentes do salário base em um mês específico."
          >
            <form onSubmit={handleSubmitOverride(onSubmitOverride)} className="space-y-4">
              <Controller
                control={overrideControl}
                name="month"
                render={({ field }) => (
                  <MonthPicker label="Mês" value={field.value} onChange={field.onChange} />
                )}
              />
              <Input
                label="Salário do mês"
                type="number"
                step="0.01"
                error={overrideErrors.amount?.message}
                {...registerOverride('amount')}
              />
              <Input
                label="Motivo (opcional)"
                placeholder="Ex.: descontos, férias, adiantamento"
                error={overrideErrors.note?.message}
                {...registerOverride('note')}
              />
              <p className="text-sm text-slate-500">
                Salário base atual: {money(baseSalary)}. O dashboard usará o valor informado acima para o mês selecionado.
              </p>
              <Button type="submit" loading={overrideSubmitting}>Salvar ajuste do mês</Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Resumo atual">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Salário base</p>
                <p className="mt-1 text-xl font-bold">{money(data?.financialSettings?.baseSalary)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Dia de pagamento</p>
                <p className="mt-1 text-xl font-bold">{data?.financialSettings?.salaryPaymentDay ?? '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Moeda</p>
                <p className="mt-1 text-xl font-bold">{data?.financialSettings?.defaultCurrency ?? 'BRL'}</p>
              </div>
            </div>
          </Card>

          <Card title="Ajustes salvos" subtitle="Meses com salário diferente do valor base.">
            {overridesLoading ? (
              <Spinner label="Carregando ajustes..." />
            ) : overridesError ? (
              <ErrorState message={overridesError} onRetry={reloadOverrides} />
            ) : !overrides?.length ? (
              <p className="text-sm text-slate-500">Nenhum ajuste por mês cadastrado.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {overrides.map((row: MonthlySalaryOverride) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium capitalize text-slate-900">{monthLabel(row.month)}</p>
                      <p className="text-lg font-bold text-[#0B2D5C]">{money(row.amount)}</p>
                      {row.note ? <p className="mt-1 text-sm text-slate-500">{row.note}</p> : null}
                      {row.updatedAt ? (
                        <p className="mt-1 text-xs text-slate-400">Atualizado em {brDate(row.updatedAt)}</p>
                      ) : null}
                    </div>
                    <ActionButton
                      type="button"
                      label="Remover ajuste"
                      icon={<Trash2 />}
                      tone="delete"
                      onClick={() => removeOverride(row.month)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </>
  );
}
