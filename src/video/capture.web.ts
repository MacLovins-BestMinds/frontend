import { acquireMic, releaseMic } from '@/audio/mic.web';

import type { Capture, CaptureOptions, CaptureResult } from './capture';

export type { Capture, CaptureOptions, CaptureResult } from './capture';

// H.264 кодируется видеокартой и почти не грузит процессор; VP8 — запасной вариант, VP9 самый тяжёлый
const VIDEO_TYPES = ['video/webm;codecs=h264,opus', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
const VIDEO_BITS = 700_000; // три минуты ≈ 16 МБ — запись остаётся в памяти вкладки
const KEYFRAME_MS = 1000; // ключевой кадр раз в секунду — перемотка в разборе срабатывает сразу

/**
 * Браузер: пишем видео с камеры (со звуком). Запись остаётся в браузере и показывается в разборе.
 * Взгляд в браузере не измеряется (gaze пустой, onLook не вызывается) — его даёт детектор лица на ML Kit в приложении.
 */
export function startCapture(_video: HTMLVideoElement, stream: MediaStream, { clock }: CaptureOptions): Capture {
  let stopped = false;
  let recorder: MediaRecorder | null = null;
  let mic: MediaStream | null = null;
  let videoOffset = 0;
  const chunks: Blob[] = [];
  const dropMic = () => {
    if (mic) releaseMic();
    mic = null;
  };
  const type = VIDEO_TYPES.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
  const record = (audio: MediaStream | null) => {
    mic = audio;
    if (stopped || typeof MediaRecorder === 'undefined') return dropMic();
    try {
      recorder = new MediaRecorder(new MediaStream([...stream.getVideoTracks(), ...(audio?.getAudioTracks() ?? [])]), {
        mimeType: type,
        videoBitsPerSecond: VIDEO_BITS,
        videoKeyFrameIntervalDuration: KEYFRAME_MS,
      } as MediaRecorderOptions);
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.start(1000);
      videoOffset = clock();
    } catch (e) {
      console.warn('The video recording did not start', e);
      recorder = null;
    }
  };
  // звук для видео — тот же поток микрофона, что слушает живой анализ; не дали — пишем без звука
  acquireMic()
    .then(record)
    .catch(() => record(null));

  const stop = () =>
    new Promise<CaptureResult>((resolve) => {
      stopped = true;
      const done = (videoUri: string | null) => {
        dropMic();
        resolve({ videoUri, videoOffset, gaze: [] });
      };
      if (!recorder || recorder.state === 'inactive') return done(null);
      recorder.onstop = () => done(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder?.mimeType || 'video/webm' })) : null);
      recorder.stop();
    });

  return { stop };
}
