// Один захват микрофона на всю сцену: живой поток на сервер и звук для видео берут один и тот же поток.
let stream: Promise<MediaStream> | null = null;
let users = 0;

export function acquireMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices) return Promise.reject(new Error('The microphone is not available on this page'));
  users += 1;
  if (!stream) {
    stream = navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    stream.catch(() => {
      stream = null;
      users = 0;
    });
  }
  return stream;
}

/** Микрофон отпускается, когда он больше никому не нужен. */
export function releaseMic() {
  users = Math.max(0, users - 1);
  if (users > 0 || !stream) return;
  stream.then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});
  stream = null;
}
