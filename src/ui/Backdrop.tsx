import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { c } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';

/** Тон чуть темнее кремового фона: рисунки видны, но текст не перебивают. */
const TONE = '#ECE6C6';
const TONE_DARK = '#E2DBB6';

type Kind = 'flower' | 'spark' | 'squiggle' | 'ring' | 'note';
type Doodle = { kind: Kind; x: number; y: number; size: number; tilt?: number; color?: string };

// x, y — доли окна. Рисунки стоят по краям, где нет текста.
const WIDE: Doodle[] = [
  { kind: 'flower', x: 0.035, y: 0.2, size: 64, tilt: -14 },
  { kind: 'spark', x: 0.085, y: 0.44, size: 38, color: c.orange },
  { kind: 'squiggle', x: 0.02, y: 0.62, size: 96, tilt: -18 },
  { kind: 'ring', x: 0.07, y: 0.8, size: 44 },
  { kind: 'spark', x: 0.955, y: 0.17, size: 54 },
  { kind: 'note', x: 0.9, y: 0.36, size: 44, tilt: 12 },
  { kind: 'flower', x: 0.94, y: 0.58, size: 46, tilt: 20, color: c.orange },
  { kind: 'squiggle', x: 0.9, y: 0.77, size: 88, tilt: 14 },
  { kind: 'spark', x: 0.5, y: 0.045, size: 26 },
  { kind: 'ring', x: 0.3, y: 0.08, size: 22, color: c.orange },
  { kind: 'ring', x: 0.72, y: 0.06, size: 30 },
];
const NARROW: Doodle[] = [
  { kind: 'flower', x: 0.86, y: 0.07, size: 40, tilt: 14 },
  { kind: 'spark', x: 0.04, y: 0.3, size: 26, color: c.orange },
  { kind: 'squiggle', x: 0.72, y: 0.52, size: 70, tilt: 12 },
  { kind: 'ring', x: 0.05, y: 0.7, size: 26 },
  { kind: 'spark', x: 0.88, y: 0.8, size: 30 },
];

function Shape({ kind, color }: { kind: Kind; color: string }) {
  // все рисунки в квадрате 24×24
  if (kind === 'flower')
    return (
      <G fill={color}>
        <Circle cx={12} cy={5.5} r={4.5} />
        <Circle cx={18.2} cy={10} r={4.5} />
        <Circle cx={15.8} cy={17.3} r={4.5} />
        <Circle cx={8.2} cy={17.3} r={4.5} />
        <Circle cx={5.8} cy={10} r={4.5} />
        <Circle cx={12} cy={12} r={3} fill={c.cream} />
      </G>
    );
  if (kind === 'spark') return <Path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={color} />;
  if (kind === 'squiggle') return <Path d="M1 12 Q4 6 7 12 T13 12 T19 12 T25 12" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />;
  if (kind === 'ring') return <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={3} strokeDasharray="5 4" />;
  return (
    <G fill={color}>
      <Ellipse cx={7} cy={19} rx={5} ry={3.6} />
      <Path d="M10.4 19 V3 L21 6 V10 L12.6 7.6 V19 Z" />
    </G>
  );
}

type BackdropProps = {
  /** Зрители-силуэты внизу. */
  crowd?: boolean;
  /** Цвет рисунков и силуэтов — для цветных секций. */
  tone?: string;
  toneDark?: string;
  /** Лучи софитов из верхних углов. */
  beams?: string | false;
  /** Размер области, если это не всё окно. */
  width?: number;
  height?: number;
};

/**
 * Фон страницы: лучи софитов из верхних углов, рисунки по краям (цветы со скатерти, искры, ноты)
 * и ряд силуэтов зрителей внизу. Лежит под контентом и не ловит нажатия.
 */
export function Backdrop({ crowd = true, tone = TONE, toneDark = TONE_DARK, beams = c.paper, width, height }: BackdropProps) {
  const layout = useLayout();
  const w = width ?? layout.width;
  const h = height ?? layout.height;
  if (w <= 0 || h <= 0) return null;
  const doodles = layout.wide ? WIDE : NARROW;
  const step = layout.wide ? 128 : 84;
  const head = step * 0.2;
  const seats = Math.ceil(w / step) + 2;
  return (
    <View style={styles.layer} pointerEvents="none">
      <Svg width={w} height={h}>
        {beams ? (
          <G fill={beams} opacity={0.55}>
            <Path d={`M-40 -40 L${w * 0.16} ${h} L${w * 0.5} ${h} Z`} />
            <Path d={`M${w + 40} -40 L${w * 0.84} ${h} L${w * 0.5} ${h} Z`} />
          </G>
        ) : null}
        {doodles.map((d, i) => {
          const k = d.size / 24;
          return (
            <G key={i} transform={`translate(${d.x * w} ${d.y * h}) rotate(${d.tilt ?? 0}) scale(${k}) translate(-12 -12)`} opacity={d.color ? 0.5 : 1}>
              <Shape kind={d.kind} color={d.color ?? tone} />
            </G>
          );
        })}
        {crowd ? (
          <>
            {/* дальний ряд — светлее и выше */}
            <G fill={tone}>
              {Array.from({ length: seats }, (_, i) => {
                const x = (i - 0.5) * step;
                const lift = ((i * 7) % 5) * 3;
                return (
                  <G key={i}>
                    <Circle cx={x} cy={h - head * 3.3 - lift} r={head * 0.9} />
                    <Ellipse cx={x} cy={h - head * 0.9 - lift} rx={head * 1.75} ry={head * 1.7} />
                  </G>
                );
              })}
            </G>
            <G fill={toneDark}>
              {Array.from({ length: seats }, (_, i) => {
                const x = i * step;
                const lift = ((i * 5) % 4) * 4;
                return (
                  <G key={i}>
                    <Circle cx={x} cy={h - head * 2.1 - lift} r={head} />
                    <Ellipse cx={x} cy={h + head * 0.5 - lift} rx={head * 2} ry={head * 1.8} />
                  </G>
                );
              })}
            </G>
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden' },
});
