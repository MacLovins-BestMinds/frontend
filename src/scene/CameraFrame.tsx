import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Camera, CommonResolutions, useCameraDevice, useCameraPermission, useVideoOutput } from 'react-native-vision-camera';
import { createFaceDetectorOutput } from 'react-native-vision-camera-face-detector';

import type { FaceAngles, NativeCameraSession } from '@/video/nativeCamera';

import { CameraPlaceholder, Frame } from './CameraFrameBase';

export type Facing = 'user' | 'environment';

type Props = {
  size?: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  /** Какой камерой снимать: фронтальной или задней. */
  facing?: Facing;
  /** Игрок переключил камеру кнопкой на рамке (кнопка есть, только когда у устройства есть обе камеры). */
  onFacing?: (facing: Facing) => void;
  /** Камера включилась или сменилась: по сессии пишется видео и считается взгляд. */
  onReady?: (session: NativeCameraSession, stream: null) => void;
};

// 480p: кружку превью больше не нужно, а запись и детектор лица заметно легче
const RESOLUTION = CommonResolutions.VGA_4_3;

/**
 * Камера в рамке, приложение: живое превью VisionCamera, запись видео без звука (звук пишет рекордер сцены)
 * и детектор лица на ML Kit — по углам головы сцена понимает, смотрит ли игрок в зал.
 */
export function CameraFrame({ facing = 'user', onFacing, onReady, ...props }: Props) {
  const permission = useCameraPermission();
  const [asked, setAsked] = useState(false);
  const device = useCameraDevice(facing === 'user' ? 'front' : 'back');
  const front = useCameraDevice('front');
  const back = useCameraDevice('back');
  const [live, setLive] = useState(false); // сессия камеры запущена
  const [configured, setConfigured] = useState(0); // сколько раз сессия перестроилась (старт, смена камеры)
  // камеру переключили, а сессия ещё перестраивается на новую — второе нажатие ждёт
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (permission.hasPermission || !permission.canRequestPermission || asked) return;
    setAsked(true);
    permission.requestPermission();
  }, [permission, asked]);

  // задней камеры нет — возвращаемся на фронтальную
  useEffect(() => {
    if (facing === 'environment' && !back) onFacing?.('user');
  }, [facing, back, onFacing]);

  // Одна сессия на весь экран, при переключении меняется только камера-источник, выходы те же.
  // Раньше на каждую камеру создавалась своя сессия с теми же выходами: когда сборщик мусора удалял старую,
  // она отцепляла выход, уже занятый новой, и iOS роняла приложение (AVCaptureOutput detachFromFigCaptureSession).
  // Постоянная запись (enablePersistentRecorder) не прерывается при переключении — видео в разборе одним куском.
  // Если устройство не примет постоянную запись вместе с детектором (два видеовыхода в одной сессии),
  // сессия вернёт ошибку — тогда переходим на обычную запись: она перезапускается после смены камеры.
  const [persistent, setPersistent] = useState(true);
  const video = useVideoOutput({ targetResolution: RESOLUTION, enableAudio: false, enablePersistentRecorder: persistent });

  // выход детектора создаём один раз: хук пакета пересоздаёт его на каждом рендере. Углы головы
  // не зависят от того, какая камера снимает, поэтому при переключении он остаётся тем же
  const listeners = useRef(new Set<(face: FaceAngles) => void>());
  const faces = useMemo(
    () =>
      createFaceDetectorOutput({
        performanceMode: 'fast',
        onFacesDetected: (found) => {
          const face = found[0];
          const angles: FaceAngles = face ? { yaw: face.yawAngle, pitch: face.pitchAngle } : null;
          listeners.current.forEach((l) => l(angles));
        },
        onError: (e) => console.warn('Face detection failed', e),
      }),
    [],
  );

  // Постоянная запись: сцена получает сессию один раз, запись и взгляд идут через все переключения без перерыва.
  // Обычная запись обрывается при смене камеры — тогда отдаём сессию заново после каждой перестройки.
  const ready = useRef(onReady);
  ready.current = onReady;
  const handed = useRef<{ video: unknown; configured: number } | null>(null);
  useEffect(() => {
    if (!live || configured === 0) return;
    const prev = handed.current;
    if (prev && prev.video === video && (persistent || prev.configured === configured)) return;
    handed.current = { video, configured };
    ready.current?.(
      {
        video,
        onFace: (listener) => {
          listeners.current.add(listener);
          return () => listeners.current.delete(listener);
        },
      },
      null,
    );
  }, [live, video, configured, persistent]);

  const on = permission.hasPermission && !!device;
  const canFlip = live && !switching && !!front && !!back && onFacing;
  return (
    <Frame
      {...props}
      onFlip={
        canFlip
          ? () => {
              setSwitching(true);
              onFacing(facing === 'user' ? 'environment' : 'user');
            }
          : undefined
      }>
      {on ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          outputs={[video, faces]}
          resizeMode="cover"
          // запись поворачиваем по интерфейсу, а не по датчику: приложение для iPad на Mac сообщает «портрет»,
          // и видео выходило вертикальным; телефон заперт в портрете — там всё как было
          orientationSource="interface"
          onConfigured={() => {
            setSwitching(false);
            setConfigured((n) => n + 1);
          }}
          onStarted={() => setLive(true)}
          onStopped={() => setLive(false)}
          onError={(e) => {
            setSwitching(false);
            if (persistent) {
              console.warn('The camera did not accept persistent recording, falling back to regular recording', e);
              setPersistent(false);
            } else console.warn('The camera failed', e);
          }}
        />
      ) : null}
      {!live && <CameraPlaceholder text={on || (!asked && permission.canRequestPermission) ? 'camera' : 'no camera'} />}
    </Frame>
  );
}
