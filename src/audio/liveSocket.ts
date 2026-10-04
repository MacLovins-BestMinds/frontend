import { env } from '@/config/env';

import type { LiveEvent } from './live';

const RETRY_MS = [1000, 2000, 4000, 8000]; // обрыв связи: переподключаемся всё реже, дальше — раз в 8 с
const BUSY_RETRY_MS = 20_000; // все слоты распознавания заняты — пробуем снова, вдруг кто-то закончил
const TRY_AGAIN_LATER = 1013;
const NORMAL = 1000;

export type LiveSocket = { send: (pcm: ArrayBuffer) => void; close: () => void };

/**
 * WS /api/ai/live с переподключением. Сервер держит состояние раунда по round_id, поэтому после обрыва время
 * и паразиты продолжаются с того же места. Слотов распознавания на сервере мало: если он ответил «заняты» (1013),
 * зал пока реагирует только на голос и тишину, а сокет раз в 20 с пробует снова. Куски, пришедшие без связи, теряются.
 */
export function openLiveSocket(roundId: string, pace: string, maxSec: number | undefined, onEvent: (e: LiveEvent) => void): LiveSocket {
  const query = `round_id=${encodeURIComponent(roundId)}&pace=${pace}${maxSec ? `&max_sec=${Math.round(maxSec)}` : ''}`;
  const url = env.apiUrl.replace(/\/$/, '').replace(/^http/, 'ws') + `/api/ai/live?${query}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    const socket = new WebSocket(url);
    ws = socket;
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => {
      failures = 0;
    };
    socket.onmessage = (m) => {
      try {
        onEvent(JSON.parse(m.data as string) as LiveEvent);
      } catch {
        // не JSON — пропускаем
      }
    };
    socket.onclose = (e) => {
      if (closed || ws !== socket) return;
      ws = null;
      // сервер закрыл штатно (вышел лимит времени) или распознавание не настроено — не повторяем
      if (e.code === NORMAL || e.reason === 'speech service is not configured') return;
      const wait = e.code === TRY_AGAIN_LATER ? BUSY_RETRY_MS : RETRY_MS[Math.min(failures, RETRY_MS.length - 1)];
      if (e.code === TRY_AGAIN_LATER) console.info('Live recognition is busy — the room reacts to your voice only for now');
      failures += 1;
      timer = setTimeout(connect, wait);
    };
  };
  connect();

  return {
    send: (pcm) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(pcm);
    },
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
      ws = null;
    },
  };
}
