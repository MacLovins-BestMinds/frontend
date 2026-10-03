import { useEffect, useState } from 'react';

/**
 * Браузер: запись с микрофона (webm) не знает своей длины — плеер видит Infinity. Перематываем
 * отдельный аудио-элемент «в бесконечность»: браузер дочитывает файл и сообщает настоящую длительность.
 */
export function useRealDuration(uri: string | null): number | null {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    setDuration(null);
    if (!uri) return;
    let dead = false;
    const audio = new Audio();
    const report = () => {
      if (!dead && Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    audio.preload = 'metadata';
    audio.ondurationchange = report;
    audio.onloadedmetadata = () => {
      if (audio.duration === Infinity) audio.currentTime = 1e101;
      else report();
    };
    audio.src = uri;
    return () => {
      dead = true;
      audio.src = '';
    };
  }, [uri]);

  return duration;
}
