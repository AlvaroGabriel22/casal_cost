import { useCallback, useEffect, useRef, useState } from 'react';
import { formatAxiosError } from '../api/errors';
import { chatService, type ChatMessage } from '../services/chat.service';

export function useAssistantChat({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [sending, setSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatService.history();
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(formatAxiosError(err, 'Não foi possível carregar o histórico.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad || loadedRef.current) return;
    loadedRef.current = true;
    void loadHistory();
  }, [autoLoad, loadHistory]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || sending) return false;

    setSending(true);
    setError(null);

    const optimisticId = `temp-${Date.now()}`;
    const assistantId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: 'USER',
        content: message,
        createdAt: new Date().toISOString(),
      },
      {
        id: assistantId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
      },
    ]);
    setStreamingId(assistantId);

    try {
      await chatService.askStream(message, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        },
        onDone: () => {
          setStreamingId(null);
          setSending(false);
        },
        onError: (message) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticId && m.id !== assistantId),
          );
          setStreamingId(null);
          setSending(false);
          setError(message);
        },
      });
      return true;
    } catch (err) {
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticId && m.id !== assistantId),
      );
      setStreamingId(null);
      setSending(false);
      setError(formatAxiosError(err, 'Não foi possível obter a resposta.'));
      return false;
    }
  }, [sending]);

  const reindex = useCallback(async () => {
    setReindexing(true);
    try {
      await chatService.reindex();
      setError(null);
      return true;
    } catch (err) {
      setError(formatAxiosError(err, 'Não foi possível sincronizar os dados.'));
      return false;
    } finally {
      setReindexing(false);
    }
  }, []);

  return {
    messages,
    loading,
    sending,
    streamingId,
    reindexing,
    error,
    setError,
    send,
    reindex,
    loadHistory,
  };
}
