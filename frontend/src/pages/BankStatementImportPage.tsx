import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import {
  BANK_OPTIONS,
  statementImportService,
  type DetectedBank,
  type StatementPreview,
} from '../services/statement-import.service';
import { brDate, money } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

export function BankStatementImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [bank, setBank] = useState<DetectedBank | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: history, loading, error, reload } = useAsyncData(
    () => statementImportService.listImports(),
    [],
  );

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
      const result = await statementImportService.import(file, bank || undefined);
      setToast({
        message: `${result.imported} lançamentos importados (${result.monthsCovered.join(', ')}).`,
        type: 'success',
      });
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      await reload();
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071A3D]/10 text-[#071A3D]">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Importar extrato bancário</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Envie extratos em CSV ou OFX do Nubank, Inter, Bradesco, PicPay e outros.
              Os lançamentos enriquecem o extrato e a IA — sem substituir despesas que você
              cadastrou manualmente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Enviar arquivo" subtitle="Formatos aceitos: .csv e .ofx (até 5 MB)">
          <div className="space-y-4">
            <Select
              label="Banco (opcional)"
              value={bank}
              onChange={(e) => setBank(e.target.value as DetectedBank | '')}
            >
              {BANK_OPTIONS.map((opt) => (
                <option key={opt.value || 'auto'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-[#103B73]/40 hover:bg-blue-50/40">
              <Upload className="h-8 w-8 text-[#103B73]" />
              <span className="mt-3 text-sm font-semibold text-slate-800">
                {file ? file.name : 'Clique para selecionar o extrato'}
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
                  Pronto para importar — {preview.bankLabel}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricCard label="Lançamentos" value={String(preview.lineCount)} />
                  <MetricCard label="Meses" value={preview.monthsCovered.join(', ')} />
                  <MetricCard label="Saídas" value={money(preview.debitTotal)} tone="danger" />
                  <MetricCard label="Entradas" value={money(preview.creditTotal)} tone="good" />
                </div>
                <p className="text-xs text-emerald-800">
                  Reimportar o mesmo banco e mês substitui os lançamentos importados daquele
                  período, mantendo seus cadastros manuais intactos.
                </p>
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
          </div>
        </Card>

        <Card title="Prévia dos lançamentos" subtitle="Primeiras linhas detectadas no arquivo">
          {!preview ? (
            <EmptyState
              title="Nenhum arquivo analisado"
              message="Selecione um extrato para ver a pré-visualização antes de importar."
            />
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto">
              {preview.sample.map((row, index) => (
                <li
                  key={`${row.date}-${row.description}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{row.description}</p>
                    <p className="text-xs text-slate-500">
                      {brDate(row.date)} · {row.category} ·{' '}
                      {row.direction === 'DEBIT' ? 'Saída' : 'Entrada'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      row.direction === 'DEBIT' ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {row.direction === 'DEBIT' ? '-' : '+'}
                    {money(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Importações recentes" subtitle="Histórico dos extratos enviados">
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
                    {row.bankLabel ?? row.bank} · {row.fileName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {row.lineCount} lançamentos · meses {row.monthsCovered.join(', ')} ·{' '}
                    {new Date(row.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {row.format}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Os valores importados aparecem no{' '}
          <Link to="/statement/individual" className="font-semibold underline">
            extrato individual
          </Link>{' '}
          em uma seção separada e alimentam o Assistente de IA. Eles não alteram despesas,
          parcelamentos ou dashboards já calculados manualmente.
        </p>
      </div>

      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
