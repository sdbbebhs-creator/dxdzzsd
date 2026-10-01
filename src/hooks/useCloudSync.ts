import { useEffect, useRef } from 'react';
import { fetchRevision, flushOutbox, getKnownRevision, hasPendingWrites } from '../utils/cloudItems';

const POLL_MS = 15_000;

/**
 * Keeps this device in step with the account: uploads queued offline changes and, when
 * another device has changed something (server revision moved ahead), asks App to reload.
 * Also retries the initial load if it failed. Runs every 15 s while the tab is visible, and immediately on focus / coming back online.
 */
export function useCloudSync(userId: string | null, onRemoteChange: () => void, isLoaded: () => boolean) {
  const handlerRef = useRef(onRemoteChange);
  handlerRef.current = onRemoteChange;
  const isLoadedRef = useRef(isLoaded);
  isLoadedRef.current = isLoaded;

  useEffect(() => {
    if (!userId) return;
    let running = false;

    const check = async () => {
      if (running || document.visibilityState !== 'visible') return;
      running = true;
      try {
        await flushOutbox();
        if (hasPendingWrites()) return;
        // The first load failed (e.g. offline at sign-in): retry it
        if (!isLoadedRef.current()) return handlerRef.current();
        const revision = await fetchRevision();
        if (revision > getKnownRevision()) handlerRef.current();
      } catch (error) {
        console.warn('Cloud sync check failed (will retry):', error);
      } finally {
        running = false;
      }
    };

    const timer = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', check);
    };
  }, [userId]);
}
