import { createElement, useEffect, useRef, useState } from 'react';

import type { StyleProp, ViewStyle } from 'react-native';

import { CameraPlaceholder, Frame } from './CameraFrameBase';

export type Facing = 'user' | 'environment';

type Props = {
  size?: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  /** Какой камерой снимать: фронтальной или задней. */
  facing?: Facing;
  /** Игрок переключил камеру кнопкой на рамке (кнопка есть, только когда у устройства больше одной камеры). */
  onFacing?: (facing: Facing) => void;
  /** Камера включилась или сменилась: видео-элемент и поток — по ним пишется видео. */
  onReady?: (video: HTMLVideoElement, stream: MediaStream) => void;
};

/** Камера в рамке, браузер: живое превью; фронтальная камера показывается зеркально, задняя — как есть. */
export function CameraFrame({ facing = 'user', onFacing, onReady, ...props }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<'wait' | 'on' | 'off'>('wait');
  const [cameras, setCameras] = useState(1);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices) {
      setState('off');
      return;
    }
    navigator.mediaDevices
      // 480p и 24 кадра: кружку превью больше не нужно, а запись и отрисовка заметно легче
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          onReady?.(video.current, s);
        }
        setState('on');
        // список камер известен только после разрешения
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCameras(devices.filter((d) => d.kind === 'videoinput').length);
      })
      .catch(() => {
        if (cancelled) return;
        // задней камеры нет или она занята — возвращаемся на фронтальную
        if (facing === 'environment') onFacing?.('user');
        else setState('off');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // камера включается при входе на сцену и при переключении
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const canFlip = state === 'on' && cameras > 1 && onFacing;
  return (
    <Frame {...props} onFlip={canFlip ? () => onFacing(facing === 'user' ? 'environment' : 'user') : undefined}>
      {createElement('video', {
        ref: video,
        autoPlay: true,
        muted: true,
        playsInline: true,
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: facing === 'user' ? 'scaleX(-1)' : undefined,
          display: state === 'on' ? 'block' : 'none',
        },
      })}
      {state !== 'on' && <CameraPlaceholder off={state === 'off'} />}
    </Frame>
  );
}
