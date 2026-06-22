import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { authService } from '../services/auth.service';
import { formatAxiosError } from '../api/errors';

const passwordControl =
  'mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#103B73] focus:ring-2 focus:ring-[#103B73]/20 disabled:bg-slate-100';

const schema = z
  .object({
    password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.'),
    confirmPassword: z.string().min(8, 'Confirme a nova senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
        <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-xl text-center">
          <h1 className="text-xl font-bold text-slate-950">Link inválido</h1>
          <p className="text-sm text-slate-500">
            Este link de recuperação está incompleto ou expirou.
          </p>
          <Link className="inline-block font-semibold text-[#0B2D5C] underline" to="/forgot-password">
            Solicitar novo link
          </Link>
        </div>
      </main>
    );
  }

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      await authService.resetPassword(token, values.password);
      navigate('/login', {
        replace: true,
        state: { message: 'Senha redefinida. Faça login com a nova senha.' },
      });
    } catch (err) {
      setError(formatAxiosError(err, 'Não foi possível redefinir a senha.'));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Nova senha</h1>
          <p className="mt-1 text-sm text-slate-500">Defina uma nova senha para a sua conta.</p>
        </div>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Nova senha
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={passwordControl}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute inset-y-0 right-2 my-1 flex w-8 items-center justify-center rounded-lg text-slate-500 hover:text-[#0B2D5C]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password?.message && (
            <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span>
          )}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Confirmar senha
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              className={passwordControl}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              className="absolute inset-y-0 right-2 my-1 flex w-8 items-center justify-center rounded-lg text-slate-500 hover:text-[#0B2D5C]"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword?.message && (
            <span className="mt-1 block text-xs text-red-600">{errors.confirmPassword.message}</span>
          )}
        </label>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Salvar nova senha
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
