import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Delivery, Flow } from '@/api/types';
import { c, font } from '@/design/theme';
import type { Polled } from '@/hooks/useInsights';
import { useT } from '@/i18n';

import { ReelBar, ReelScreen } from './BlooperReel';
import type { PitchPlayerHandle } from './PitchPlayer';
import { PitchVideo } from './PitchVideo';
import { Card, H3, Label, Muted } from './primitives';
import { buildReel, type ReelSegment } from './reel';
import { flowMarks, ThoughtFlow } from './ThoughtFlow';
import { MARK, markLabel, Transcript, type TranscriptHandle } from './Transcript';

type Props = {
  delivery: Delivery;
  audioUri: string | null;
  videoUri: string | null;
  videoOffset: number;
  duration: number;
  wide: boolean;
  noRecording: string;
  /** Ход мысли от ИИ: карточка, отметки на дорожке и провалы в нарезке. */
  flow: Polled<Flow>;
  /** Запись заиграла — другой плеер на экране стоит остановить. */
  onPlay?: () => void;
};

// отрезок нарезки считается начатым, когда плеер дошёл до него; ушли дальше этого — перемотали руками
const ARM_BEFORE_SEC = 0.6;
const AWAY_SEC = 1.5;

/**
 * Запись выступления в разборе: видео со звуком и транскрипт — один плеер. Если видео есть, время ведёт оно,
 * а транскрипт подсвечивает слово по нему и перематывает видео по нажатию. Видео нет — у транскрипта свой плеер.
 * Время живёт здесь, а не на экране разбора: так 20 раз в секунду перерисовываются только плеер и текст.
 * Здесь же ход мысли (нажатие на момент включает запись там) и нарезка факапов: она водит тот же плеер
 * по отрезкам с ошибками через playFrom и по его часам переходит к следующему.
 * ref — пауза и перемотка того плеера, что сейчас ведёт запись.
 */
export const Recording = forwardRef<PitchPlayerHandle, Props>(function Recording(
  { delivery, audioUri, videoUri, videoOffset, duration, wide, noRecording, flow, onPlay },
  ref,
) {
  const t = useT('review');
  const ti = useT('insights');
  const video = useRef<PitchPlayerHandle>(null);
  const text = useRef<TranscriptHandle>(null);
  const [clock, setClock] = useState({ time: 0, playing: false });
  const onTime = useCallback((time: number, playing: boolean) => setClock((prev) => (prev.time === time && prev.playing === playing ? prev : { time, playing })), []);
  const playable = !!(videoUri || audioUri);
  const player = useCallback(() => (videoUri ? video.current : text.current), [videoUri]);
  useImperativeHandle(ref, () => ({ playFrom: (s) => player()?.playFrom(s), pause: () => player()?.pause() }), [player]);

  // когда игрок не смотрел в зал: начало и длительность берём из событий разбора
  const away = useMemo(
    () =>
      delivery.events
        .filter((e) => e.type === 'gaze_off')
        // текст события может прийти на языке интерфейса — число бывает с запятой
        .map((e) => ({ from: e.t, to: e.t + Number((e.text.match(/\d+([.,]\d+)?/)?.[0] ?? '0').replace(',', '.')) })),
    [delivery.events],
  );
  const moments = useMemo(() => (flow.state === 'ready' ? [...(flow.data?.moments ?? [])].sort((a, b) => a.t - b.t) : []), [flow]);
  // подписи — на языке интерфейса: пересчитываем при его смене (ti меняется вместе с языком)
  const momentMarks = useMemo(() => flowMarks(moments), [moments, ti]);
  // на дорожке видео — всё сразу: отметки из текста, моменты, когда взгляд ушёл, и ход мысли
  const marks = useMemo(
    () => [
      ...delivery.events.filter((e) => e.type !== 'gaze_off').map((e) => ({ t: e.t, color: MARK[e.type]?.color ?? c.markPause, label: markLabel(e) })),
      ...away.map((s) => ({ t: s.from, color: c.markGaze, label: t('eyesOffFor', { n: Math.round(s.to - s.from) }) })),
      ...momentMarks,
    ],
    [delivery.events, away, momentMarks, t],
  );
  const contact = delivery.metrics.gaze_on_ratio;
  const longest = Math.round(Math.max(0, ...away.map((s) => s.to - s.from)));

  const media = useMemo(
    () => (videoUri ? { time: clock.time, playing: clock.playing, playFrom: (s: number) => video.current?.playFrom(s) } : undefined),
    [videoUri, clock],
  );

  // нарезка факапов: отрезки фиксируются при запуске — если ход мысли придёт посреди просмотра, номера не съедут
  const segments = useMemo(() => buildReel(delivery.events, moments, duration), [delivery.events, moments, duration, ti]);
  const [reel, setReel] = useState<{ segments: ReelSegment[]; index: number } | null>(null);
  const armed = useRef(false);
  const playSegment = (list: ReelSegment[], index: number) => {
    armed.current = false;
    setReel({ segments: list, index });
    // playFrom начинает на секунду раньше
    player()?.playFrom(list[index].from + 1);
  };
  const stopReel = () => {
    player()?.pause();
    setReel(null);
  };
  useEffect(() => {
    if (!reel) return;
    const seg = reel.segments[reel.index];
    const now = clock.time;
    // пока плеер не перемотал к отрезку, его часы показывают старое место
    if (!armed.current) {
      if (now >= seg.from - ARM_BEFORE_SEC && now < seg.to) armed.current = true;
      return;
    }
    if (now < seg.from - AWAY_SEC || now > seg.to + AWAY_SEC) setReel(null);
    else if (now >= seg.to) {
      if (reel.index + 1 < reel.segments.length) playSegment(reel.segments, reel.index + 1);
      else stopReel();
    }
    // следим только за часами плеера
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock.time]);

  const seg = reel ? reel.segments[reel.index] : null;
  const screen =
    reel && seg ? (
      <ReelScreen segment={seg} index={reel.index} count={reel.segments.length} progress={(clock.time - seg.from) / Math.max(0.1, seg.to - seg.from)} framed={!!videoUri} />
    ) : undefined;
  const bar =
    playable && (reel || segments.length > 0) ? (
      <ReelBar
        count={reel ? reel.segments.length : segments.length}
        index={reel ? reel.index : null}
        onStart={() => playSegment(segments, 0)}
        onPrev={() => reel && playSegment(reel.segments, Math.max(0, reel.index - 1))}
        onNext={() => reel && reel.index + 1 < reel.segments.length && playSegment(reel.segments, reel.index + 1)}
        onStop={stopReel}
      />
    ) : null;

  // ход мысли: момент, который звучит сейчас, и переход к моменту
  let active = -1;
  if (playable && (clock.playing || clock.time > 0)) {
    for (let i = moments.length - 1; i >= 0; i -= 1) {
      if (clock.time >= moments[i].t - 0.05 && clock.time <= Math.max(moments[i].end, moments[i].t + 2)) {
        active = i;
        break;
      }
    }
  }
  const seek = useCallback(
    (s: number) => {
      setReel(null);
      player()?.playFrom(s);
    },
    [player],
  );

  return (
    <>
      {videoUri ? (
        <Card flat style={styles.recording}>
          <H3>{t('recording')}</H3>
          <PitchVideo
            ref={video}
            uri={videoUri}
            audioUri={audioUri}
            offset={videoOffset}
            fallbackDuration={duration}
            marks={marks}
            notes={away.map((s) => ({ ...s, text: t('eyesOff') }))}
            overlay={screen}
            onPlay={onPlay}
            onTime={onTime}
          />
          {bar}
          <View style={[styles.contact, wide && styles.contactWide]}>
            <Label>{t('eyeContact')}</Label>
            {typeof contact === 'number' ? (
              <View style={styles.contactBody}>
                <Text style={styles.contactValue}>{Math.round(contact * 100)}%</Text>
                <Muted style={styles.grow}>
                  {away.length === 0 ? t('eyesOnRoom') : t('lookedAway', { n: away.length, longest })}
                </Muted>
              </View>
            ) : (
              <Muted>{t('notMeasured')}</Muted>
            )}
          </View>
        </Card>
      ) : null}
      <ThoughtFlow state={flow.state} summary={flow.data?.summary ?? null} moments={moments} active={active} onSeek={playable ? seek : undefined} wide={wide} />
      <Transcript
        ref={text}
        delivery={delivery}
        audioUri={audioUri}
        duration={duration}
        wide={wide}
        noRecording={noRecording}
        media={media}
        onPlay={onPlay}
        onTime={onTime}
        extraMarks={momentMarks}
        aside={
          videoUri ? undefined : (
            <>
              {screen}
              {bar}
            </>
          )
        }
      />
    </>
  );
});

const styles = StyleSheet.create({
  recording: { borderRadius: 22, gap: 14 },
  contact: { gap: 6 },
  contactWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  contactBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contactValue: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: c.ink },
  grow: { flex: 1 },
});
