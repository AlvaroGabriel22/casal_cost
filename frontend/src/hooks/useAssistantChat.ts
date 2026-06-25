import { useCallback, useEffect, useState } from 'react';
import { formatAxiosError } from '../api/errors';
import {
  bindChatSession,
  needsChatSessionReset,
} from '../lib/chatSession';
import { chatService } from '../services/chat.service';
import { useAuthStore } from '../stores/auth.store';
import { useChatStore } from '../stores/chat.store';

export function useAssistantChat() {
  const token = useAuthStore((s) => s.token);
  const messages = useChatStore((s) => s.messages);
  const sessionReady = useChatStore((s) => s.sessionReady);
  const setMessages = useChatStore((s) => s.setMessages);
  const setSessionReady = useChatStore((s) => s.setSessionReady);

  const [loading, setLoading] = useState(!sessionReady);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionReady || !token) {
      if (sessionReady) setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        if (needsChatSessionReset(token)) {
          await chatService.clear();
          if (!cancelled) setMessages([]);
        }
        bindChatSession(token);
        if (!cancelled) setSessionReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(formatAxiosError(err, 'Não foi possível iniciar o chat.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, sessionReady, setMessages, setSessionReady]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending || !sessionReady) return false;

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
    },
    [sending, sessionReady, setMessages],
  );

  const clearConversation = useCallback(async () => {
    if (sending || clearing) return false;
    setClearing(true);
    try {
      await chatService.clear();
      setMessages([]);
      setStreamingId(null);
      setError(null);
      return true;
    } catch (err) {
      setError(formatAxiosError(err, 'Não foi possível limpar a conversa.'));
      return false;
    } finally {
      setClearing(false);
    }
  }, [sending, clearing, setMessages]);

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
    clearing,
    streamingId,
    reindexing,
    error,
    setError,
    send,
    clearConversation,
    reindex,
  };
}
