import { api, getApiBaseUrl, type ApiSuccess } from '../api/client';

export type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
};

export type ChatStreamHandlers = {
  onChunk: (chunk: string) => void;
  onDone: (fullReply: string) => void;
  onError: (message: string) => void;
};

export const chatService = {
  async history() {
    const { data } = await api.get<ApiSuccess<ChatMessage[]>>('/chat/history');
    return data.data;
  },

  async clear() {
    const { data } = await api.delete<ApiSuccess<{ cleared: boolean }>>('/chat/history');
    return data.data;
  },

  async ask(message: string) {
    const { data } = await api.post<ApiSuccess<{ reply: string }>>('/chat', {
      message,
    });
    return data.data.reply;
  },

  async askStream(message: string, handlers: ChatStreamHandlers): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${getApiBaseUrl()}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      let errorMessage = 'Não foi possível obter a resposta.';
      try {
        const body = (await response.json()) as { error?: { message?: string }; message?: string };
        errorMessage = body.error?.message ?? body.message ?? errorMessage;
      } catch {
        // ignore parse errors
      }
      handlers.onError(errorMessage);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      handlers.onError('Resposta inválida do servidor.');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const dataLine = event
          .split('\n')
          .find((line) => line.startsWith('data: '));
        if (!dataLine) continue;

        const payload = dataLine.slice(6).trim();
        if (payload === '[DONE]') {
          handlers.onDone(fullReply);
          return;
        }

        try {
          const parsed = JSON.parse(payload) as { content?: string; error?: string };
          if (parsed.error) {
            handlers.onError(parsed.error);
            return;
          }
          if (parsed.content) {
            fullReply += parsed.content;
            handlers.onChunk(parsed.content);
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    handlers.onDone(fullReply);
  },

  async reindex() {
    const { data } = await api.post<ApiSuccess<{ indexed: number }>>(
      '/chat/reindex',
      {},
    );
    return data.data.indexed;
  },
};
