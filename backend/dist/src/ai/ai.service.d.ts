import { ConfigService } from '@nestjs/config';
export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatTurn {
    role: ChatRole;
    content: string;
}
export declare class AiService {
    private readonly config;
    private readonly logger;
    private readonly client;
    private readonly chatModel;
    private readonly embeddingModel;
    constructor(config: ConfigService);
    get enabled(): boolean;
    embed(texts: string[]): Promise<number[][]>;
    embedOne(text: string): Promise<number[]>;
    complete(messages: ChatTurn[]): Promise<string>;
    streamComplete(messages: ChatTurn[]): AsyncGenerator<string>;
}
