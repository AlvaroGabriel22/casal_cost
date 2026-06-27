import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { DetectedBank } from '@prisma/client';
import type { ParsedBankLine } from './types';
import { buildFingerprint, buildFingerprintsForImport } from './utils';

describe('buildFingerprint', () => {
  const userId = 'user-1';
  const bank = DetectedBank.NUBANK;
  const date = new Date(Date.UTC(2026, 4, 3));

  it('differentiates paired Nubank lines that share the same externalId', () => {
    const sharedId = '69f76e96-08cf-4198-89b9-4c12baaf66d3';
    const credit: ParsedBankLine = {
      transactionDate: date,
      description: 'Valor adicionado na conta por cartão de crédito',
      amount: 113.89,
      direction: 'CREDIT',
      externalId: sharedId,
    };
    const debit: ParsedBankLine = {
      transactionDate: date,
      description: 'Transferência enviada pelo Pix - ÁGUAS DE MANAUS',
      amount: 113.89,
      direction: 'DEBIT',
      externalId: sharedId,
    };

    const fpCredit = buildFingerprint(userId, bank, credit);
    const fpDebit = buildFingerprint(userId, bank, debit);
    expect(fpCredit).not.toBe(fpDebit);
  });

  it('assigns distinct fingerprints to same-day duplicate lines', () => {
    const line: ParsedBankLine = {
      transactionDate: date,
      description: 'Foztrans*Bus',
      amount: 5,
      direction: 'DEBIT',
    };
    const fps = buildFingerprintsForImport(userId, bank, [line, line, line]);
    expect(new Set(fps).size).toBe(3);
  });
});

import { parseBrazilianAmount } from './utils';
import { parseStatementFile } from './statement.parser';

describe('parseBrazilianAmount', () => {
  it('parses Nubank dot-decimal values as reais (not centavos × 100)', () => {
    expect(parseBrazilianAmount('1800.00')).toBe(1800);
    expect(parseBrazilianAmount('-1800.00')).toBe(-1800);
    expect(parseBrazilianAmount('2600.00')).toBe(2600);
    expect(parseBrazilianAmount('100.00')).toBe(100);
    expect(parseBrazilianAmount('151.19')).toBe(151.19);
    expect(parseBrazilianAmount('-531.72')).toBe(-531.72);
    expect(parseBrazilianAmount('10600.00')).toBe(10600);
  });

  it('parses Brazilian comma-decimal format', () => {
    expect(parseBrazilianAmount('1.800,00')).toBe(1800);
    expect(parseBrazilianAmount('1800,50')).toBe(1800.5);
  });

  it('parses US thousand-separator format', () => {
    expect(parseBrazilianAmount('1,800.00')).toBe(1800);
  });
});

describe('parseStatementFile (Nubank CSV)', () => {
  const mayCsvPath = join(
    process.env.HOME ?? '',
    'Downloads',
    'NU_410953980_01MAI2026_31MAI2026.csv',
  );

  it('matches all signed amounts from real Nubank export when file is available', () => {
    let content: string;
    try {
      content = readFileSync(mayCsvPath, 'utf8');
    } catch {
      return;
    }

    const expected = content
      .split(/\r?\n/)
      .slice(1)
      .filter(Boolean)
      .map((line) => Number(line.split(',')[1]));

    const parsed = parseStatementFile({
      content,
      fileName: 'NU_410953980_01MAI2026_31MAI2026.csv',
      format: 'CSV',
    }).lines.map((line) => (line.direction === 'DEBIT' ? -1 : 1) * line.amount);

    expect(parsed).toHaveLength(expected.length);
    parsed.forEach((amount, index) => {
      expect(amount).toBeCloseTo(expected[index], 2);
    });
  });
});
