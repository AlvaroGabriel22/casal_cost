import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import type { HealthObservation } from '../../services/insights.service';

const OBSERVATION_STYLE: Record<
  HealthObservation['tone'],
  { border: string; bg: string; icon: typeof CheckCircle2; iconCls: string }
> = {
  POSITIVE: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    icon: CheckCircle2,
    iconCls: 'text-emerald-600',
  },
  ATTENTION: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    icon: AlertTriangle,
    iconCls: 'text-amber-600',
  },
  CRITICAL: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    icon: AlertTriangle,
    iconCls: 'text-red-600',
  },
  INFO: {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    icon: Lightbulb,
    iconCls: 'text-slate-600',
  },
};

const CHAR_DELAY_MS = 18;
const ROTATE_INTERVAL_MS = 7000;

function StreamCursor({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#103B73]"
      aria-hidden
    />
  );
}

function useStreamText(text: string, resetKey: string) {
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setCharIndex(0);
  }, [resetKey]);

  useEffect(() => {
    if (charIndex >= text.length) return;
    const timer = window.setTimeout(() => {
      setCharIndex((value) => value + 1);
    }, CHAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, charIndex]);

  return {
    rendered: text.slice(0, charIndex),
    isStreaming: charIndex < text.length,
  };
}

type RotatingInsightCardsProps = {
  observations: HealthObservation[];
};

export function RotatingInsightCards({ observations }: RotatingInsightCardsProps) {
  const insights = observations.slice(0, 3);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const active = insights[activeIndex];
  const streamTarget = active?.tip ?? active?.message ?? '';
  const { rendered: streamedText, isStreaming } = useStreamText(
    streamTarget,
    `${active?.id ?? 'empty'}-${activeIndex}`,
  );

  useEffect(() => {
    if (insights.length <= 1) return;

    const rotateTimer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % insights.length);
        setVisible(true);
      }, 280);
    }, ROTATE_INTERVAL_MS);

    return () => window.clearInterval(rotateTimer);
  }, [insights.length]);

  const goTo = (index: number) => {
    if (index === activeIndex) return;
    setVisible(false);
    window.setTimeout(() => {
      setActiveIndex(index);
      setVisible(true);
    }, 280);
  };

  if (insights.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Importe extratos bancários para ver insights personalizados.
      </p>
    );
  }

  const style = OBSERVATION_STYLE[active.tone];
  const Icon = style.icon;
  const hasTip = !!active.tip;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Insights do extrato bancário
        </p>
        <div className="flex items-center gap-1.5">
          {insights.map((insight, index) => (
            <button
              key={insight.id}
              type="button"
              aria-label={`Insight ${index + 1} de ${insights.length}`}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? 'w-6 bg-[#071A3D]' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>

      <article
        key={`${active.id}-${activeIndex}`}
        className={`rounded-xl border p-4 transition-all duration-300 ${style.border} ${style.bg} ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        <div className="flex gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconCls}`} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-950">{active.title}</h3>
            {hasTip ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{active.message}</p>
            ) : null}
            <p
              className={`text-sm leading-relaxed text-slate-700 ${
                hasTip
                  ? 'mt-2 rounded-lg border border-[#071A3D]/10 bg-white/60 px-3 py-2 text-xs font-medium text-slate-800'
                  : 'mt-1.5'
              }`}
            >
              {hasTip ? (
                <>
                  <span className="font-semibold text-[#071A3D]">Sugestão: </span>
                  {streamedText}
                </>
              ) : (
                streamedText
              )}
              {isStreaming ? <StreamCursor active /> : null}
            </p>
          </div>
        </div>
      </article>

      <p className="text-[11px] text-slate-500">
        {activeIndex + 1} de {insights.length} · alterna a cada {ROTATE_INTERVAL_MS / 1000}s
      </p>
    </div>
  );
}
