import { api, type ApiSuccess } from '../api/client';

export type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
};

export const chatService = {
  async history() {
    const { data } = await api.get<ApiSuccess<ChatMessage[]>>('/chat/history');
    return data.data;
  },

  async ask(message: string) {
    const { data } = await api.post<ApiSuccess<{ reply: string }>>('/chat', {
      message,
    });
    return data.data.reply;
  },

  async reindex() {
    const { data } = await api.post<ApiSuccess<{ indexed: number }>>(
      '/chat/reindex',
      {},
    );
    return data.data.indexed;
  },
};
