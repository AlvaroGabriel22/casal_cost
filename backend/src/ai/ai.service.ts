import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.chatModel =
      this.config.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini';
    this.embeddingModel =
      this.config.get<string>('OPENAI_EMBEDDING_MODEL') ??
      'text-embedding-3-small';
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn(
        'OPENAI_API_KEY ausente — o assistente financeiro ficará indisponível.',
      );
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** Generates embeddings for a batch of texts. Returns one vector per input. */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.client) throw new Error('OpenAI não configurado.');
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    return response.data.map((item) => item.embedding as number[]);
  }

  async embedOne(text: string): Promise<number[]> {
    const [vector] = await this.embed([text]);
    return vector;
  }

  /** Runs a chat completion and returns the assistant text. */
  async complete(messages: ChatTurn[]): Promise<string> {
    if (!this.client) throw new Error('OpenAI não configurado.');
    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      temperature: 0.3,
      messages,
    });
    return response.choices[0]?.message?.content?.trim() ?? '';
  }
}
