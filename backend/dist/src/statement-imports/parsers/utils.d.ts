import { DetectedBank, StatementSourceType } from '@prisma/client';
import type { ParsedBankLine } from './types';
export declare function buildFingerprint(userId: string, bank: DetectedBank, line: ParsedBankLine, sourceType?: StatementSourceType): string;
export declare function refMonthFromDate(d: Date): Date;
export declare function ym(d: Date): string;
export declare function parseBrazilianAmount(raw: string): number | null;
export declare function parseFlexibleDate(raw: string): Date | null;
