import { File, Paths } from 'expo-file-system';

import type { User } from '@/api/types';

export type SavedSession = { user: User; token: string };

// Приложение: вход лежит маленьким JSON в папке документов рядом с настройками языка (src/i18n/storage.ts),
// поэтому после перезапуска человек сразу попадает в меню, а не на лендинг. expo-file-system уже есть в сборке.
const NAME = 'stager-session.json';

/** Читаем при запуске синхронно: первый экран сразу знает, вошёл ли человек. */
export function loadSession(): SavedSession | null {
  try {
    const file = new File(Paths.document, NAME);
    if (!file.exists) return null;
    const saved = JSON.parse(file.textSync()) as SavedSession | null;
    return saved?.user && saved.token ? saved : null;
  } catch {
    return null;
  }
}

export function saveSession(saved: SavedSession | null) {
  try {
    const file = new File(Paths.document, NAME);
    if (!saved) {
      if (file.exists) file.delete();
      return;
    }
    if (!file.exists) file.create();
    file.write(JSON.stringify(saved));
  } catch {
    // файл не записался — вход просто не запомнится
  }
}
