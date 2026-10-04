import { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Delivery, TimelineEvent } from '@/api/types';
import { c, font, formatTime } from '@/design/theme';

import { PitchPlayer, type PitchPlayerHandle } from './PitchPlayer';
import { Card, H3, Small } from './primitives';

export const MARK: Record<TimelineEvent['type'], { color: string; name: string }> = {
  filler: { color: c.markFiller, name: 'filler word' },
  repeat: { color: c.markRepeat, name: 'repeat' },
  profanity: { color: c.markSwear, name: 'swearing' },
  long_pause: { color: c.markPause, name: 'pause mid-phrase' },
  hesitation: { color: c.markPause, name: 'hesitation' },
  pace: { color: c.markPace, name: 'pace' },
  gaze_off: { color: c.markGaze, name: 'looking away' },
  good_pause: { color: c.markPause, name: 'pause' },
};
const LEGEND = ['filler', 'repeat', 'long_pause', 'pace'] as const;

/**
 * Кусок транскрипта: обычный текст, отмеченное место (паразит, повтор) или значок между словами (пауза, темп).
 * from/to — место куска в транскрипте; у значка их нет.
 */
type Piece = { from: number; to: number; event?: TimelineEvent; badge?: string; before?: string; after?: string };

/** Подпись значка между словами: «… 3.6 s …» для паузы, «fast · 196/min» для темпа, «eyes away · 4 s» для взгляда. */
function badge(e: TimelineEvent): string {
  const n = e.text.match(/\d+(\.\d+)?/)?.[0] ?? '';
  if (e.type === 'gaze_off') return `eyes away · ${n} s`;
  if (e.type === 'pace') return `${e.text.includes('fast') ? 'fast' : 'slow'} · ${n}/min`;
  return `… ${n} s …`;
}

/** Все ошибки прямо в тексте: бэкенд отдаёт место каждой (start/end в символах транскрипта). */
function markTranscript(transcript: string, events: TimelineEvent[]): Piece[] {
  const placed = events
    .filter((e) => typeof e.start === 'number' && typeof e.end === 'number')
    .sort((a, b) => a.start! - b.start! || a.end! - b.end!);
  const pieces: Piece[] = [];
  let at = 0;
  for (const e of placed) {
    const start = Math.min(e.start!, transcript.length);
    const end = Math.min(e.end!, transcript.length);
    if (end > start && start < at) continue; // место уже занято другой отметкой — событие остаётся в списке ниже
    if (start > at) {
      pieces.push({ from: at, to: start });
      at = start;
    }
    if (end > start) {
      pieces.push({ from: start, to: end, event: e });
      at = end;
    } else {
      // значок не должен слипаться со словами: пробел ставим там, где его нет в тексте
      const spaced = (ch: string | undefined) => (ch === undefined || /\s/.test(ch) ? '' : ' ');
      pieces.push({ from: at, to: at, event: e, badge: badge(e), before: spaced(transcript[at - 1]), after: spaced(transcript[at]) });
    }
  }
  pieces.push({ from: at, to: transcript.length });
  return pieces;
}

/** Одно слово. Перерисовывается, только когда становится текущим или перестаёт им быть. */
const Word = memo(function Word({ index, text, active, onPress }: { index: number; text: string; active: boolean; onPress: (index: number) => void }) {
  return (
    <Text onPress={() => onPress(index)} style={active ? styles.now : undefined}>
      {text}
    </Text>
  );
});

export type TranscriptHandle = { playFrom: (seconds: number) => void; pause: () => void };

type Props = {
  delivery: Delivery;
  /** Звукозапись питча; null — записи нет (раунд из истории), тогда текст без плеера и подсветки. */
  audioUri: string | null;
  duration: number;
  wide: boolean;
  /** Что сказать, когда записи нет. */
  noRecording: string;
  /** Запись заиграла — можно остановить другой плеер. */
  onPlay?: () => void;
};

/**
 * Транскрипт со своим плеером во всю ширину: ошибки отмечены прямо в тексте, а слово, которое звучит сейчас,
 * подсвечено. Нажатие на слово или отметку перематывает запись туда.
 */
export const Transcript = forwardRef<TranscriptHandle, Props>(function Transcript({ delivery, audioUri, duration, wide, noRecording, onPlay }, ref) {
  const player = useRef<PitchPlayerHandle>(null);
  const [now, setNow] = useState<{ time: number; playing: boolean }>({ time: 0, playing: false });
  const { transcript, events } = delivery;
  const words = useMemo(() => delivery.words ?? [], [delivery.words]);
  const pieces = useMemo(() => markTranscript(transcript, events), [transcript, events]);
  // на дорожке текста — только то, что отмечено в тексте; взгляд живёт на дорожке видео
  const marks = useMemo(() => events.filter((e) => e.type !== 'gaze_off').map((e) => ({ t: e.t, color: MARK[e.type]?.color ?? c.markPause })), [events]);

  const playFrom = (seconds: number) => player.current?.playFrom(seconds);
  useImperativeHandle(ref, () => ({ playFrom, pause: () => player.current?.pause() }));

  // слово, которое звучит сейчас: последнее, начавшееся к этому моменту
  let active = -1;
  if (audioUri && words.length && (now.playing || now.time > 0)) {
    let lo = 0;
    let hi = words.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (words[mid].t <= now.time + 0.05) {
        active = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
  }
  const jump = useMemo(() => (index: number) => player.current?.playFrom(words[index].t + 1), [words]); // playFrom начинает на секунду раньше

  let cursor = 0; // слова идут по порядку — по ним проходим один раз
  const range = (from: number, to: number): ReactNode[] => {
    const nodes: ReactNode[] = [];
    let at = from;
    while (cursor < words.length && words[cursor].start < to) {
      const w = words[cursor];
      if (w.start >= at) {
        if (w.start > at) nodes.push(transcript.slice(at, w.start));
        const end = Math.min(w.end, to);
        nodes.push(<Word key={cursor} index={cursor} text={transcript.slice(w.start, end)} active={cursor === active} onPress={jump} />);
        at = end;
      }
      cursor += 1;
    }
    if (at < to) nodes.push(transcript.slice(at, to));
    return nodes;
  };

  const legend = [...LEGEND, ...(events.some((e) => e.type === 'profanity') ? (['profanity'] as const) : []), ...(events.some((e) => e.type === 'gaze_off') ? (['gaze_off'] as const) : [])];

  return (
    <Card flat style={[styles.card, wide && styles.cardWide]}>
      <View style={styles.head}>
        <H3 style={styles.title}>Transcript</H3>
        <View style={styles.legend}>
          {legend.map((t) => (
            <View key={t} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: MARK[t].color }]} />
              <Text style={styles.legendText}>{MARK[t].name}</Text>
            </View>
          ))}
        </View>
      </View>

      {audioUri ? (
        <>
          <PitchPlayer
            ref={player}
            uri={audioUri}
            fallbackDuration={duration}
            marks={marks}
            onTime={(time, playing) => {
              setNow({ time, playing });
              if (playing && !now.playing) onPlay?.();
            }}
          />
          <Small>{words.length ? 'The word you are saying is highlighted. Tap any word or marker to jump there.' : 'Tap a marker to play from that moment, or drag the slider.'}</Small>
        </>
      ) : (
        <Small>{noRecording}</Small>
      )}

      <Text style={styles.text}>
        {pieces.map((p, i) =>
          p.badge && p.event ? (
            <Text key={i}>
              {p.before}
              <Text onPress={() => playFrom(p.event!.t)} style={[styles.marked, styles.badge, { backgroundColor: MARK[p.event.type]?.color ?? c.markPause }]} accessibilityLabel={p.event.text}>
                {` ${p.badge.replace(/ /g, ' ')} `}
              </Text>
              {p.after}
            </Text>
          ) : p.event ? (
            <Text
              key={i}
              onPress={words.length ? undefined : () => playFrom(p.event!.t)}
              style={[styles.marked, { backgroundColor: MARK[p.event.type]?.color ?? c.markPause }]}
              accessibilityLabel={p.event.text}>
              {range(p.from, p.to)}
            </Text>
          ) : (
            <Text key={i}>{range(p.from, p.to)}</Text>
          ),
        )}
      </Text>

      {events.length > 0 && (
        <View style={styles.events}>
          {events.map((e, i) => (
            <Pressable key={i} accessibilityRole="button" onPress={() => playFrom(e.t)} style={[styles.event, { backgroundColor: MARK[e.type]?.color ?? c.markPause }]}>
              <Text style={styles.eventTime}>{formatTime(e.t)}</Text>
              <Text style={styles.eventText}>{e.text}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 22, gap: 14 },
  cardWide: { padding: 30, borderRadius: 24 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  title: { flexGrow: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, maxWidth: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: c.ink },
  legendText: { fontFamily: font.semi, fontSize: 13, color: c.ink },
  text: { fontFamily: font.body, fontSize: 18, lineHeight: 32, color: c.ink },
  marked: { fontFamily: font.semi, borderRadius: 6 },
  badge: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.2 },
  // слово, которое звучит сейчас
  now: { backgroundColor: c.ink, color: c.cream, borderRadius: 5 },
  events: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 2, borderColor: c.ink, paddingHorizontal: 10, minHeight: 40, maxWidth: '100%' },
  eventTime: { fontFamily: font.bold, fontSize: 14, color: c.ink, fontVariant: ['tabular-nums'] },
  eventText: { fontFamily: font.medium, fontSize: 14, color: c.ink, flexShrink: 1 },
});
