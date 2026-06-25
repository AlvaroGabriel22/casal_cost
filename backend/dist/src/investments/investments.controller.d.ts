import type { AuthUser } from '../auth/current-user.decorator';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto, InvestmentQueryDto, UpdateInvestmentDto } from './dto/investment.dto';
export declare class InvestmentsController {
    private readonly investments;
    constructor(investments: InvestmentsService);
    create(user: AuthUser, dto: CreateInvestmentDto): Promise<{
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
            amount: import("@prisma/client/runtime/library").Decimal;
            userId: string;
            contributedAt: Date | null;
        };
        message: string;
    }>;
    list(user: AuthUser, q: InvestmentQueryDto): Promise<{
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
                amount: import("@prisma/client/runtime/library").Decimal;
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
            summary: import("./investment.types").InvestmentScopeSummary;
        };
        message: string;
    }>;
    update(user: AuthUser, id: string, dto: UpdateInvestmentDto): Promise<{
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
            amount: import("@prisma/client/runtime/library").Decimal;
            userId: string;
            contributedAt: Date | null;
        };
        message: string;
    }>;
    remove(user: AuthUser, id: string): Promise<{
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
            amount: import("@prisma/client/runtime/library").Decimal;
            userId: string;
            contributedAt: Date | null;
        };
        message: string;
    }>;
}
