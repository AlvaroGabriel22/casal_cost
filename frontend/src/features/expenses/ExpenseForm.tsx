import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import type { ExpenseScope, User } from '../../types/finance';
import { monthToDate } from '../../utils/format';

const schema = z.object({
  title: z.string().min(2, 'Informe o título.'),
  description: z.string().optional(),
  category: z.string().min(2, 'Informe a categoria.'),
  totalAmount: z.coerce.number().min(0.01, 'Informe um valor maior que zero.'),
  scope: z.enum(['INDIVIDUAL', 'SHARED']),
  expenseType: z.enum(['ONE_TIME', 'FIXED', 'RECURRING', 'INSTALLMENT', 'FUTURE_CREDIT_CARD']),
  paymentMethod: z.enum(['BOLETO', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'OTHER']),
  cardName: z.string().optional(),
  paidByUserId: z.string().optional(),
  referenceMonth: z.string().min(7),
  dueDate: z.string().optional(),
  recurrenceStartDate: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  dayOfMonth: z.coerce.number().optional(),
  totalInstallments: z.coerce.number().optional(),
  firstReferenceMonth: z.string().optional(),
  splitType: z.enum(['EQUAL', 'PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  comment: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.scope === 'SHARED' && !values.paidByUserId) {
    ctx.addIssue({
      code: 'custom',
      path: ['paidByUserId'],
      message: 'Selecione quem realizou o pagamento.',
    });
  }
});

type ExpenseFormInput = z.input<typeof schema>;
export type ExpenseFormData = z.output<typeof schema>;

const expenseTypes = ['ONE_TIME', 'FIXED', 'RECURRING', 'INSTALLMENT', 'FUTURE_CREDIT_CARD'] as const;
const paymentMethods = ['BOLETO', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'OTHER'] as const;
const cardOptions = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'Inter', 'C6', 'PicPay', 'Outro'];

export function toExpensePayload(values: ExpenseFormData) {
  return {
    title: values.title,
    description: values.description || undefined,
    category: values.category,
    totalAmount: values.totalAmount,
    expenseType: values.expenseType,
    paymentMethod: values.paymentMethod,
    cardName:
      values.paymentMethod === 'CREDIT_CARD' || values.paymentMethod === 'DEBIT_CARD'
        ? values.cardName
        : undefined,
    paidByUserId: values.scope === 'SHARED' ? values.paidByUserId : undefined,
    referenceMonth: values.referenceMonth,
    dueDate: values.dueDate || monthToDate(values.referenceMonth),
    recurrence:
      values.expenseType === 'FIXED' || values.expenseType === 'RECURRING'
        ? {
            frequency: 'MONTHLY' as const,
            startDate: values.recurrenceStartDate || monthToDate(values.referenceMonth),
            endDate: values.recurrenceEndDate || undefined,
            dayOfMonth: values.dayOfMonth || undefined,
          }
        : undefined,
    installment:
      values.expenseType === 'INSTALLMENT'
        ? {
            totalInstallments: values.totalInstallments || 1,
            firstReferenceMonth: values.firstReferenceMonth || values.referenceMonth,
          }
        : undefined,
  };
}

export function ExpenseForm({
  defaultScope = 'INDIVIDUAL',
  coupleMembers = [],
  onSubmit,
  submitting,
}: {
  defaultScope?: ExpenseScope;
  coupleMembers?: Array<Pick<User, 'id' | 'name' | 'username'>>;
  onSubmit: (values: ExpenseFormData) => Promise<void>;
  submitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      scope: defaultScope,
      expenseType: 'ONE_TIME',
      paymentMethod: 'PIX',
      referenceMonth: new Date().toISOString().slice(0, 7),
      splitType: 'EQUAL',
      paidByUserId: '',
    },
  });
  const scope = watch('scope');
  const type = watch('expenseType');
  const paymentMethod = watch('paymentMethod');

  useEffect(() => {
    if (type === 'FUTURE_CREDIT_CARD') setValue('paymentMethod', 'CREDIT_CARD');
  }, [type, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Título *" error={errors.title?.message} {...register('title')} />
        <Input label="Categoria *" error={errors.category?.message} {...register('category')} />
        <Input label="Valor total *" type="number" step="0.01" error={errors.totalAmount?.message} {...register('totalAmount')} />
        <Select label="Escopo *" error={errors.scope?.message} {...register('scope')}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="SHARED">Compartilhada</option>
        </Select>
        {scope === 'SHARED' && (
          <Select label="Quem realizou o pagamento *" error={errors.paidByUserId?.message} {...register('paidByUserId')}>
            <option value="">Selecione</option>
            {coupleMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.username})
              </option>
            ))}
          </Select>
        )}
        <Select label="Tipo *" error={errors.expenseType?.message} {...register('expenseType')}>
          {expenseTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select label="Pagamento *" error={errors.paymentMethod?.message} {...register('paymentMethod')}>
          {paymentMethods.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
          <Select label="Cartão usado" {...register('cardName')}>
            <option value="">Selecione o cartão</option>
            {cardOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        )}
        <Input label="Mês de referência *" type="month" error={errors.referenceMonth?.message} {...register('referenceMonth')} />
        <Input label="Vencimento" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
      </div>

      <Textarea label="Descrição" {...register('description')} />

      {(type === 'FIXED' || type === 'RECURRING') && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-950">Recorrência</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Início" type="date" {...register('recurrenceStartDate')} />
            <Input label="Fim opcional" type="date" {...register('recurrenceEndDate')} />
            <Input label="Dia do mês" type="number" min={1} max={31} {...register('dayOfMonth')} />
          </div>
        </div>
      )}

      {(type === 'INSTALLMENT' || type === 'FUTURE_CREDIT_CARD') && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-950">Parcelamento e meses futuros</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Total de parcelas" type="number" min={1} {...register('totalInstallments')} />
            <Input label="Primeiro mês afetado" type="month" {...register('firstReferenceMonth')} />
          </div>
          {type === 'FUTURE_CREDIT_CARD' && (
            <p className="mt-3 text-sm text-slate-500">
              Esta opção registra a despesa no mês selecionado. Para detalhar mês a mês, escolha
              "Parcelado".
            </p>
          )}
        </div>
      )}

      {scope === 'SHARED' && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="font-semibold text-slate-950">Divisão compartilhada</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Select label="Tipo de divisão" {...register('splitType')}>
              <option value="EQUAL">Igual</option>
              <option value="PERCENTAGE">Percentual</option>
              <option value="FIXED_AMOUNT">Valor fixo</option>
            </Select>
            <Input label="Comentário opcional" {...register('comment')} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            A divisão final é aplicada de forma justa entre os parceiros, conforme a opção
            selecionada.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Salvar despesa
        </Button>
      </div>
    </form>
  );
}
