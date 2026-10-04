import { useCallback, useRef } from 'react';

import { acquireMic, releaseMic } from './mic.web';

// Safari пишет mp4/AAC, Chrome и Firefox — webm/opus
const AUDIO_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

/**
 * Браузер: запись звука для разбора через MediaRecorder на том же потоке микрофона, что и живой анализ
 * (live.web.ts) и звук видео (capture.web.ts). Один захват микрофона на всё: в мобильном Safari второй
 * getUserMedia мог молчать или стартовать позже, и звук с видео расходились на десятки секунд.
 * Уровень голоса считает живой поток, поэтому speaking здесь всегда undefined.
 */
export function useRecorder() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const holdsMic = useRef(false);

  const letGo = () => {
    if (holdsMic.current) releaseMic();
    holdsMic.current = false;
  };

  /** false — нет разрешения или запись не стартовала. Обещание выполняется, когда запись реально пошла. */
  const start = useCallback(async (): Promise<boolean> => {
    if (recorder.current) return true;
    try {
      if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is not available');
      const stream = await acquireMic();
      holdsMic.current = true;
      const type = AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(new MediaStream(stream.getAudioTracks()), type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      await new Promise<void>((resolve, reject) => {
        rec.onstart = () => resolve();
        rec.onerror = (e) => reject(e);
        rec.start(1000);
      });
      recorder.current = rec;
      return true;
    } catch (e) {
      console.warn('Recording did not start', e);
      letGo();
      return false;
    }
  }, []);

  /** Останавливает запись и возвращает её адрес (blob:), null — записи нет. */
  const stop = useCallback(async (): Promise<string | null> => {
    const rec = recorder.current;
    recorder.current = null;
    if (!rec) return null;
    const uri = await new Promise<string | null>((resolve) => {
      if (rec.state === 'inactive') return resolve(null);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        resolve(blob.size > 0 ? URL.createObjectURL(blob) : null);
      };
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
    letGo();
    return uri;
  }, []);

  return { start, stop, speaking: undefined as boolean | undefined };
}
