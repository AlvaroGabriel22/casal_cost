import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-950">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warning' | 'danger' | 'navy';
}) {
  const tones = {
    neutral: 'border-slate-200 bg-white text-slate-950',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    warning: 'border-amber-200 bg-amber-50 text-amber-950',
    danger: 'border-red-200 bg-red-50 text-red-950',
    navy: 'border-[#103B73]/20 bg-[#071A3D] text-white',
  };
  return (
    <div className={`min-w-0 rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className={`text-xs font-semibold uppercase ${tone === 'navy' ? 'text-blue-100' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-bold tracking-normal">{value}</p>
      {hint && <p className={`mt-1 text-sm ${tone === 'navy' ? 'text-blue-100' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
}
