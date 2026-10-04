import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';

import { PlayerBar, type PitchPlayerHandle } from './PitchPlayer';
import type { PitchVideoProps } from './PitchVideo';

const SYNC_OK_SEC = 0.04;
const SEEK_SEC = 0.6;
const SEEK_GAP_MS = 800;
const NUDGE = 0.8;
const RATE_MAX = 0.15;
const REPORT_SEC = 0.05; // чаще перерисовывать ползунок и текст незачем

/**
 * Запись из браузера не знает своей длины, пока браузер не дочитает файл: один раз прыгаем
 * «в бесконечность», получаем настоящую длительность и возвращаемся в начало.
 */
function watchLength(el: HTMLMediaElement, onLength: (seconds: number) => void): () => void {
  const settle = () => {
    if (!Number.isFinite(el.duration)) return;
    el.removeEventListener('durationchange', settle);
    el.currentTime = 0;
    onLength(el.duration);
  };
  const loaded = () => {
    if (Number.isFinite(el.duration)) return onLength(el.duration);
    el.addEventListener('durationchange', settle);
    el.currentTime = 1e101;
  };
  el.addEventListener('loadedmetadata', loaded);
  return () => {
    el.removeEventListener('loadedmetadata', loaded);
    el.removeEventListener('durationchange', settle);
  };
}

/**
 * Видеозапись выступления, браузер. Если есть звукозапись раунда, время ведёт она — как в приложении:
 * дорожка всегда от нуля до конца записи и совпадает с транскриптом, а видео (без звука) подстраивается
 * под неё скоростью и редкими перемотками. Видео началось позже звука — до его начала стоит первый кадр.
 * Звукозаписи нет — видео играет со своим звуком и само ведёт время.
 */
export const PitchVideo = forwardRef<PitchPlayerHandle, PitchVideoProps>(function PitchVideo(
  { uri, offset, fallbackDuration, marks, notes, onPlay, onTime, audioUri, overlay },
  ref,
) {
  const video = useRef<HTMLVideoElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const withAudio = !!audioUri;
  const [videoLength, setVideoLength] = useState(0);
  const [audioLength, setAudioLength] = useState(0);
  const [time, setTime] = useState(0); // время раунда
  const [playing, setPlaying] = useState(false);
  const lastSeek = useRef(0);

  const master = () => (withAudio ? audio.current : video.current);
  const roundTime = () => (withAudio ? (audio.current?.currentTime ?? 0) : (video.current?.currentTime ?? 0) + offset);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = withAudio;
    const stop = watchLength(v, setVideoLength);
    v.src = uri;
    return () => {
      v.pause();
      stop();
    };
  }, [uri, withAudio]);

  useEffect(() => {
    const a = audio.current;
    if (!a || !audioUri) return;
    const stop = watchLength(a, setAudioLength);
    a.src = audioUri;
    return () => {
      a.pause();
      stop();
    };
  }, [audioUri]);

  // играет ли запись — по событиям ведущего плеера
  useEffect(() => {
    const m = master();
    if (!m) return;
    const sync = () => setPlaying(!m.paused && !m.ended);
    const ended = () => {
      sync();
      video.current?.pause();
    };
    m.addEventListener('play', sync);
    m.addEventListener('pause', sync);
    m.addEventListener('ended', ended);
    return () => {
      m.removeEventListener('play', sync);
      m.removeEventListener('pause', sync);
      m.removeEventListener('ended', ended);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withAudio]);

  // пока играет: каждый кадр двигаем ползунок и подтягиваем картинку к звуку
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let shown = -1;
    const tick = () => {
      const t = roundTime();
      if (Math.abs(t - shown) >= REPORT_SEC) {
        shown = t;
        setTime(t);
      }
      const v = video.current;
      if (withAudio && v) {
        const target = t - offset;
        const inside = target >= 0 && (videoLength <= 0 || target < videoLength);
        if (!inside) {
          if (!v.paused) v.pause();
        } else {
          if (v.paused) v.play().catch(() => {});
          const drift = target - v.currentTime;
          if (Math.abs(drift) > SEEK_SEC) {
            v.playbackRate = 1;
            if (Date.now() - lastSeek.current > SEEK_GAP_MS) {
              v.currentTime = target;
              lastSeek.current = Date.now();
            }
          } else {
            const rate = Math.abs(drift) < SYNC_OK_SEC ? 1 : 1 + Math.max(-RATE_MAX, Math.min(RATE_MAX, drift * NUDGE));
            if (Math.abs(v.playbackRate - rate) > 0.01) v.playbackRate = rate;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, withAudio, offset, videoLength]);

  const duration = withAudio ? audioLength || fallbackDuration : videoLength > 0 ? videoLength + offset : fallbackDuration;
  const position = Math.min(duration, time);

  const seek = (seconds: number) => {
    const t = Math.max(0, Math.min(seconds, Math.max(0, duration - 0.05)));
    const v = video.current;
    if (v) {
      v.currentTime = Math.max(0, Math.min(t - offset, videoLength > 0 ? videoLength - 0.05 : Infinity));
      v.playbackRate = 1;
    }
    if (withAudio && audio.current) audio.current.currentTime = t;
    lastSeek.current = Date.now();
    setTime(t);
  };
  const play = () => {
    const m = master();
    if (!m) return;
    onPlay?.();
    if (withAudio && video.current) video.current.currentTime = Math.max(0, roundTime() - offset);
    m.play().catch((e) => console.warn('The recording did not start', e));
  };
  const pause = () => {
    audio.current?.pause();
    video.current?.pause();
  };
  const toggle = () => {
    if (playing) return pause();
    if (position >= duration - 0.2) seek(0);
    play();
  };

  useImperativeHandle(ref, () => ({
    playFrom: (seconds) => {
      seek(Math.max(0, seconds - 1));
      play();
    },
    pause,
  }));

  const report = useRef(onTime);
  report.current = onTime;
  useEffect(() => {
    report.current?.(position, playing);
  }, [position, playing]);

  const note = notes?.find((n) => position >= n.from && position <= n.to)?.text;

  return (
    <View style={styles.wrap}>
      {createElement('audio', { ref: audio, preload: 'auto' })}
      <View style={styles.limit}>
        <View style={styles.frame}>
          {createElement('video', {
            ref: video,
            playsInline: true,
            preload: 'auto',
            onClick: toggle,
            style: { position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' },
          })}
          {overlay ??
            (note ? (
              <View style={styles.note}>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ) : null)}
        </View>
      </View>
      <PlayerBar playing={playing} position={position} duration={duration} marks={marks} onToggle={toggle} onSeek={seek} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  // ширину ограничивает обёртка: aspectRatio вместе с maxWidth на одном View вытягивает кадр
  limit: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, overflow: 'hidden', backgroundColor: c.lens, ...outline, ...shadow(4) },
  note: { position: 'absolute', left: 10, bottom: 10, backgroundColor: c.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, ...outline },
  noteText: { fontFamily: font.bold, fontSize: 13, color: c.ink },
});
