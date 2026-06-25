import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { AssistantChatPanel } from '../components/assistant/AssistantChatPanel';
import { useState } from 'react';

export function AssistantPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <Card
        title="Assistente financeiro"
        subtitle="Pergunte sobre seus gastos, metas e planos de economia. As respostas usam apenas os seus dados."
      >
        <AssistantChatPanel
          onSuccess={(message) => setToast({ message, type: 'success' })}
          onError={(message) => setToast({ message, type: 'error' })}
        />
      </Card>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
