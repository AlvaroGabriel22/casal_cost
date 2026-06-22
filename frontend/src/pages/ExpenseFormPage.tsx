import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { ExpenseForm, toExpensePayload, type ExpenseFormData } from '../features/expenses/ExpenseForm';
import { coupleService, expenseService } from '../services/finance.service';
import { formatAxiosError } from '../api/errors';
import { useAsyncData } from '../hooks/useAsyncData';

export function ExpenseFormPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data: couple } = useAsyncData(() => coupleService.me(), []);
  const coupleMembers = [couple?.userA, couple?.userB].filter((member) => !!member);

  async function onSubmit(values: ExpenseFormData) {
    setSaving(true);
    setToast(null);
    try {
      await expenseService.create(values.scope, toExpensePayload(values));
      setToast({ message: 'Despesa criada com sucesso.', type: 'success' });
      navigate(values.scope === 'SHARED' ? '/expenses/couple' : '/expenses/individual');
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível criar a despesa.'), type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card title="Nova despesa" subtitle="Cadastre contas únicas, fixas, recorrentes, parceladas ou futuras.">
        <ExpenseForm onSubmit={onSubmit} submitting={saving} coupleMembers={coupleMembers} />
      </Card>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </>
  );
}
