import { DetectedBank, PaymentMethod, StatementSourceType } from '@prisma/client';

export type ParsedBankLine = {
  transactionDate: Date;
  description: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  externalId?: string;
  category?: string;
  paymentMethod?: PaymentMethod;
};

export type ParseResult = {
  bank: DetectedBank;
  accountLabel?: string;
  lines: ParsedBankLine[];
};

export type ParseInput = {
  content: string;
  fileName: string;
  format: 'CSV' | 'OFX';
  bankHint?: DetectedBank;
  sourceType?: StatementSourceType;
};
