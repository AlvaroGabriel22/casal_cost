import { useEffect, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { chatService, type ChatMessage } from '../services/chat.service';
import { formatAxiosError } from '../api/errors';
import { RefreshCw, Send, Sparkles } from 'lucide-react';

const suggestions = [
  'Como estão minhas finanças este mês?',
  'Em quais categorias eu mais gasto?',
  'Quais contas vencem em breve?',
  'Crie um plano de economia realista para mim.',
  'Consigo definir uma meta de economia para os próximos meses?',
];

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    chatService
      .history()
      .then((data) => {
        if (active) setMessages(data);
      })
      .catch((err) =>
        setToast({ message: formatAxiosError(err, 'Não foi possível carregar o histórico.'), type: 'error' }),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput('');
    setSending(true);
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const reply = await chatService.ask(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          content: reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(message);
      setToast({ message: formatAxiosError(err, 'Não foi possível obter a resposta.'), type: 'error' });
    } finally {
      setSending(false);
    }
  }

  async function reindex() {
    setReindexing(true);
    try {
      await chatService.reindex();
      setToast({ message: 'Dados sincronizados com a IA.', type: 'success' });
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível sincronizar os dados.'), type: 'error' });
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card
        title="Assistente financeiro"
        subtitle="Pergunte sobre seus gastos, metas e planos de economia. As respostas usam apenas os seus dados."
        action={
          <Button type="button" variant="outline" loading={reindexing} onClick={() => void reindex()}>
            <RefreshCw className="h-4 w-4" />
            Sincronizar dados
          </Button>
        }
      >
        <div className="flex flex-col">
          <div className="max-h-[58vh] min-h-[320px] space-y-4 overflow-y-auto pr-1">
            {loading ? (
              <Spinner label="Carregando conversa..." />
            ) : messages.length === 0 ? (
              <div className="space-y-4 py-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <Sparkles className="h-5 w-5 text-[#103B73]" />
                  <p className="text-sm">Comece com uma destas perguntas:</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#0B2D5C]/40 hover:bg-slate-50"
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
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'USER'
                        ? 'bg-[#071A3D] text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
                  Analisando seus dados...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="mt-4 flex items-end gap-2 border-t border-slate-200 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Pergunte algo sobre suas finanças..."
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#103B73] focus:outline-none focus:ring-2 focus:ring-[#103B73]/30"
            />
            <Button type="submit" loading={sending} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </form>
        </div>
      </Card>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
