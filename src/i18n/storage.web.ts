// Сайт: выбранный язык помним в localStorage, как и вход (src/store/game.ts).
const KEY = 'stager-lang';

export function loadLang(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveLang(lang: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // хранилище недоступно — просто не запоминаем
  }
}
