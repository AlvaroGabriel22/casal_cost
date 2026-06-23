import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { UpdateCardDto, UpsertCardDto } from './dto/card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const cards = await this.prisma.userCard.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return ok(cards, 'Operation completed successfully');
  }

  /** Creates or updates a card by name for the user (idempotent on name). */
  async upsert(userId: string, dto: UpsertCardDto) {
    const name = dto.name.trim();
    const card = await this.prisma.userCard.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name, dueDay: dto.dueDay },
      update: { dueDay: dto.dueDay },
    });
    await this.applyDueDayToExistingOccurrences(userId, name, dto.dueDay);
    return ok(card, 'Operation completed successfully');
  }

  async update(userId: string, id: string, dto: UpdateCardDto) {
    const existing = await this.prisma.userCard.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Cartão não encontrado.');
    const card = await this.prisma.userCard.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? existing.name,
        dueDay: dto.dueDay ?? existing.dueDay,
      },
    });
    await this.applyDueDayToExistingOccurrences(userId, card.name, card.dueDay);
    return ok(card, 'Operation completed successfully');
  }

  /**
   * Recalculates the due date of every pending/overdue occurrence belonging to
   * the user's expenses paid with the given card, keeping the reference month
   * and only changing the day to the card's due day (clamped to month length).
   */
  private async applyDueDayToExistingOccurrences(
    userId: string,
    cardName: string,
    dueDay: number,
  ) {
    const expenses = await this.prisma.expense.findMany({
      where: { ownerUserId: userId, cardName, deletedAt: null },
      select: { id: true },
    });
    if (expenses.length === 0) return;

    const occurrences = await this.prisma.expenseOccurrence.findMany({
      where: {
        expenseId: { in: expenses.map((e) => e.id) },
        deletedAt: null,
        status: { in: [ExpenseStatus.PENDING, ExpenseStatus.OVERDUE] },
      },
      select: { id: true, referenceMonth: true },
    });
    if (occurrences.length === 0) return;

    const updates = occurrences.map((occurrence) => {
      const ref = occurrence.referenceMonth;
      const year = ref.getUTCFullYear();
      const month = ref.getUTCMonth();
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(dueDay, lastDay);
      const dueDate = new Date(Date.UTC(year, month, day));
      return this.prisma.expenseOccurrence.update({
        where: { id: occurrence.id },
        data: { dueDate },
      });
    });

    await this.prisma.$transaction(updates);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.userCard.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Cartão não encontrado.');
    await this.prisma.userCard.delete({ where: { id } });
    return ok({ id }, 'Operation completed successfully');
  }
}
