import type { GazePoint } from '@/api/types';

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

/**
 * Видеозапись выступления и слежение за взглядом. В приложении ещё не подключено: нужны react-native-vision-camera
 * и её детектор лица на ML Kit (yawAngle / pitchAngle), сборка development build — пока возвращаем пустой результат.
 * В браузере capture.web.ts пишет только видео, взгляд там не измеряется.
 */
export function startCapture(_video: unknown, _stream: unknown, _options: CaptureOptions): Capture {
  return { stop: async () => ({ videoUri: null, videoOffset: 0, gaze: [] }) };
}
