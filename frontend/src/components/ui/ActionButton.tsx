import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'edit' | 'pay' | 'delete' | 'neutral';

const tones: Record<Tone, string> = {
  edit: 'border-blue-200 bg-blue-50 text-[#0B2D5C] hover:bg-blue-100',
  pay: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  delete: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
};

export function ActionButton({
  icon,
  label,
  tone = 'neutral',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  tone?: Tone;
}) {
  return (
    <button
      {...props}
      title={label}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#103B73] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[2.4]">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
