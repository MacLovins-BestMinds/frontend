import { env } from '@/config/env';

import type { LiveEvent, LiveHandlers } from './live';
import { acquireMic, releaseMic } from './mic.web';

export type { LiveEvent, LiveHandlers } from './live';

const SAMPLE_RATE = 16000;
const CHUNK = 4096; // ≈ 256 мс при 16 кГц
const VOICE_MIN_RMS = 0.012; // тише — точно не речь (шумоподавление браузера включено)
const VOICE_OVER_NOISE = 3; // голос — когда звук втрое громче фона
const FRAME = 320; // 20 мс: в речи такие короткие провалы есть всегда (смычки, стыки слов), в шуме — нет
const NOISE_WINDOW = 12; // фон — самый тихий кадр за последние ≈3 с

/**
 * Браузер: слушаем микрофон. Громкость каждого куска говорит залу, звучит ли голос (onVoice), а сами куски
 * PCM 16 кГц, моно, 16 бит уходят в WS /api/ai/live, откуда приходят события (паразит, долгая пауза, темп).
 * roundId = null — без сокета (моки): зал реагирует только на голос. Возвращает функцию остановки.
 */
export function startLive(roundId: string | null, { onEvent, onVoice }: LiveHandlers): () => void {
  let stopped = false;
  let ctx: AudioContext | null = null;
  let holdsMic = true;
  const quietest: number[] = []; // самый тихий кадр каждого из последних кусков
  let ws: WebSocket | null = null;
  if (roundId) {
    const url = env.apiUrl.replace(/\/$/, '').replace(/^http/, 'ws') + `/api/ai/live?round_id=${encodeURIComponent(roundId)}`;
    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (m) => {
      try {
        onEvent(JSON.parse(m.data as string) as LiveEvent);
      } catch {
        // не JSON — пропускаем
      }
    };
  }

  acquireMic()
    .then((s) => {
      if (stopped) return;
      ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const source = ctx.createMediaStreamSource(s);
      const node = ctx.createScriptProcessor(CHUNK, 1, 1);
      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        let sum = 0;
        let quiet = Infinity;
        for (let from = 0; from + FRAME <= input.length; from += FRAME) {
          let frame = 0;
          for (let i = from; i < from + FRAME; i++) frame += input[i] * input[i];
          sum += frame;
          quiet = Math.min(quiet, Math.sqrt(frame / FRAME));
        }
        const rms = Math.sqrt(sum / (Math.floor(input.length / FRAME) * FRAME));
        // фон берём по самым тихим кадрам: сколько бы человек ни говорил без остановки, фон не «дорастает» до речи
        quietest.push(quiet);
        if (quietest.length > NOISE_WINDOW) quietest.shift();
        onVoice(rms > Math.max(VOICE_MIN_RMS, Math.min(...quietest) * VOICE_OVER_NOISE));
        if (ws?.readyState !== WebSocket.OPEN) return;
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        ws.send(pcm.buffer);
      };
      source.connect(node);
      node.connect(ctx.destination);
    })
    .catch((e) => {
      holdsMic = false;
      console.warn('The live audio stream did not start', e);
    });

  return () => {
    stopped = true;
    if (holdsMic) releaseMic();
    holdsMic = false;
    ctx?.close().catch(() => {});
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
  };
}

export const liveSupported = true;
