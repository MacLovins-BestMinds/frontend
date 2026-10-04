import { forwardRef } from 'react';

import type { PitchPlayerHandle, PlayerMark } from './PitchPlayer';

export type PitchVideoProps = {
  uri: string;
  /** На сколько секунд видео началось позже раунда: время раунда = время видео + offset. */
  offset: number;
  fallbackDuration: number;
  marks: PlayerMark[];
  /** Подписи поверх кадра на отрезках раунда — например, когда взгляд ушёл из зала. */
  notes?: { from: number; to: number; text: string }[];
  /** Видео заиграло — можно остановить другой плеер. */
  onPlay?: () => void;
};

/** Видеозапись выступления. В приложении её пока нет (камера не подключена) — показывать нечего. */
export const PitchVideo = forwardRef<PitchPlayerHandle, PitchVideoProps>(function PitchVideo() {
  return null;
});
