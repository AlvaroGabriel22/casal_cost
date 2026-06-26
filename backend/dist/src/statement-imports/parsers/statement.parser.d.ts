import { DetectedBank } from '@prisma/client';
import type { ParseInput, ParseResult } from './types';
export declare function parseOfx(input: ParseInput): ParseResult;
export declare function parseCsv(input: ParseInput): ParseResult;
export declare function parseStatementFile(input: ParseInput): ParseResult;
export declare const BANK_LABELS: Record<DetectedBank, string>;
