"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
let CardsService = class CardsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        const cards = await this.prisma.userCard.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
        });
        return (0, api_response_1.ok)(cards, 'Operation completed successfully');
    }
    async upsert(userId, dto) {
        const name = dto.name.trim();
        const card = await this.prisma.userCard.upsert({
            where: { userId_name: { userId, name } },
            create: {
                userId,
                name,
                dueDay: dto.dueDay,
                closingDay: dto.closingDay ?? null,
            },
            update: {
                dueDay: dto.dueDay,
                ...(dto.closingDay !== undefined ? { closingDay: dto.closingDay } : {}),
            },
        });
        await this.applyDueDayToExistingOccurrences(userId, name, dto.dueDay);
        return (0, api_response_1.ok)(card, 'Operation completed successfully');
    }
    async update(userId, id, dto) {
        const existing = await this.prisma.userCard.findFirst({
            where: { id, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException('Cartão não encontrado.');
        const card = await this.prisma.userCard.update({
            where: { id },
            data: {
                name: dto.name?.trim() ?? existing.name,
                dueDay: dto.dueDay ?? existing.dueDay,
                closingDay: dto.closingDay !== undefined ? dto.closingDay : existing.closingDay,
            },
        });
        await this.applyDueDayToExistingOccurrences(userId, card.name, card.dueDay);
        return (0, api_response_1.ok)(card, 'Operation completed successfully');
    }
    async applyDueDayToExistingOccurrences(userId, cardName, dueDay) {
        const expenses = await this.prisma.expense.findMany({
            where: { ownerUserId: userId, cardName, deletedAt: null },
            select: { id: true },
        });
        if (expenses.length === 0)
            return;
        const occurrences = await this.prisma.expenseOccurrence.findMany({
            where: {
                expenseId: { in: expenses.map((e) => e.id) },
                deletedAt: null,
                status: { not: client_1.ExpenseStatus.CANCELLED },
            },
            select: { id: true, referenceMonth: true },
        });
        if (occurrences.length === 0)
            return;
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
    async remove(userId, id) {
        const existing = await this.prisma.userCard.findFirst({
            where: { id, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException('Cartão não encontrado.');
        await this.prisma.userCard.delete({ where: { id } });
        return (0, api_response_1.ok)({ id }, 'Operation completed successfully');
    }
};
exports.CardsService = CardsService;
exports.CardsService = CardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CardsService);
//# sourceMappingURL=cards.service.js.map