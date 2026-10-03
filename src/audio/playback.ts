import { createAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

export type Playback = { stop: () => void };

/**
 * Проигрывает mp3 по url. Браузер может запретить автовоспроизведение без жеста пользователя —
 * тогда вызывается onBlocked (показать кнопку «Прослушать»), а не падает необработанная ошибка.
 */
export function playUrl(url: string, onBlocked: () => void): Playback {
  if (Platform.OS === 'web') {
    const audio = new Audio(url);
    audio.play().catch(onBlocked);
    return {
      stop: () => {
        audio.pause();
        audio.src = '';
      },
    };
  }
  const player = createAudioPlayer(url);
  try {
    player.play();
  } catch {
    onBlocked();
  }
  return { stop: () => player.remove() };
}
