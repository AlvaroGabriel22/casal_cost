import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuthStore } from '../stores/auth.store';
import { formatAxiosError } from '../api/errors';

const passwordControl =
  'mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#103B73] focus:ring-2 focus:ring-[#103B73]/20 disabled:bg-slate-100';

const schema = z.object({
  username: z.string().min(2, 'Informe usuário ou email.'),
  password: z.string().min(8, 'Informe a senha.'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/dashboard/individual" replace />;

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      await login(values.username, values.password);
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard/individual';
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatAxiosError(err, 'Falha no login.'));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-[#071A3D] p-8 text-white md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#071A3D]">
              <WalletCards className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CasalCost</h1>
              <p className="text-sm text-blue-100">Controle financeiro individual e compartilhado</p>
            </div>
          </div>
          <div className="mt-12 max-w-md">
            <p className="text-3xl font-bold leading-tight md:text-4xl">
              Organize contas, receitas e responsabilidades sem abrir mão da privacidade.
            </p>
            <p className="mt-4 text-blue-100">
              Use permissões para compartilhar somente o necessário e acompanhe o mês do casal com clareza.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-8 md:p-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Entrar</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acesse sua conta para gerenciar suas finanças.
            </p>
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Input
            label="Usuário ou email"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <label className="block text-sm font-medium text-slate-700">
            Senha
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                className={passwordControl}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-2 my-1 flex w-8 items-center justify-center rounded-lg text-slate-500 hover:text-[#0B2D5C] focus:outline-none focus:ring-2 focus:ring-[#103B73]/40"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password?.message && (
              <span id="login-password-error" className="mt-1 block text-xs text-red-600">
                {errors.password.message}
              </span>
            )}
          </label>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Acessar painel
          </Button>
          <p className="text-center text-sm text-slate-500">
            Ainda não tem conta?{' '}
            <Link className="font-semibold text-[#0B2D5C] underline" to="/register">
              Criar cadastro
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
