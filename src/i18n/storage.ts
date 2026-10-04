import { File, Paths } from 'expo-file-system';

// Приложение: выбранный язык лежит маленьким JSON в папке документов. expo-file-system уже есть в сборке.
const NAME = 'stager-settings.json';

/** Читаем при запуске синхронно, чтобы первый кадр был сразу на нужном языке. */
export function loadLang(): string | null {
  try {
    const file = new File(Paths.document, NAME);
    if (!file.exists) return null;
    const saved = JSON.parse(file.textSync()) as { lang?: unknown };
    return typeof saved.lang === 'string' ? saved.lang : null;
  } catch {
    return null;
  }
}

export function saveLang(lang: string) {
  try {
    const file = new File(Paths.document, NAME);
    if (!file.exists) file.create();
    file.write(JSON.stringify({ lang }));
  } catch {
    // файл не записался — язык просто не запомнится
  }
}
