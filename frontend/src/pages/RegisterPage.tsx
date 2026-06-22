import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuthStore } from '../stores/auth.store';
import { formatAxiosError } from '../api/errors';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  username: z.string().min(2, 'Informe um usuário.'),
  email: z.string().email('Informe um email válido.'),
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.'),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      await registerUser(values);
      navigate('/dashboard/individual', { replace: true });
    } catch (err) {
      setError(formatAxiosError(err, 'Não foi possível criar a conta.'));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-xl space-y-5 rounded-3xl bg-white p-8 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">Seu painel financeiro pessoal e compartilhado.</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" error={errors.name?.message} {...register('name')} />
          <Input label="Usuário" error={errors.username?.message} {...register('username')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Senha" type="password" error={errors.password?.message} {...register('password')} />
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Criar e entrar
        </Button>
        <p className="text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link className="font-semibold text-[#0B2D5C] underline" to="/login">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
