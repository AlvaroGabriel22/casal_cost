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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
let AiService = AiService_1 = class AiService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(AiService_1.name);
        const apiKey = this.config.get('OPENAI_API_KEY');
        this.chatModel =
            this.config.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini';
        this.embeddingModel =
            this.config.get('OPENAI_EMBEDDING_MODEL') ??
                'text-embedding-3-small';
        this.client = apiKey ? new openai_1.default({ apiKey }) : null;
        if (!this.client) {
            this.logger.warn('OPENAI_API_KEY ausente — o assistente financeiro ficará indisponível.');
        }
    }
    get enabled() {
        return this.client !== null;
    }
    async embed(texts) {
        if (!this.client)
            throw new Error('OpenAI não configurado.');
        if (texts.length === 0)
            return [];
        const response = await this.client.embeddings.create({
            model: this.embeddingModel,
            input: texts,
        });
        return response.data.map((item) => item.embedding);
    }
    async embedOne(text) {
        const [vector] = await this.embed([text]);
        return vector;
    }
    async complete(messages) {
        if (!this.client)
            throw new Error('OpenAI não configurado.');
        const response = await this.client.chat.completions.create({
            model: this.chatModel,
            temperature: 0.3,
            messages,
        });
        return response.choices[0]?.message?.content?.trim() ?? '';
    }
    async *streamComplete(messages) {
        if (!this.client)
            throw new Error('OpenAI não configurado.');
        const stream = await this.client.chat.completions.create({
            model: this.chatModel,
            temperature: 0.3,
            messages,
            stream: true,
        });
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text)
                yield text;
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map