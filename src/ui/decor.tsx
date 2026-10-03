import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { c, font, outline, shadow } from '@/design/theme';

/** Цветок с платьев и скатерти — знак Stage Zero. */
export function Flower({ size = 26, center = c.orange }: { size?: number; center?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill={c.ink}>
        <Circle cx={12} cy={5.5} r={4.5} />
        <Circle cx={18.2} cy={10} r={4.5} />
        <Circle cx={15.8} cy={17.3} r={4.5} />
        <Circle cx={8.2} cy={17.3} r={4.5} />
        <Circle cx={5.8} cy={10} r={4.5} />
      </G>
      <Circle cx={12} cy={12} r={3.4} fill={center} />
    </Svg>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <View style={styles.logo}>
      <Flower size={size + 4} />
      <Text style={[styles.logoText, { fontSize: size, lineHeight: size * 1.25 }]}>Stage Zero</Text>
    </View>
  );
}

export type Trend = 'up' | 'down' | 'flat' | string;

/** Стрелка тренда звания. */
export function TrendArrow({ trend, size = 24, color = c.orange }: { trend: Trend; size?: number; color?: string }) {
  const d = trend === 'up' ? 'M12 19V5 M5 12l7-7 7 7' : trend === 'down' ? 'M12 5v14 M5 12l7 7 7-7' : 'M5 12h14 M13 6l6 6-6 6';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

export function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 4l14 8-14 8V4z" fill={c.ink} stroke={c.ink} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 20, color = c.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z" />
      <Circle cx={12} cy={12} r={3.2} fill={color} />
    </Svg>
  );
}

export function CameraIcon({ size = 28, color = c.cream }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 7l-7 5 7 5V7z" />
      <Rect x={1} y={5} width={15} height={14} rx={2} />
    </Svg>
  );
}

type StampProps = { title: string; caption?: string; captionBelow?: boolean; trend?: Trend; size?: number; color?: string; fill?: string; tilt?: number };

/** Круглая печать жюри: звание. */
export function Stamp({ title, caption, captionBelow, trend, size = 132, color = c.ink, fill, tilt = -8 }: StampProps) {
  const captionNode = caption ? <Text style={[styles.stampCaption, { color }, captionBelow && styles.stampRange]}>{caption}</Text> : null;
  const inner = size - 24;
  return (
    <View
      style={[
        styles.stamp,
        { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: fill, transform: [{ rotate: `${tilt}deg` }] },
      ]}
    >
      <View style={[styles.stampInner, { width: inner, height: inner, borderRadius: inner / 2, borderColor: color }]}>
        {captionBelow ? null : captionNode}
        <Text style={[styles.stampTitle, { color, fontSize: size * 0.105, lineHeight: size * 0.14 }]}>{title}</Text>
        {captionBelow ? captionNode : null}
        {trend ? <TrendArrow trend={trend} size={size * 0.14} color={color} /> : null}
      </View>
    </View>
  );
}

/** Шкала-гирлянда, как на театральной вывеске: value 0–100. */
export function Bulbs({ value, count = 15, size = 12 }: { value: number; count?: number; size?: number }) {
  const lit = Math.round((Math.max(0, Math.min(100, value)) / 100) * count);
  return (
    <View style={styles.bulbs} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.bulb, { width: size, height: size, borderRadius: size / 2 }, i < lit && styles.bulbLit]} />
      ))}
    </View>
  );
}

type TicketProps = { title: string; stubTop: string; stubBottom: string; onPress: () => void; style?: StyleProp<ViewStyle>; stretch?: boolean };

/** Кнопка-билет с отрывным корешком. */
export function TicketButton({ title, stubTop, stubBottom, onPress, style, stretch }: TicketProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.ticket, stretch && { alignSelf: 'stretch' }, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }, style]}
    >
      <Text style={[styles.ticketTitle, stretch && { flex: 1 }]}>{title}</Text>
      <View style={styles.ticketStub}>
        <Text style={styles.ticketStubTop}>{stubTop}</Text>
        <Text style={styles.ticketStubBottom}>{stubBottom}</Text>
      </View>
    </Pressable>
  );
}

/** Кусок оранжевого скотча: афиша приклеена. */
export function Tape({ style, tilt = -6 }: { style?: StyleProp<ViewStyle>; tilt?: number }) {
  return <View style={[styles.tape, { transform: [{ rotate: `${tilt}deg` }] }, style]} />;
}

/** Реплика в пузыре. */
export function Bubble({ text, dark, tilt = -5, style }: { text: string; dark?: boolean; tilt?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.bubble, dark && { backgroundColor: c.ink }, { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Text style={[styles.bubbleText, dark && { color: c.onInk }]}>{text}</Text>
    </View>
  );
}

/** Волнистое подчёркивание под словом. */
export function Squiggle({ height = 12 }: { height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 200 14" preserveAspectRatio="none">
      <Path d="M2 8 Q 14 0 26 8 T 50 8 T 74 8 T 98 8 T 122 8 T 146 8 T 170 8 T 198 8" fill="none" stroke={c.orange} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

/** Ламбрекен с фестонами — тот же, что на сцене. */
export function Valance({ width, background = c.cream, fill = c.orange, stroke = c.ink, dots = c.ink }: { width: number; background?: string; fill?: string; stroke?: string; dots?: string }) {
  const step = 96;
  const n = Math.ceil(width / step) + 1;
  return (
    <Svg width={width} height={44} style={{ backgroundColor: background }}>
      {Array.from({ length: n }, (_, i) => (
        <G key={i} x={i * step}>
          <Path d="M0 -4 H96 V6 A48 34 0 0 1 0 6 Z" fill={fill} stroke={stroke} strokeWidth={3} />
          <Circle cx={0} cy={8} r={5} fill={dots} />
        </G>
      ))}
    </Svg>
  );
}

/** Лучи из-за нижнего края секции — как свет рампы. */
export function Rays({ width, height, color }: { width: number; height: number; color: string }) {
  const n = 14;
  const cx = width / 2;
  const r = Math.hypot(width, height);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {Array.from({ length: n }, (_, i) => {
        const a0 = Math.PI + (Math.PI / n) * i;
        const a1 = a0 + Math.PI / n / 2;
        return <Path key={i} d={`M${cx} ${height} L${cx + r * Math.cos(a0)} ${height + r * Math.sin(a0)} L${cx + r * Math.cos(a1)} ${height + r * Math.sin(a1)} Z`} fill={color} />;
      })}
    </Svg>
  );
}

/** Искра — четырёхконечная звёздочка. */
export function Spark({ size = 24, color = c.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={color} />
    </Svg>
  );
}

/** Колесо тем: восемь секторов и стрелка. */
export function Wheel({ size = 240, pointer = true }: { size?: number; pointer?: boolean }) {
  const p = ['200 100', '170.7 170.7', '100 200', '29.3 170.7', '0 100', '29.3 29.3', '100 0', '170.7 29.3'];
  const fills = [c.paper, c.ink, c.paper, c.orange, c.paper, c.ink, c.paper, c.orange];
  return (
    <Svg width={size} height={size * (pointer ? 1.065 : 1)} viewBox={pointer ? '-8 -22 216 230' : '-4 -4 208 208'}>
      <G stroke={c.ink} strokeWidth={3} strokeLinejoin="round">
        {p.map((from, i) => (
          <Path key={i} d={`M100 100 L${from} A100 100 0 0 1 ${p[(i + 1) % 8]} Z`} fill={fills[i]} />
        ))}
        <Circle cx={100} cy={100} r={16} fill={c.paper} />
        {pointer ? <Path d="M100 14 L86 -16 H114 Z" fill={c.ink} /> : null}
      </G>
    </Svg>
  );
}

type PaddleProps = { value: number; label: string; weight: string; note?: string; accent?: boolean; tilt?: number; size?: number };

/** Табличка жюри на ручке: оценка. */
export function Paddle({ value, label, weight, note, accent, tilt = -4, size = 150 }: PaddleProps) {
  const small = size < 120;
  return (
    <View style={styles.paddle}>
      <View
        style={[
          styles.paddleFace,
          shadow(small ? 3 : 5),
          { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: `${tilt}deg` }] },
          accent && { backgroundColor: c.orange },
        ]}
      >
        <Text style={[styles.paddleValue, { fontSize: size * 0.35, lineHeight: size * 0.42 }]}>{Math.round(value)}</Text>
      </View>
      <View style={[styles.paddleHandle, { width: size * 0.16, height: size * 0.36 }]} />
      <Text style={[styles.paddleLabel, small && { fontSize: 13 }]}>
        {label} <Text style={styles.paddleWeight}>· {weight}</Text>
      </Text>
      {note ? <Text style={styles.paddleNote}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { fontFamily: font.display, color: c.ink },
  stamp: { borderWidth: 3, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  stampInner: { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 2 },
  stampCaption: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  stampTitle: { fontFamily: font.display, textAlign: 'center' },
  stampRange: { fontFamily: font.body, fontSize: 14, letterSpacing: 0, textTransform: 'none' },
  bulbs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bulb: { backgroundColor: c.bulbOff, borderWidth: 1.5, borderColor: c.paper },
  bulbLit: { backgroundColor: c.orange, boxShadow: '0 0 0 3px rgba(247,166,30,0.35)' },
  ticket: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'flex-start',
    backgroundColor: c.orange,
    borderRadius: 16,
    transform: [{ rotate: '-1.5deg' }],
    ...outline,
    ...shadow(5),
  },
  ticketTitle: { fontFamily: font.bold, fontSize: 18, lineHeight: 23, color: c.ink, paddingHorizontal: 22, paddingVertical: 16, textAlign: 'center' },
  ticketStub: { borderLeftWidth: 2.5, borderLeftColor: c.ink, borderStyle: 'dashed', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  ticketStubTop: { fontFamily: font.semi, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: c.ink },
  ticketStubBottom: { fontFamily: font.display, fontSize: 16, lineHeight: 20, color: c.ink },
  tape: { position: 'absolute', top: -14, width: 84, height: 28, backgroundColor: c.orange, borderWidth: 2, borderColor: c.ink },
  bubble: {
    position: 'absolute',
    backgroundColor: c.paper,
    borderRadius: 14,
    borderBottomLeftRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 3,
    ...outline,
  },
  bubbleText: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: c.ink },
  paddle: { alignItems: 'center', flexGrow: 1, flexBasis: 0, minWidth: 100 },
  paddleFace: { backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', ...outline },
  paddleValue: { fontFamily: font.display, color: c.ink },
  paddleHandle: { backgroundColor: c.orange, borderWidth: 2.5, borderTopWidth: 0, borderColor: c.ink, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  paddleLabel: { fontFamily: font.bold, fontSize: 16, lineHeight: 21, color: c.ink, marginTop: 8, textAlign: 'center' },
  paddleWeight: { fontFamily: font.medium, color: c.graphite },
  paddleNote: { fontFamily: font.body, fontSize: 14, lineHeight: 19, color: c.graphite, textAlign: 'center', maxWidth: 220, marginTop: 2 },
});
