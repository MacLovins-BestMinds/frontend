import type { Capture, CaptureOptions, CaptureResult } from './capture';

export type { Capture, CaptureOptions, CaptureResult } from './capture';

const VIDEO_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
const VIDEO_BITS = 700_000; // три минуты ≈ 16 МБ — запись остаётся в памяти вкладки

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
  const type = VIDEO_TYPES.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
  const record = (audio: MediaStream | null) => {
    if (stopped || typeof MediaRecorder === 'undefined') return audio?.getTracks().forEach((t) => t.stop());
    mic = audio;
    try {
      recorder = new MediaRecorder(new MediaStream([...stream.getVideoTracks(), ...(audio?.getAudioTracks() ?? [])]), {
        mimeType: type,
        videoBitsPerSecond: VIDEO_BITS,
      });
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.start(1000);
      videoOffset = clock();
    } catch (e) {
      console.warn('The video recording did not start', e);
      recorder = null;
    }
  };
  // звук для видео — свой поток с микрофона; не дали — пишем без звука
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(record)
    .catch(() => record(null));

  const stop = () =>
    new Promise<CaptureResult>((resolve) => {
      stopped = true;
      const done = (videoUri: string | null) => {
        mic?.getTracks().forEach((t) => t.stop());
        resolve({ videoUri, videoOffset, gaze: [] });
      };
      if (!recorder || recorder.state === 'inactive') return done(null);
      recorder.onstop = () => done(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder?.mimeType || 'video/webm' })) : null);
      recorder.stop();
    });

  return { stop };
}
