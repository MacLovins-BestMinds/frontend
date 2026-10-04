import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Delivery } from '@/api/types';
import { c, font } from '@/design/theme';

import type { PitchPlayerHandle } from './PitchPlayer';
import { PitchVideo } from './PitchVideo';
import { Card, H3, Label, Muted } from './primitives';
import { MARK, Transcript } from './Transcript';

type Props = {
  delivery: Delivery;
  audioUri: string | null;
  videoUri: string | null;
  videoOffset: number;
  duration: number;
  wide: boolean;
  noRecording: string;
};

/**
 * Запись выступления в разборе: видео со звуком и транскрипт — один плеер. Если видео есть, время ведёт оно,
 * а транскрипт подсвечивает слово по нему и перематывает видео по нажатию. Видео нет — у транскрипта свой плеер.
 * Время живёт здесь, а не на экране разбора: так 20 раз в секунду перерисовываются только плеер и текст.
 */
export function Recording({ delivery, audioUri, videoUri, videoOffset, duration, wide, noRecording }: Props) {
  const video = useRef<PitchPlayerHandle>(null);
  const [clock, setClock] = useState({ time: 0, playing: false });

  // когда игрок не смотрел в зал: начало и длительность берём из событий разбора
  const away = useMemo(
    () =>
      delivery.events
        .filter((e) => e.type === 'gaze_off')
        .map((e) => ({ from: e.t, to: e.t + Number(e.text.match(/\d+(\.\d+)?/)?.[0] ?? 0) })),
    [delivery.events],
  );
  // на дорожке видео — всё сразу: отметки из текста и моменты, когда взгляд ушёл
  const marks = useMemo(
    () => [
      ...delivery.events.filter((e) => e.type !== 'gaze_off').map((e) => ({ t: e.t, color: MARK[e.type]?.color ?? c.markPause })),
      ...away.map((s) => ({ t: s.from, color: c.markGaze })),
    ],
    [delivery.events, away],
  );
  const contact = delivery.metrics.gaze_on_ratio;
  const longest = Math.round(Math.max(0, ...away.map((s) => s.to - s.from)));

  const media = useMemo(
    () => (videoUri ? { time: clock.time, playing: clock.playing, playFrom: (s: number) => video.current?.playFrom(s) } : undefined),
    [videoUri, clock],
  );

  return (
    <>
      {videoUri ? (
        <Card flat style={styles.recording}>
          <H3>Your recording</H3>
          <PitchVideo
            ref={video}
            uri={videoUri}
            audioUri={audioUri}
            offset={videoOffset}
            fallbackDuration={duration}
            marks={marks}
            notes={away.map((s) => ({ ...s, text: 'eyes off the room' }))}
            onTime={(time, playing) => setClock((prev) => (prev.time === time && prev.playing === playing ? prev : { time, playing }))}
          />
          <View style={[styles.contact, wide && styles.contactWide]}>
            <Label>Eye contact</Label>
            {typeof contact === 'number' ? (
              <View style={styles.contactBody}>
                <Text style={styles.contactValue}>{Math.round(contact * 100)}%</Text>
                <Muted style={styles.grow}>
                  {away.length === 0
                    ? 'You kept your eyes on the room the whole time.'
                    : `You looked away ${away.length === 1 ? 'once' : `${away.length} times`} for more than 3 seconds, the longest for ${longest} s. The markers on the track show where.`}
                </Muted>
              </View>
            ) : (
              <Muted>Eye contact was not measured this time. Watch the recording: are your eyes on the room?</Muted>
            )}
          </View>
        </Card>
      ) : null}
      <Transcript delivery={delivery} audioUri={audioUri} duration={duration} wide={wide} noRecording={noRecording} media={media} />
    </>
  );
}

const styles = StyleSheet.create({
  recording: { borderRadius: 22, gap: 14 },
  contact: { gap: 6 },
  contactWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  contactBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contactValue: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: c.ink },
  grow: { flex: 1 },
});
