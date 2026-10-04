/** Языки интерфейса. Тот же набор понимает бэкенд (Accept-Language, lang раунда и живого потока). */
export type Lang = 'en' | 'ru' | 'ro';

/** Формы числа для Intl.PluralRules: в английском хватает one/other, в русском и румынском нужны few и many. */
export type Plural = { one: string; few?: string; many?: string; other: string };

export type Entry = string | Plural;
export type Dict = Record<string, Entry>;

/** Перевод повторяет английский словарь ключ в ключ: строка остаётся строкой, формы числа — формами. */
export type Same<T extends Dict> = { [K in keyof T]: T[K] extends string ? string : Plural };

/**
 * Словарь одного раздела: английский — образец, у русского и румынского ровно те же ключи
 * (лишний или пропущенный ключ — ошибка TypeScript). В строках {name} — подстановка, для форм числа — {n}.
 */
export function strings<T extends Dict>(en: T, rest: { ru: Same<T>; ro: Same<T> }): Record<Lang, Same<T>> {
  return { en: en as Same<T>, ru: rest.ru, ro: rest.ro };
}
