import { PaymentMethod } from '@prisma/client';
export declare function guessCategory(description: string): string;
export declare function guessPaymentMethod(description: string, bank: string, isCreditCardStatement?: boolean): PaymentMethod | undefined;
