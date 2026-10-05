import { Platform, type ViewStyle } from 'react-native';

import { getLang, localeOf, translate } from '@/i18n';

// Палитра и шрифты из макета: кремовый фон, тушь, один оранжевый акцент.
export const c = {
  cream: '#F9F7E1',
  paper: '#FFFDF2',
  ink: '#161418',
  orange: '#F7A61E',
  graphite: '#4A4538',
  burnt: '#8A4E00',
  onInk: '#F9F7E1',
  onInkMuted: '#D9D4BC',
  bulbOff: '#3A3538',
  lens: '#2A262B',
  bad: '#A32020',
  good: '#2E6B3A',
  markFiller: '#F5B8AE',
  markRepeat: '#FBD98A',
  markSwear: '#E8736A',
  markPause: '#D9D4BC',
  // темп — сиреневый: зелёный в разборе значит только удачу
  markPace: '#E4C8F0',
  markGaze: '#CDD5F3',
  // запинка — абрикосовый, неуверенная фраза — шалфей, затухший голос — небесный: все светлее туши и друг от друга отличимы
  markStumble: '#FFD7B0',
  markWeak: '#D9E7C4',
  markEnergy: '#BDE3EC',
  // удачные места (хорошая пауза, сильный момент хода мысли) — зелёные, провалы хода мысли — красно-оранжевые;
  // тушь на обоих читается с контрастом выше 6:1
  markGood: '#9FD89A',
  markBad: '#F07C5C',
} as const;

export const font = {
  // заголовки — рукописный Shantell Sans, под нарисованных от руки персонажей; текст — Rubik
  display: 'ShantellSans_800ExtraBold',
  displaySemi: 'ShantellSans_700Bold',
  body: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semi: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
  // цитаты из питча
  italic: 'Rubik_500Medium_Italic',
} as const;

/** Контур и жёсткая тень-смещение — как обводка у персонажей. */
export const outline = { borderWidth: 2.5, borderColor: c.ink } as const;

/**
 * Жёсткая тень без размытия. На iOS CSS `boxShadow` рисуется розовой плашкой,
 * поэтому там тень идёт старыми свойствами слоя.
 */
export function shadow(offset = 5, color: string = c.ink): ViewStyle {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: { width: offset, height: offset },
      shadowOpacity: 1,
      shadowRadius: 0,
    };
  }
  return { boxShadow: `${offset}px ${offset}px 0 ${color}` };
}

/** Имя члена жюри на текущем языке; незнакомый id — как есть. */
export function jurorName(id: string): string {
  return id === 'strict' || id === 'kind' || id === 'skeptic' ? translate('common', `juror.${id}`) : id;
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Сколько говорить: «20–45 sec», «1–3 min» или «1:30–4:00», если минуты не целые. Единицы — на языке интерфейса. */
export function formatRange(minSec: number, maxSec: number): string {
  if (maxSec < 60) return translate('common', 'rangeSec', { min: minSec, max: maxSec });
  if (minSec % 60 === 0 && maxSec % 60 === 0) return translate('common', 'rangeMin', { min: minSec / 60, max: maxSec / 60 });
  return `${formatTime(minSec)}–${formatTime(maxSec)}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** «2026-10-03» → «October 3», «3 октября», «3 octombrie». */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!m || !d) return iso;
  const lang = getLang();
  try {
    // дата без времени: собираем её в местном поясе и так же выводим — день не сдвинется
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : localeOf(lang), { month: 'long', day: 'numeric' }).format(new Date(y || 2000, m - 1, d));
  } catch {
    return `${MONTHS[m - 1]} ${d}`;
  }
}

/** Дата из ISO-строки на языке интерфейса: «3 October», «3 окт.». */
export function formatDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso);
  try {
    return date.toLocaleDateString(localeOf(), options);
  } catch {
    return date.toDateString();
  }
}

/** Число с нужным числом знаков после запятой: «0.8» в английском, «0,8» в русском и румынском. */
export function formatNumber(value: number, digits = 0): string {
  try {
    return new Intl.NumberFormat(localeOf(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}
