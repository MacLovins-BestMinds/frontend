import { requestRecordingPermissionsAsync } from 'expo-audio';

/**
 * Спросить разрешение на микрофон заранее, до кнопки Start на сцене, чтобы системное окно не съедало
 * начало питча. Приложение: только разрешение, запись потом откроет рекордер. В браузере — micAccess.web.ts.
 * Возвращает, разрешён ли микрофон, и функцию, которую вызвать, когда микрофон больше не нужно держать.
 */
export async function prepareMic(): Promise<{ ok: boolean; release: () => void }> {
  try {
    const { granted } = await requestRecordingPermissionsAsync();
    return { ok: granted, release: () => {} };
  } catch {
    return { ok: false, release: () => {} };
  }
}
