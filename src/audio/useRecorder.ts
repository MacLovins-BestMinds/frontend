import { useAudioRecorder, type AudioDataEvent } from '@siteed/audio-studio';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useRef } from 'react';

import { feedLive } from './liveFeed';

/** base64 из нативного модуля → PCM 16 бит (little-endian, как и отдаёт iOS/Android). */
function toPcm(data: AudioDataEvent['data']): Int16Array | null {
  if (data instanceof Int16Array) return data;
  if (data instanceof Float32Array) {
    const pcm = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) pcm[i] = Math.max(-1, Math.min(1, data[i])) * 0x7fff;
    return pcm;
  }
  if (typeof data !== 'string' || !data) return null;
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length - (bin.length % 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

const asFileUri = (uri: string) => (uri.startsWith('/') ? `file://${uri}` : uri);

/**
 * Приложение: запись через @siteed/audio-studio. Один микрофон даёт сразу две вещи:
 * файл AAC для разбора и куски PCM 16 кГц по 250 мс для живого потока (live.ts → WS /api/ai/live).
 * Уровень голоса считает живой поток, поэтому speaking здесь всегда undefined.
 */
export function useRecorder() {
  const studio = useAudioRecorder();
  const active = useRef(false);

  /** false — нет разрешения или запись не стартовала. */
  const start = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return false;
      await studio.startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 250,
        enableProcessing: false,
        keepAwake: true,
        showNotification: false,
        output: { primary: { enabled: true }, compressed: { enabled: true, format: 'aac', bitrate: 64000 } },
        // запись и голоса жюри идут через один динамик, громко, а не в разговорный
        ios: { audioSession: { category: 'PlayAndRecord', mode: 'Default', categoryOptions: ['DefaultToSpeaker', 'AllowBluetooth'] } },
        onAudioStream: async (e) => {
          const pcm = toPcm(e.data);
          if (pcm?.length) feedLive(pcm);
        },
      });
      active.current = true;
      return true;
    } catch (e) {
      console.warn('Recording did not start', e);
      return false;
    }
  }, [studio]);

  /** Останавливает запись и возвращает uri файла: сжатый AAC, если он получился, иначе WAV. */
  const stop = useCallback(async (): Promise<string | null> => {
    if (!active.current) return null;
    active.current = false;
    try {
      const rec = await studio.stopRecording();
      const uri = rec?.compression?.compressedFileUri || rec?.fileUri;
      return uri ? asFileUri(uri) : null;
    } catch (e) {
      console.warn('Recording did not stop', e);
      return null;
    }
  }, [studio]);

  return { start, stop, speaking: undefined as boolean | undefined };
}
