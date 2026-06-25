import { InvestmentScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { AuditLogService } from '../audit/audit-log.service';
import type { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investment.dto';
import type { InvestmentOverview, InvestmentScopeSummary } from './investment.types';
export declare class InvestmentsService {
    private readonly prisma;
    private readonly permission;
    private readonly audit;
    constructor(prisma: PrismaService, permission: PermissionService, audit: AuditLogService);
    private refMonth;
    private ym;
    private addMonths;
    private currentYm;
    private scopeFilter;
    summarizeScope(userId: string, scope: InvestmentScope, referenceMonth?: string): Promise<InvestmentScopeSummary>;
    summarizeOverview(userId: string, referenceMonth?: string): Promise<InvestmentOverview>;
    create(userId: string, dto: CreateInvestmentDto): Promise<{
        success: true;
        data: {
            user: {
                id: string;
                name: string;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            scope: import(".prisma/client").$Enums.InvestmentScope;
            description: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            referenceMonth: Date;
            amount: Prisma.Decimal;
            userId: string;
            contributedAt: Date | null;
        };
        message: string;
    }>;
    list(userId: string, scope?: InvestmentScope, month?: string): Promise<{
        success: true;
        data: {
            items: never[];
            contributionsInMonth: number;
            monthTotal: string;
            allTimeTotal: string;
            history: never[];
        };
        message: string;
    } | {
        success: true;
        data: {
            items: ({
                user: {
                    id: string;
                    name: string;
                    username: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                scope: import(".prisma/client").$Enums.InvestmentScope;
                description: string | null;
                deletedAt: Date | null;
                coupleId: string | null;
                referenceMonth: Date;
                amount: Prisma.Decimal;
                userId: string;
                contributedAt: Date | null;
            })[];
            contributionsInMonth: number;
            monthTotal: string;
            allTimeTotal: string;
            history: {
                month: string;
                amount: string;
            }[];
            summary: InvestmentScopeSummary;
        };
        message: string;
    }>;
    update(userId: string, id: string, dto: UpdateInvestmentDto): Promise<{
        success: true;
        data: {
            user: {
                id: string;
                name: string;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            scope: import(".prisma/client").$Enums.InvestmentScope;
            description: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            referenceMonth: Date;
            amount: Prisma.Decimal;
            userId: string;
            contributedAt: Date | null;
        };
        message: string;
    }>;
    remove(userId: string, id: string): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            scope: import(".prisma/client").$Enums.InvestmentScope;
            description: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            referenceMonth: Date;
            amount: Prisma.Decimal;
            userId: string;
            contributedAt: Date | null;
        };
        message: string;
    }>;
    private findOwnedOrCoupleRow;
}
