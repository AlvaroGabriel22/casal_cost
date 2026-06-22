import { ExpenseScope, ExpenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class PermissionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getActiveCoupleForUser(userId: string): Promise<{
        coupleId: string;
        partnerId: string;
    } | null>;
    assertCoupleMembership(userId: string, coupleId: string): Promise<void>;
    canViewIndividualAccount(viewerId: string, ownerId: string): Promise<boolean>;
    canEditIndividualAccount(editorId: string, ownerId: string): Promise<boolean>;
    assertIndividualAccess(viewerId: string, ownerId: string, requireEdit: boolean): Promise<void>;
    assertExpenseReadable(userId: string, expense: {
        scope: ExpenseScope;
        ownerUserId: string | null;
        coupleId: string | null;
    }): Promise<void>;
    assertExpenseEditable(userId: string, expense: {
        scope: ExpenseScope;
        ownerUserId: string | null;
        coupleId: string | null;
        expenseType: ExpenseType;
    }): Promise<void>;
}
