import type { AuthUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSalaryDto } from './dto/update-user.dto';
import { UpsertMonthlySalaryOverrideDto } from './dto/monthly-salary-override.dto';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    me(user: AuthUser): Promise<{
        success: true;
        data: {
            id: string;
            name: string;
            username: string;
            email: string;
            financialSettings: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                baseSalary: import("@prisma/client/runtime/library").Decimal;
                salaryPaymentDay: number;
                defaultCurrency: string;
            } | null;
        };
        message: string;
    }>;
    update(user: AuthUser, dto: UpdateProfileDto): Promise<{
        success: true;
        data: {
            id: string;
            name: string;
            username: string;
            email: string;
        };
        message: string;
    }>;
    salary(user: AuthUser, dto: UpdateSalaryDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            baseSalary: import("@prisma/client/runtime/library").Decimal;
            salaryPaymentDay: number;
            defaultCurrency: string;
        };
        message: string;
    }>;
    listSalaryOverrides(user: AuthUser, month?: string): Promise<{
        success: true;
        data: {
            id: string;
            month: string;
            amount: string;
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        message: string;
    }>;
    upsertSalaryOverride(user: AuthUser, dto: UpsertMonthlySalaryOverrideDto): Promise<{
        success: true;
        data: {
            id: string;
            month: string;
            amount: string;
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        message: string;
    }>;
    deleteSalaryOverride(user: AuthUser, month: string): Promise<{
        success: true;
        data: {
            month: string;
        };
        message: string;
    }>;
}
