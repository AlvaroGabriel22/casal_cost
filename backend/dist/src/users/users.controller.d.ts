import type { AuthUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSalaryDto } from './dto/update-user.dto';
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
}
