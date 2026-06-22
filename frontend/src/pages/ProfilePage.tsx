import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { ErrorState, Spinner } from '../components/ui/States';
import { Toast } from '../components/ui/Toast';
import { userService } from '../services/finance.service';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuthStore } from '../stores/auth.store';
import { formatAxiosError } from '../api/errors';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  email: z.string().email('Email inválido.'),
});
type FormData = z.infer<typeof schema>;

export function ProfilePage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data, loading, error, reload } = useAsyncData(() => userService.me(), []);
  const setUser = useAuthStore.setState;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) reset({ name: data.name, email: data.email ?? '' });
  }, [data, reset]);

  async function onSubmit(values: FormData) {
    try {
      const user = await userService.updateProfile(values);
      setUser({ user });
      setToast({ message: 'Perfil atualizado.', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: formatAxiosError(err, 'Não foi possível atualizar.'), type: 'error' });
    }
  }

  if (loading) return <Spinner label="Carregando perfil..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <Card title="Meu perfil" subtitle="Dados básicos da conta.">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <Input label="Nome" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Usuário" value={data?.username ?? ''} disabled readOnly />
          <Input label="ID" value={data?.id ?? ''} disabled readOnly />
          <div className="md:col-span-2">
            <Button type="submit" loading={isSubmitting}>Salvar perfil</Button>
          </div>
        </form>
      </Card>
      <Toast message={toast?.message ?? null} type={toast?.type} />
    </>
  );
}
