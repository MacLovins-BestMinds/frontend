import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useRealDuration } from '@/audio/duration';
import { c, font, outline } from '@/design/theme';

import { PlayIcon } from './decor';

export type PitchPlayerHandle = { playFrom: (seconds: number) => void };
export type PlayerMark = { t: number; color: string };

type Props = {
  uri: string;
  fallbackDuration: number;
  marks: PlayerMark[];
  /** Где сейчас запись и играет ли она — по этому за плеером идёт видео. */
  onTime?: (seconds: number, playing: boolean) => void;
};

const THUMB = 22;

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Плеер записи питча: дорожка с маркерами событий, заливка до текущего места и ползунок.
 * По дорожке можно нажать или вести пальцем — запись перематывается туда.
 */
export const PitchPlayer = forwardRef<PitchPlayerHandle, Props>(function PitchPlayer({ uri, fallbackDuration, marks, onTime }, ref) {
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const real = useRealDuration(uri);
  const duration = real ?? (Number.isFinite(status.duration) && status.duration > 0 ? status.duration : fallbackDuration);

  // пока палец ведёт ползунок, показываем его место, а не место плеера
  const [scrub, setScrub] = useState<number | null>(null);
  const track = useRef<View>(null);
  const box = useRef({ left: 0, width: 1 });

  const position = Math.min(scrub ?? status.currentTime ?? 0, duration);
  const progress = duration > 0 ? position / duration : 0;

  const seek = async (seconds: number) => {
    try {
      await player.seekTo(Math.max(0, Math.min(seconds, Math.max(0, duration - 0.05))));
    } catch (e) {
      console.warn('Seek failed', e);
    }
  };

  useEffect(() => {
    onTime?.(position, status.playing);
    // сообщаем только о смене места и состояния
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, status.playing]);

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

  const measure = () => track.current?.measureInWindow((left, _top, width) => (box.current = { left, width: Math.max(1, width) }));
  const at = (e: GestureResponderEvent) => {
    const ratio = (e.nativeEvent.pageX - box.current.left) / box.current.width;
    return Math.max(0, Math.min(1, ratio)) * duration;
  };

  return (
    <View style={styles.player}>
      <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause' : 'Play the recording'} onPress={toggle} style={styles.play}>
        {status.playing ? <View style={styles.pause} /> : <PlayIcon />}
      </Pressable>
      <View
        ref={track}
        style={styles.hit}
        onLayout={measure}
        accessibilityRole="adjustable"
        accessibilityLabel="Position in the recording"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(position) }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          measure();
          setScrub(at(e));
        }}
        onResponderMove={(e) => setScrub(at(e))}
        onResponderRelease={(e) => {
          const target = at(e);
          // держим ползунок на месте, пока плеер не перемотает, иначе он дёрнется назад
          seek(target).finally(() => setScrub(null));
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
        {clock(position)} / {clock(duration)}
      </Text>
    </View>
  );
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
