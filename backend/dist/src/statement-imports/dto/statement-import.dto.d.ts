import { DetectedBank } from '@prisma/client';
export declare class StatementImportQueryDto {
    month?: string;
    bank?: DetectedBank;
}
export declare class StatementBankHintDto {
    bank?: DetectedBank;
}
