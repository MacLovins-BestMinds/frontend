import type { StyleProp, ViewStyle } from 'react-native';

import { CameraPlaceholder, Frame } from './CameraFrameBase';

type Props = { size?: number; tilt?: number; style?: StyleProp<ViewStyle>; onReady?: (video: unknown, stream: unknown) => void };

/**
 * Камера в рамке. В приложении живое превью ещё не подключено (нужен react-native-vision-camera
 * и сборка development build) — показываем заглушку. В браузере работает CameraFrame.web.tsx.
 */
export function CameraFrame({ onReady: _onReady, ...props }: Props) {
  return (
    <Frame {...props}>
      <CameraPlaceholder />
    </Frame>
  );
}
