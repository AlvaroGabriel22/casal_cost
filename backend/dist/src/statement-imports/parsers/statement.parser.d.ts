import { DetectedBank, StatementSourceType } from '@prisma/client';
import type { ParseInput, ParseResult } from './types';
export declare function directionFromSignedAmount(signedAmount: number, sourceType?: StatementSourceType, isCardFile?: boolean): 'DEBIT' | 'CREDIT';
export declare function parseOfx(input: ParseInput): ParseResult;
export declare function parseCsv(input: ParseInput): ParseResult;
export declare function parseStatementFile(input: ParseInput): ParseResult;
export declare const BANK_LABELS: Record<DetectedBank, string>;
