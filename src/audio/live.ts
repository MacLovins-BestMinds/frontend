export type LiveEvent =
  | { type: 'filler'; t: number; word: string; burst: boolean }
  | { type: 'long_pause'; t: number; duration: number }
  | { type: 'pace'; t: number; wpm: number; verdict: 'fast' | 'slow' }
  /** Раз в несколько секунд: насколько последние слова по теме и по делу (0–100) и подсказка на экран. */
  | { type: 'content'; t: number; score: number; comment: string }
  /** Игрок выругался. */
  | { type: 'profanity'; t: number; word: string };

export type LiveHandlers = {
  /** Событие от бэкенда: паразит, долгая пауза, темп, оценка содержания. */
  onEvent: (e: LiveEvent) => void;
  /** Звучит ли сейчас голос — приходит несколько раз в секунду, по нему зал понимает, что ты молчишь. */
  onVoice: (speaking: boolean) => void;
};

/**
 * Живой поток звука в WS /api/ai/live. В приложении ещё не подключён (нужен @siteed/audio-studio
 * и development build) — возвращаем пустую остановку. В браузере работает live.web.ts.
 */
export function startLive(_roundId: string | null, _handlers: LiveHandlers, _pace: 'slow' | 'normal' | 'fast' = 'normal'): () => void {
  return () => {};
}

export const liveSupported = false;
