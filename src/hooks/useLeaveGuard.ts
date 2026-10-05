import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Сайт: пока идёт выступление или жюри, обновление или закрытие вкладки спрашивает «Покинуть сайт?» —
 * иначе раунд, который живёт только в памяти вкладки, пропал бы молча. В приложении ничего не делает.
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
}
