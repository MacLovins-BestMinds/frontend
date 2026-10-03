import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

const TAG = 'stage-zero';

/**
 * Экран не гаснет, пока смонтирован компонент. Вместо useKeepAwake: тот в браузере
 * бросает необработанную ошибку при размонтировании, если wake lock не успел включиться.
 */
export function useStayAwake() {
  useEffect(() => {
    const activated = activateKeepAwakeAsync(TAG).then(
      () => true,
      () => false,
    );
    return () => {
      activated
        .then(async (ok) => {
          if (ok) await deactivateKeepAwake(TAG);
        })
        .catch(() => {});
    };
  }, []);
}
