import {
  ExpenseType,
  ExpenseScope,
  ExpenseStatus,
  IncomeType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { Test } from '@nestjs/testing';
import { FinancialCalculationService } from './financial-calculation.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { OccurrenceGenerationService } from './occurrence-generation.service';

describe('FinancialCalculationService', () => {
  let service: FinancialCalculationService;
  let prisma: {
    income: { findMany: jest.Mock };
    recurrenceRule: { findMany: jest.Mock };
    expenseOccurrence: { findMany: jest.Mock };
    couple: { findUnique: jest.Mock };
  };
  let permission: { getActiveCoupleForUser: jest.Mock };
  let occurrenceGeneration: { expandRecurringForMonth: jest.Mock };

  beforeEach(async () => {
    prisma = {
      income: { findMany: jest.fn() },
      recurrenceRule: { findMany: jest.fn() },
      expenseOccurrence: { findMany: jest.fn() },
      couple: { findUnique: jest.fn() },
    };
    permission = { getActiveCoupleForUser: jest.fn() };
    occurrenceGeneration = { expandRecurringForMonth: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FinancialCalculationService,
        { provide: PrismaService, useValue: prisma },
        { provide: PermissionService, useValue: permission },
        {
          provide: OccurrenceGenerationService,
          useValue: occurrenceGeneration,
        },
      ],
    }).compile();
    service = moduleRef.get(FinancialCalculationService);
  });

  it('getFinancialStatus NEGATIVE when expenses exceed income', () => {
    expect(
      service.getFinancialStatus(
        new Prisma.Decimal('100'),
        new Prisma.Decimal('150'),
      ),
    ).toBe('NEGATIVE');
  });

  it('getFinancialStatus ATTENTION at 80% threshold', () => {
    expect(
      service.getFinancialStatus(
        new Prisma.Decimal('100'),
        new Prisma.Decimal('80'),
      ),
    ).toBe('ATTENTION');
  });

  it('getFinancialStatus POSITIVE below 80%', () => {
    expect(
      service.getFinancialStatus(
        new Prisma.Decimal('100'),
        new Prisma.Decimal('50'),
      ),
    ).toBe('POSITIVE');
  });

  it('effectiveOccurrenceStatus marks overdue when pending and due in past', () => {
    const past = new Date('2020-01-01');
    const today = new Date('2026-05-15');
    expect(
      service.effectiveOccurrenceStatus(ExpenseStatus.PENDING, past, today),
    ).toBe('OVERDUE');
  });

  it('monthStart parses YYYY-MM', () => {
    const m = service.monthStart('2026-07');
    expect(m.getUTCMonth()).toBe(6);
    expect(m.getUTCDate()).toBe(1);
  });

  it('calculateIncome counts non-recurring and recurring incomes in the selected month', async () => {
    prisma.income.findMany.mockResolvedValue([
      {
        type: IncomeType.EXTRA_INCOME,
        amount: new Prisma.Decimal('50'),
        isRecurring: true,
        referenceMonth: new Date('2026-01-01'),
        recurrenceStartDate: null,
        recurrenceEndDate: null,
      },
      {
        type: IncomeType.BONUS,
        amount: new Prisma.Decimal('200'),
        isRecurring: true,
        referenceMonth: new Date('2026-05-01'),
        recurrenceStartDate: new Date('2026-05-15'),
        recurrenceEndDate: null,
      },
      {
        type: IncomeType.BENEFIT,
        amount: new Prisma.Decimal('25'),
        isRecurring: true,
        referenceMonth: new Date('2026-01-01'),
        recurrenceStartDate: null,
        recurrenceEndDate: new Date('2026-04-30'),
      },
      {
        type: IncomeType.PLR,
        amount: new Prisma.Decimal('300'),
        isRecurring: false,
        referenceMonth: new Date('2026-05-01'),
        recurrenceStartDate: null,
        recurrenceEndDate: null,
      },
      {
        type: IncomeType.OTHER,
        amount: new Prisma.Decimal('999'),
        isRecurring: false,
        referenceMonth: new Date('2026-06-01'),
        recurrenceStartDate: null,
        recurrenceEndDate: null,
      },
    ]);

    const result = await service.calculateIncome(
      'user-1',
      new Date('2026-05-01'),
      new Prisma.Decimal('1000'),
    );

    expect(result.baseSalaryMonth.toFixed(2)).toBe('1000.00');
    expect(result.extraIncomeMonth.toFixed(2)).toBe('550.00');
    expect(result.totalIncomeMonth.toFixed(2)).toBe('1550.00');
  });

  it('calculateCoupleMonth excludes cancelled occurrences from totals and categories', async () => {
    prisma.recurrenceRule.findMany.mockResolvedValue([]);
    prisma.expenseOccurrence.findMany.mockResolvedValue([
      {
        expenseId: 'paid-expense',
        amount: new Prisma.Decimal('100'),
        dueDate: new Date('2026-05-10'),
        status: ExpenseStatus.PAID,
        expense: {
          deletedAt: null,
          scope: ExpenseScope.SHARED,
          category: 'home',
        },
      },
      {
        expenseId: 'cancelled-expense',
        amount: new Prisma.Decimal('40'),
        dueDate: new Date('2026-05-12'),
        status: ExpenseStatus.CANCELLED,
        expense: {
          deletedAt: null,
          scope: ExpenseScope.SHARED,
          category: 'home',
        },
      },
    ]);
    prisma.couple.findUnique.mockResolvedValue(null);

    const result = await service.calculateCoupleMonth('couple-1', '2026-05');

    expect(result.totalSharedExpenses).toBe('100.00');
    expect(result.cancelledTotal).toBe('40.00');
    expect(result.categoryDistribution).toEqual([
      { category: 'home', amount: '100.00' },
    ]);
  });

  it('getIndividualStatement includes individual installment occurrences', async () => {
    permission.getActiveCoupleForUser.mockResolvedValue(null);
    prisma.recurrenceRule.findMany.mockResolvedValue([]);
    prisma.expenseOccurrence.findMany.mockResolvedValue([
      {
        id: 'occ-1',
        expenseId: 'expense-1',
        amount: new Prisma.Decimal('125'),
        dueDate: new Date('2026-05-10'),
        paymentDate: null,
        referenceMonth: new Date('2026-05-01'),
        status: ExpenseStatus.PENDING,
        installmentNumber: 2,
        totalInstallments: 6,
        createdAt: new Date('2026-05-01'),
        expense: {
          id: 'expense-1',
          ownerUserId: 'user-1',
          deletedAt: null,
          scope: ExpenseScope.INDIVIDUAL,
          title: 'Notebook',
          description: null,
          category: 'electronics',
          expenseType: ExpenseType.INSTALLMENT,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          cardName: 'Nubank',
          owner: { id: 'user-1', name: 'Alvaro', username: 'alvaro.g' },
          sharedSplits: [],
        },
      },
    ]);

    const result = await service.getIndividualStatement('user-1', {
      monthYm: '2026-05',
    });

    expect(result.totalAmount).toBe('125.00');
    expect(result.individualTotal).toBe('125.00');
    expect(result.items).toEqual([
      expect.objectContaining({
        title: 'Notebook',
        source: 'INDIVIDUAL',
        amount: '125.00',
        expenseType: ExpenseType.INSTALLMENT,
        installmentNumber: 2,
        totalInstallments: 6,
      }),
    ]);
  });
});
