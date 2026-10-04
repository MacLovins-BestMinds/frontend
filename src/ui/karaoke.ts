// Плавные часы для подсветки текста по буквам. Плеер сообщает время 10–20 раз в секунду, а заливке букв
// нужен каждый кадр: между сообщениями время достраивается само (requestAnimationFrame), а мелкое дрожание
// назад не показывается — подсветка не дёргается. Перемотку (большой скачок) часы принимают сразу.

const MAX_AHEAD_SEC = 0.35; // дальше последнего сообщения плеера не убегаем — вдруг он встал
const JITTER_SEC = 0.15; // назад на столько — это дрожание отчёта, а не перемотка

export type SmoothClock = {
  /** Новое время от плеера (секунды записи) и играет ли он. */
  set: (time: number, playing: boolean) => void;
  /** Время для текущего кадра. */
  get: () => number;
  /** Подсветка включена: запись играет или уже где-то стоит. До первого запуска текст просто читается. */
  engaged: () => boolean;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function createSmoothClock(): SmoothClock {
  let anchor = 0; // последнее время от плеера
  let at = now(); // когда оно пришло
  let playing = false;
  let shown = 0; // что показали в прошлом кадре
  let frame: ReturnType<typeof requestAnimationFrame> | null = null;
  const listeners = new Set<() => void>();

  const compute = () => (playing ? Math.min(anchor + (now() - at) / 1000, anchor + MAX_AHEAD_SEC) : anchor);
  const emit = () => listeners.forEach((l) => l());
  const tick = () => {
    shown = Math.max(shown, compute());
    emit();
    frame = playing ? requestAnimationFrame(tick) : null;
  };

  return {
    set(time, isPlaying) {
      const jitter = isPlaying && playing && time < shown && shown - time < JITTER_SEC;
      anchor = jitter ? shown : time;
      at = now();
      if (!jitter) shown = time;
      playing = isPlaying;
      if (playing && frame === null) frame = requestAnimationFrame(tick);
      if (!playing) emit();
    },
    get: () => shown,
    engaged: () => playing || shown > 0,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      listeners.clear();
    },
  };
}

/** Насколько залита каждая буква слова (0–1): по таймкодам букв, а без них — равномерно по длине слова. */
export function charProgress(time: number, length: number, t: number, tEnd: number, chars?: number[] | null): number[] {
  const end = Math.max(tEnd, t + 0.05);
  const starts = chars && chars.length === length ? chars : Array.from({ length }, (_, i) => t + ((end - t) * i) / length);
  return starts.map((s, i) => {
    const e = Math.max(i + 1 < length ? starts[i + 1] : end, s + 0.03);
    return Math.max(0, Math.min(1, (time - s) / (e - s)));
  });
}

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;

/** Цвет между двумя (#rrggbb) с плавным входом и выходом. */
export function mix(from: string, to: string, p: number): string {
  const e = p * p * (3 - 2 * p); // smoothstep
  const a = hex(from);
  const b = hex(to);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * e)).join(',')})`;
}
