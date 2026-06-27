import { DetectedBank, StatementSourceType } from '@prisma/client';
import {
  assignCreditCardReferenceMonths,
  filterCreditCardImportLines,
  isWithinNubankBillingPeriod,
  nubankBillingPeriodForDueMonth,
  nubankReferenceMonthForPurchase,
  shouldSkipCreditCardImportLine,
} from './billing-cycle';
import { directionFromSignedAmount, parseStatementFile } from './parsers/statement.parser';

describe('nubankBillingPeriodForDueMonth', () => {
  it('defines June invoice as Apr 24 – May 25 when due is day 1', () => {
    const { periodStart, periodEnd } = nubankBillingPeriodForDueMonth(2025, 6, 1);
    expect(periodStart.toISOString().slice(0, 10)).toBe('2025-04-24');
    expect(periodEnd.toISOString().slice(0, 10)).toBe('2025-05-25');
  });
});

describe('nubankReferenceMonthForPurchase', () => {
  it('assigns May 20 purchase to June invoice', () => {
    const ref = nubankReferenceMonthForPurchase(
      new Date(Date.UTC(2025, 4, 20)),
      1,
    );
    expect(`${ref.getUTCFullYear()}-${String(ref.getUTCMonth() + 1).padStart(2, '0')}`).toBe(
      '2025-06',
    );
  });

  it('assigns May 26 purchase to July invoice', () => {
    const ref = nubankReferenceMonthForPurchase(
      new Date(Date.UTC(2025, 4, 26)),
      1,
    );
    expect(`${ref.getUTCFullYear()}-${String(ref.getUTCMonth() + 1).padStart(2, '0')}`).toBe(
      '2025-07',
    );
  });
});

describe('shouldSkipCreditCardImportLine', () => {
  it('skips Pagamento recebido on Nubank card CSV', () => {
    expect(
      shouldSkipCreditCardImportLine(
        {
          transactionDate: new Date(Date.UTC(2025, 10, 27)),
          description: 'Pagamento recebido',
          amount: 2785.41,
          direction: 'CREDIT',
        },
        DetectedBank.NUBANK,
      ),
    ).toBe(true);
  });
});

describe('assignCreditCardReferenceMonths (Nubank)', () => {
  const sampleTsv = `date\ttitle\tamount
2025-05-20\tHiper Db Cidade Nova\t67,9
2025-05-26\tFrangao Restaurante\t30
2025-11-27\tPagamento recebido\t-2.785,41`;

  it('uses billing period for purchases and skips payment lines from import filter', () => {
    const parsed = parseStatementFile({
      content: sampleTsv,
      fileName: 'fatura.csv',
      format: 'CSV',
      sourceType: StatementSourceType.CREDIT_CARD,
    }).lines;

    const importable = filterCreditCardImportLines(parsed, DetectedBank.NUBANK);
    expect(importable).toHaveLength(2);
    expect(importable.some((l) => l.description === 'Pagamento recebido')).toBe(false);

    const refs = assignCreditCardReferenceMonths(
      importable,
      { dueDay: 1 },
      DetectedBank.NUBANK,
    );

    const byDesc = Object.fromEntries(
      importable.map((line, i) => [line.description, refs[i].toISOString().slice(0, 7)]),
    );

    expect(byDesc['Hiper Db Cidade Nova']).toBe('2025-06');
    expect(byDesc['Frangao Restaurante']).toBe('2025-07');
  });
});

describe('isWithinNubankBillingPeriod', () => {
  it('returns true only inside the invoice window', () => {
    expect(
      isWithinNubankBillingPeriod(new Date(Date.UTC(2025, 4, 20)), '2025-06', 1),
    ).toBe(true);
    expect(
      isWithinNubankBillingPeriod(new Date(Date.UTC(2025, 4, 26)), '2025-06', 1),
    ).toBe(false);
  });
});
