import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';

import { PlayerBar, type PitchPlayerHandle } from './PitchPlayer';
import type { PitchVideoProps } from './PitchVideo';

/**
 * Видеозапись выступления, браузер. Видео играет со своим звуком и само ведёт ползунок и маркеры —
 * второго плеера нет, поэтому подгонять звук к картинке не нужно и запись не дёргается.
 */
export const PitchVideo = forwardRef<PitchPlayerHandle, PitchVideoProps>(function PitchVideo({ uri, offset, fallbackDuration, marks, notes }, ref) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState({ time: 0, playing: false, length: 0 });

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let ready = false;
    const report = () => ready && setState({ time: v.currentTime, playing: !v.paused && !v.ended, length: Number.isFinite(v.duration) ? v.duration : 0 });
    // запись из браузера не знает своей длины, пока браузер не дочитает файл:
    // один раз прыгаем «в бесконечность», получаем настоящую длительность и возвращаемся в начало
    const settle = () => {
      if (!Number.isFinite(v.duration)) return;
      v.removeEventListener('durationchange', settle);
      v.currentTime = 0;
      ready = true;
      report();
    };
    const loaded = () => {
      if (Number.isFinite(v.duration)) {
        ready = true;
        return report();
      }
      v.addEventListener('durationchange', settle);
      v.currentTime = 1e101;
    };
    const events = ['timeupdate', 'play', 'pause', 'ended', 'seeked'];
    v.addEventListener('loadedmetadata', loaded);
    events.forEach((e) => v.addEventListener(e, report));
    v.src = uri;
    return () => {
      v.pause();
      v.removeEventListener('loadedmetadata', loaded);
      v.removeEventListener('durationchange', settle);
      events.forEach((e) => v.removeEventListener(e, report));
    };
  }, [uri]);

  // ползунок и маркеры живут во времени раунда; видео могло начаться позже (например, после смены камеры)
  const duration = state.length > 0 ? state.length + offset : fallbackDuration;
  const position = state.length > 0 ? state.time + offset : 0;

  const seek = (seconds: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(seconds - offset, Math.max(0, v.duration - 0.05)));
  };
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (!v.paused) return v.pause();
    if (v.ended || v.currentTime >= v.duration - 0.2) v.currentTime = 0;
    v.play().catch((e) => console.warn('The video did not start', e));
  };

  useImperativeHandle(ref, () => ({
    playFrom: (seconds) => {
      seek(Math.max(0, seconds - 1));
      video.current?.play().catch((e) => console.warn('The video did not start', e));
    },
  }));

  const note = notes?.find((n) => position >= n.from && position <= n.to)?.text;

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        {createElement('video', {
          ref: video,
          playsInline: true,
          preload: 'auto',
          onClick: toggle,
          style: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' },
        })}
        {note ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}
      </View>
      <PlayerBar playing={state.playing} position={position} duration={duration} marks={marks} onToggle={toggle} onSeek={seek} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, overflow: 'hidden', backgroundColor: c.lens, ...outline, ...shadow(4) },
  note: { position: 'absolute', left: 10, bottom: 10, backgroundColor: c.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, ...outline },
  noteText: { fontFamily: font.bold, fontSize: 13, color: c.ink },
});
