/**
 * Напоминание с подготовки, приложение. Уведомлений системы здесь пока нет — для них нужен expo-notifications
 * и новая сборка; пока игрок в приложении, напоминает вибрация, а сцена ждёт, когда он вернётся.
 * В браузере работает alarm.web.ts.
 */
import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';

export type AlarmPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function alarmPermission(): AlarmPermission {
  return 'unsupported';
}

export function unlockSound() {}

export async function enableAlarm(): Promise<AlarmPermission> {
  return 'unsupported';
}

export function isAway(): boolean {
  return AppState.currentState !== 'active';
}

export function onReturn(cb: () => void): () => void {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') cb();
  });
  return () => sub.remove();
}

export function ring(_title: string, _body: string): () => void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  return () => {};
}
