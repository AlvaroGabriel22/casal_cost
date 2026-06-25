import type { AuthUser } from '../auth/current-user.decorator';
import { CardsService } from './cards.service';
import { UpdateCardDto, UpsertCardDto } from './dto/card.dto';
export declare class CardsController {
    private readonly cards;
    constructor(cards: CardsService);
    list(user: AuthUser): Promise<{
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
    upsert(user: AuthUser, dto: UpsertCardDto): Promise<{
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
    update(user: AuthUser, id: string, dto: UpdateCardDto): Promise<{
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
    remove(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            id: string;
        };
        message: string;
    }>;
}
