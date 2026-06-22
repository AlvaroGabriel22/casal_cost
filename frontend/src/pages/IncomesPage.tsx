import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ActionButton } from '../components/ui/ActionButton';
import { Input, Select } from '../components/ui/Field';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { incomeService } from '../services/finance.service';
import { brDate, label, money, monthToDate } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

const schema = z.object({
  type: z.enum(['SALARY', 'BONUS', 'PLR', 'VACATION', 'BENEFIT', 'EXTRA_INCOME', 'OTHER']),
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Informe o valor.'),
  referenceMonth: z.string().min(7),
  receivedDate: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceStartDate: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;
const incomeTypes = ['SALARY', 'BONUS', 'PLR', 'VACATION', 'BENEFIT', 'EXTRA_INCOME', 'OTHER'] as const;

export function IncomesPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data, loading, error, reload } = useAsyncData(() => incomeService.list(), []);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXTRA_INCOME', referenceMonth: new Date().toISOString().slice(0, 7), isRecurring: false },
  });
  const recurring = watch('isRecurring');

  async function onSubmit(values: FormData) {
    setToast(null);
    try {
      await incomeService.create({
        ...values,
        referenceMonth: monthToDate(values.referenceMonth),
        receivedDate: values.receivedDate || undefined,
      });
      reset({ type: 'EXTRA_INCOME', referenceMonth: values.referenceMonth, isRecurring: false });
      setToast({ message: 'Receita cadastrada.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível salvar a receita.'), type: 'error' });
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir esta receita?')) return;
    try {
      await incomeService.remove(id);
      setToast({ message: 'Receita excluída.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível excluir.'), type: 'error' });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card title="Nova receita" subtitle="Salários, bônus, PLR, férias, benefícios e rendas extras.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Tipo *" error={errors.type?.message} {...register('type')}>
            {incomeTypes.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </Select>
          <Input label="Descrição" {...register('description')} />
          <Input label="Valor *" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <Input label="Mês de referência *" type="month" error={errors.referenceMonth?.message} {...register('referenceMonth')} />
          <Input label="Data de recebimento" type="date" {...register('receivedDate')} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('isRecurring')} />
            Receita recorrente
          </label>
          {recurring && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Início" type="date" {...register('recurrenceStartDate')} />
              <Input label="Fim opcional" type="date" {...register('recurrenceEndDate')} />
            </div>
          )}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Salvar receita
          </Button>
        </form>
      </Card>

      <Card title="Receitas cadastradas">
        {loading && <Spinner label="Carregando receitas..." />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && !data?.items.length && <EmptyState title="Sem receitas" />}
        {!!data?.items.length && (
          <div className="space-y-3">
            {data.items.map((income) => (
              <div key={income.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{label(income.type)}</p>
                  <p className="text-sm text-slate-500">
                    {income.description || 'Sem descrição'} • {brDate(income.referenceMonth)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="font-bold text-emerald-700">{money(income.amount)}</span>
                  <ActionButton
                    type="button"
                    tone="delete"
                    label="Excluir"
                    icon={<Trash2 />}
                    onClick={() => void remove(income.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
