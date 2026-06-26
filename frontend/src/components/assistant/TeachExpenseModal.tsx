import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  financeContextService,
  type FinanceContextRule,
} from '../../services/finance-context.service';

const CONTEXT_CATEGORIES = [
  'Educação',
  'Transferências',
  'Alimentação',
  'Saúde',
  'Moradia',
  'Assinaturas',
  'Mercado',
  'Combustível',
  'Outros',
];

type TeachFormState = {
  displayLabel: string;
  motive: string;
  category: string;
};

export function TeachExpenseModal({
  open,
  merchant,
  existingRule,
  defaultCategory,
  onClose,
  onSaved,
}: {
  open: boolean;
  merchant: string;
  existingRule?: FinanceContextRule | null;
  defaultCategory?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TeachFormState>({
    displayLabel: merchant,
    motive: '',
    category: defaultCategory ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      displayLabel: existingRule?.displayLabel ?? merchant,
      motive: existingRule?.motive ?? '',
      category: existingRule?.category ?? defaultCategory ?? '',
    });
    setError(null);
  }, [open, merchant, existingRule, defaultCategory]);

  const submit = async () => {
    if (!form.displayLabel.trim() || !form.motive.trim()) {
      setError('Descreva o motivo deste gasto.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        displayLabel: form.displayLabel.trim(),
        motive: form.motive.trim(),
        category: form.category || undefined,
      };
      if (existingRule) {
        await financeContextService.updateRule(existingRule.id, payload);
      } else {
        await financeContextService.createRule(payload);
      }
      onSaved();
      onClose();
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={existingRule ? 'Editar contexto do gasto' : 'Ensinar a IA sobre este gasto'}
      onClose={onClose}
    >
      <p className="text-sm text-slate-600">
        A IA usará essa informação nas análises do extrato e no chat.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          Nome no extrato
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.displayLabel}
            onChange={(e) => setForm((f) => ({ ...f, displayLabel: e.target.value }))}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Categoria (opcional)
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Automática</option>
            {CONTEXT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        O que é esse gasto?
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={3}
          value={form.motive}
          onChange={(e) => setForm((f) => ({ ...f, motive: e.target.value }))}
          placeholder="Ex.: Reforço de inglês, parcela do terreno, plano de celular compartilhado…"
          autoFocus
        />
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" disabled={saving} onClick={submit}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </Modal>
  );
}
