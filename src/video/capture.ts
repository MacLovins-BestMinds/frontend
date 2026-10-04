import type { GazePoint } from '@/api/types';

import type { FaceAngles, NativeCameraSession } from './nativeCamera';

export type CaptureResult = {
  /** Видеозапись выступления; null — камеры нет или запись не получилась. */
  videoUri: string | null;
  /** На сколько секунд видео началось позже звука: место в видео = время раунда − offset. */
  videoOffset: number;
  /** Смены взгляда «в зал / мимо»; пусто — взгляд не измерялся. */
  gaze: GazePoint[];
};

export type Capture = { stop: () => Promise<CaptureResult> };

export type CaptureOptions = {
  /** Секунды от начала раунда — в этих же секундах идёт запись звука и события разбора. */
  clock: () => number;
  /** Смотрит ли игрок в зал прямо сейчас — по этому зал реагирует вживую. */
  onLook: (on: boolean) => void;
};

// лицо повёрнуто к телефону, если голова отвёрнута не больше чем на 15° по обеим осям (ТЗ)
const LOOK_DEG = 15;
// столько кадров подряд должно подтвердить смену взгляда — одиночный сбой детектора не считаем
const CONFIRM_FRAMES = 3;
const STOP_TIMEOUT_MS = 5000;

const looking = (face: FaceAngles) => !!face && Math.abs(face.yaw) <= LOOK_DEG && Math.abs(face.pitch) <= LOOK_DEG;

/**
 * Приложение: пишем видео с камеры без звука (звук пишет рекордер сцены) и следим за взглядом
 * по детектору лица. Видео остаётся на телефоне для разбора, на бэкенд уходят только смены взгляда.
 */
export function startCapture(session: NativeCameraSession, _stream: null, { clock, onLook }: CaptureOptions): Capture {
  const gaze: GazePoint[] = [];
  let on: boolean | null = null;
  let candidate: boolean | null = null;
  let streak = 0;
  const unsubscribe = session.onFace((face) => {
    const now = looking(face);
    if (now === on) {
      candidate = null;
      streak = 0;
      return;
    }
    if (now !== candidate) {
      candidate = now;
      streak = 0;
    }
    streak += 1;
    if (streak < CONFIRM_FRAMES && on !== null) return;
    on = now;
    candidate = null;
    streak = 0;
    gaze.push({ t: Math.round(clock() * 10) / 10, on: now });
    onLook(now);
  });

  let videoOffset = 0;
  let finished: (path: string | null) => void = () => {};
  const file = new Promise<string | null>((resolve) => (finished = resolve));
  const recorder = session.video
    .createRecorder({})
    .then(async (r) => {
      await r.startRecording(
        (path) => finished(path),
        (e) => {
          console.warn('Video recording failed', e);
          finished(null);
        },
      );
      videoOffset = clock();
      return r;
    })
    .catch((e) => {
      console.warn('Video recording did not start', e);
      finished(null);
      return null;
    });

  return {
    stop: async () => {
      unsubscribe();
      const r = await recorder;
      if (r?.isRecording) {
        // точнее всего начало видео видно с конца: сейчас минус реально записанная длина.
        // Момент выхода из startRecording опережает первый записанный кадр на сотни мс
        const recorded = r.recordedDuration;
        if (recorded > 0) videoOffset = Math.max(0, clock() - recorded);
        await r.stopRecording().catch((e) => console.warn('Video recording did not stop', e));
      }
      else if (r) finished(r.filePath || null);
      // ждём, пока файл допишется, но не вечно
      const path = await Promise.race([file, new Promise<null>((resolve) => setTimeout(() => resolve(null), STOP_TIMEOUT_MS))]);
      return { videoUri: path ? (path.startsWith('file://') ? path : `file://${path}`) : null, videoOffset, gaze };
    },
  };
}
