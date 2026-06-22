import { useCallback, useEffect, useRef, useState } from 'react';
import { expenseService } from '../services/finance.service';
import type { Expense } from '../types/finance';

function watermarkKey(userId: string) {
  return `casalcost:couplePartnerExpenseWatermark:${userId}`;
}

function maxPartnerCreatedAt(items: Expense[], userId: string): Date | null {
  let max = 0;
  for (const e of items) {
    if (!e.ownerUserId || e.ownerUserId === userId) continue;
    if (!e.createdAt) continue;
    const t = new Date(e.createdAt).getTime();
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max === 0 ? null : new Date(max);
}

/**
 * Indica se existem despesas SHARED criadas pelo parceiro mais recentes do que a última vista.
 * Persistência por utilizador em localStorage.
 */
export function usePartnerCoupleExpenseNotification(userId: string | undefined) {
  const [hasUnread, setHasUnread] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const evaluate = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await expenseService.list('SHARED', { limit: 100 });
      const maxP = maxPartnerCreatedAt(data.items, userId);
      const key = watermarkKey(userId);
      const stored = localStorage.getItem(key);
      if (!stored) {
        const baseline = maxP ?? new Date();
        localStorage.setItem(key, baseline.toISOString());
        if (alive.current) setHasUnread(false);
        return;
      }
      const watermark = new Date(stored).getTime();
      const candidate = maxP?.getTime() ?? 0;
      if (alive.current) setHasUnread(candidate > watermark);
    } catch {
      /* não intrusivo */
    }
  }, [userId]);

  const acknowledge = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await expenseService.list('SHARED', { limit: 100 });
      const maxP = maxPartnerCreatedAt(data.items, userId);
      const baseline = maxP ?? new Date();
      localStorage.setItem(watermarkKey(userId), baseline.toISOString());
      if (alive.current) setHasUnread(false);
    } catch {
      /* noop */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setHasUnread(false);
      return;
    }
    void evaluate();
    const intervalId = window.setInterval(() => void evaluate(), 90_000);
    const onFocus = () => void evaluate();
    const onVis = () => {
      if (document.visibilityState === 'visible') void evaluate();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId, evaluate]);

  return { hasUnread, acknowledge, refresh: evaluate };
}
