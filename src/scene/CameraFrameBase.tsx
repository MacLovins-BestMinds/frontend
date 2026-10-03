import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { c, font, outline, shadow } from '@/design/theme';
import { CameraIcon, Flower } from '@/ui/decor';

type FrameProps = { size?: number; tilt?: number; style?: StyleProp<ViewStyle>; children?: ReactNode; onFlip?: () => void };

/**
 * Круглая фоторамка под камеру: оранжевый обод, прострочка, цветок снизу.
 * Наклонены только обод и украшения: само видео стоит ровно, иначе браузер перерисовывает каждый кадр через поворот.
 */
export function Frame({ size = 136, tilt = -4, style, children, onFlip }: FrameProps) {
  // обод и прострочка растут вместе с рамкой, чтобы крупная камера не выглядела тонкой
  const stitch = Math.round(size * 0.87);
  const lens = Math.round(size * 0.74);
  const button = Math.max(36, Math.round(size * 0.2));
  return (
    <View style={[styles.box, { width: size, height: size }, style]}>
      <View style={[styles.frame, shadow(4), { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: `${tilt}deg` }] }]}>
        <View style={[styles.stitch, { width: stitch, height: stitch, borderRadius: stitch / 2 }]} />
        <View style={styles.flower}>
          <Flower size={size * 0.23} center={c.paper} />
        </View>
      </View>
      <View style={[styles.lens, { width: lens, height: lens, borderRadius: lens / 2 }]}>{children}</View>
      {onFlip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          onPress={onFlip}
          hitSlop={8}
          style={[styles.flip, { width: button, height: button, borderRadius: button / 2 }]}>
          <Svg width={button * 0.56} height={button * 0.56} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 11a8 8 0 0 0-14.3-4.5M4 5v4h4" />
            <Path d="M4 13a8 8 0 0 0 14.3 4.5M20 19v-4h-4" />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CameraPlaceholder({ text = 'camera' }: { text?: string }) {
  return (
    <>
      <CameraIcon size={24} />
      <Text style={styles.placeholder}>{text}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  frame: { position: 'absolute', left: 0, top: 0, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', ...outline },
  stitch: { borderWidth: 2, borderStyle: 'dashed', borderColor: c.ink },
  lens: { backgroundColor: c.lens, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4, ...outline },
  flower: { position: 'absolute', bottom: -12 },
  flip: { position: 'absolute', right: 0, top: 0, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', ...outline, ...shadow(2) },
  placeholder: { fontFamily: font.semi, fontSize: 11, color: c.cream },
});
