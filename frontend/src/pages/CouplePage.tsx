import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { coupleService } from '../services/finance.service';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuthStore } from '../stores/auth.store';
import { formatAxiosError } from '../api/errors';

export function CouplePage() {
  const [partnerUsername, setPartnerUsername] = useState('partner.demo');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, reload } = useAsyncData(() => coupleService.me(), []);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setToast({ message: success, type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'A ação falhou.'), type: 'error' });
    }
  }

  if (loading) return <Spinner label="Carregando casal..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const partner = data?.userA?.id === user?.id ? data?.userB : data?.userA;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card title="Convite de parceiro" subtitle="A conta compartilhada fica editável por ambos quando o casal está ativo.">
        <div className="space-y-4">
          <Input label="Usuário do parceiro" value={partnerUsername} onChange={(e) => setPartnerUsername(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void run(() => coupleService.invite(partnerUsername), 'Convite enviado.')}>
              Enviar convite
            </Button>
            <Button type="button" variant="outline" onClick={() => void run(() => coupleService.accept(), 'Convite aceito.')}>
              Aceitar convite pendente
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Status do casal">
        {!data ? (
          <EmptyState title="Sem casal ativo" message="Envie um convite ou aceite um convite pendente." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-950">{partner?.name ?? 'Parceiro'}</p>
                <p className="text-sm text-slate-500">{partner?.username}</p>
              </div>
              <Badge tone={data.status}>{data.status}</Badge>
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                window.confirm('Desativar este casal?') &&
                void run(() => coupleService.disable(data.id), 'Casal desativado.')
              }
            >
              Desativar casal
            </Button>
          </div>
        )}
      </Card>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
