import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useRealDuration } from '@/audio/duration';
import { c, font, outline } from '@/design/theme';

import { PlayIcon } from './decor';

export type PitchPlayerHandle = { playFrom: (seconds: number) => void };
export type PlayerMark = { t: number; color: string };

const THUMB = 22;

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type BarProps = {
  playing: boolean;
  /** Место в записи и её длина, секунды. */
  position: number;
  duration: number;
  marks: PlayerMark[];
  onToggle: () => void;
  /** Перемотать; пока обещание не выполнится, ползунок держится там, куда его привели. */
  onSeek: (seconds: number) => Promise<unknown> | void;
};

/**
 * Панель плеера: кнопка, дорожка с маркерами событий, заливка до текущего места и ползунок.
 * По дорожке можно нажать или вести пальцем — запись перематывается туда. Что именно играет (звук или видео),
 * панель не знает.
 */
export function PlayerBar({ playing, position, duration, marks, onToggle, onSeek }: BarProps) {
  // пока палец ведёт ползунок, показываем его место, а не место плеера
  const [scrub, setScrub] = useState<number | null>(null);
  const track = useRef<View>(null);
  const box = useRef({ left: 0, width: 1 });
  const shown = Math.min(scrub ?? position, duration);
  const progress = duration > 0 ? shown / duration : 0;

  const measure = () => track.current?.measureInWindow((left, _top, width) => (box.current = { left, width: Math.max(1, width) }));
  const at = (e: GestureResponderEvent) => {
    const ratio = (e.nativeEvent.pageX - box.current.left) / box.current.width;
    return Math.max(0, Math.min(1, ratio)) * duration;
  };

  return (
    <View style={styles.player}>
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play the recording'} onPress={onToggle} style={styles.play}>
        {playing ? <View style={styles.pause} /> : <PlayIcon />}
      </Pressable>
      <View
        ref={track}
        style={styles.hit}
        onLayout={measure}
        accessibilityRole="adjustable"
        accessibilityLabel="Position in the recording"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shown) }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          measure();
          setScrub(at(e));
        }}
        onResponderMove={(e) => setScrub(at(e))}
        onResponderRelease={(e) => {
          // держим ползунок на месте, пока плеер не перемотает, иначе он дёрнется назад
          Promise.resolve(onSeek(at(e))).finally(() => setScrub(null));
        }}
        onResponderTerminate={() => setScrub(null)}
      >
        <View style={styles.rail} pointerEvents="none">
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        {duration > 0 &&
          marks.map((m, i) => (
            <View key={i} pointerEvents="none" style={[styles.mark, { left: `${Math.min(100, (m.t / duration) * 100)}%`, backgroundColor: m.color }]} />
          ))}
        <View pointerEvents="none" style={[styles.thumb, scrub !== null && styles.thumbActive, { left: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.time}>
        {clock(shown)} / {clock(duration)}
      </Text>
    </View>
  );
}

type Props = { uri: string; fallbackDuration: number; marks: PlayerMark[] };

/** Плеер звукозаписи питча — когда видео нет (в приложении или без камеры). */
export const PitchPlayer = forwardRef<PitchPlayerHandle, Props>(function PitchPlayer({ uri, fallbackDuration, marks }, ref) {
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const real = useRealDuration(uri);
  const duration = real ?? (Number.isFinite(status.duration) && status.duration > 0 ? status.duration : fallbackDuration);
  const position = Math.min(status.currentTime ?? 0, duration);

  const seek = async (seconds: number) => {
    try {
      await player.seekTo(Math.max(0, Math.min(seconds, Math.max(0, duration - 0.05))));
    } catch (e) {
      console.warn('Seek failed', e);
    }
  };

  useImperativeHandle(ref, () => ({
    playFrom: (seconds) => {
      seek(Math.max(0, seconds - 1)).then(() => player.play());
    },
  }));

  // доиграло до конца — возвращаемся в начало, чтобы «играть» снова работало
  useEffect(() => {
    if (status.didJustFinish) seek(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const toggle = () => {
    if (status.playing) return player.pause();
    if (position >= duration - 0.2) seek(0).then(() => player.play());
    else player.play();
  };

  return <PlayerBar playing={status.playing} position={position} duration={duration} marks={marks} onToggle={toggle} onSeek={seek} />;
});

const styles = StyleSheet.create({
  player: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, ...outline },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', ...outline },
  pause: { width: 14, height: 16, borderLeftWidth: 5, borderRightWidth: 5, borderColor: c.ink },
  // зона нажатия выше самой дорожки, чтобы в неё легко попасть пальцем
  hit: { flex: 1, height: 44, justifyContent: 'center', marginHorizontal: THUMB / 2, cursor: 'pointer' },
  rail: { height: 12, borderRadius: 6, borderWidth: 2, borderColor: c.ink, backgroundColor: c.paper, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.orange },
  mark: { position: 'absolute', top: 12, width: 9, height: 20, marginLeft: -4.5, borderRadius: 4, borderWidth: 2, borderColor: c.ink },
  thumb: {
    position: 'absolute',
    top: (44 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: THUMB / 2,
    backgroundColor: c.ink,
    borderWidth: 3,
    borderColor: c.orange,
  },
  thumbActive: { transform: [{ scale: 1.25 }] },
  time: { fontFamily: font.semi, fontSize: 15, color: c.ink, fontVariant: ['tabular-nums'], minWidth: 86, textAlign: 'right' },
});
