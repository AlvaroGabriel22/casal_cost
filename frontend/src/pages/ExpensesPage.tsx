import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, Ban, Pencil, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ActionButton } from '../components/ui/ActionButton';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import type { Paginated } from '../api/client';
import { expenseService, type ExpenseFilters } from '../services/finance.service';
import type {
  Expense,
  ExpenseScope,
  ExpenseStatus,
  ExpenseType,
  IndividualStatement,
  IndividualStatementItem,
  PaymentMethod,
} from '../types/finance';
import { brDate, currentMonth, label, money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

const statuses: Array<ExpenseStatus | ''> = ['', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
const types: Array<ExpenseType | ''> = ['', 'ONE_TIME', 'FIXED', 'RECURRING', 'INSTALLMENT', 'FUTURE_CREDIT_CARD'];
const methods: Array<PaymentMethod | ''> = ['', 'BOLETO', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'OTHER'];
const cardOptions = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'Inter', 'C6', 'PicPay', 'Outro'];

function occurrenceForMonth(expense: Expense, month?: string) {
  if (!expense.occurrences?.length) return undefined;
  if (!month) return expense.occurrences[0];
  return (
    expense.occurrences.find((row) => row.referenceMonth.startsWith(month)) ??
    expense.occurrences[0]
  );
}

function sharedShareAmount(expense: Expense, occurrenceAmount: string | number) {
  const amount = Number(occurrenceAmount);
  if (!Number.isFinite(amount)) return null;
  const splits = expense.sharedSplits ?? [];
  if (splits.length === 0) return amount / 2;
  const equalCount = splits.filter((split) => split.splitType === 'EQUAL').length;
  if (equalCount > 0) return amount / equalCount;
  return null;
}

export function ExpensesPage({ scope }: { scope: ExpenseScope }) {
  const [filters, setFilters] = useState<ExpenseFilters>({ month: currentMonth(), page: 1, limit: 20 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [payingShare, setPayingShare] = useState<IndividualStatementItem | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [paySharePassword, setPaySharePassword] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    totalAmount: '',
    paymentMethod: 'PIX' as PaymentMethod,
    cardName: '',
  });
  const { data, loading, error, reload } = useAsyncData<Paginated<Expense> | IndividualStatement>(
    () =>
      scope === 'INDIVIDUAL'
        ? expenseService.individualStatement({
            month: filters.month,
            name: filters.name,
            source: 'ALL',
          })
        : expenseService.list(scope, filters),
    [
      scope,
      filters.month,
      filters.name,
      filters.status,
      filters.category,
      filters.expenseType,
      filters.paymentMethod,
      filters.page,
    ],
  );

  const statementData = scope === 'INDIVIDUAL' ? (data as IndividualStatement | null) : null;
  const paginatedData =
    scope === 'SHARED' ? (data as Paginated<Expense> | null) : null;
  const statementItems =
    statementData?.items.filter((item) => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.expenseType && item.expenseType !== filters.expenseType) return false;
      if (filters.paymentMethod && item.paymentMethod !== filters.paymentMethod) return false;
      return true;
    }) ?? [];

  async function mutate(action: () => Promise<unknown>, success: string) {
    setToast(null);
    try {
      await action();
      setToast({ message: success, type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'A ação falhou.'), type: 'error' });
    }
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setEditForm({
      title: expense.title,
      description: expense.description ?? '',
      category: expense.category,
      totalAmount: String(expense.totalAmount),
      paymentMethod: expense.paymentMethod,
      cardName: expense.cardName ?? '',
    });
  }

  function statementItemToExpense(item: IndividualStatementItem): Expense {
    return {
      id: item.expenseId,
      title: item.title,
      description: item.description,
      category: item.category,
      totalAmount: item.amount,
      scope: item.source,
      expenseType: item.expenseType,
      paymentMethod: item.paymentMethod,
      cardName: item.cardName,
      status: item.status,
      occurrences: [
        {
          id: item.occurrenceId,
          referenceMonth: item.referenceMonth,
          dueDate: item.dueDate,
          amount: item.amount,
          status: item.status,
          paymentDate: item.paymentDate,
          installmentNumber: item.installmentNumber,
          totalInstallments: item.totalInstallments,
        },
      ],
    };
  }

  async function saveEdit() {
    if (!editing) return;
    await mutate(
      () =>
        expenseService.update(scope, editing.id, {
          title: editForm.title,
          description: editForm.description || undefined,
          category: editForm.category,
          totalAmount: Number(editForm.totalAmount),
          paymentMethod: editForm.paymentMethod,
          cardName:
            editForm.paymentMethod === 'CREDIT_CARD' || editForm.paymentMethod === 'DEBIT_CARD'
              ? editForm.cardName
              : undefined,
        }),
      'Despesa atualizada.',
    );
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    await mutate(
      () => expenseService.remove(scope, deleting.id, deletePassword),
      'Despesa excluída.',
    );
    setDeleting(null);
    setDeletePassword('');
  }

  async function confirmPayMyShare() {
    if (!payingShare) return;
    await mutate(
      () => expenseService.payMyShare(payingShare.expenseId, payingShare.occurrenceId, paySharePassword),
      'Sua parte foi quitada.',
    );
    setPayingShare(null);
    setPaySharePassword('');
  }

  return (
    <div className="space-y-6">
      <Card
        title={scope === 'SHARED' ? 'Despesas do casal' : 'Despesas individuais'}
        subtitle={
          scope === 'SHARED'
            ? 'Filtre, edite e acompanhe todas as contas que vocês dividem.'
            : 'Tudo o que você vai pagar no mês: lançamentos individuais e sua parte nas contas do casal.'
        }
        action={
          <Link to="/expenses/new">
            <Button type="button">
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-5">
          <Input label="Mês" type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value, page: 1 })} />
          <Select label="Status" value={filters.status ?? ''} onChange={(e) => setFilters({ ...filters, status: e.target.value as ExpenseStatus | '', page: 1 })}>
            {statuses.map((item) => (
              <option key={item || 'all'} value={item}>
                {item ? label(item) : 'Todos'}
              </option>
            ))}
          </Select>
          {scope === 'INDIVIDUAL' ? (
            <Input label="Conta" value={filters.name ?? ''} onChange={(e) => setFilters({ ...filters, name: e.target.value, page: 1 })} />
          ) : (
            <Input label="Categoria" value={filters.category ?? ''} onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })} />
          )}
          <Select label="Tipo" value={filters.expenseType ?? ''} onChange={(e) => setFilters({ ...filters, expenseType: e.target.value as ExpenseType | '', page: 1 })}>
            {types.map((item) => (
              <option key={item || 'all'} value={item}>
                {item ? label(item) : 'Todos'}
              </option>
            ))}
          </Select>
          <Select label="Pagamento" value={filters.paymentMethod ?? ''} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value as PaymentMethod | '', page: 1 })}>
            {methods.map((item) => (
              <option key={item || 'all'} value={item}>
                {item ? label(item) : 'Todos'}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading && <Spinner label="Carregando despesas..." />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && scope === 'SHARED' && !paginatedData?.items.length && (
        <EmptyState title="Nenhuma despesa encontrada" message="Ajuste os filtros ou cadastre uma nova despesa." />
      )}
      {!loading && !error && scope === 'INDIVIDUAL' && !statementItems.length && (
        <EmptyState title="Nenhuma despesa encontrada" message="Ajuste os filtros ou cadastre uma nova despesa." />
      )}

      {scope === 'INDIVIDUAL' && !!statementItems.length && (
        <Card title={`${statementItems.length} registro(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4">Título</th>
                  <th className="py-3 pr-4">Origem</th>
                  <th className="py-3 pr-4">Categoria</th>
                  <th className="py-3 pr-4">Valor que você paga</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Vencimento</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {statementItems.map((item) => {
                  const isShared = item.source === 'SHARED';
                  const canManageHere = !isShared;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4 font-semibold text-slate-950">
                        {item.title}
                        {item.description && <p className="font-normal text-slate-500">{item.description}</p>}
                        {item.installmentNumber && item.totalInstallments && (
                          <p className="font-normal text-slate-500">
                            Parcela {item.installmentNumber}/{item.totalInstallments}
                          </p>
                        )}
                        {isShared && item.createdBy && (
                          <p className="font-normal text-slate-500">Lançada por {item.createdBy.name}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={item.source}>{item.sourceLabel}</Badge>
                      </td>
                      <td className="py-3 pr-4">{item.category}</td>
                      <td className="py-3 pr-4 font-semibold">
                        {money(item.amount)}
                        {isShared && (
                          <p className="text-xs font-normal text-slate-500">Total lançado: {money(item.originalAmount)}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">{label(item.expenseType)}</td>
                      <td className="py-3 pr-4">{brDate(item.dueDate)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={item.status}>{label(item.status)}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          {canManageHere ? (
                            <>
                              <ActionButton
                                type="button"
                                tone="edit"
                                label="Editar"
                                icon={<Pencil />}
                                onClick={() => openEdit(statementItemToExpense(item))}
                              />
                              <ActionButton
                                type="button"
                                tone="pay"
                                label="Quitar"
                                icon={<CheckCircle2 />}
                                disabled={item.status === 'PAID' || item.status === 'CANCELLED'}
                                onClick={() =>
                                  mutate(
                                    () =>
                                      expenseService.pay(
                                        'INDIVIDUAL',
                                        item.expenseId,
                                        item.occurrenceId,
                                        filters.month,
                                      ),
                                    'Conta quitada.',
                                  )
                                }
                              />
                              <ActionButton
                                type="button"
                                tone="neutral"
                                label="Cancelar"
                                icon={<Ban />}
                                disabled={item.status === 'CANCELLED'}
                                onClick={() =>
                                  window.confirm('Cancelar esta conta do mês?') &&
                                  mutate(
                                    () => expenseService.cancel('INDIVIDUAL', item.expenseId, item.occurrenceId, filters.month),
                                    'Conta cancelada.',
                                  )
                                }
                              />
                              <ActionButton
                                type="button"
                                tone="delete"
                                label="Excluir"
                                icon={<Trash2 />}
                                onClick={() => setDeleting(statementItemToExpense(item))}
                              />
                            </>
                          ) : (
                            <ActionButton
                              type="button"
                              tone="pay"
                              label="Quitar"
                              icon={<CheckCircle2 />}
                              disabled={item.status === 'PAID' || item.status === 'CANCELLED'}
                              onClick={() => {
                                setPayingShare(item);
                                setPaySharePassword('');
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {scope === 'SHARED' && !!paginatedData?.items.length && (
        <Card title={`${paginatedData.total} registro(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4">Título</th>
                  <th className="py-3 pr-4">Categoria</th>
                  <th className="py-3 pr-4">Valor</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Vencimento</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.items.map((item) => {
                  const occurrence = occurrenceForMonth(item, filters.month);
                  const visibleStatus = occurrence?.status ?? item.status;
                  const displayAmount = occurrence?.amount ?? item.totalAmount;
                  const perPersonShare = sharedShareAmount(item, displayAmount);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4 font-semibold text-slate-950">
                        {item.title}
                        {item.description && <p className="font-normal text-slate-500">{item.description}</p>}
                        {occurrence?.installmentNumber && occurrence?.totalInstallments && (
                          <p className="font-normal text-slate-500">
                            Parcela {occurrence.installmentNumber}/{occurrence.totalInstallments}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">{item.category}</td>
                      <td className="py-3 pr-4 font-semibold">
                        {money(displayAmount)}
                        {item.expenseType === 'INSTALLMENT' && (
                          <p className="text-xs font-normal text-slate-500">
                            Total do parcelamento: {money(item.totalAmount)}
                          </p>
                        )}
                        {perPersonShare != null && (
                          <p className="text-xs font-normal text-slate-500">
                            ~{money(perPersonShare)} por pessoa
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">{label(item.expenseType)}</td>
                      <td className="py-3 pr-4">{brDate(occurrence?.dueDate)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={visibleStatus}>{label(visibleStatus)}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <ActionButton
                            type="button"
                            tone="edit"
                            label="Editar"
                            icon={<Pencil />}
                            onClick={() => openEdit(item)}
                          />
                          <ActionButton
                            type="button"
                            tone="pay"
                            label="Quitar"
                            icon={<CheckCircle2 />}
                            disabled={visibleStatus === 'PAID' || visibleStatus === 'CANCELLED'}
                            onClick={() =>
                              mutate(
                                () =>
                                  expenseService.pay(
                                    scope,
                                    item.id,
                                    occurrence?.id,
                                    filters.month,
                                  ),
                                'Conta quitada.',
                              )
                            }
                          />
                          <ActionButton
                            type="button"
                            tone="neutral"
                            label="Cancelar"
                            icon={<Ban />}
                            disabled={visibleStatus === 'CANCELLED'}
                            onClick={() =>
                              window.confirm('Cancelar esta conta do mês?') &&
                              mutate(
                                () =>
                                  expenseService.cancel(
                                    scope,
                                    item.id,
                                    occurrence?.id,
                                    filters.month,
                                  ),
                                'Conta cancelada.',
                              )
                            }
                          />
                          <ActionButton
                            type="button"
                            tone="delete"
                            label="Excluir"
                            icon={<Trash2 />}
                            onClick={() => setDeleting(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}>
              Anterior
            </Button>
            <span className="text-sm text-slate-500">
              Página {paginatedData.page} de {paginatedData.totalPages || 1}
            </span>
            <Button type="button" variant="outline" disabled={paginatedData.page >= paginatedData.totalPages} onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}>
              Próxima
            </Button>
          </div>
        </Card>
      )}
      <Modal open={!!editing} title="Editar despesa" onClose={() => setEditing(null)}>
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
          <Select
            label="Pagamento"
            value={editForm.paymentMethod}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                paymentMethod: e.target.value as PaymentMethod,
              })
            }
          >
            {methods.filter(Boolean).map((item) => (
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
              {cardOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
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
      <Modal open={!!deleting} title="Confirmar exclusão" onClose={() => setDeleting(null)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (deletePassword.length >= 8) void confirmDelete();
          }}
        >
          <p className="text-sm text-slate-600">
            Para excluir <strong>{deleting?.title}</strong> e suas ocorrências, confirme sua senha.
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
      <Modal open={!!payingShare} title="Quitar minha parte" onClose={() => setPayingShare(null)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (paySharePassword.length >= 8) void confirmPayMyShare();
          }}
        >
          <p className="text-sm text-slate-600">
            Você está quitando somente a sua parte de <strong>{payingShare?.title}</strong>. A conta do casal permanece separada para controle do casal.
          </p>
          <Input
            label="Senha"
            type="password"
            value={paySharePassword}
            autoComplete="current-password"
            onChange={(e) => setPaySharePassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setPayingShare(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={paySharePassword.length < 8}>
              <CheckCircle2 className="h-4 w-4" />
              Quitar minha parte
            </Button>
          </div>
        </form>
      </Modal>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
