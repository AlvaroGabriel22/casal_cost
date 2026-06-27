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
              <MetricCard label="Meses" value={preview.monthsCovered.join(', ')} />
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
          subtitle="Fatura CSV — compras detalhadas por estabelecimento"
          icon={CreditCard}
          bank={cardBank}
          onBankChange={setCardBank}
          onImported={reload}
        />
      </div>

      <Card title="Importações recentes" subtitle="Histórico de extratos enviados">
        {loading ? (
          <Spinner label="Carregando histórico..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !history?.length ? (
          <EmptyState title="Nenhuma importação" message="Seus extratos importados aparecerão aqui." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {row.sourceTypeLabel ?? row.sourceType} · {row.bankLabel ?? row.bank} ·{' '}
                    {row.fileName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {row.lineCount} lançamentos · meses {row.monthsCovered.join(', ')} ·{' '}
                    {new Date(row.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {row.format}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => {
                      setDeleting(row);
                      setDeletePassword('');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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
