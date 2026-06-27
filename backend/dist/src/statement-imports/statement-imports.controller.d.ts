import { UploadedFile } from '@nestjs/common';
import type { AuthUser } from '../auth/current-user.decorator';
import { StatementImportsService } from './statement-imports.service';
import { DeleteStatementImportDto, StatementBankHintDto, StatementImportQueryDto } from './dto/statement-import.dto';
type UploadedFile = {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
};
export declare class StatementImportsController {
    private readonly imports;
    constructor(imports: StatementImportsService);
    list(user: AuthUser): Promise<{
        success: true;
        data: {
            bankLabel: string;
            sourceTypeLabel: string;
            id: string;
            createdAt: Date;
            userId: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
            sourceType: import(".prisma/client").$Enums.StatementSourceType;
            monthsCovered: string[];
            format: import(".prisma/client").$Enums.BankStatementFormat;
            fileName: string;
            accountLabel: string | null;
            lineCount: number;
        }[];
        message: string;
    }>;
    entries(user: AuthUser, query: StatementImportQueryDto): Promise<{
        success: true;
        data: {
            amount: string;
            bankLabel: string;
            sourceTypeLabel: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            category: string | null;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            userId: string;
            transactionDate: Date;
            direction: import(".prisma/client").$Enums.BankTransactionDirection;
            importId: string;
            fingerprint: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
            sourceType: import(".prisma/client").$Enums.StatementSourceType;
            externalId: string | null;
        }[];
        message: string;
    }>;
    preview(user: AuthUser, file: UploadedFile, query: StatementBankHintDto): {
        success: true;
        data: {
            bank: import(".prisma/client").$Enums.DetectedBank;
            bankLabel: string;
            sourceType: import(".prisma/client").$Enums.StatementSourceType;
            sourceTypeLabel: string;
            format: import(".prisma/client").$Enums.BankStatementFormat;
            fileName: string;
            accountLabel: string | undefined;
            lineCount: number;
            monthsCovered: string[];
            debitTotal: string;
            creditTotal: string;
            sample: {
                date: string;
                description: string;
                amount: string;
                direction: "DEBIT" | "CREDIT";
                category: string;
            }[];
        };
        message: string;
    };
    import(user: AuthUser, file: UploadedFile, query: StatementBankHintDto): Promise<{
        success: true;
        data: {
            importId: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
            bankLabel: string;
            sourceType: import(".prisma/client").$Enums.StatementSourceType;
            sourceTypeLabel: string;
            fileName: string;
            imported: number;
            monthsCovered: string[];
            reconciled: number;
            message: string;
        };
        message: string;
    }>;
    delete(user: AuthUser, id: string, dto: DeleteStatementImportDto): Promise<{
        success: true;
        data: {
            importId: string;
            fileName: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
            bankLabel: string;
            sourceType: import(".prisma/client").$Enums.StatementSourceType;
            sourceTypeLabel: string;
            monthsCovered: string[];
            entriesRemoved: number;
            reconciliationsReverted: number;
            message: string;
        };
        message: string;
    }>;
}
export {};
