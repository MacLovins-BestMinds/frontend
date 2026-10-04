import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { Delivery, TimelineEvent } from '@/api/types';
import { c, font, formatTime } from '@/design/theme';
import { translate, useT } from '@/i18n';

import { charProgress, createSmoothClock, mix, type SmoothClock } from './karaoke';
import { PitchPlayer, type PitchPlayerHandle, type PlayerMark } from './PitchPlayer';
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
  // удачная пауза — не ошибка: зелёная, как сильные моменты хода мысли
  good_pause: { color: c.markGood },
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

// ещё не сказанное: приглушённый ink на бумаге; сказанное — обычный ink
const MUTED = '#A8A397';

type WordProps = {
  index: number;
  text: string;
  /** Когда слово звучит (с, с) и когда начинается следующее — до него слово считается текущим. */
  t: number;
  tEnd: number;
  nextT: number;
  /** Начало каждой буквы (с); нет — заливка идёт равномерно по длине слова. */
  chars?: number[] | null;
  /** Слово внутри отметки ошибки: у неё свой фон, подложку текущего слова не рисуем. */
  marked: boolean;
  clock: SmoothClock;
  /** Система просит меньше движения: текущее слово просто выделено, без заливки по буквам. */
  still: boolean;
  onPress: (index: number) => void;
};

/**
 * Слово транскрипта как караоке: впереди — приглушено, сказанное — чёрное, текущее заливается по буквам.
 * Перерисовывается, только когда меняется его состояние; каждый кадр — только текущее слово (ActiveWord).
 */
const Word = memo(function Word(props: WordProps) {
  const { index, text, t, nextT, clock, still, onPress } = props;
  const state = useSyncExternalStore(clock.subscribe, () => {
    if (!clock.engaged()) return 'idle';
    const time = clock.get();
    return time < t ? 'future' : time < nextT ? 'active' : 'past';
  });
  if (state === 'active') {
    return still ? (
      <Text onPress={() => onPress(index)} style={styles.nowStill}>
        {text}
      </Text>
    ) : (
      <ActiveWord {...props} />
    );
  }
  return (
    <Text onPress={() => onPress(index)} style={[fade, state === 'future' && styles.future]}>
      {text}
    </Text>
  );
});

/** Текущее слово: каждая буква плавно переходит из приглушённой в чёрную в свой момент записи. */
function ActiveWord({ index, text, t, tEnd, chars, marked, clock, onPress }: WordProps) {
  const time = useSyncExternalStore(clock.subscribe, clock.get);
  const letters = Array.from(text); // по символам, как считает бэкенд
  const progress = charProgress(time, letters.length, t, tEnd, chars);
  return (
    <Text onPress={() => onPress(index)} style={[fade, !marked && styles.now]}>
      {letters.map((ch, i) => (
        <Text key={i} style={{ color: mix(MUTED, c.ink, progress[i]) }}>
          {ch}
        </Text>
      ))}
    </Text>
  );
}

// в браузере смена «впереди → сказано» и подложка текущего слова проявляются плавно
const fade = (Platform.OS === 'web' ? { transitionProperty: 'color, background-color', transitionDuration: '220ms' } : {}) as TextStyle;

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
  /** Где своя запись текста и играет ли она — для нарезки ошибок и хода мысли. */
  onTime?: (seconds: number, playing: boolean) => void;
  /** Ещё отметки на дорожку своего плеера — моменты хода мысли. */
  extraMarks?: PlayerMark[];
  /** Что показать сразу под своим плеером — нарезку ошибок. */
  aside?: ReactNode;
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
export const Transcript = forwardRef<TranscriptHandle, Props>(function Transcript(
  { delivery, audioUri, duration, wide, noRecording, onPlay, onTime, extraMarks, aside, media },
  ref,
) {
  const t = useT('review');
  const player = useRef<PitchPlayerHandle>(null);
  const [now, setNow] = useState<{ time: number; playing: boolean }>({ time: 0, playing: false });
  const { transcript, events } = delivery;
  const words = useMemo(() => delivery.words ?? [], [delivery.words]);
  // подписи значков и отметок — на языке интерфейса: пересчитываем и при его смене (t меняется вместе с языком)
  const pieces = useMemo(() => markTranscript(transcript, events), [transcript, events, t]);
  // на дорожке текста — то, что отмечено в тексте, и моменты хода мысли; взгляд живёт на дорожке видео
  const marks = useMemo(
    () => [...events.filter((e) => e.type !== 'gaze_off').map((e) => ({ t: e.t, color: MARK[e.type]?.color ?? c.markPause, label: markLabel(e) })), ...(extraMarks ?? [])],
    [events, extraMarks, t],
  );

  // плавные часы подсветки: их кормит тот плеер, что ведёт время (видео или свой)
  const smooth = useMemo(() => createSmoothClock(), []);
  useEffect(() => () => smooth.dispose(), [smooth]);
  const still = useReducedMotion();

  const follow = useRef(media);
  follow.current = media;
  const playFrom = (seconds: number) => (follow.current ? follow.current.playFrom(seconds) : player.current?.playFrom(seconds));
  const clock = media ?? now;
  useImperativeHandle(ref, () => ({ playFrom, pause: () => player.current?.pause() }));

  const hasPlayer = !!(media || audioUri);
  useEffect(() => {
    if (hasPlayer) smooth.set(clock.time, clock.playing);
  }, [hasPlayer, clock.time, clock.playing, smooth]);
  // playFrom начинает на секунду раньше
  const jump = useMemo(() => (index: number) => (follow.current ? follow.current.playFrom(words[index].t + 1) : player.current?.playFrom(words[index].t + 1)), [words]);

  let cursor = 0; // слова идут по порядку — по ним проходим один раз
  const range = (from: number, to: number, marked = false): ReactNode[] => {
    const nodes: ReactNode[] = [];
    let at = from;
    while (cursor < words.length && words[cursor].start < to) {
      const w = words[cursor];
      if (w.start >= at) {
        if (w.start > at) nodes.push(transcript.slice(at, w.start));
        const end = Math.min(w.end, to);
        nodes.push(
          <Word
            key={cursor}
            index={cursor}
            text={transcript.slice(w.start, end)}
            t={w.t}
            tEnd={w.t_end}
            nextT={words[cursor + 1]?.t ?? Infinity}
            chars={end === w.end ? w.c : null}
            marked={marked}
            clock={smooth}
            still={still}
            onPress={jump}
          />,
        );
        at = end;
      }
      cursor += 1;
    }
    if (at < to) nodes.push(transcript.slice(at, to));
    return nodes;
  };

  const has = (type: TimelineEvent['type']) => events.some((e) => e.type === type);
  const legend = [...LEGEND, ...(has('profanity') ? (['profanity'] as const) : []), ...(has('gaze_off') ? (['gaze_off'] as const) : []), ...(has('good_pause') ? (['good_pause'] as const) : [])];

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
              onTime?.(time, playing);
              if (playing && !now.playing) onPlay?.();
            }}
          />
          {aside}
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
              {range(p.from, p.to, true)}
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
  // караоке: ещё не сказанное, подложка текущего слова и текущее слово без анимации (меньше движения)
  future: { color: MUTED },
  now: { backgroundColor: 'rgba(247,166,30,0.34)', borderRadius: 6 },
  nowStill: { backgroundColor: c.ink, color: c.cream, borderRadius: 5 },
  events: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 2, borderColor: c.ink, paddingHorizontal: 10, minHeight: 40, maxWidth: '100%' },
  eventTime: { fontFamily: font.bold, fontSize: 14, color: c.ink, fontVariant: ['tabular-nums'] },
  eventText: { fontFamily: font.medium, fontSize: 14, color: c.ink, flexShrink: 1 },
});
