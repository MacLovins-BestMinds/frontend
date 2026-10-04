import { useEvent } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';
import { useT } from '@/i18n';

import { PlayerBar, type PitchPlayerHandle, type PlayerMark } from './PitchPlayer';

export type PitchVideoProps = {
  uri: string;
  /** На сколько секунд видео началось позже раунда: время раунда = время видео + offset. */
  offset: number;
  fallbackDuration: number;
  marks: PlayerMark[];
  /** Подписи поверх кадра на отрезках раунда — например, когда взгляд ушёл из зала. */
  notes?: { from: number; to: number; text: string }[];
  /** Видео заиграло — можно остановить другой плеер. */
  onPlay?: () => void;
  /** Где сейчас запись (время раунда) и играет ли она — по этому транскрипт подсвечивает слово. */
  onTime?: (seconds: number, playing: boolean) => void;
  /** Звукозапись раунда. В приложении видео пишется без звука, звук играет вместе с ним и ведёт время. */
  audioUri?: string | null;
};

const TICK_SEC = 0.05;
// Синхронизация как у видеоплееров: мелкое расхождение картинка догоняет скоростью (±15%),
// перематываем только при большом и не чаще раза в SEEK_GAP_MS — перемотка видео сама идёт сотни мс,
// и частые перемотки дёргали кадр так, что он не совпадал со звуком вообще
const SYNC_OK_SEC = 0.04;
const SEEK_SEC = 0.6;
const SEEK_GAP_MS = 800;
const NUDGE = 0.8; // на сколько ускорить за каждую секунду отставания
const RATE_MAX = 0.15;

/**
 * Видеозапись выступления, приложение. Видео (expo-video, без звука) и голос (expo-audio) — один плеер:
 * время ведёт звук, он начался вместе с раундом, а картинка всё время подтягивается к нему.
 * Перемотка, пауза и старт идут в оба плеера сразу.
 */
export const PitchVideo = forwardRef<PitchPlayerHandle, PitchVideoProps>(function PitchVideo(
  { uri, offset, fallbackDuration, marks, notes, onPlay, onTime, audioUri },
  ref,
) {
  const t = useT('review');
  const video = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.timeUpdateEventInterval = TICK_SEC;
  });
  const audio = useAudioPlayer(audioUri ?? null, { updateInterval: TICK_SEC * 1000 });
  const sound = useAudioPlayerStatus(audio);
  const { currentTime: videoTime } = useEvent(video, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });
  const { isPlaying: videoPlaying } = useEvent(video, 'playingChange', { isPlaying: false, oldIsPlaying: false });
  // длительность видео известна после загрузки — перерисовываемся, когда она приходит
  useEvent(video, 'statusChange', { status: 'idle' });

  const hasAudio = !!audioUri && sound.isLoaded;
  const audioLength = Number.isFinite(sound.duration) && sound.duration > 0 ? sound.duration : 0;
  const videoLength = Number.isFinite(video.duration) && video.duration > 0 ? video.duration + offset : 0;
  const duration = Math.max(audioLength, videoLength) || fallbackDuration;
  const position = Math.min(duration, hasAudio ? (sound.currentTime ?? 0) : videoTime + offset);
  const playing = hasAudio ? sound.playing : videoPlaying;

  // картинка идёт за звуком: до начала видео стоит на первом кадре, после конца — на последнем
  const lastSeek = useRef(0);
  // скорость здесь не трогаем: на iOS выставить playbackRate — значит запустить плеер, и видео шло дальше на паузе
  const seekVideo = (t: number) => {
    video.currentTime = Math.max(0, t);
    lastSeek.current = Date.now();
  };
  useEffect(() => {
    if (!hasAudio) return;
    const target = position - offset;
    const inside = target >= 0 && (video.duration <= 0 || target < video.duration);
    if (!sound.playing || !inside) {
      if (video.playing) video.pause();
      // на паузе кадр ставим точно — так перемотка ползунком видна сразу
      if (Math.abs(video.currentTime - Math.max(0, target)) > SYNC_OK_SEC && Date.now() - lastSeek.current > 120) seekVideo(target);
      return;
    }
    if (!video.playing) video.play();
    const drift = target - video.currentTime; // > 0 — картинка отстаёт
    let rate = Math.abs(drift) < SYNC_OK_SEC ? 1 : 1 + Math.max(-RATE_MAX, Math.min(RATE_MAX, drift * NUDGE));
    if (Math.abs(drift) > SEEK_SEC) {
      rate = 1;
      if (Date.now() - lastSeek.current > SEEK_GAP_MS) seekVideo(target);
    }
    // скорость меняем только пока играет звук — здесь это так
    if (Math.abs(video.playbackRate - rate) > 0.01) video.playbackRate = rate;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAudio, position, sound.playing]);

  const report = useRef(onTime);
  report.current = onTime;
  useEffect(() => {
    report.current?.(position, playing);
  }, [position, playing]);

  async function seek(seconds: number) {
    const t = Math.max(0, Math.min(seconds, Math.max(0, duration - 0.05)));
    seekVideo(t - offset);
    if (hasAudio) await audio.seekTo(t).catch((e) => console.warn('Seek failed', e));
  }

  // доиграло до конца — возвращаемся в начало, чтобы «играть» снова работало
  useEffect(() => {
    if (sound.didJustFinish) {
      video.pause();
      seek(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound.didJustFinish]);

  const play = () => {
    onPlay?.();
    if (hasAudio) {
      // картинку ставим на место заранее, чтобы первый кадр совпал со звуком
      seekVideo(position - offset);
      audio.play();
    } else video.play();
  };
  const pause = () => {
    audio.pause();
    video.pause();
  };
  // звук встал (пауза, конец) — картинка встаёт сразу, не дожидаясь следующего тика
  useEffect(() => {
    if (hasAudio && !sound.playing && video.playing) video.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound.playing]);
  const toggle = () => {
    if (playing) return pause();
    if (position >= duration - 0.2) seek(0).then(play);
    else play();
  };

  useImperativeHandle(ref, () => ({
    playFrom: (seconds) => {
      seek(Math.max(0, seconds - 1)).then(play);
    },
    pause,
  }));

  const note = notes?.find((n) => position >= n.from && position <= n.to)?.text;

  return (
    <View style={styles.wrap}>
      <View style={styles.limit}>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('pause') : t('play')} onPress={toggle} style={styles.frame}>
          {/* обрезка отдельным слоем: на iOS overflow: hidden срезает тень рамки */}
          <View style={styles.clip}>
            <VideoView player={video} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} pointerEvents="none" />
          </View>
          {note ? (
            <View style={styles.note}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <PlayerBar playing={playing} position={position} duration={duration} marks={marks} onToggle={toggle} onSeek={seek} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  // ширину ограничивает обёртка, а рамка берёт её целиком: aspectRatio вместе с maxWidth на одном View
  // считает высоту от неограниченной ширины, и кадр вытягивается
  limit: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: c.lens, ...outline, ...shadow(4) },
  clip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, overflow: 'hidden' },
  note: { position: 'absolute', left: 10, bottom: 10, backgroundColor: c.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, ...outline },
  noteText: { fontFamily: font.bold, fontSize: 13, color: c.ink },
});
