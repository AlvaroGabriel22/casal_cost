import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ActionButton } from '../components/ui/ActionButton';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { cardService, coupleService, installmentService } from '../services/finance.service';
import { brDate, label, money, monthToDate } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';
import type { InstallmentGroup, Occurrence, PaymentMethod, UserCard } from '../types/finance';
import { CheckCircle2, CreditCard, Pencil, Plus, Save, Trash2 } from 'lucide-react';

const occurrenceStatusBadge: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-700',
  PENDING: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const occurrenceStatusLabel: Record<string, string> = {
  PAID: 'Quitada',
  OVERDUE: 'Atrasada',
  PENDING: 'Pendente',
  CANCELLED: 'Cancelada',
};

function collectOccurrences(group: InstallmentGroup): Occurrence[] {
  return (group.expenses?.flatMap((expense) => expense.occurrences ?? []) ?? [])
    .slice()
    .sort((a, b) => {
      const an = a.installmentNumber ?? 0;
      const bn = b.installmentNumber ?? 0;
      if (an !== bn) return an - bn;
      return a.referenceMonth.localeCompare(b.referenceMonth);
    });
}

const schema = z.object({
  title: z.string().min(2, 'Informe o título.'),
  description: z.string().optional(),
  category: z.string().min(2, 'Informe a categoria.'),
  totalAmount: z.coerce.number().min(0.01, 'Informe o valor.'),
  paymentMethod: z.enum(['BOLETO', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'OTHER']),
  cardName: z.string().optional(),
  paidByUserId: z.string().optional(),
  totalInstallments: z.coerce.number().min(1, 'Informe as parcelas.'),
  firstReferenceMonth: z.string().min(7),
  scope: z.enum(['INDIVIDUAL', 'SHARED']),
}).superRefine((values, ctx) => {
  if (values.scope === 'SHARED' && !values.paidByUserId) {
    ctx.addIssue({
      code: 'custom',
      path: ['paidByUserId'],
      message: 'Selecione quem realizou o pagamento.',
    });
  }
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;
const paymentMethods = ['BOLETO', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'OTHER'] as const;
const cardSuggestions = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'Inter', 'C6', 'PicPay'];

export function InstallmentsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState<InstallmentGroup | null>(null);
  const [deleting, setDeleting] = useState<InstallmentGroup | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [paying, setPaying] = useState<InstallmentGroup | null>(null);
  const [selectedToPay, setSelectedToPay] = useState<Set<string>>(new Set());
  const [savingPayment, setSavingPayment] = useState(false);
  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [dueDayPrompt, setDueDayPrompt] = useState<{
    name: string;
    dueDay: string;
    closingDay: string;
  } | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    totalAmount: '',
    totalInstallments: '',
    paymentMethod: 'CREDIT_CARD' as PaymentMethod,
    cardName: '',
    paidByUserId: '',
  });
  const { data, loading, error, reload } = useAsyncData(() => installmentService.list(), []);
  const { data: couple } = useAsyncData(() => coupleService.me(), []);
  const { data: cards, reload: reloadCards } = useAsyncData(() => cardService.list(), []);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'CREDIT_CARD',
      firstReferenceMonth: new Date().toISOString().slice(0, 7),
      scope: 'INDIVIDUAL',
      paidByUserId: '',
    },
  });
  const createPaymentMethod = watch('paymentMethod');
  const createScope = watch('scope');
  const coupleMembers = [couple?.userA, couple?.userB].filter(Boolean);

  async function onSubmit(values: FormData) {
    try {
      const usesCard =
        values.paymentMethod === 'CREDIT_CARD' || values.paymentMethod === 'DEBIT_CARD';
      const selectedCard =
        usesCard && values.cardName
          ? cards?.find((card) => card.name === values.cardName)
          : undefined;
      await installmentService.create({
        ...values,
        paidByUserId: values.scope === 'SHARED' ? values.paidByUserId : undefined,
        firstReferenceMonth: monthToDate(values.firstReferenceMonth),
        dueDay: selectedCard?.dueDay,
      });
      setToast({ message: 'Parcelamento criado.', type: 'success' });
      reset({
        paymentMethod: 'CREDIT_CARD',
        firstReferenceMonth: values.firstReferenceMonth,
        scope: values.scope,
        paidByUserId: values.scope === 'SHARED' ? values.paidByUserId : '',
      });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível criar o parcelamento.'), type: 'error' });
    }
  }

  async function mutate(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setToast({ message: success, type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'A ação falhou.'), type: 'error' });
    }
  }

  function openEdit(group: InstallmentGroup) {
    const firstExpense = group.expenses?.[0];
    setEditing(group);
    setEditForm({
      title: group.title,
      description: firstExpense?.description ?? '',
      category: firstExpense?.category ?? '',
      totalAmount: String(group.totalAmount),
      totalInstallments: String(group.totalInstallments),
      paymentMethod: firstExpense?.paymentMethod ?? 'CREDIT_CARD',
      cardName: firstExpense?.cardName ?? '',
      paidByUserId: firstExpense?.paidByUserId ?? '',
    });
  }

  async function saveEdit() {
    if (!editing) return;
    await mutate(
      () =>
        installmentService.update(editing.id, {
          title: editForm.title,
          description: editForm.description || undefined,
          category: editForm.category,
          totalAmount: Number(editForm.totalAmount),
          totalInstallments: Number(editForm.totalInstallments),
          paymentMethod: editForm.paymentMethod,
          cardName:
            editForm.paymentMethod === 'CREDIT_CARD' || editForm.paymentMethod === 'DEBIT_CARD'
              ? editForm.cardName
              : undefined,
          paidByUserId: editing.expenses?.[0]?.scope === 'SHARED' ? editForm.paidByUserId : undefined,
        }),
      'Parcelamento atualizado.',
    );
    setEditing(null);
  }

  function openPay(group: InstallmentGroup) {
    setPaying(group);
    setSelectedToPay(new Set());
  }

  function toggleSelectToPay(occurrenceId: string) {
    setSelectedToPay((prev) => {
      const next = new Set(prev);
      if (next.has(occurrenceId)) next.delete(occurrenceId);
      else next.add(occurrenceId);
      return next;
    });
  }

  async function confirmPay() {
    if (!paying || selectedToPay.size === 0) return;
    setSavingPayment(true);
    try {
      await installmentService.pay(paying.id, [...selectedToPay]);
      setToast({ message: 'Parcelas quitadas.', type: 'success' });
      setPaying(null);
      setSelectedToPay(new Set());
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível quitar as parcelas.'), type: 'error' });
    } finally {
      setSavingPayment(false);
    }
  }

  function openDueDayPrompt(name: string) {
    const existing = cards?.find((card) => card.name === name);
    setDueDayPrompt({
      name,
      dueDay: existing ? String(existing.dueDay) : '',
      closingDay: existing?.closingDay ? String(existing.closingDay) : '',
    });
  }

  function startAddCustomCard() {
    const name = newCardName.trim();
    if (!name) return;
    openDueDayPrompt(name);
  }

  async function confirmDueDay() {
    if (!dueDayPrompt) return;
    const day = Number(dueDayPrompt.dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setToast({ message: 'Informe um dia de vencimento entre 1 e 31.', type: 'error' });
      return;
    }
    const closingRaw = dueDayPrompt.closingDay.trim();
    const closingDay =
      closingRaw === '' ? undefined : Number(closingRaw);
    if (
      closingDay !== undefined &&
      (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31)
    ) {
      setToast({ message: 'Informe um dia de fechamento entre 1 e 31.', type: 'error' });
      return;
    }
    setSavingCard(true);
    try {
      await cardService.upsert(dueDayPrompt.name.trim(), day, closingDay);
      setToast({
        message: 'Cartão salvo. Vencimento e fechamento usados na importação de extrato.',
        type: 'success',
      });
      setDueDayPrompt(null);
      setNewCardName('');
      await Promise.all([reloadCards(), reload()]);
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível salvar o cartão.'), type: 'error' });
    } finally {
      setSavingCard(false);
    }
  }

  async function removeCard(card: UserCard) {
    await mutateCards(() => cardService.remove(card.id), 'Cartão removido.');
  }

  async function mutateCards(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setToast({ message: success, type: 'success' });
      await reloadCards();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'A ação falhou.'), type: 'error' });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await mutate(
      () => installmentService.remove(deleting.id, deletePassword),
      'Parcelamento excluído.',
    );
    setDeleting(null);
    setDeletePassword('');
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card title="Novo parcelamento" subtitle="Crie compras parceladas e meses futuros afetados.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Título *" error={errors.title?.message} {...register('title')} />
          <Input label="Descrição" {...register('description')} />
          <Input label="Categoria *" error={errors.category?.message} {...register('category')} />
          <Input label="Valor total *" type="number" step="0.01" error={errors.totalAmount?.message} {...register('totalAmount')} />
          <Input label="Parcelas *" type="number" min={1} error={errors.totalInstallments?.message} {...register('totalInstallments')} />
          <Input label="Primeiro mês *" type="month" error={errors.firstReferenceMonth?.message} {...register('firstReferenceMonth')} />
          <Select label="Escopo *" {...register('scope')}>
            <option value="INDIVIDUAL">Individual</option>
            <option value="SHARED">Compartilhado</option>
          </Select>
          {createScope === 'SHARED' && (
            <Select label="Quem realizou o pagamento *" error={errors.paidByUserId?.message} {...register('paidByUserId')}>
              <option value="">Selecione</option>
              {coupleMembers.map((member) => (
                <option key={member!.id} value={member!.id}>
                  {member!.name} ({member!.username})
                </option>
              ))}
            </Select>
          )}
          <Select label="Pagamento *" {...register('paymentMethod')}>
            {paymentMethods.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </Select>
          {(createPaymentMethod === 'CREDIT_CARD' || createPaymentMethod === 'DEBIT_CARD') && (
            <div className="space-y-2">
              <Select label="Cartão usado" {...register('cardName')}>
                <option value="">Selecione o cartão</option>
                {(cards ?? []).map((card) => (
                  <option key={card.id} value={card.name}>
                    {card.name} (vence dia {card.dueDay})
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setCardManagerOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B2D5C] underline"
              >
                <CreditCard className="h-4 w-4" />
                Gerenciar cartões
              </button>
              {!cards?.length && (
                <p className="text-xs text-slate-500">
                  Nenhum cartão cadastrado. Adicione um cartão para usar a data de vencimento automática.
                </p>
              )}
            </div>
          )}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Criar parcelamento
          </Button>
        </form>
      </Card>

      <Card title="Grupos de parcelas">
        {loading && <Spinner label="Carregando parcelamentos..." />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && !data?.length && <EmptyState title="Sem parcelamentos" />}
        {!!data?.length && (
          <div className="grid gap-3">
            {data.map((group) => (
              <div key={group.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-slate-950">{group.title}</p>
                    <p className="text-sm text-slate-500">
                      Início {brDate(group.firstReferenceMonth)} • {group.totalInstallments} parcelas
                    </p>
                    {group.expenses?.[0]?.cardName && (
                      <p className="text-sm text-slate-500">Cartão: {group.expenses[0].cardName}</p>
                    )}
                    {group.expenses?.[0]?.paidBy && (
                      <p className="text-sm text-slate-500">
                        Pagamento realizado por {group.expenses[0].paidBy.name}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-[#071A3D]">{money(group.totalAmount)}</p>
                </div>
                {(() => {
                  const occurrences =
                    group.expenses?.flatMap((expense) => expense.occurrences ?? []) ?? [];
                  const paid = occurrences.filter((occurrence) => occurrence.status === 'PAID').length;
                  const pending = occurrences.filter((occurrence) => occurrence.status !== 'PAID').length;
                  return (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        Parcelas: {paid}/{occurrences.length || group.totalInstallments}
                      </span>
                      <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Parcela média {money(Number(group.totalAmount) / group.totalInstallments)}
                      </span>
                      <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-[#0B2D5C]">
                        Pendentes: {pending}
                      </span>
                    </div>
                  );
                })()}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <ActionButton
                    type="button"
                    tone="edit"
                    label="Editar"
                    icon={<Pencil />}
                    onClick={() => openEdit(group)}
                  />
                  <ActionButton
                    type="button"
                    tone="pay"
                    label="Quitar"
                    icon={<CheckCircle2 />}
                    onClick={() => openPay(group)}
                  />
                  <ActionButton
                    type="button"
                    tone="delete"
                    label="Excluir"
                    icon={<Trash2 />}
                    onClick={() => setDeleting(group)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal open={!!editing} title="Editar parcelamento" onClose={() => setEditing(null)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Título"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <Input
            label="Categoria"
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
          />
          <Input
            label="Valor total"
            type="number"
            step="0.01"
            value={editForm.totalAmount}
            onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })}
          />
          <Input
            label="Quantidade de parcelas"
            type="number"
            min={1}
            value={editForm.totalInstallments}
            onChange={(e) => setEditForm({ ...editForm, totalInstallments: e.target.value })}
          />
          <Select
            label="Pagamento"
            value={editForm.paymentMethod}
            onChange={(e) =>
              setEditForm({ ...editForm, paymentMethod: e.target.value as PaymentMethod })
            }
          >
            {paymentMethods.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </Select>
          {(editForm.paymentMethod === 'CREDIT_CARD' || editForm.paymentMethod === 'DEBIT_CARD') && (
            <Select
              label="Cartão usado"
              value={editForm.cardName}
              onChange={(e) => setEditForm({ ...editForm, cardName: e.target.value })}
            >
              <option value="">Selecione o cartão</option>
              {editForm.cardName &&
                !cards?.some((card) => card.name === editForm.cardName) && (
                  <option value={editForm.cardName}>{editForm.cardName}</option>
                )}
              {(cards ?? []).map((card) => (
                <option key={card.id} value={card.name}>
                  {card.name} (vence dia {card.dueDay})
                </option>
              ))}
            </Select>
          )}
          {editing?.expenses?.[0]?.scope === 'SHARED' && (
            <Select
              label="Quem realizou o pagamento"
              value={editForm.paidByUserId}
              onChange={(e) => setEditForm({ ...editForm, paidByUserId: e.target.value })}
            >
              <option value="">Selecione</option>
              {coupleMembers.map((member) => (
                <option key={member!.id} value={member!.id}>
                  {member!.name} ({member!.username})
                </option>
              ))}
            </Select>
          )}
          <div className="md:col-span-2">
            <Input
              label="Descrição"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveEdit()}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={!!paying} title="Quitar parcelas" onClose={() => setPaying(null)}>
        {paying && (() => {
          const occurrences = collectOccurrences(paying);
          const selectable = occurrences.filter(
            (o) => o.status !== 'PAID' && o.status !== 'CANCELLED',
          );
          const allSelectableChosen =
            selectable.length > 0 && selectable.every((o) => selectedToPay.has(o.id));
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Selecione as parcelas que deseja quitar. As já quitadas aparecem marcadas.
                </p>
                {selectable.length > 0 && (
                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-[#0B2D5C] underline"
                    onClick={() =>
                      setSelectedToPay(
                        allSelectableChosen ? new Set() : new Set(selectable.map((o) => o.id)),
                      )
                    }
                  >
                    {allSelectableChosen ? 'Limpar seleção' : 'Selecionar pendentes'}
                  </button>
                )}
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {occurrences.map((occurrence) => {
                  const isPaid = occurrence.status === 'PAID';
                  const isCancelled = occurrence.status === 'CANCELLED';
                  const disabled = isPaid || isCancelled;
                  const checked = isPaid || selectedToPay.has(occurrence.id);
                  return (
                    <label
                      key={occurrence.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                        disabled
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                          : 'cursor-pointer border-slate-200 hover:border-[#0B2D5C]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-[#071A3D]"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleSelectToPay(occurrence.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">
                          Parcela {occurrence.installmentNumber ?? '—'}
                          {occurrence.totalInstallments ? `/${occurrence.totalInstallments}` : ''}
                          <span className="ml-2 font-normal text-slate-500">
                            • venc. {brDate(occurrence.dueDate)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">{money(occurrence.amount)}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                          occurrenceStatusBadge[occurrence.status] ?? 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {occurrenceStatusLabel[occurrence.status] ?? label(occurrence.status)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  loading={savingPayment}
                  disabled={selectedToPay.size === 0}
                  onClick={() => void confirmPay()}
                >
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
      <Modal open={!!deleting} title="Confirmar exclusão" onClose={() => setDeleting(null)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (deletePassword.length >= 8) void confirmDelete();
          }}
        >
          <p className="text-sm text-slate-600">
            Para excluir <strong>{deleting?.title}</strong> e suas parcelas, confirme sua senha.
          </p>
          <Input
            label="Senha"
            type="password"
            value={deletePassword}
            autoComplete="current-password"
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={deletePassword.length < 8}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={cardManagerOpen} title="Gerenciar cartões" onClose={() => setCardManagerOpen(false)}>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Meus cartões</p>
            {!cards?.length ? (
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Você ainda não cadastrou cartões.
              </p>
            ) : (
              <div className="space-y-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{card.name}</p>
                      <p className="text-xs text-slate-500">
                        Vence dia {card.dueDay}
                        {card.closingDay ? ` · Fecha dia ${card.closingDay}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => openDueDayPrompt(card.name)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Vencimento
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => void removeCard(card)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Adicionar cartão</p>
            <div className="flex flex-wrap gap-2">
              {cardSuggestions
                .filter((name) => !cards?.some((card) => card.name === name))
                .map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-[#0B2D5C]/40 hover:bg-slate-50"
                    onClick={() => openDueDayPrompt(name)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {name}
                  </button>
                ))}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Novo cartão"
                  placeholder="Ex: Cartão da loja"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                />
              </div>
              <Button type="button" onClick={startAddCustomCard} disabled={!newCardName.trim()}>
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setCardManagerOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={!!dueDayPrompt}
        title="Datas do cartão"
        onClose={() => setDueDayPrompt(null)}
      >
        {dueDayPrompt && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmDueDay();
            }}
          >
            <p className="text-sm text-slate-600">
              Informe vencimento e fechamento do cartão <strong>{dueDayPrompt.name}</strong>.
              Usamos essas datas para agrupar compras do extrato na fatura correta (ex.: Nubank
              fecha dia 20, vence dia 1).
            </p>
            <Input
              label="Dia do vencimento (1 a 31) *"
              type="number"
              min={1}
              max={31}
              value={dueDayPrompt.dueDay}
              onChange={(e) => setDueDayPrompt({ ...dueDayPrompt, dueDay: e.target.value })}
            />
            <Input
              label="Dia do fechamento (opcional)"
              type="number"
              min={1}
              max={31}
              placeholder="Ex.: 20 — detectamos pelo extrato se vazio"
              value={dueDayPrompt.closingDay}
              onChange={(e) => setDueDayPrompt({ ...dueDayPrompt, closingDay: e.target.value })}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDueDayPrompt(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={savingCard} disabled={!dueDayPrompt.dueDay}>
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
