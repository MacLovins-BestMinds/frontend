import { setLiveSink } from './liveFeed';
import { openLiveSocket } from './liveSocket';

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

// те же пороги, что в браузере (live.web.ts), только на PCM 16 бит
const VOICE_MIN_RMS = 0.012;
const VOICE_OVER_NOISE = 3;
const FRAME = 320; // 20 мс при 16 кГц
const NOISE_WINDOW = 12;

/**
 * Приложение: куски PCM 16 кГц, моно, 16 бит приходят от рекордера сцены (useRecorder → liveFeed).
 * Громкость каждого куска говорит залу, звучит ли голос (onVoice), а сами куски уходят в WS /api/ai/live,
 * откуда приходят события. roundId = null — без сокета (моки). Запись должна быть запущена рекордером.
 */
export function startLive(
  roundId: string | null,
  { onEvent, onVoice }: LiveHandlers,
  pace: 'slow' | 'normal' | 'fast' = 'normal',
  maxSec?: number,
): () => void {
  const quietest: number[] = [];
  // сокет переподключается сам; null — без сокета (моки)
  const ws = roundId ? openLiveSocket(roundId, pace, maxSec, onEvent) : null;

  setLiveSink((pcm) => {
    let sum = 0;
    let quiet = Infinity;
    const frames = Math.floor(pcm.length / FRAME);
    for (let f = 0; f < frames; f++) {
      let frame = 0;
      for (let i = f * FRAME; i < (f + 1) * FRAME; i++) {
        const v = pcm[i] / 0x8000;
        frame += v * v;
      }
      sum += frame;
      quiet = Math.min(quiet, Math.sqrt(frame / FRAME));
    }
    if (frames > 0) {
      const rms = Math.sqrt(sum / (frames * FRAME));
      quietest.push(quiet);
      if (quietest.length > NOISE_WINDOW) quietest.shift();
      onVoice(rms > Math.max(VOICE_MIN_RMS, Math.min(...quietest) * VOICE_OVER_NOISE));
    }
    if (!ws) return;
    // копия — ровно свой кусок: Int16Array может смотреть в больший буфер
    ws.send(pcm.slice().buffer);
  });

  return () => {
    setLiveSink(null);
    ws?.close();
  };
}

export const liveSupported = true;
