import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

const VOICE_DB = -38; // громче — считаем, что звучит голос

/**
 * Запись в файл m4a/AAC через expo-audio.
 * Живой поток PCM в WS /api/ai/live (@siteed/audio-studio) сюда ещё не подключён.
 */
export function useRecorder() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const { metering, isRecording } = useAudioRecorderState(recorder, 250);
  const active = useRef(false);
  /** Звучит ли голос, по уровню записи. undefined — уровня нет; в браузере его даёт живой поток (live.web.ts). */
  const speaking = Platform.OS !== 'web' && isRecording && typeof metering === 'number' ? metering > VOICE_DB : undefined;

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
      console.warn('Recording did not start', e);
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
      console.warn('Recording did not stop', e);
      return null;
    }
  }, [recorder]);

  return { start, stop, speaking };
}
