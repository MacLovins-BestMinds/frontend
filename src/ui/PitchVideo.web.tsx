import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';

import type { PitchVideoProps } from './PitchVideo';

const DRIFT_SEC = 0.35; // на столько видео может разойтись со звуком, прежде чем мы его подвинем

/**
 * Видеозапись выступления, браузер. Звук играет плеер записи, а видео без звука идёт за ним:
 * так перемотка, маркеры и ползунок остаются общими.
 */
export function PitchVideo({ uri, offset, time, playing, note }: PitchVideoProps) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  // запись из браузера (webm) не знает своей длины и не перематывается, пока браузер не дочитает файл:
  // прыгаем «в бесконечность», ждём настоящую длительность и возвращаемся в начало
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    setReady(false);
    const settle = () => {
      if (!Number.isFinite(v.duration)) return;
      v.removeEventListener('durationchange', settle);
      v.currentTime = 0;
      setReady(true);
    };
    const loaded = () => {
      if (Number.isFinite(v.duration)) return setReady(true);
      v.addEventListener('durationchange', settle);
      v.currentTime = 1e101;
    };
    v.addEventListener('loadedmetadata', loaded);
    v.src = uri;
    return () => {
      v.removeEventListener('loadedmetadata', loaded);
      v.removeEventListener('durationchange', settle);
    };
  }, [uri]);

  useEffect(() => {
    const v = video.current;
    if (!v || !ready) return;
    const target = Math.max(0, time - offset);
    if (Math.abs(v.currentTime - target) > DRIFT_SEC) v.currentTime = Math.min(target, Math.max(0, v.duration - 0.05));
    if (playing && v.paused) v.play().catch(() => {});
    if (!playing && !v.paused) v.pause();
  }, [time, playing, offset, ready]);

  return (
    <View style={styles.frame}>
      {createElement('video', {
        ref: video,
        muted: true,
        playsInline: true,
        preload: 'auto',
        style: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
      })}
      {note ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, overflow: 'hidden', backgroundColor: c.lens, ...outline, ...shadow(4) },
  note: { position: 'absolute', left: 10, bottom: 10, backgroundColor: c.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, ...outline },
  noteText: { fontFamily: font.bold, fontSize: 13, color: c.ink },
});
