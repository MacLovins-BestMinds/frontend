import type { Key, Vars } from '.';

const KNOWN = ['novice', 'speaker', 'pitcher', 'orator', 'legend'];

/**
 * Звание приходит с бэкенда по-английски — это ключ, его сравнивают и бэкенд, и тесты.
 * На экране показываем его на языке интерфейса; незнакомое звание — как есть.
 */
export function rankLabel(tc: (key: Key<'common'>, vars?: Vars) => string, title: string): string {
  const id = title.trim().toLowerCase();
  return KNOWN.includes(id) ? tc(`rank.${id}` as Key<'common'>) : title;
}
