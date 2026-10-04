import { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Delivery, TimelineEvent } from '@/api/types';
import { c, font, formatTime } from '@/design/theme';
import { translate, useT } from '@/i18n';

import { PitchPlayer, type PitchPlayerHandle } from './PitchPlayer';
import { Card, H3, Small } from './primitives';

/** Цвет отметки по типу; название — markName (словарь review). */
export const MARK: Record<TimelineEvent['type'], { color: string }> = {
  filler: { color: c.markFiller },
  repeat: { color: c.markRepeat },
  profanity: { color: c.markSwear },
  long_pause: { color: c.markPause },
  hesitation: { color: c.markPause },
  pace: { color: c.markPace },
  gaze_off: { color: c.markGaze },
  good_pause: { color: c.markPause },
};
const LEGEND = ['filler', 'repeat', 'long_pause', 'pace'] as const;

/** Название отметки на текущем языке: «filler word», «слово-паразит». */
export function markName(type: TimelineEvent['type']): string {
  return type in MARK ? translate('review', `mark.${type}`) : type;
}

/** Подпись отметки на дорожке плеера: у паразита и повтора текст — одно слово, добавляем, что это. */
export function markLabel(e: TimelineEvent): string {
  if (e.type !== 'filler' && e.type !== 'repeat' && e.type !== 'profanity') return e.text;
  const name = markName(e.type);
  return `${name[0].toUpperCase()}${name.slice(1)} ${e.text}`;
}

/**
 * Кусок транскрипта: обычный текст, отмеченное место (паразит, повтор) или значок между словами (пауза, темп).
 * from/to — место куска в транскрипте; у значка их нет.
 */
type Piece = { from: number; to: number; event?: TimelineEvent; badge?: string; before?: string; after?: string };

/** Подпись значка между словами: «… 3.6 s …» для паузы, «fast · 196/min» для темпа, «eyes away · 4 s» для взгляда. */
function badge(e: TimelineEvent): string {
  // текст события сервер может прислать на языке интерфейса: число бывает и с запятой
  const n = e.text.match(/\d+([.,]\d+)?/)?.[0] ?? '';
  if (e.type === 'gaze_off') return translate('review', 'badgeGaze', { n });
  if (e.type === 'pace') return translate('review', /fast|быстр|rapid/i.test(e.text) ? 'badgeFast' : 'badgeSlow', { n });
  return translate('review', 'badgePause', { n });
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
  /**
   * Время ведёт видео со звуком: своего плеера у текста нет, слово подсвечивается по видео,
   * а нажатие на слово или отметку перематывает видео.
   */
  media?: { time: number; playing: boolean; playFrom: (seconds: number) => void };
};

/**
 * Транскрипт со своим плеером во всю ширину: ошибки отмечены прямо в тексте, а слово, которое звучит сейчас,
 * подсвечено. Нажатие на слово или отметку перематывает запись туда.
 */
export const Transcript = forwardRef<TranscriptHandle, Props>(function Transcript({ delivery, audioUri, duration, wide, noRecording, onPlay, media }, ref) {
  const t = useT('review');
  const player = useRef<PitchPlayerHandle>(null);
  const [now, setNow] = useState<{ time: number; playing: boolean }>({ time: 0, playing: false });
  const { transcript, events } = delivery;
  const words = useMemo(() => delivery.words ?? [], [delivery.words]);
  // подписи значков и отметок — на языке интерфейса: пересчитываем и при его смене (t меняется вместе с языком)
  const pieces = useMemo(() => markTranscript(transcript, events), [transcript, events, t]);
  // на дорожке текста — только то, что отмечено в тексте; взгляд живёт на дорожке видео
  const marks = useMemo(() => events.filter((e) => e.type !== 'gaze_off').map((e) => ({ t: e.t, color: MARK[e.type]?.color ?? c.markPause, label: markLabel(e) })), [events, t]);

  const follow = useRef(media);
  follow.current = media;
  const playFrom = (seconds: number) => (follow.current ? follow.current.playFrom(seconds) : player.current?.playFrom(seconds));
  const clock = media ?? now;
  useImperativeHandle(ref, () => ({ playFrom, pause: () => player.current?.pause() }));

  // слово, которое звучит сейчас: последнее, начавшееся к этому моменту
  let active = -1;
  if ((media || audioUri) && words.length && (clock.playing || clock.time > 0)) {
    let lo = 0;
    let hi = words.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (words[mid].t <= clock.time + 0.05) {
        active = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
  }
  // playFrom начинает на секунду раньше
  const jump = useMemo(() => (index: number) => (follow.current ? follow.current.playFrom(words[index].t + 1) : player.current?.playFrom(words[index].t + 1)), [words]);

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
        <H3 style={styles.title}>{t('transcript')}</H3>
        <View style={styles.legend}>
          {legend.map((type) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: MARK[type].color }]} />
              <Text style={styles.legendText}>{markName(type)}</Text>
            </View>
          ))}
        </View>
      </View>

      {media ? (
        <Small>{words.length ? t('videoWords') : t('videoMarks')}</Small>
      ) : audioUri ? (
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
          <Small>{words.length ? t('audioWords') : t('audioMarks')}</Small>
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
