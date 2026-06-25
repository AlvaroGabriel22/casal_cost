import type { Response } from 'express';
import type { AuthUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatAskDto } from './dto/chat.dto';
export declare class ChatController {
    private readonly chat;
    constructor(chat: ChatService);
    history(user: AuthUser): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            userId: string;
            role: import(".prisma/client").$Enums.ChatRole;
            content: string;
        }[];
        message: string;
    }>;
    clearHistory(user: AuthUser): Promise<{
        success: true;
        data: {
            cleared: boolean;
        };
        message: string;
    }>;
    ask(user: AuthUser, dto: ChatAskDto): Promise<{
        success: true;
        data: {
            reply: string;
        };
        message: string;
    }>;
    stream(user: AuthUser, dto: ChatAskDto, res: Response): Promise<void>;
    reindex(user: AuthUser): Promise<{
        success: true;
        data: {
            indexed: number;
        };
        message: string;
    }>;
}
