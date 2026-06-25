import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FinanceRagService } from './finance-rag.service';
export declare class ChatService {
    private readonly prisma;
    private readonly ai;
    private readonly rag;
    constructor(prisma: PrismaService, ai: AiService, rag: FinanceRagService);
    private buildAskMessages;
    private saveMessages;
    history(userId: string): Promise<{
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
    reindex(userId: string): Promise<{
        success: true;
        data: {
            indexed: number;
        };
        message: string;
    }>;
    ask(userId: string, message: string): Promise<{
        success: true;
        data: {
            reply: string;
        };
        message: string;
    }>;
    askStream(userId: string, message: string): AsyncGenerator<string>;
}
