import type { FlowMoment, TimelineEvent } from '@/api/types';
import { translate } from '@/i18n';

import { momentName, toneColor } from './ThoughtFlow';
import { MARK, markName } from './Transcript';

/** Что за ошибка в отрезке: название, слово или цитата, цвет отметки. */
export type ReelItem = { title: string; detail?: string; color: string };
/** Отрезок нарезки в секундах записи; rank — насколько важно его показать. */
export type ReelSegment = { from: number; to: number; items: ReelItem[]; rank: number };

const PAD_SEC = 1.5; // столько до ошибки и после неё
const LONG_SEC = 6; // длинная пауза или взгляд мимо зала — не дольше этого
const MOMENT_SEC = 8; // момент хода мысли — от начала, но не дольше
const MERGE_GAP_SEC = 0.3;
const MAX_SEGMENTS = 12;

// ошибок больше, чем влезает в нарезку, — оставляем важные; удачная пауза — не ошибка, её здесь нет
const RANK: Partial<Record<TimelineEvent['type'], number>> = { profanity: 7, repeat: 5, filler: 4, long_pause: 3, hesitation: 3, gaze_off: 2, pace: 1 };
const FLOW_RANK = 6;

/** Число из подписи события; сервер пишет его и с запятой. */
const seconds = (text: string) => Number((text.match(/\d+([.,]\d+)?/)?.[0] ?? '0').replace(',', '.'));
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function eventSpan(e: TimelineEvent): [number, number] {
  // у паузы, заминки и взгляда t — начало, а в подписи — длительность
  if (e.type === 'long_pause' || e.type === 'hesitation' || e.type === 'gaze_off') {
    const n = seconds(e.text);
    return [e.t - PAD_SEC, e.t + Math.min(n > 0 ? n : PAD_SEC, LONG_SEC) + 1];
  }
  // темп — отрезок речи, t — его начало
  if (e.type === 'pace') return [e.t - PAD_SEC, e.t + 2 * PAD_SEC];
  return [e.t - PAD_SEC, e.t + PAD_SEC];
}

/**
 * Нарезка факапов: только проблемные места — ошибки речи и провалы хода мысли — по паре секунд вокруг каждого.
 * Пересекающиеся отрезки склеиваются, всего не больше 12 — важные остаются, порядок по времени.
 */
export function buildReel(events: TimelineEvent[], moments: FlowMoment[], duration: number): ReelSegment[] {
  const end = duration > 0 ? duration : Infinity;
  const raw: ReelSegment[] = [];
  const add = (from: number, to: number, item: ReelItem, rank: number) => {
    const a = Math.max(0, from);
    const b = Math.min(end, to);
    if (b - a >= 0.5) raw.push({ from: a, to: b, items: [item], rank });
  };
  for (const e of events) {
    const rank = RANK[e.type];
    if (!rank) continue;
    const [from, to] = eventSpan(e);
    add(from, to, { title: capital(markName(e.type)), detail: e.text, color: MARK[e.type].color }, rank);
  }
  for (const m of moments) {
    if (m.tone !== 'bad') continue;
    const [from, to] = m.end > m.t ? [m.t, Math.min(m.end, m.t + MOMENT_SEC)] : [m.t - PAD_SEC, m.t + PAD_SEC];
    add(from, to, { title: momentName(m.kind), detail: m.quote ? translate('insights', 'quote', { text: m.quote }) : undefined, color: toneColor(m.tone) }, FLOW_RANK);
  }

  raw.sort((a, b) => a.from - b.from);
  const merged: ReelSegment[] = [];
  for (const s of raw) {
    const last = merged[merged.length - 1];
    if (last && s.from <= last.to + MERGE_GAP_SEC) {
      last.to = Math.max(last.to, s.to);
      last.items.push(...s.items);
      last.rank = Math.max(last.rank, s.rank);
    } else merged.push(s);
  }
  if (merged.length <= MAX_SEGMENTS) return merged;
  return merged
    .slice()
    .sort((a, b) => b.rank - a.rank || b.items.length - a.items.length || a.from - b.from)
    .slice(0, MAX_SEGMENTS)
    .sort((a, b) => a.from - b.from);
}
