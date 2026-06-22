import type { ReactNode } from 'react';

const tones: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  POSITIVE: 'bg-emerald-100 text-emerald-800',
  ATTENTION: 'bg-amber-100 text-amber-800',
  NEGATIVE: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_STATUS: 'bg-amber-100 text-amber-800',
  DISABLED: 'bg-slate-200 text-slate-700',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone ?? String(children)] ?? 'bg-blue-50 text-[#0B2D5C]'}`}>
      {children}
    </span>
  );
}
