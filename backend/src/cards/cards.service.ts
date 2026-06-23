import { Injectable, NotFoundException } from '@nestjs/common';
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
    return ok(card, 'Operation completed successfully');
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
