import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { AssistantChatPanel } from './AssistantChatPanel';
import { Toast } from '../ui/Toast';

export function AssistantChatWidget() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const location = useLocation();
  const hiddenOnPage = location.pathname === '/assistente';

  useEffect(() => {
    if (hiddenOnPage) setOpen(false);
  }, [hiddenOnPage]);

  if (hiddenOnPage) return null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar assistente"
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={`fixed z-50 flex flex-col transition-all duration-300 ease-out ${
          open
            ? 'bottom-0 right-0 left-0 h-[min(620px,85vh)] sm:bottom-6 sm:left-auto sm:h-[min(560px,calc(100vh-5rem))] sm:w-[min(420px,calc(100vw-2rem))]'
            : 'bottom-5 right-5 sm:bottom-6 sm:right-6'
        }`}
      >
        {open ? (
          <div className="flex h-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#071A3D] to-[#103B73] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">Assistente financeiro</p>
                  <p className="text-xs text-blue-100">Respostas com base nos seus dados</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar chat"
                className="rounded-lg p-2 transition hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <AssistantChatPanel
                compact
                showReindex={false}
                onSuccess={(message) => setToast({ message, type: 'success' })}
                onError={(message) => setToast({ message, type: 'error' })}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Abrir assistente financeiro"
            title="Assistente financeiro"
            className="group ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#071A3D] to-[#103B73] text-white shadow-lg shadow-[#071A3D]/30 transition hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="h-6 w-6 transition group-hover:scale-110" />
          </button>
        )}
      </div>

      <Toast message={toast?.message ?? null} type={toast?.type} />
    </>
  );
}
