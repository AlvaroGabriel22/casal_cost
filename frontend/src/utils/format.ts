import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function money(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function numberValue(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function label(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function brDate(value: string | null | undefined) {
  if (!value) return '-';
  // As datas vêm da API como datas de calendário (sem hora real, colunas @db.Date).
  // Lemos a parte AAAA-MM-DD diretamente para evitar que o fuso horário desloque
  // o dia em +/- 1 ao converter o instante UTC para o horário local.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  try {
    return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return value;
  }
}

export function currentMonth() {
  return format(new Date(), 'yyyy-MM');
}

export function monthToDate(month: string) {
  return `${month}-01`;
}
