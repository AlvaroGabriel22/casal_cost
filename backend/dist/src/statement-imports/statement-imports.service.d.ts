import { BankStatementFormat, DetectedBank } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
export declare class StatementImportsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    detectFormat(fileName: string, mime?: string): BankStatementFormat | null;
    preview(userId: string, buffer: Buffer, fileName: string, bankHint?: DetectedBank): {
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
    import(userId: string, buffer: Buffer, fileName: string, bankHint?: DetectedBank): Promise<{
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
    listImports(userId: string): Promise<{
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
    listEntries(userId: string, month?: string, bank?: DetectedBank): Promise<{
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
}
