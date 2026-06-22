import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { ExpensesService } from '../expenses/expenses.service';
import type { CreateInstallmentDto, DeleteInstallmentDto, UpdateInstallmentDto } from './dto/installment.dto';
export declare class InstallmentsService {
    private readonly prisma;
    private readonly permission;
    private readonly expenses;
    constructor(prisma: PrismaService, permission: PermissionService, expenses: ExpensesService);
    create(userId: string, dto: CreateInstallmentDto): unknown;
    list(userId: string): unknown;
    one(userId: string, id: string): unknown;
    private findEditableGroup;
    update(userId: string, id: string, dto: UpdateInstallmentDto): unknown;
    private monthAt;
    private dueDateFor;
    private rebuildInstallmentOccurrences;
    pay(userId: string, id: string): unknown;
    remove(userId: string, id: string, dto: DeleteInstallmentDto): unknown;
}
