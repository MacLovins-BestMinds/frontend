export const colors = {
  bg: '#14121F',
  card: '#221F33',
  cardLight: '#2E2A45',
  text: '#FFFFFF',
  muted: '#A7A3BD',
  accent: '#FFC53D',
  accentText: '#1B1730',
  good: '#4ADE80',
  bad: '#F87171',
  warn: '#FBBF24',
};

export const JUROR: Record<string, { face: string; name: string }> = {
  strict: { face: '🧐', name: 'Строгий' },
  kind: { face: '😊', name: 'Добрый' },
  skeptic: { face: '🤨', name: 'Скептик' },
};

export const TREND: Record<string, string> = { up: '↑', down: '↓', flat: '→' };

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
