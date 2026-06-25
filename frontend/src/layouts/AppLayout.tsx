import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Banknote,
  ChartPie,
  CreditCard,
  HandCoins,
  Heart,
  Home,
  KeyRound,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { usePartnerCoupleExpenseNotification } from '../hooks/usePartnerCoupleExpenseNotification';
import { AssistantChatWidget } from '../components/assistant/AssistantChatWidget';

const nav = [
  {
    title: 'Individual',
    items: [
      { to: '/dashboard/individual', label: 'Dashboard individual', icon: Home },
      { to: '/statement/individual', label: 'Extrato', icon: ReceiptText },
      { to: '/expenses/individual', label: 'Despesas individuais', icon: CreditCard },
      { to: '/installments', label: 'Parcelamentos', icon: Banknote },
      { to: '/investments/individual', label: 'Investimentos', icon: TrendingUp },
      { to: '/assistente', label: 'Assistente IA', icon: Sparkles },
    ],
  },
  {
    title: 'Casal',
    items: [
      { to: '/dashboard/couple', label: 'Dashboard casal', icon: ChartPie },
      { to: '/expenses/couple', label: 'Despesas do casal', icon: Users },
      { to: '/investments/couple', label: 'Investimentos do casal', icon: TrendingUp },
      { to: '/expenses/new', label: 'Nova despesa', icon: HandCoins },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { to: '/incomes', label: 'Receitas', icon: Banknote },
      { to: '/couple', label: 'Casal', icon: Users },
      { to: '/permissions', label: 'Permissões', icon: ShieldCheck },
      { to: '/settings/financial', label: 'Salário', icon: Settings },
      { to: '/profile', label: 'Perfil', icon: User },
    ],
  },
];

const titles: Record<string, string> = {
  '/dashboard/individual': 'Dashboard individual',
  '/statement/individual': 'Extrato individual',
  '/dashboard/couple': 'Dashboard do casal',
  '/expenses/individual': 'Despesas individuais',
  '/expenses/couple': 'Despesas do casal',
  '/expenses/new': 'Nova despesa',
  '/installments': 'Parcelamentos',
  '/investments/individual': 'Investimentos individuais',
  '/investments/couple': 'Investimentos do casal',
  '/assistente': 'Assistente financeiro (IA)',
  '/incomes': 'Receitas',
  '/couple': 'Gestão do casal',
  '/permissions': 'Permissões',
  '/settings/financial': 'Salário',
  '/profile': 'Perfil',
};

function Sidebar({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <aside className="flex h-full flex-col bg-[#071A3D] text-white">
      <div className={`flex h-16 items-center gap-3 border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#071A3D]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className={collapsed ? 'hidden' : 'block'}>
          <p className="text-lg font-bold">CasalCost</p>
          <p className="text-xs text-blue-100">Finanças com privacidade</p>
        </div>
      </div>
      <nav className={`flex-1 space-y-4 p-3 ${collapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {nav.map((group) => (
          <div key={group.title} className="space-y-1">
            <p
              className={`px-3 text-[11px] font-bold uppercase tracking-wide text-blue-200 ${
                collapsed ? 'sr-only' : ''
              }`}
            >
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-white text-[#071A3D]'
                        : 'text-blue-50 hover:bg-white/10 hover:text-white'
                    }`
                  }
                  title={collapsed ? `${group.title}: ${item.label}` : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={collapsed ? 'hidden' : 'truncate'}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-blue-50 hover:bg-white/10 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Sair' : undefined}
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className={collapsed ? 'hidden' : 'inline'}>Sair</span>
        </button>
      </div>
    </aside>
  );
}

const COUPLE_ACK_PATHS = ['/dashboard/couple', '/expenses/couple'];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const title = useMemo(() => titles[location.pathname] ?? 'CasalCost', [location.pathname]);
  const { hasUnread: couplePartnerAlert, acknowledge: acknowledgeCouplePartnerAlerts } =
    usePartnerCoupleExpenseNotification(user?.id);

  useEffect(() => {
    if (COUPLE_ACK_PATHS.includes(location.pathname)) {
      void acknowledgeCouplePartnerAlerts();
    }
  }, [location.pathname, acknowledgeCouplePartnerAlerts]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`hidden transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block ${
          hovered ? 'lg:w-72 shadow-2xl' : 'lg:w-20'
        }`}
      >
        <Sidebar collapsed={!hovered} />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-80 max-w-[86vw]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-20">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2 lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label="Abrir menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="truncate text-lg font-bold text-slate-950 md:text-xl">{title}</h1>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <button
              type="button"
              className={`relative rounded-xl p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                couplePartnerAlert
                  ? 'text-red-600 hover:bg-red-50 focus:ring-red-500'
                  : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600 focus:ring-rose-400'
              }`}
              aria-label={
                couplePartnerAlert
                  ? 'Nova despesa do casal pelo parceiro — ver despesas do casal'
                  : 'Despesas do casal'
              }
              title={
                couplePartnerAlert
                  ? 'O parceiro adicionou uma despesa partilhada — clique para ver'
                  : 'Despesas do casal'
              }
              onClick={() => navigate('/expenses/couple')}
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                {couplePartnerAlert ? (
                  <>
                    <span
                      className="couple-heart-ripple pointer-events-none absolute h-7 w-7 rounded-full bg-red-500/35"
                      aria-hidden
                    />
                    <span
                      className="couple-heart-ripple couple-heart-ripple-delay pointer-events-none absolute h-7 w-7 rounded-full bg-red-400/25"
                      aria-hidden
                    />
                  </>
                ) : null}
                <Heart
                  className={`relative z-[1] h-6 w-6 ${couplePartnerAlert ? 'animate-couple-heart-beat fill-red-600 text-red-700' : ''}`}
                  strokeWidth={couplePartnerAlert ? 1.5 : 2}
                />
              </span>
              {couplePartnerAlert ? (
                <span className="absolute right-0.5 top-0.5 z-[2] h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
              ) : null}
            </button>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name ?? 'Usuário'}</p>
              <p className="truncate text-xs text-slate-500">{user?.username}</p>
            </div>
          </div>
        </header>

        <main className="w-full px-4 py-5 md:px-6 md:py-7">
          <Outlet />
        </main>
      </div>
      <AssistantChatWidget />
    </div>
  );
}
