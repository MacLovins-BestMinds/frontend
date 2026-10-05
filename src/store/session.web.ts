import type { User } from '@/api/types';

export type SavedSession = { user: User; token: string };

// Сайт: вход помним в localStorage, как и язык (src/i18n/storage.web.ts).
const SESSION_KEY = 'stage-zero-session';

export function loadSession(): SavedSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as SavedSession | null;
    return saved?.user && saved.token ? saved : null;
  } catch {
    return null;
  }
}

export function saveSession(saved: SavedSession | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (saved) localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // хранилище недоступно — просто не запоминаем
  }
}
