/**
 * Напоминание с подготовки, браузер. Игрок ищет материал в соседних вкладках — когда время подходит к концу,
 * он получает уведомление системы, слышит короткий сигнал, а заголовок вкладки мигает, пока он не вернётся.
 */
import type { AlarmPermission } from './alarm';

const supported = () => typeof Notification !== 'undefined';
let sound: AudioContext | null = null;

export function alarmPermission(): AlarmPermission {
  return supported() ? Notification.permission : 'unsupported';
}

/** Звук включается только после жеста пользователя: создаём контекст заранее, по нажатию. */
export function unlockSound() {
  try {
    sound = sound ?? new AudioContext();
    void sound.resume();
  } catch {
    sound = null;
  }
}

/** Вызывать по нажатию кнопки: браузеры спрашивают про уведомления только после жеста. */
export async function enableAlarm(): Promise<AlarmPermission> {
  unlockSound();
  if (!supported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Игрок не на вкладке: она скрыта (другая вкладка, свёрнутый браузер) и не в фокусе. */
export function isAway(): boolean {
  return typeof document !== 'undefined' && document.hidden && !document.hasFocus();
}

/** Вызывает cb, когда игрок вернулся на вкладку. Возвращает отписку. */
export function onReturn(cb: () => void): () => void {
  const shown = () => {
    if (!document.hidden) cb();
  };
  // фокус окна — точно вернулся, даже если браузер ещё не обновил visibility
  document.addEventListener('visibilitychange', shown);
  window.addEventListener('focus', cb);
  return () => {
    document.removeEventListener('visibilitychange', shown);
    window.removeEventListener('focus', cb);
  };
}

/** Два коротких тона; звук недоступен — молча пропускаем. */
function beep() {
  if (!sound) return;
  const start = sound.currentTime;
  [880, 660].forEach((hz, i) => {
    const osc = sound!.createOscillator();
    const gain = sound!.createGain();
    osc.frequency.value = hz;
    const at = start + i * 0.22;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(gain).connect(sound!.destination);
    osc.start(at);
    osc.stop(at + 0.21);
  });
}

/**
 * Позвать игрока. Он на вкладке — только сигнал; ушёл — ещё уведомление системы (нажатие возвращает на вкладку)
 * и мигающий заголовок. Всё убирается само, когда игрок вернулся; возвращает функцию, чтобы убрать раньше.
 */
export function ring(title: string, body: string): () => void {
  beep();
  if (!isAway()) return () => {};
  let note: Notification | null = null;
  if (supported() && Notification.permission === 'granted') {
    try {
      // один tag: «осталась минута» заменяется на «время вышло», а не копится стопкой
      note = new Notification(title, { body, tag: 'stager-prep', requireInteraction: true, icon: '/favicon.ico' });
      note.onclick = () => {
        window.focus();
        note?.close();
      };
    } catch {
      note = null; // на телефоне уведомления создаются только через service worker
    }
  }
  const original = document.title;
  let lit = false;
  const flash = setInterval(() => {
    lit = !lit;
    document.title = lit ? `⏰ ${title}` : original;
  }, 1000);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(flash);
    document.title = original;
    note?.close();
    unsubscribe();
  };
  const unsubscribe = onReturn(stop);
  return stop;
}
