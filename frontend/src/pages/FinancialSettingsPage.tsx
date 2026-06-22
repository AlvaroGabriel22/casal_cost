import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { userService } from '../services/finance.service';
import { money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

const schema = z.object({
  baseSalary: z.coerce.number().min(0, 'Informe um salário válido.'),
  salaryPaymentDay: z.coerce.number().min(1).max(31).optional(),
});
type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

export function FinancialSettingsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data, loading, error, reload } = useAsyncData(() => userService.me(), []);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data?.financialSettings) {
      reset({
        baseSalary: Number(data.financialSettings.baseSalary),
        salaryPaymentDay: data.financialSettings.salaryPaymentDay,
      });
    }
  }, [data, reset]);

  async function onSubmit(values: FormData) {
    try {
      await userService.updateSalary(values);
      setToast({ message: 'Configurações financeiras atualizadas.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível atualizar.'), type: 'error' });
    }
  }

  if (loading) return <Spinner label="Carregando configurações..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card title="Salário e preferências" subtitle="O salário base alimenta os cálculos do dashboard individual.">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Salário base" type="number" step="0.01" error={errors.baseSalary?.message} {...register('baseSalary')} />
            <Input label="Dia de pagamento" type="number" min={1} max={31} error={errors.salaryPaymentDay?.message} {...register('salaryPaymentDay')} />
            <Button type="submit" loading={isSubmitting}>Salvar configurações</Button>
          </form>
        </Card>
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
      </div>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </>
  );
}
