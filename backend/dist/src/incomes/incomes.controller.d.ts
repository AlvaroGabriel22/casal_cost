import type { AuthUser } from '../auth/current-user.decorator';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class IncomesController {
    private readonly incomes;
    constructor(incomes: IncomesService);
    create(user: AuthUser, dto: CreateIncomeDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            receivedDate: Date | null;
            description: string | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            userId: string;
            type: import(".prisma/client").$Enums.IncomeType;
            isRecurring: boolean;
            recurrenceStartDate: Date | null;
            recurrenceEndDate: Date | null;
        };
        message: string;
    }>;
    list(user: AuthUser, q: PaginationQueryDto): Promise<{
        success: true;
        data: {
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                receivedDate: Date | null;
                description: string | null;
                deletedAt: Date | null;
                referenceMonth: Date;
                amount: import("@prisma/client/runtime/library").Decimal;
                userId: string;
                type: import(".prisma/client").$Enums.IncomeType;
                isRecurring: boolean;
                recurrenceStartDate: Date | null;
                recurrenceEndDate: Date | null;
            }[];
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        message: string;
    }>;
    update(user: AuthUser, id: string, dto: UpdateIncomeDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            receivedDate: Date | null;
            description: string | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            userId: string;
            type: import(".prisma/client").$Enums.IncomeType;
            isRecurring: boolean;
            recurrenceStartDate: Date | null;
            recurrenceEndDate: Date | null;
        };
        message: string;
    }>;
    remove(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            receivedDate: Date | null;
            description: string | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            userId: string;
            type: import(".prisma/client").$Enums.IncomeType;
            isRecurring: boolean;
            recurrenceStartDate: Date | null;
            recurrenceEndDate: Date | null;
        };
        message: string;
    }>;
}
