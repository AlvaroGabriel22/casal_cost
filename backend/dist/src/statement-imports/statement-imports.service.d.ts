import { BankStatementFormat, DetectedBank, StatementSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { StatementReconciliationService } from './statement-reconciliation.service';
export declare class StatementImportsService {
    private readonly prisma;
    private readonly audit;
    private readonly auth;
    private readonly reconciliation;
    constructor(prisma: PrismaService, audit: AuditLogService, auth: AuthService, reconciliation: StatementReconciliationService);
    detectFormat(fileName: string, mime?: string): BankStatementFormat | null;
    resolveSourceType(fileName: string, requested?: StatementSourceType): StatementSourceType;
    private invalidateRagIndex;
    private resolveBillingConfig;
    private resolveReferenceMonths;
    preview(userId: string, buffer: Buffer, fileName: string, bankHint?: DetectedBank, sourceTypeHint?: StatementSourceType): Promise<{
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
            billingCycleApplied: boolean;
            skippedCardPayments: number | undefined;
            debitTotal: string;
            creditTotal: string;
            sample: {
                date: string;
                description: string;
                amount: string;
                direction: "DEBIT" | "CREDIT";
                category: string;
                billingMonth: string;
            }[];
        };
        message: string;
    }>;
    import(userId: string, buffer: Buffer, fileName: string, bankHint?: DetectedBank, sourceTypeHint?: StatementSourceType): Promise<{
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
    deleteImport(userId: string, importId: string, password: string): Promise<{
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
    listImports(userId: string): Promise<{
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
    listEntries(userId: string, month?: string, bank?: DetectedBank, sourceType?: StatementSourceType): Promise<{
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
            direction: import(".prisma/client").$Enums.BankTransactionDirection;
            transactionDate: Date;
            externalId: string | null;
            importId: string;
            fingerprint: string;
            bank: import(".prisma/client").$Enums.DetectedBank;
            sourceType: import(".prisma/client").$Enums.StatementSourceType;
        }[];
        message: string;
    }>;
}
