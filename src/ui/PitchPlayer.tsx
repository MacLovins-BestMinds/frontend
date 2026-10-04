import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRealDuration } from '@/audio/duration';
import { c, font, outline } from '@/design/theme';
import { useT } from '@/i18n';

import { PlayIcon } from './decor';

export type PitchPlayerHandle = { playFrom: (seconds: number) => void; pause: () => void };
/**
 * Отметка на дорожке: где случилась ошибка, её цвет и что это (для подсказки над ползунком).
 * dot — круглая отметка: так моменты хода мысли отличаются от отметок речи.
 */
export type PlayerMark = { t: number; color: string; label?: string; dot?: boolean };

const THUMB = 22;
const HIT = 34;
const SNAP_PX = 12; // ближе — ползунок прилипает к отметке, как к главам на YouTube
const LEAD_SEC = 0.5; // к отметке перематываем чуть раньше, чтобы услышать ошибку целиком
const NOW_BEFORE_SEC = 0.6; // отметка считается текущей чуть до и пару секунд после своего момента
const NOW_AFTER_SEC = 2.5;
const web = Platform.OS === 'web';

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
 * Панель плеера: кнопка, дорожка с отметками ошибок, заливка до текущего места и ползунок.
 * Как на YouTube: ползунок прилипает к отметке рядом, над ним видно время и что за ошибка, под дорожкой — текущая
 * ошибка и переходы к прошлой и следующей. Что именно играет (звук или видео), панель не знает.
 */
export function PlayerBar({ playing, position, duration, marks, onToggle, onSeek }: BarProps) {
  const t = useT('review');
  // пока палец ведёт ползунок, показываем его место, а не место плеера; hover — куда указывает мышь
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  // куда только что перемотали: на паузе браузерный плеер не всегда сразу сообщает новое место —
  // держим ползунок там, пока плеер не догонит (или не заиграет)
  const [pinned, setPinned] = useState<{ t: number; at: number } | null>(null);
  const [width, setWidth] = useState(1);
  const [tipWidth, setTipWidth] = useState(0);
  const track = useRef<View>(null);
  const box = useRef({ left: 0, width: 1 });
  const sorted = useMemo(() => [...marks].sort((a, b) => a.t - b.t), [marks]);
  const base = pinned?.t ?? position;
  const shown = Math.min(scrub ?? base, duration);

  useEffect(() => {
    if (!pinned) return;
    if (Math.abs(position - pinned.t) < 0.4 || (playing && Date.now() - pinned.at > 1500)) setPinned(null);
  }, [position, playing, pinned]);

  const seekTo = (t: number) => {
    setPinned({ t, at: Date.now() });
    return onSeek(t);
  };
  const progress = duration > 0 ? shown / duration : 0;

  const measure = () => track.current?.measureInWindow((left, _top, w) => (box.current = { left, width: Math.max(1, w) }));
  /** Отметка рядом с моментом t (по расстоянию на экране) — к ней прилипает ползунок. */
  const near = (t: number) => {
    let best: PlayerMark | null = null;
    for (const m of sorted) {
      const px = (Math.abs(m.t - t) / Math.max(duration, 0.001)) * box.current.width;
      if (px <= SNAP_PX && (!best || Math.abs(m.t - t) < Math.abs(best.t - t))) best = m;
    }
    return best;
  };
  const at = (x: number) => {
    const t = Math.max(0, Math.min(1, (x - box.current.left) / box.current.width)) * duration;
    return near(t)?.t ?? t;
  };
  const target = (t: number) => (near(t) ? Math.max(0, t - LEAD_SEC) : t);

  // ошибка, которая звучит сейчас, и соседние — для подписи и переходов
  // из нескольких рядом — самая поздняя начавшаяся: после перехода к отметке подписана именно она
  const current = [...sorted].reverse().find((m) => shown >= m.t - NOW_BEFORE_SEC && shown <= m.t + NOW_AFTER_SEC) ?? null;
  const next = sorted.find((m) => m.t - LEAD_SEC > base + 0.25);
  // «назад» как на YouTube: если только что перешли к отметке — к предыдущей, иначе к началу текущей
  const prev = [...sorted].reverse().find((m) => m.t - LEAD_SEC < base - 1.5);
  /** Переход к ошибке, как к главе на YouTube: перематываем чуть раньше неё и сразу играем. */
  const jump = (m: PlayerMark | undefined) => {
    if (!m) return;
    Promise.resolve(seekTo(Math.max(0, m.t - LEAD_SEC))).then(() => !playing && onToggle());
  };

  const tipAt = scrub ?? hover;
  const tipMark = tipAt !== null ? (sorted.find((m) => m.t === tipAt) ?? null) : null;
  const tipLeft = tipAt !== null && duration > 0 ? Math.max(-THUMB / 2, Math.min(width - tipWidth + THUMB / 2, (tipAt / duration) * width - tipWidth / 2)) : 0;

  return (
    <View style={styles.player}>
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('pause') : t('play')} onPress={onToggle} style={styles.play}>
        {playing ? <View style={styles.pause} /> : <PlayIcon />}
      </Pressable>
      {/* дорожка занимает всю оставшуюся ширину, время стоит под ней — так на узком экране её видно целиком */}
      <View style={styles.trackColumn}>
        <View
          ref={track}
          style={styles.hit}
          onLayout={(e) => {
            setWidth(Math.max(1, e.nativeEvent.layout.width));
            measure();
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={t('position')}
          accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shown) }}
          accessibilityActions={[
            { name: 'increment', label: t('nextMistake') },
            { name: 'decrement', label: t('prevMistake') },
          ]}
          onAccessibilityAction={(e) => jump(e.nativeEvent.actionName === 'increment' ? next : prev)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            measure();
            setScrub(at(e.nativeEvent.pageX));
          }}
          onResponderMove={(e) => setScrub(at(e.nativeEvent.pageX))}
          onResponderRelease={(e) => {
            const t = at(e.nativeEvent.pageX);
            // держим ползунок на месте, пока плеер не перемотает, иначе он дёрнется назад
            Promise.resolve(seekTo(target(t))).finally(() => setScrub(null));
          }}
          onResponderTerminate={() => setScrub(null)}
          // мышь над дорожкой (сайт): показываем, куда попадёт нажатие и какая там ошибка
          onPointerMove={web ? (e) => e.nativeEvent.pointerType === 'mouse' && setHover(at(e.nativeEvent.clientX)) : undefined}
          onPointerEnter={web ? measure : undefined}
          onPointerLeave={web ? () => setHover(null) : undefined}
        >
          <View style={styles.rail} pointerEvents="none">
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          {duration > 0 &&
            sorted.map((m, i) => {
              const on = m === current || m === tipMark;
              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[
                    m.dot ? styles.dot : styles.mark,
                    on && (m.dot ? styles.dotOn : styles.markOn),
                    { left: `${Math.min(100, (m.t / duration) * 100)}%`, backgroundColor: m.color },
                  ]}
                />
              );
            })}
          {hover !== null && scrub === null && duration > 0 && (
            <View pointerEvents="none" style={[styles.hoverLine, { left: `${(hover / duration) * 100}%` }]} />
          )}
          <View pointerEvents="none" style={[styles.thumb, scrub !== null && styles.thumbActive, { left: `${progress * 100}%` }]} />
          {tipAt !== null && (
            <View pointerEvents="none" onLayout={(e) => setTipWidth(e.nativeEvent.layout.width)} style={[styles.tip, { left: tipLeft, opacity: tipWidth ? 1 : 0 }]}>
              <Text style={styles.tipTime}>{clock(tipAt)}</Text>
              {tipMark?.label ? (
                <>
                  <View style={[styles.tipSwatch, { backgroundColor: tipMark.color }]} />
                  <Text style={styles.tipText} numberOfLines={1}>
                    {tipMark.label}
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </View>
        <View style={styles.under}>
          {sorted.length > 0 && (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={t('prevMistake')} disabled={!prev} onPress={() => jump(prev)} style={[styles.skip, !prev && styles.skipOff]}>
                <Text style={styles.skipText}>‹</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('nextMistake')} disabled={!next} onPress={() => jump(next)} style={[styles.skip, !next && styles.skipOff]}>
                <Text style={styles.skipText}>›</Text>
              </Pressable>
            </>
          )}
          <View style={styles.now} accessibilityLiveRegion="polite">
            {current?.label ? (
              <>
                <View style={[styles.tipSwatch, { backgroundColor: current.color }]} />
                <Text style={styles.nowText} numberOfLines={1}>
                  {current.label}
                </Text>
              </>
            ) : sorted.length > 0 ? (
              <Text style={styles.nowHint} numberOfLines={1}>
                {t('markers', { n: sorted.length })}
              </Text>
            ) : null}
          </View>
          <Text style={styles.time}>
            {clock(shown)} / {clock(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

type Props = {
  uri: string;
  fallbackDuration: number;
  marks: PlayerMark[];
  /** Где сейчас запись и играет ли она — по этому в тексте подсвечивается текущее слово. */
  onTime?: (seconds: number, playing: boolean) => void;
};

/** Плеер звукозаписи питча — когда видео нет (в приложении или без камеры). */
export const PitchPlayer = forwardRef<PitchPlayerHandle, Props>(function PitchPlayer({ uri, fallbackDuration, marks, onTime }, ref) {
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
    pause: () => player.pause(),
  }));

  useEffect(() => {
    onTime?.(position, status.playing);
    // сообщаем только о смене места и состояния
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, status.playing]);

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
  player: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, ...outline },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', ...outline },
  pause: { width: 14, height: 16, borderLeftWidth: 5, borderRightWidth: 5, borderColor: c.ink },
  // зона нажатия выше самой дорожки, чтобы в неё легко попасть пальцем
  trackColumn: { flex: 1, gap: 2 },
  hit: { height: HIT, justifyContent: 'center', marginHorizontal: THUMB / 2, cursor: 'pointer' },
  rail: { height: 12, borderRadius: 6, borderWidth: 2, borderColor: c.ink, backgroundColor: c.paper, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.orange },
  mark: { position: 'absolute', top: 8, width: 7, height: 18, marginLeft: -3.5, borderRadius: 3, borderWidth: 1.5, borderColor: c.ink },
  // текущая или выбранная ошибка — крупнее, как глава под курсором на YouTube
  markOn: { top: 4, width: 11, height: 26, marginLeft: -5.5, borderRadius: 4, borderWidth: 2.5, zIndex: 1 },
  dot: { position: 'absolute', top: 10, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2, borderColor: c.ink },
  dotOn: { top: 6, width: 22, height: 22, marginLeft: -11, borderRadius: 11, borderWidth: 2.5, zIndex: 1 },
  hoverLine: { position: 'absolute', top: 4, width: 2, height: HIT - 8, marginLeft: -1, backgroundColor: c.graphite, opacity: 0.6 },
  thumb: {
    position: 'absolute',
    top: (HIT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: THUMB / 2,
    backgroundColor: c.ink,
    borderWidth: 3,
    borderColor: c.orange,
    zIndex: 2,
  },
  thumbActive: { transform: [{ scale: 1.25 }] },
  tip: { position: 'absolute', bottom: HIT - 2, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 280, backgroundColor: c.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, zIndex: 3 },
  tipTime: { fontFamily: font.bold, fontSize: 12, color: c.onInk, fontVariant: ['tabular-nums'] },
  tipSwatch: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: c.ink },
  tipText: { fontFamily: font.medium, fontSize: 12, color: c.onInk, flexShrink: 1 },
  under: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: THUMB / 2 - 4 },
  skip: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.ink, backgroundColor: c.paper },
  skipOff: { opacity: 0.35 },
  skipText: { fontFamily: font.bold, fontSize: 17, lineHeight: 20, color: c.ink },
  now: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  nowText: { fontFamily: font.semi, fontSize: 13, lineHeight: 16, color: c.ink, flexShrink: 1 },
  nowHint: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: c.graphite, flexShrink: 1 },
  time: { fontFamily: font.semi, fontSize: 13, lineHeight: 16, color: c.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
});
