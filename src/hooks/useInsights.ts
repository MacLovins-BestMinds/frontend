import { useEffect, useState } from 'react';

import { api } from '@/api/client';
import type { BetterVersion, Flow } from '@/api/types';

const POLL_MS = 3000;
const GIVE_UP_MS = 3 * 60 * 1000;
const MAX_ERRORS = 5; // подряд: сервер лежит — не крутим ожидание все три минуты

/**
 * Что пришло с сервера: waiting — ещё готовится (показываем ожидание), ready — готово,
 * none — не вышло, не умеет или не дождались (тихая строка). data — последний ответ, в нём может быть reason.
 */
export type Polled<T> = { state: 'waiting' | 'ready' | 'none'; data: T | null };

type Job = { status: string };

/** Ответ уже окончательный — опрашивать больше незачем; pending и пусто — null. */
function settled<T extends Job>(data: T | null | undefined): Polled<T> | null {
  if (!data || data.status === 'pending') return null;
  return { state: data.status === 'ready' ? 'ready' : 'none', data };
}

/**
 * Опрос фоновой задачи сервера: каждые 3 с, пока status — pending; любой другой ответ — конец.
 * Через 3 минуты сдаёмся, при уходе с экрана перестаём. Готовый ответ (из истории) не опрашиваем вовсе.
 */
function usePolled<T extends Job>(roundId: string | null, load: (roundId: string) => Promise<T>, initial: T | null): Polled<T> {
  const [polled, setPolled] = useState<Polled<T>>(() => settled(initial) ?? { state: roundId ? 'waiting' : 'none', data: null });

  useEffect(() => {
    const ready = settled(initial);
    if (ready || !roundId) {
      setPolled(ready ?? { state: 'none', data: null });
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let errors = 0;
    const deadline = Date.now() + GIVE_UP_MS;
    setPolled({ state: 'waiting', data: null });

    const tick = async () => {
      let next: T | null = null;
      try {
        next = await load(roundId);
        errors = 0;
      } catch (e) {
        // 4xx — раунда нет или сервер такого не умеет: ждать бесполезно; сеть и 5xx — пробуем ещё
        errors += 1;
        if (/^4\d\d/.test((e as Error).message) || errors >= MAX_ERRORS) {
          if (alive) setPolled({ state: 'none', data: null });
          return;
        }
      }
      if (!alive) return;
      const done = settled(next);
      if (done) return setPolled(done);
      if (Date.now() + POLL_MS > deadline) return setPolled({ state: 'none', data: next });
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [roundId, initial, load]);

  return polled;
}

/**
 * Ход мысли и «питч без запинок» для разбора. Оба готовятся на сервере в фоне после выступления:
 * разбор открывается сразу, а карточки подтягиваются, когда задачи готовы. У раунда из истории они могут прийти готовыми.
 */
export function useReviewInsights(roundId: string | null, flow: Flow | null, better: BetterVersion | null) {
  return {
    flow: usePolled(roundId, api.flow, flow),
    better: usePolled(roundId, api.betterVersion, better),
  };
}
