import { AlertCircle, Loader2, WalletCards } from 'lucide-react';
import { Button } from './Button';

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  title = 'Nada por aqui ainda',
  message = 'Quando houver dados, eles aparecerão nesta área.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <WalletCards className="mx-auto h-8 w-8 text-slate-400" />
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold">Não foi possível carregar</p>
          <p className="mt-1 text-sm">{message}</p>
          {onRetry && (
            <Button type="button" className="mt-3" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
