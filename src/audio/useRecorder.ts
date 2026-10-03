import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useRef } from 'react';

/**
 * Запись в файл m4a/AAC через expo-audio.
 * Живой поток PCM в WS /api/ai/live (@siteed/audio-studio) сюда ещё не подключён.
 */
export function useRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const active = useRef(false);

  /** false — нет разрешения или запись не стартовала. */
  const start = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      active.current = true;
      return true;
    } catch (e) {
      console.warn('Запись не стартовала', e);
      return false;
    }
  }, [recorder]);

  /** Останавливает запись и возвращает uri файла. */
  const stop = useCallback(async (): Promise<string | null> => {
    if (!active.current) return null;
    active.current = false;
    try {
      await recorder.stop();
      return recorder.uri;
    } catch (e) {
      console.warn('Запись не остановилась', e);
      return null;
    }
  }, [recorder]);

  return { start, stop };
}
