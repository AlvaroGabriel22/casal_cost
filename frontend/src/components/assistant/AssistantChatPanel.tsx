import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Send, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/States';
import { AssistantMessageContent } from './AssistantMessageContent';
import { ASSISTANT_SUGGESTIONS } from './assistant.constants';
import { useAssistantChat } from '../../hooks/useAssistantChat';

type AssistantChatPanelProps = {
  compact?: boolean;
  showReindex?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export function AssistantChatPanel({
  compact = false,
  showReindex = true,
  onSuccess,
  onError,
}: AssistantChatPanelProps) {
  const {
    messages,
    loading,
    sending,
    streamingId,
    reindexing,
    error,
    setError,
    send,
    reindex,
  } = useAssistantChat();

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (error) {
      onError?.(error);
      setError(null);
    }
  }, [error, onError, setError]);

  async function handleSend(text: string) {
    const ok = await send(text);
    if (ok) setInput('');
  }

  async function handleReindex() {
    const ok = await reindex();
    if (ok) onSuccess?.('Dados sincronizados com a IA.');
  }

  const waitingForStream =
    sending && messages.some((m) => m.role === 'ASSISTANT' && m.id === streamingId && !m.content);

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : ''}`}>
      {showReindex ? (
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-9 px-3 py-1.5 text-xs"
            loading={reindexing}
            onClick={() => void handleReindex()}
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar dados
          </Button>
        </div>
      ) : null}

      <div
        className={`space-y-4 overflow-y-auto pr-1 ${
          compact ? 'min-h-0 flex-1' : 'max-h-[58vh] min-h-[320px]'
        }`}
      >
        {loading ? (
          <Spinner label="Carregando conversa..." />
        ) : messages.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="h-5 w-5 text-[#103B73]" />
              <p className="text-sm">Comece com uma destas perguntas:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ASSISTANT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void handleSend(s)}
                  disabled={sending}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:border-[#0B2D5C]/40 hover:bg-slate-50 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                  m.role === 'USER'
                    ? 'bg-[#071A3D] text-sm text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.role === 'USER' ? (
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                ) : m.content ? (
                  <AssistantMessageContent
                    content={m.content}
                    streaming={m.id === streamingId}
                  />
                ) : waitingForStream && m.id === streamingId ? (
                  <p className="text-sm text-slate-500">
                    Analisando seus dados
                    <span className="assistant-typing-dots" aria-hidden>
                      ...
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-4 flex shrink-0 items-end gap-2 border-t border-slate-200 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend(input);
            }
          }}
          rows={1}
          disabled={sending}
          placeholder="Pergunte algo sobre suas finanças..."
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#103B73] focus:outline-none focus:ring-2 focus:ring-[#103B73]/30 disabled:bg-slate-50"
        />
        <Button type="submit" loading={sending} disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
          {!compact ? 'Enviar' : null}
        </Button>
      </form>
    </div>
  );
}
