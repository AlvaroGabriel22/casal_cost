import { DetectedBank, StatementSourceType } from '@prisma/client';
export declare class StatementImportQueryDto {
    month?: string;
    bank?: DetectedBank;
    sourceType?: StatementSourceType;
}
export declare class StatementBankHintDto {
    bank?: DetectedBank;
    sourceType?: StatementSourceType;
}
export declare class DeleteStatementImportDto {
    password: string;
}
