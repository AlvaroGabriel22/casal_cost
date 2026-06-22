"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
const ID_USER_ALVARO = '10000000-0000-4000-8000-000000000001';
const ID_USER_PARTNER = '10000000-0000-4000-8000-000000000002';
const ID_COUPLE = '20000000-0000-4000-8000-000000000001';
const ID_SETTINGS_ALVARO = '30000000-0000-4000-8000-000000000001';
const ID_SETTINGS_PARTNER = '30000000-0000-4000-8000-000000000002';
const ID_ACCESS_VIEW = '40000000-0000-4000-8000-000000000001';
async function main() {
    const passwordHash = await bcrypt.hash('admin@user', 10);
    await prisma.auditLog.deleteMany();
    await prisma.expenseOccurrence.deleteMany();
    await prisma.recurrenceRule.deleteMany();
    await prisma.sharedExpenseSplit.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.installmentGroup.deleteMany();
    await prisma.income.deleteMany();
    await prisma.financialSettings.deleteMany();
    await prisma.individualAccountAccess.deleteMany();
    await prisma.couple.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.createMany({
        data: [
            {
                id: ID_USER_ALVARO,
                name: 'Alvaro',
                username: 'alvaro.g',
                email: 'alvaro@example.com',
                passwordHash,
            },
            {
                id: ID_USER_PARTNER,
                name: 'Partner',
                username: 'partner.demo',
                email: 'partner@example.com',
                passwordHash,
            },
        ],
    });
    await prisma.couple.create({
        data: {
            id: ID_COUPLE,
            userAId: ID_USER_ALVARO,
            userBId: ID_USER_PARTNER,
            status: client_1.CoupleStatus.ACTIVE,
        },
    });
    await prisma.financialSettings.createMany({
        data: [
            {
                id: ID_SETTINGS_ALVARO,
                userId: ID_USER_ALVARO,
                baseSalary: '8500.00',
                salaryPaymentDay: 5,
                defaultCurrency: 'BRL',
            },
            {
                id: ID_SETTINGS_PARTNER,
                userId: ID_USER_PARTNER,
                baseSalary: '7200.00',
                salaryPaymentDay: 5,
                defaultCurrency: 'BRL',
            },
        ],
    });
    await prisma.individualAccountAccess.create({
        data: {
            id: ID_ACCESS_VIEW,
            ownerUserId: ID_USER_ALVARO,
            allowedUserId: ID_USER_PARTNER,
            canView: true,
            canEdit: false,
        },
    });
    const may2026 = new Date('2026-05-01');
    const june2026 = new Date('2026-06-01');
    const july2026 = new Date('2026-07-01');
    await prisma.income.createMany({
        data: [
            {
                userId: ID_USER_ALVARO,
                type: client_1.IncomeType.BONUS,
                description: 'Performance bonus',
                amount: '1200.00',
                referenceMonth: may2026,
                receivedDate: new Date('2026-05-15'),
                isRecurring: false,
            },
            {
                userId: ID_USER_PARTNER,
                type: client_1.IncomeType.EXTRA_INCOME,
                description: 'Freelance',
                amount: '500.00',
                referenceMonth: may2026,
                isRecurring: false,
            },
        ],
    });
    const expIndiv = await prisma.expense.create({
        data: {
            ownerUserId: ID_USER_ALVARO,
            scope: client_1.ExpenseScope.INDIVIDUAL,
            title: 'Course',
            category: 'education',
            totalAmount: '450.00',
            expenseType: client_1.ExpenseType.ONE_TIME,
            paymentMethod: client_1.PaymentMethod.PIX,
            status: client_1.ExpenseStatus.PENDING,
        },
    });
    await prisma.expenseOccurrence.create({
        data: {
            expenseId: expIndiv.id,
            userId: ID_USER_ALVARO,
            referenceMonth: may2026,
            dueDate: new Date('2026-05-20'),
            amount: '450.00',
            status: client_1.ExpenseStatus.PENDING,
            installmentNumber: null,
            totalInstallments: null,
        },
    });
    const expShared = await prisma.expense.create({
        data: {
            ownerUserId: ID_USER_ALVARO,
            coupleId: ID_COUPLE,
            scope: client_1.ExpenseScope.SHARED,
            title: 'Groceries',
            category: 'food',
            totalAmount: '800.00',
            expenseType: client_1.ExpenseType.ONE_TIME,
            paymentMethod: client_1.PaymentMethod.CREDIT_CARD,
            status: client_1.ExpenseStatus.PAID,
        },
    });
    await prisma.sharedExpenseSplit.createMany({
        data: [
            {
                expenseId: expShared.id,
                userId: ID_USER_ALVARO,
                splitType: client_1.SplitType.PERCENTAGE,
                percentage: '50.00',
            },
            {
                expenseId: expShared.id,
                userId: ID_USER_PARTNER,
                splitType: client_1.SplitType.PERCENTAGE,
                percentage: '50.00',
            },
        ],
    });
    await prisma.expenseOccurrence.create({
        data: {
            expenseId: expShared.id,
            userId: ID_USER_ALVARO,
            coupleId: ID_COUPLE,
            referenceMonth: may2026,
            dueDate: new Date('2026-05-10'),
            amount: '800.00',
            status: client_1.ExpenseStatus.PAID,
            paymentDate: new Date('2026-05-10'),
        },
    });
    const expFixed = await prisma.expense.create({
        data: {
            ownerUserId: ID_USER_PARTNER,
            scope: client_1.ExpenseScope.INDIVIDUAL,
            title: 'Gym',
            category: 'health',
            totalAmount: '120.00',
            expenseType: client_1.ExpenseType.FIXED,
            paymentMethod: client_1.PaymentMethod.DEBIT_CARD,
            status: client_1.ExpenseStatus.PENDING,
        },
    });
    await prisma.recurrenceRule.create({
        data: {
            expenseId: expFixed.id,
            frequency: client_1.RecurrenceFrequency.MONTHLY,
            startDate: new Date('2026-01-01'),
            endDate: null,
            dayOfMonth: 8,
        },
    });
    await prisma.expenseOccurrence.create({
        data: {
            expenseId: expFixed.id,
            userId: ID_USER_PARTNER,
            referenceMonth: may2026,
            dueDate: new Date('2026-05-08'),
            amount: '120.00',
            status: client_1.ExpenseStatus.PENDING,
        },
    });
    const ig = await prisma.installmentGroup.create({
        data: {
            userId: ID_USER_ALVARO,
            title: 'Laptop purchase',
            totalAmount: '1200.00',
            totalInstallments: 6,
            firstReferenceMonth: july2026,
        },
    });
    const expInst = await prisma.expense.create({
        data: {
            ownerUserId: ID_USER_ALVARO,
            scope: client_1.ExpenseScope.INDIVIDUAL,
            title: 'Laptop purchase',
            category: 'electronics',
            totalAmount: '1200.00',
            expenseType: client_1.ExpenseType.INSTALLMENT,
            paymentMethod: client_1.PaymentMethod.CREDIT_CARD,
            status: client_1.ExpenseStatus.PENDING,
            installmentGroupId: ig.id,
        },
    });
    const installmentAmount = 200;
    for (let i = 0; i < 6; i++) {
        const ref = new Date(2026, 6 + i, 1);
        await prisma.expenseOccurrence.create({
            data: {
                expenseId: expInst.id,
                userId: ID_USER_ALVARO,
                referenceMonth: ref,
                dueDate: new Date(ref.getFullYear(), ref.getMonth(), 10),
                amount: installmentAmount.toFixed(2),
                status: client_1.ExpenseStatus.PENDING,
                installmentNumber: i + 1,
                totalInstallments: 6,
            },
        });
    }
    const expFuture = await prisma.expense.create({
        data: {
            ownerUserId: ID_USER_ALVARO,
            scope: client_1.ExpenseScope.INDIVIDUAL,
            title: 'Trip reservation',
            category: 'travel',
            totalAmount: '900.00',
            expenseType: client_1.ExpenseType.FUTURE_CREDIT_CARD,
            paymentMethod: client_1.PaymentMethod.CREDIT_CARD,
            status: client_1.ExpenseStatus.PENDING,
        },
    });
    await prisma.expenseOccurrence.create({
        data: {
            expenseId: expFuture.id,
            userId: ID_USER_ALVARO,
            referenceMonth: june2026,
            dueDate: new Date('2026-06-15'),
            amount: '300.00',
            status: client_1.ExpenseStatus.PENDING,
            installmentNumber: 1,
            totalInstallments: 3,
        },
    });
    await prisma.auditLog.create({
        data: {
            userId: ID_USER_ALVARO,
            entity: 'SEED',
            entityId: 'seed',
            action: 'CREATE',
            newValue: { message: 'Development seed applied' },
        },
    });
    console.log('Seed completed: users alvaro.g / partner.demo (password admin@user), ACTIVE couple, sample finances.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map