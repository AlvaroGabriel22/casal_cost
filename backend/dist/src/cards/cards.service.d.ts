import { PrismaService } from '../prisma/prisma.service';
import { UpdateCardDto, UpsertCardDto } from './dto/card.dto';
export declare class CardsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string;
            dueDay: number;
        }[];
        message: string;
    }>;
    upsert(userId: string, dto: UpsertCardDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string;
            dueDay: number;
        };
        message: string;
    }>;
    update(userId: string, id: string, dto: UpdateCardDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string;
            dueDay: number;
        };
        message: string;
    }>;
    private applyDueDayToExistingOccurrences;
    remove(userId: string, id: string): Promise<{
        success: true;
        data: {
            id: string;
        };
        message: string;
    }>;
}
