export type PitchVideoProps = {
  uri: string;
  /** На сколько секунд видео началось позже звука. */
  offset: number;
  /** Место в записи (секунды раунда) и играет ли она — видео идёт за плеером. */
  time: number;
  playing: boolean;
  /** Подпись поверх кадра — например, что в этот момент взгляд ушёл из зала. */
  note?: string;
};

/** Видеозапись выступления. В приложении её пока нет (камера не подключена) — показывать нечего. */
export function PitchVideo(_props: PitchVideoProps) {
  return null;
}
