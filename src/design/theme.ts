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
  markFiller: '#F5B8AE',
  markRepeat: '#FBD98A',
  markPause: '#D9D4BC',
  markPace: '#CFE3D0',
  markGaze: '#CDD5F3',
} as const;

export const font = {
  // заголовки — рукописный Shantell Sans, под нарисованных от руки персонажей; текст — Rubik
  display: 'ShantellSans_800ExtraBold',
  displaySemi: 'ShantellSans_700Bold',
  body: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semi: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
} as const;

/** Контур и жёсткая тень-смещение — как обводка у персонажей. */
export const outline = { borderWidth: 2.5, borderColor: c.ink } as const;
export const shadow = (offset = 5, color: string = c.ink) => ({ boxShadow: `${offset}px ${offset}px 0 ${color}` });

export const JUROR_NAME: Record<string, string> = { strict: 'Strict', kind: 'Kind', skeptic: 'Sceptic' };

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** «2026-10-03» → «October 3». */
export function formatDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return m && d ? `${MONTHS[m - 1]} ${d}` : iso;
}
