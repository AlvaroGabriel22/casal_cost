import { api, type ApiSuccess } from '../api/client';

export type DetectedBank =
  | 'NUBANK'
  | 'INTER'
  | 'BRADESCO'
  | 'PICPAY'
  | 'ITAU'
  | 'SANTANDER'
  | 'CAIXA'
  | 'GENERIC';

export type StatementPreview = {
  bank: DetectedBank;
  bankLabel: string;
  format: 'CSV' | 'OFX';
  fileName: string;
  accountLabel?: string;
  lineCount: number;
  monthsCovered: string[];
  debitTotal: string;
  creditTotal: string;
  sample: Array<{
    date: string;
    description: string;
    amount: string;
    direction: 'DEBIT' | 'CREDIT';
    category: string;
  }>;
};

export type StatementImportResult = {
  importId: string;
  bank: DetectedBank;
  bankLabel: string;
  fileName: string;
  imported: number;
  monthsCovered: string[];
  message: string;
};

export type StatementImportRecord = {
  id: string;
  bank: DetectedBank;
  bankLabel?: string;
  format: 'CSV' | 'OFX';
  fileName: string;
  lineCount: number;
  monthsCovered: string[];
  createdAt: string;
};

export const BANK_OPTIONS: Array<{ value: DetectedBank | ''; label: string }> = [
  { value: '', label: 'Detectar automaticamente' },
  { value: 'NUBANK', label: 'Nubank' },
  { value: 'INTER', label: 'Banco Inter' },
  { value: 'BRADESCO', label: 'Bradesco' },
  { value: 'PICPAY', label: 'PicPay' },
  { value: 'ITAU', label: 'Itaú' },
  { value: 'SANTANDER', label: 'Santander' },
  { value: 'CAIXA', label: 'Caixa' },
  { value: 'GENERIC', label: 'Outro banco' },
];

function uploadFile(path: string, file: File, bank?: DetectedBank) {
  const form = new FormData();
  form.append('file', file);
  const params = bank ? { bank } : undefined;
  return api.post<ApiSuccess<StatementPreview | StatementImportResult>>(path, form, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export const statementImportService = {
  async preview(file: File, bank?: DetectedBank) {
    const { data } = await uploadFile('/statement-imports/preview', file, bank);
    return data.data as StatementPreview;
  },

  async import(file: File, bank?: DetectedBank) {
    const { data } = await uploadFile('/statement-imports', file, bank);
    return data.data as StatementImportResult;
  },

  async listImports() {
    const { data } = await api.get<ApiSuccess<StatementImportRecord[]>>('/statement-imports');
    return data.data;
  },
};
