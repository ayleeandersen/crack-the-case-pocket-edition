import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cards } from '../data/cards';
import { useStore } from '../state/StoreContext';
import { pickRandomCard } from './selection';

/** Current time, refreshed while `active` and whenever the page becomes visible again. */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const onVis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVis);
    const id = active ? window.setInterval(tick, intervalMs) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (id) window.clearInterval(id);
    };
  }, [active, intervalMs]);
  return now;
}

/** Keeps the screen awake while `active`; re-acquires after the page returns from background. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        /* denied or unsupported: the clock still works */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}

/** Draws a random unplayed card for the active profile and opens it. Returns false if none are left. */
export function useNextCase() {
  const { store, activeFilters, lastShownRef } = useStore();
  const navigate = useNavigate();
  return useCallback(
    (opts: { includePlayed?: boolean; replace?: boolean } = {}): boolean => {
      const card = pickRandomCard(cards, activeFilters, store.played[store.activeProfileId] ?? {}, {
        excludeId: lastShownRef.current,
        includePlayed: opts.includePlayed,
      });
      navigate(card ? `/case/${card.id}` : '/play', { replace: opts.replace });
      return card !== null;
    },
    [store.played, store.activeProfileId, activeFilters, lastShownRef, navigate],
  );
}

/** Back to the previous in-app screen, or the Play tab after a deep link. */
export function useGoBack() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/play', { replace: true });
  }, [location.key, navigate]);
}
