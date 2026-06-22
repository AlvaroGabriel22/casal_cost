import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { authService } from '../services/auth.service';
import { formatAxiosError } from '../api/errors';

const schema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setError(null);
    setSuccess(null);
    try {
      const message = await authService.forgotPassword(values.email);
      setSuccess(message);
    } catch (err) {
      setError(formatAxiosError(err, 'Não foi possível enviar o e-mail.'));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Recuperar senha</h1>
          <p className="mt-1 text-sm text-slate-500">
            Informe o e-mail da sua conta. Enviaremos um link para definir uma nova senha.
          </p>
        </div>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
            {success}
          </p>
        )}
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" className="w-full" loading={isSubmitting} disabled={!!success}>
          Enviar link
        </Button>
        <p className="text-center text-sm text-slate-500">
          <Link className="font-semibold text-[#0B2D5C] underline" to="/login">
            Voltar ao login
          </Link>
        </p>
      </form>
    </main>
  );
}
