export type BankMovementType = 'INVESTMENT_APPLY' | 'INVESTMENT_REDEEM' | 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CARD_BILL' | 'OTHER';
export declare function classifyBankMovement(description: string, direction: 'DEBIT' | 'CREDIT'): BankMovementType;
export declare function movementTypeLabel(type: BankMovementType): string;
