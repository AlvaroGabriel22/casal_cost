import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { coupleService, permissionService } from '../services/finance.service';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAxiosError } from '../api/errors';

export function PermissionsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const permissions = useAsyncData(() => permissionService.list(), []);
  const couple = useAsyncData(() => coupleService.me(), []);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setToast({ message: success, type: 'success' });
      await permissions.reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível alterar permissões.'), type: 'error' });
    }
  }

  if (permissions.loading || couple.loading) return <Spinner label="Carregando permissões..." />;
  if (permissions.error) return <ErrorState message={permissions.error} onRetry={permissions.reload} />;

  const grant = permissions.data?.grantedByMe?.[0];
  const partner = couple.data?.userA?.id === grant?.ownerUserId ? couple.data?.userB : couple.data?.userA;
  const partnerId = partner?.id ?? grant?.allowedUserId;

  return (
    <div className="space-y-6">
      <Card title="Privacidade individual" subtitle="Contas individuais são privadas por padrão. Compartilhe somente quando quiser.">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Conceder edição permite que o parceiro altere suas finanças individuais. Você pode
          revogar este acesso a qualquer momento.
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Acesso concedido por mim">
          {!grant && !partnerId ? (
            <EmptyState title="Nenhum parceiro ativo" message="Ative um casal antes de conceder permissões." />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{partner?.name ?? grant?.allowed?.name ?? 'Parceiro'}</p>
                <p className="text-sm text-slate-500">{partner?.username ?? grant?.allowed?.username}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={grant?.canView ? 'secondary' : 'outline'}
                  onClick={() =>
                    partnerId &&
                    void run(
                      () =>
                        grant
                          ? permissionService.update(grant.id, {
                              canView: !grant.canView,
                              canEdit: grant.canView ? false : grant.canEdit,
                            })
                          : permissionService.create({ allowedUserId: partnerId, canView: true, canEdit: false }),
                      'Permissão de visualização atualizada.',
                    )
                  }
                >
                  {grant?.canView ? 'Desativar visualização' : 'Ativar visualização'}
                </Button>
                <Button
                  type="button"
                  variant={grant?.canEdit ? 'danger' : 'outline'}
                  disabled={!grant?.canView}
                  onClick={() =>
                    grant &&
                    window.confirm('Conceder ou remover edição das finanças individuais?') &&
                    void run(
                      () => permissionService.update(grant.id, { canEdit: !grant.canEdit }),
                      'Permissão de edição atualizada.',
                    )
                  }
                >
                  {grant?.canEdit ? 'Remover edição' : 'Permitir edição'}
                </Button>
              </div>
              {grant && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    window.confirm('Revogar todo acesso individual?') &&
                    void run(() => permissionService.remove(grant.id), 'Acesso revogado.')
                  }
                >
                  Revogar acesso
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card title="Acesso concedido a mim">
          {!permissions.data?.grantedToMe.length ? (
            <EmptyState title="Nenhum acesso recebido" />
          ) : (
            <div className="space-y-3">
              {permissions.data.grantedToMe.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{row.owner?.name}</p>
                  <p className="text-sm text-slate-500">{row.owner?.username}</p>
                  <div className="mt-3 flex gap-2">
                    <Badge tone={row.canView ? 'ACTIVE' : 'DISABLED'}>{row.canView ? 'Pode ver' : 'Sem visão'}</Badge>
                    <Badge tone={row.canEdit ? 'ACTIVE' : 'DISABLED'}>{row.canEdit ? 'Pode editar' : 'Sem edição'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
