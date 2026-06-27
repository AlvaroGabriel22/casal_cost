import { DetectedBank } from '@prisma/client';
import type { ParsedBankLine } from './parsers/types';
import { refMonthFromDate, ym } from './parsers/utils';

export interface BillingCycleConfig {
  closingDay?: number;
  dueDay: number;
}

const PAYMENT_LINE =
  /pagamento\s*(?:recebido|de\s*fatura|fatura)/i;

export function isCardBillPayment(
  line: Pick<ParsedBankLine, 'description' | 'direction'>,
): boolean {
  return line.direction === 'CREDIT' && PAYMENT_LINE.test(line.description);
}

/** Linhas de pagamento de fatura no CSV do cartão Nubank — ignoradas (valor vem do extrato da conta). */
export function shouldSkipCreditCardImportLine(
  line: ParsedBankLine,
  bank?: DetectedBank,
): boolean {
  return bank === DetectedBank.NUBANK && isCardBillPayment(line);
}

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function utcDayKey(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Período inclusivo da fatura Nubank: vence dia D do mês M → de (D-7) do mês M-1 até (D-7) do mês M. */
export function nubankBillingPeriodForDueMonth(
  dueYear: number,
  /** 1–12 */
  dueMonth: number,
  dueDay: number,
): { periodStart: Date; periodEnd: Date } {
  const dueDate = utcDate(dueYear, dueMonth - 1, dueDay);
  const periodEnd = new Date(dueDate);
  periodEnd.setUTCDate(periodEnd.getUTCDate() - 7);

  const prevDue = utcDate(dueYear, dueMonth - 2, dueDay);
  const periodStart = new Date(prevDue);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);

  return { periodStart, periodEnd };
}

export function isWithinNubankBillingPeriod(
  txDate: Date,
  referenceMonthYm: string,
  dueDay: number,
): boolean {
  const [y, m] = referenceMonthYm.split('-').map(Number);
  const { periodStart, periodEnd } = nubankBillingPeriodForDueMonth(y, m, dueDay);
  const t = utcDayKey(txDate);
  return t >= utcDayKey(periodStart) && t <= utcDayKey(periodEnd);
}

/** Compra no cartão Nubank → mês de vencimento da fatura cujo ciclo contém a data. */
export function nubankReferenceMonthForPurchase(
  txDate: Date,
  dueDay: number,
): Date {
  const y = txDate.getUTCFullYear();
  const m = txDate.getUTCMonth();

  for (let offset = -3; offset <= 4; offset++) {
    let dueM = m + offset;
    let dueY = y;
    while (dueM > 11) {
      dueM -= 12;
      dueY += 1;
    }
    while (dueM < 0) {
      dueM += 12;
      dueY -= 1;
    }

    const { periodStart, periodEnd } = nubankBillingPeriodForDueMonth(
      dueY,
      dueM + 1,
      dueDay,
    );
    const t = utcDayKey(txDate);
    if (t >= utcDayKey(periodStart) && t <= utcDayKey(periodEnd)) {
      return utcDate(dueY, dueM, 1);
    }
  }

  return refMonthFromDate(txDate);
}

/** Fechamento genérico (outros bancos). Nubank usa regra dueDay-7 via `nubankBillingPeriodForDueMonth`. */
export function defaultClosingDay(dueDay: number, bank?: DetectedBank): number {
  if (bank === DetectedBank.NUBANK) {
    let closing = dueDay - 7;
    while (closing < 1) closing += 28;
    return closing;
  }
  let closing = dueDay - 11;
  while (closing < 1) closing += 28;
  return Math.min(28, closing);
}

export function purchaseBillingReferenceMonth(
  txDate: Date,
  closingDay: number,
): Date {
  const day = txDate.getUTCDate();
  let closingMonth = txDate.getUTCMonth();
  let closingYear = txDate.getUTCFullYear();

  if (day > closingDay) {
    closingMonth += 1;
    if (closingMonth > 11) {
      closingMonth = 0;
      closingYear += 1;
    }
  }

  let dueMonth = closingMonth + 1;
  let dueYear = closingYear;
  if (dueMonth > 11) {
    dueMonth = 0;
    dueYear += 1;
  }

  return utcDate(dueYear, dueMonth, 1);
}

function addMonths(ref: Date, delta: number): Date {
  let m = ref.getUTCMonth() + delta;
  let y = ref.getUTCFullYear();
  while (m > 11) {
    m -= 12;
    y += 1;
  }
  while (m < 0) {
    m += 12;
    y -= 1;
  }
  return utcDate(y, m, 1);
}

function assignFromPaymentAnchors(lines: ParsedBankLine[]): Map<number, Date> {
  const indexed = lines.map((line, index) => ({ line, index }));
  const sorted = [...indexed].sort(
    (a, b) =>
      a.line.transactionDate.getTime() - b.line.transactionDate.getTime() ||
      a.index - b.index,
  );

  const payments = sorted.filter(({ line }) => isCardBillPayment(line));
  const result = new Map<number, Date>();
  if (payments.length === 0) return result;

  for (let p = 0; p < payments.length; p++) {
    const { line: paymentLine, index: paymentIndex } = payments[p];
    const prevTime =
      p > 0 ? payments[p - 1].line.transactionDate.getTime() : Number.NEGATIVE_INFINITY;
    const paymentTime = paymentLine.transactionDate.getTime();
    const paymentRef = addMonths(refMonthFromDate(paymentLine.transactionDate), 1);

    result.set(paymentIndex, paymentRef);

    for (const { line, index } of sorted) {
      if (line.direction !== 'DEBIT') continue;
      const t = line.transactionDate.getTime();
      if (t >= prevTime && t <= paymentTime) {
        result.set(index, paymentRef);
      }
    }
  }

  const lastPayment = payments[payments.length - 1];
  for (const { line, index } of sorted) {
    if (result.has(index)) continue;
    if (isCardBillPayment(line)) continue;
    if (line.transactionDate.getTime() > lastPayment.line.transactionDate.getTime()) {
      result.set(index, purchaseBillingReferenceMonth(line.transactionDate, 20));
    }
  }

  return result;
}

export function assignCreditCardReferenceMonths(
  lines: ParsedBankLine[],
  config?: BillingCycleConfig | null,
  bank?: DetectedBank,
): Date[] {
  const dueDay = config?.dueDay ?? 1;

  if (bank === DetectedBank.NUBANK) {
    return lines.map((line) => {
      if (shouldSkipCreditCardImportLine(line, bank)) {
        return refMonthFromDate(line.transactionDate);
      }
      if (line.direction !== 'DEBIT') {
        return refMonthFromDate(line.transactionDate);
      }
      return nubankReferenceMonthForPurchase(line.transactionDate, dueDay);
    });
  }

  const closingDay =
    config?.closingDay ?? defaultClosingDay(dueDay, bank);
  const anchorMap = assignFromPaymentAnchors(lines);
  const hasAnchors = anchorMap.size > 0;

  return lines.map((line, index) => {
    if (isCardBillPayment(line)) {
      return addMonths(refMonthFromDate(line.transactionDate), 1);
    }
    if (line.direction !== 'DEBIT') {
      return refMonthFromDate(line.transactionDate);
    }
    if (hasAnchors && anchorMap.has(index)) {
      return anchorMap.get(index)!;
    }
    return purchaseBillingReferenceMonth(line.transactionDate, closingDay);
  });
}

export function filterCreditCardImportLines(
  lines: ParsedBankLine[],
  bank?: DetectedBank,
): ParsedBankLine[] {
  return lines.filter((line) => !shouldSkipCreditCardImportLine(line, bank));
}

export function billingMonthsCovered(referenceMonths: Date[]): string[] {
  return [...new Set(referenceMonths.map(ym))].sort();
}
