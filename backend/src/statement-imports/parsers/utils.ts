import { createHash } from 'crypto';
import { DetectedBank, StatementSourceType } from '@prisma/client';
import type { ParsedBankLine } from './types';

export function buildFingerprint(
  userId: string,
  bank: DetectedBank,
  line: ParsedBankLine,
  sourceType: StatementSourceType = StatementSourceType.BANK_ACCOUNT,
  duplicateIndex = 0,
): string {
  const date = line.transactionDate.toISOString().slice(0, 10);
  const key = line.externalId
    ? `${userId}|${bank}|${sourceType}|${line.externalId}|${line.direction}|${line.amount.toFixed(2)}`
    : duplicateIndex > 0
      ? `${userId}|${bank}|${sourceType}|${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}|#${duplicateIndex}`
      : `${userId}|${bank}|${sourceType}|${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}`;
  return createHash('sha256').update(key).digest('hex');
}

/** Fingerprints únicos por arquivo — trata linhas repetidas (ex.: 2× Foztrans no mesmo dia). */
export function buildFingerprintsForImport(
  userId: string,
  bank: DetectedBank,
  lines: ParsedBankLine[],
  sourceType: StatementSourceType = StatementSourceType.BANK_ACCOUNT,
): string[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    if (line.externalId) {
      return buildFingerprint(userId, bank, line, sourceType);
    }
    const date = line.transactionDate.toISOString().slice(0, 10);
    const base = `${date}|${line.amount.toFixed(2)}|${normalizeDesc(line.description)}`;
    const index = seen.get(base) ?? 0;
    seen.set(base, index + 1);
    return buildFingerprint(userId, bank, line, sourceType, index);
  });
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
