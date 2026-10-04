import { useCallback } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

import type { Dict, Entry, Lang, Plural } from './define';
import { preferredTags } from './device';
import { loadLang, saveLang } from './storage';
import audiences from './strings/audiences';
import common from './strings/common';
import insights from './strings/insights';
import jury from './strings/jury';
import landing from './strings/landing';
import menu from './strings/menu';
import own from './strings/own';
import prep from './strings/prep';
import profile from './strings/profile';
import result from './strings/result';
import review from './strings/review';
import stage from './strings/stage';
import wheel from './strings/wheel';

export type { Lang, Plural } from './define';

/** Языки в переключателе: код на кнопке и самоназвание в меню. */
export const LANGS: { id: Lang; code: string; name: string }[] = [
  { id: 'en', code: 'EN', name: 'English' },
  { id: 'ru', code: 'RU', name: 'Русский' },
  { id: 'ro', code: 'RO', name: 'Română' },
];

const NS = { audiences, common, insights, jury, landing, menu, own, prep, profile, result, review, stage, wheel };

export type Namespace = keyof typeof NS;
export type Key<N extends Namespace> = keyof (typeof NS)[N]['en'] & string;
export type Vars = Record<string, string | number>;

/** «ru-RU», «mo», «ro_MD» → ru / ro; английский и прочие → en; не язык → null. */
function match(tag: string | null | undefined): Lang | null {
  const code = tag?.trim().toLowerCase().slice(0, 2);
  if (!code || !/^[a-z]{2}$/.test(code)) return null;
  if (code === 'ru') return 'ru';
  if (code === 'ro' || code === 'mo') return 'ro';
  return 'en';
}

/** Язык устройства или браузера: первый из списка предпочтений, остальное — английский. */
function deviceLang(): Lang {
  for (const tag of preferredTags()) {
    const lang = match(tag);
    if (lang) return lang;
  }
  return 'en';
}

function isLang(value: string | null): value is Lang {
  return value === 'en' || value === 'ru' || value === 'ro';
}

/** <html lang> на сайте — для озвучки страниц, переносов и перевода браузером. */
function markDocument(lang: Lang) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lang;
}

const saved = loadLang();
const initial: Lang = isLang(saved) ? saved : deviceLang();
markDocument(initial);

type LangState = { lang: Lang; setLang: (lang: Lang) => void };

export const useLangStore = create<LangState>((set) => ({
  lang: initial,
  setLang: (lang) => {
    saveLang(lang);
    markDocument(lang);
    set({ lang });
  },
}));

/** Текущий язык интерфейса; компонент перерисуется при смене. */
export const useLang = () => useLangStore((s) => s.lang);

/** Текущий язык вне компонентов: заголовки запросов, адрес живого потока. */
export const getLang = (): Lang => useLangStore.getState().lang;

const rules: Partial<Record<Lang, Intl.PluralRules>> = {};

/** Правила CLDR для трёх наших языков — на случай движка без Intl.PluralRules (Hermes его может не иметь). */
function cldrForm(lang: Lang, n: number): keyof Plural {
  const whole = Number.isInteger(n);
  if (lang === 'ru') {
    if (!whole) return 'other';
    const d = Math.abs(n) % 10;
    const h = Math.abs(n) % 100;
    if (d === 1 && h !== 11) return 'one';
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'few';
    return 'many';
  }
  if (lang === 'ro') {
    if (n === 1) return 'one';
    const h = Math.abs(n) % 100;
    return !whole || n === 0 || (h >= 1 && h <= 19) ? 'few' : 'other';
  }
  return n === 1 ? 'one' : 'other';
}

function pluralForm(lang: Lang, n: number): keyof Plural {
  if (typeof Intl === 'undefined' || typeof Intl.PluralRules !== 'function') return cldrForm(lang, n);
  try {
    rules[lang] ??= new Intl.PluralRules(lang);
    return rules[lang].select(n) as keyof Plural;
  } catch {
    return cldrForm(lang, n);
  }
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

function format(entry: Entry | undefined, lang: Lang, vars?: Vars): string {
  if (entry === undefined) return '';
  if (typeof entry === 'string') return fill(entry, vars);
  const n = Number(vars?.n ?? 0);
  return fill(entry[pluralForm(lang, n)] ?? entry.other, vars);
}

/** Строка раздела на нужном языке; у форм числа количество передаётся в {n}. */
export function translateIn<N extends Namespace>(lang: Lang, ns: N, key: Key<N>, vars?: Vars): string {
  return format((NS[ns][lang] as Dict)[key], lang, vars);
}

/** Строка на текущем языке — для кода вне компонентов (ошибки запросов). В разметке — useT: он перерисует экран. */
export function translate<N extends Namespace>(ns: N, key: Key<N>, vars?: Vars): string {
  return translateIn(getLang(), ns, key, vars);
}

/**
 * Переводчик раздела: const t = useT('menu'); t('title'), t('hello', { name }), t('rounds', { n: 3 }).
 * Компонент перерисовывается, когда игрок меняет язык.
 */
export function useT<N extends Namespace>(ns: N) {
  const lang = useLang();
  return useCallback((key: Key<N>, vars?: Vars) => translateIn(lang, ns, key, vars), [lang, ns]);
}

/** Локаль для Intl: в английском даты как раньше — «3 October» (en-GB). */
export function localeOf(lang: Lang = getLang()): string {
  return lang === 'ru' ? 'ru-RU' : lang === 'ro' ? 'ro-RO' : 'en-GB';
}
