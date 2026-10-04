import { acquireMic, releaseMic } from './mic.web';

/**
 * Браузер: захватываем общий поток микрофона заранее (здесь браузер и спрашивает разрешение) и держим его,
 * пока рекордер и живой поток не возьмут тот же поток. release — отпустить свою долю.
 */
export async function prepareMic(): Promise<{ ok: boolean; release: () => void }> {
  try {
    await acquireMic();
  } catch {
    return { ok: false, release: () => {} };
  }
  let held = true;
  return {
    ok: true,
    release: () => {
      if (held) releaseMic();
      held = false;
    },
  };
}
