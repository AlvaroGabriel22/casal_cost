import { DetectedBank } from '@prisma/client';
import type { ParsedBankLine } from './parsers/types';
export interface BillingCycleConfig {
    closingDay?: number;
    dueDay: number;
}
export declare function isCardBillPayment(line: Pick<ParsedBankLine, 'description' | 'direction'>): boolean;
export declare function shouldSkipCreditCardImportLine(line: ParsedBankLine, bank?: DetectedBank): boolean;
export declare function nubankBillingPeriodForDueMonth(dueYear: number, dueMonth: number, dueDay: number): {
    periodStart: Date;
    periodEnd: Date;
};
export declare function isWithinNubankBillingPeriod(txDate: Date, referenceMonthYm: string, dueDay: number): boolean;
export declare function nubankReferenceMonthForPurchase(txDate: Date, dueDay: number): Date;
export declare function defaultClosingDay(dueDay: number, bank?: DetectedBank): number;
export declare function purchaseBillingReferenceMonth(txDate: Date, closingDay: number): Date;
export declare function assignCreditCardReferenceMonths(lines: ParsedBankLine[], config?: BillingCycleConfig | null, bank?: DetectedBank): Date[];
export declare function filterCreditCardImportLines(lines: ParsedBankLine[], bank?: DetectedBank): ParsedBankLine[];
export declare function billingMonthsCovered(referenceMonths: Date[]): string[];
