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
            id: string;
            createdAt: Date;
            userId: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            category: string | null;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            userId: string;
            importId: string;
            fingerprint: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
            transactionDate: Date;
            direction: import(".prisma/client").$Enums.BankTransactionDirection;
            externalId: string | null;
        }[];
        message: string;
    }>;
    preview(user: AuthUser, file: UploadedFile, query: StatementBankHintDto): {
        success: true;
        data: {
            bank: import(".prisma/client").$Enums.DetectedBank;
            bankLabel: string;
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
            fileName: string;
            imported: number;
            monthsCovered: string[];
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
            monthsCovered: string[];
            entriesRemoved: number;
            message: string;
        };
        message: string;
    }>;
}
export {};
