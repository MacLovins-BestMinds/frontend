import type { CameraVideoOutput } from 'react-native-vision-camera';

/** Поворот головы с детектора лица, градусы; null — лица в кадре нет. */
export type FaceAngles = { yaw: number; pitch: number } | null;

/**
 * То, что CameraFrame в приложении отдаёт в onReady, а startCapture забирает: выход записи видео
 * и подписка на детектор лица. Живёт, пока включена текущая камера.
 */
export type NativeCameraSession = {
  video: CameraVideoOutput;
  /** Подписка на каждое срабатывание детектора; возвращает отписку. */
  onFace: (listener: (face: FaceAngles) => void) => () => void;
};
