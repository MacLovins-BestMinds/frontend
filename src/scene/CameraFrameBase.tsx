import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';
import { CameraIcon, Flower } from '@/ui/decor';

type FrameProps = { size?: number; tilt?: number; style?: StyleProp<ViewStyle>; children?: ReactNode };

/** Круглая фоторамка под камеру: оранжевый обод, прострочка, цветок снизу. */
export function Frame({ size = 136, tilt = -4, style, children }: FrameProps) {
  // обод и прострочка растут вместе с рамкой, чтобы крупная камера не выглядела тонкой
  const stitch = Math.round(size * 0.87);
  const lens = Math.round(size * 0.74);
  return (
    <View style={[styles.frame, shadow(4), { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={[styles.stitch, { width: stitch, height: stitch, borderRadius: stitch / 2 }]}>
        <View style={[styles.lens, { width: lens, height: lens, borderRadius: lens / 2 }]}>{children}</View>
      </View>
      <View style={styles.flower}>
        <Flower size={size * 0.23} center={c.paper} />
      </View>
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
  frame: { backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', ...outline },
  stitch: { borderWidth: 2, borderStyle: 'dashed', borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  lens: { backgroundColor: c.lens, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4, ...outline },
  flower: { position: 'absolute', bottom: -12 },
  placeholder: { fontFamily: font.semi, fontSize: 11, color: c.cream },
});
