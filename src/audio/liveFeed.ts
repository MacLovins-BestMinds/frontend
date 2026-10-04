// Приложение: микрофон один, и его держит рекордер сцены (useRecorder). Куски PCM, которые он пишет,
// он же отдаёт сюда, а живой поток (live.ts) забирает их отсюда. Так файл и поток идут с одной записи.

type Sink = (pcm: Int16Array) => void;

let sink: Sink | null = null;

/** Кто сейчас слушает куски PCM 16 кГц, моно, 16 бит; null — никто. */
export function setLiveSink(next: Sink | null) {
  sink = next;
}

export function feedLive(pcm: Int16Array) {
  sink?.(pcm);
}
