import { createElement, useEffect, useRef, useState } from 'react';

import type { StyleProp, ViewStyle } from 'react-native';

import { CameraPlaceholder, Frame } from './CameraFrameBase';

type Props = {
  size?: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  /** Камера включилась: видео-элемент и поток — по ним пишется видео и определяется взгляд. */
  onReady?: (video: HTMLVideoElement, stream: MediaStream) => void;
};

/** Камера в рамке, браузер: живое зеркальное превью с фронтальной камеры. */
export function CameraFrame({ onReady, ...props }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<'wait' | 'on' | 'off'>('wait');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          onReady?.(video.current, s);
        }
        setState('on');
      })
      .catch(() => setState('off'));
    if (!navigator.mediaDevices) setState('off');
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // камера включается один раз при входе на сцену
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Frame {...props}>
      {createElement('video', {
        ref: video,
        autoPlay: true,
        muted: true,
        playsInline: true,
        style: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: state === 'on' ? 'block' : 'none' },
      })}
      {state !== 'on' && <CameraPlaceholder text={state === 'off' ? 'no camera' : 'camera'} />}
    </Frame>
  );
}
