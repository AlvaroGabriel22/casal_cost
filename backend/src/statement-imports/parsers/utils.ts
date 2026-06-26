import { createHash } from 'crypto';
import { DetectedBank } from '@prisma/client';
import type { ParsedBankLine } from './types';

export function buildFingerprint(
  userId: string,
  bank: DetectedBank,
  line: ParsedBankLine,
): string {
  const date = line.transactionDate.toISOString().slice(0, 10);
  // Nubank reuses the same Identificador for paired movements (e.g. credit + Pix).
  const key = line.externalId
    ? `${userId}|${bank}|${line.externalId}|${line.direction}|${line.amount.toFixed(2)}`
    : `${userId}|${bank}|${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}`;
  return createHash('sha256').update(key).digest('hex');
}

function normalizeDesc(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function refMonthFromDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function ym(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function parseBrazilianAmount(raw: string): number | null {
  let value = raw.trim().replace(/[R$\s]/gi, '');
  if (!value || value === '-') return null;

  let sign = 1;
  if (value.startsWith('-')) {
    sign = -1;
    value = value.slice(1);
  } else if (value.startsWith('(') && value.endsWith(')')) {
    sign = -1;
    value = value.slice(1, -1);
  }

  // Nubank/OFX: ponto decimal com centavos — 1800.00, 151.19, 2600.00
  if (/^\d{1,12}\.\d{1,2}$/.test(value)) {
    const n = Number(value) * sign;
    return Number.isFinite(n) ? n : null;
  }

  // Formato BR: vírgula decimal — 1.800,00 ou 1800,50
  if (/,\d{1,2}$/.test(value)) {
    value = value.replace(/\./g, '').replace(',', '.');
  }
  // Formato US: vírgula milhar — 1,800.00
  else if (/,\d{3}/.test(value)) {
    value = value.replace(/,/g, '');
  }

  const n = Number(value) * sign;
  return Number.isFinite(n) ? n : null;
}

export function parseFlexibleDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }

  const br = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(value);
  if (br) {
    let year = Number(br[3]);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, Number(br[2]) - 1, Number(br[1])));
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
    );
  }
  return null;
}
