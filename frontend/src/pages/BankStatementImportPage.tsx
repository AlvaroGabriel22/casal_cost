import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  FileUp,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import {
  BANK_OPTIONS,
  statementImportService,
  type DetectedBank,
  type StatementImportRecord,
  type StatementPreview,
  type StatementSourceType,
} from '../services/statement-import.service';
import { money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

type UploadPanelProps = {
  sourceType: StatementSourceType;
  title: string;
  subtitle: string;
  icon: typeof Landmark;
  bank: DetectedBank | '';
  onBankChange: (bank: DetectedBank | '') => void;
  onImported: () => void;
};

function UploadPanel({
  sourceType,
  title,
  subtitle,
  icon: Icon,
  bank,
  onBankChange,
  onImported,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function handleFileSelect(selected: File | null) {
    setFile(selected);
    setPreview(null);
    if (!selected) return;

    setPreviewing(true);
    setToast(null);
    try {
      const data = await statementImportService.preview(
        selected,
        bank || undefined,
        sourceType,
      );
      setPreview(data);
    } catch (err) {
      setToast({
        message: formatAxiosError(err, 'Não foi possível ler o arquivo.'),
        type: 'error',
      });
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setToast(null);
    try {
      const result = await statementImportService.import(
        file,
        bank || undefined,
        sourceType,
      );
      setToast({ message: result.message, type: 'success' });
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      onImported();
    } catch (err) {
      setToast({
        message: formatAxiosError(err, 'Falha ao importar extrato.'),
        type: 'error',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-4">
        <Select
          label="Banco (opcional)"
          value={bank}
          onChange={(e) => onBankChange(e.target.value as DetectedBank | '')}
        >
          {BANK_OPTIONS.map((opt) => (
            <option key={opt.value || 'auto'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-[#103B73]/40 hover:bg-blue-50/40">
          <Icon className="h-7 w-7 text-[#103B73]" />
          <span className="mt-3 text-sm font-semibold text-slate-800">
            {file ? file.name : 'Clique para selecionar o arquivo'}
          </span>
          <span className="mt-1 text-xs text-slate-500">CSV ou OFX exportado pelo app do banco</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.ofx,.qfx,text/csv,application/x-ofx"
            className="hidden"
            onChange={(e) => void handleFileSelect(e.target.files?.[0] ?? null)}
          />
        </label>

        {previewing && <Spinner label="Analisando arquivo..." />}

        {preview && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" />
              Pronto — {preview.bankLabel} · {preview.sourceTypeLabel}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard label="Lançamentos" value={String(preview.lineCount)} />
              <MetricCard
                label={preview.billingCycleApplied ? 'Faturas (vencimento)' : 'Meses'}
                value={preview.monthsCovered.join(', ')}
              />
              {preview.skippedCardPayments ? (
                <MetricCard
                  label="Pagamentos ignorados"
                  value={String(preview.skippedCardPayments)}
                  hint="Fatura paga — use extrato da conta"
                />
              ) : null}
              <MetricCard label="Saídas" value={money(preview.debitTotal)} tone="danger" />
              <MetricCard label="Entradas" value={money(preview.creditTotal)} tone="good" />
            </div>
            <Button
              type="button"
              className="w-full"
              loading={importing}
              onClick={() => void handleImport()}
            >
              Confirmar importação
            </Button>
          </div>
        )}

        <Toast message={toast?.message ?? null} type={toast?.type} />
      </div>
    </Card>
  );
}

function primaryMonth(row: StatementImportRecord): string {
  if (row.sourceType === 'CREDIT_CARD') {
    const fromName = billingMonthFromFileName(row.fileName);
    if (fromName) return fromName;
  }
  return [...row.monthsCovered].sort()[0] ?? '0000-00';
}

function billingMonthFromFileName(fileName: string): string | null {
  const match = fileName.match(/(\d{4})-(\d{2})(?:-\d{2})?/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

function displayMonths(row: StatementImportRecord): string[] {
  if (row.sourceType === 'CREDIT_CARD') {
    const fromName = billingMonthFromFileName(row.fileName);
    if (fromName) return [fromName];
  }
  return [...row.monthsCovered].sort();
}

function sortImportsByMonth(rows: StatementImportRecord[]): StatementImportRecord[] {
  return [...rows].sort((a, b) => {
    const byMonth = primaryMonth(a).localeCompare(primaryMonth(b));
    if (byMonth !== 0) return byMonth;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function formatMonthsLabel(months: string[], isCard: boolean): string {
  if (months.length === 0) return '—';
  const sorted = [...months].sort();
  const formatted = sorted.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
  });
  return isCard ? `Faturas: ${formatted.join(', ')}` : formatted.join(', ');
}

type ImportHistoryRowProps = {
  row: StatementImportRecord;
  onDelete: (row: StatementImportRecord) => void;
};

function ImportHistoryRow({ row, onDelete }: ImportHistoryRowProps) {
  const isCard = row.sourceType === 'CREDIT_CARD';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#103B73] shadow-sm">
            {formatMonthsLabel(displayMonths(row), isCard)}
          </span>
          <span className="truncate text-sm font-semibold text-slate-950">{row.fileName}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {row.bankLabel ?? row.bank} · {row.lineCount} lançamentos ·{' '}
          {new Date(row.createdAt).toLocaleString('pt-BR')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {row.format}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3 text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>
    </li>
  );
}

type ImportHistorySectionProps = {
  title: string;
  subtitle: string;
  icon: typeof Landmark;
  rows: StatementImportRecord[];
  emptyMessage: string;
  onDelete: (row: StatementImportRecord) => void;
};

function ImportHistorySection({
  title,
  subtitle,
  icon: Icon,
  rows,
  emptyMessage,
  onDelete,
}: ImportHistorySectionProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
        <div className="flex items-center gap-2 text-slate-700">
          <Icon className="h-5 w-5 text-[#103B73]" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <Icon className="h-5 w-5 text-[#103B73]" />
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {rows.length}
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <ImportHistoryRow key={row.id} row={row} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}

export function BankStatementImportPage() {
  const [accountBank, setAccountBank] = useState<DetectedBank | ''>('');
  const [cardBank, setCardBank] = useState<DetectedBank | ''>('');
  const [deleting, setDeleting] = useState<StatementImportRecord | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingImport, setDeletingImport] = useState(false);
  const [pageToast, setPageToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null,
  );

  const { data: history, loading, error, reload } = useAsyncData(
    () => statementImportService.listImports(),
    [],
  );

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingImport(true);
    setPageToast(null);
    try {
      const result = await statementImportService.remove(deleting.id, deletePassword);
      setPageToast({
        message: `${result.message} (${result.entriesRemoved} lançamentos removidos).`,
        type: 'success',
      });
      setDeleting(null);
      setDeletePassword('');
      await reload();
    } catch (err) {
      setPageToast({
        message: formatAxiosError(err, 'Não foi possível excluir o extrato.'),
        type: 'error',
      });
    } finally {
      setDeletingImport(false);
    }
  }

  function openDelete(row: StatementImportRecord) {
    setDeleting(row);
    setDeletePassword('');
  }

  const accountImports = sortImportsByMonth(
    history?.filter((row) => row.sourceType === 'BANK_ACCOUNT') ?? [],
  );
  const cardImports = sortImportsByMonth(
    history?.filter((row) => row.sourceType === 'CREDIT_CARD') ?? [],
  );
  const hasHistory = (history?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071A3D]/10 text-[#071A3D]">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Importar extratos</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Envie o extrato de transações da conta e o extrato do cartão de crédito. Os dados
              alimentam o dashboard, quitam contas Pix/débito automaticamente e enriquecem o
              Assistente de IA.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <UploadPanel
          sourceType="BANK_ACCOUNT"
          title="Extrato de transações (conta)"
          subtitle="NuConta, conta corrente — Pix, pagamentos, salário, fatura do cartão"
          icon={Landmark}
          bank={accountBank}
          onBankChange={setAccountBank}
          onImported={reload}
        />
        <UploadPanel
          sourceType="CREDIT_CARD"
          title="Extrato do cartão de crédito"
          subtitle="Nomeie o arquivo com a data da fatura (ex.: Nubank_2026-01-01.csv). Compras por estabelecimento — ciclo Nubank: fecha 7 dias antes do vencimento."
          icon={CreditCard}
          bank={cardBank}
          onBankChange={setCardBank}
          onImported={reload}
        />
      </div>

      <Card title="Extratos importados" subtitle="Organizados por mês e tipo de conta">
        {loading ? (
          <Spinner label="Carregando histórico..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !hasHistory ? (
          <EmptyState title="Nenhuma importação" message="Seus extratos importados aparecerão aqui." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <ImportHistorySection
              title="Conta corrente"
              subtitle="NuConta, Pix, salário e pagamentos"
              icon={Landmark}
              rows={accountImports}
              emptyMessage="Nenhum extrato de conta importado ainda."
              onDelete={openDelete}
            />
            <ImportHistorySection
              title="Cartão de crédito"
              subtitle="Compras e faturas por estabelecimento"
              icon={CreditCard}
              rows={cardImports}
              emptyMessage="Nenhum extrato de cartão importado ainda."
              onDelete={openDelete}
            />
          </div>
        )}
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Contas cadastradas manualmente (Pix/débito) são quitadas automaticamente quando o extrato
          da conta mostra o pagamento. Compras do cartão vêm do extrato do cartão — o pagamento da
          fatura na conta não duplica o consumo. Veja o{' '}
          <Link to="/statement/individual" className="font-semibold underline">
            extrato individual
          </Link>{' '}
          e o{' '}
          <Link to="/assistant" className="font-semibold underline">
            Assistente
          </Link>
          .
        </p>
      </div>

      <Toast message={pageToast?.message ?? null} type={pageToast?.type} />

      <Modal
        open={!!deleting}
        title="Excluir extrato importado"
        onClose={() => {
          if (deletingImport) return;
          setDeleting(null);
          setDeletePassword('');
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (deletePassword.length >= 8) void confirmDelete();
          }}
        >
          <p className="text-sm text-slate-600">
            Para excluir o extrato <strong>{deleting?.fileName}</strong> (
            {deleting?.sourceTypeLabel ?? deleting?.sourceType},{' '}
            {deleting?.bankLabel ?? deleting?.bank}, meses {deleting?.monthsCovered.join(', ')}) e
            todos os lançamentos importados dele, confirme sua senha.
          </p>
          <Input
            label="Senha"
            type="password"
            value={deletePassword}
            autoComplete="current-password"
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={deletingImport}
              onClick={() => {
                setDeleting(null);
                setDeletePassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deletingImport}
              disabled={deletePassword.length < 8}
            >
              <Trash2 className="h-4 w-4" />
              Excluir extrato
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
