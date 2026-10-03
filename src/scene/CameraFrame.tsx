import type { StyleProp, ViewStyle } from 'react-native';

import { CameraPlaceholder, Frame } from './CameraFrameBase';

export type Facing = 'user' | 'environment';

type Props = {
  size?: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  facing?: Facing;
  onFacing?: (facing: Facing) => void;
  onReady?: (video: unknown, stream: unknown) => void;
};

/**
 * Камера в рамке. В приложении живое превью ещё не подключено (нужен react-native-vision-camera
 * и сборка development build) — показываем заглушку. В браузере работает CameraFrame.web.tsx.
 */
export function CameraFrame({ onReady: _onReady, facing: _facing, onFacing: _onFacing, ...props }: Props) {
  return (
    <Frame {...props}>
      <CameraPlaceholder />
    </Frame>
  );
}
