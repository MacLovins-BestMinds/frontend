import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { c } from '@/design/theme';

import { CHARACTERS, JURY, LAYERS } from './assets';
import { SCENE, type Orientation } from './layout';

const TICK_MS = 450;
export type JurorId = keyof typeof JURY;
export const JURORS = SCENE.jury.names as readonly JurorId[];

type Mood = 'idle' | 'surprised' | 'bored';

/** Кто из переднего ряда первым начинает скучать: порядок фиксированный, чтобы зал не мигал. */
const BORED_ORDER = [3, 8, 0, 6, 9, 1, 5, 4, 7, 2];
const AMAZED_ORDER = [5, 2, 7, 0, 9, 4, 1, 8, 3, 6];

function moods(attention: number, count: number): Mood[] {
  const out: Mood[] = Array(count).fill('idle');
  // Ступени вокруг середины шкалы. Чуть ниже половины — двое отвлеклись, заметно ниже — почти все в телефонах.
  // Чуть выше половины — двое удивлены, выше 70 — удивлённых всё больше.
  const share = (n: number) => Math.round((n / 10) * count);
  const bored = attention < 28 ? share(8) : attention < 38 ? share(5) : attention < 47 ? share(2) : 0;
  const amazed = attention > 85 ? share(8) : attention > 70 ? share(5) : attention > 53 ? share(2) : 0;
  BORED_ORDER.slice(0, bored).forEach((i) => (out[i % count] = 'bored'));
  AMAZED_ORDER.slice(0, amazed).forEach((i) => (out[i % count] = 'surprised'));
  return out;
}

export function useTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return tick;
}

type SpriteProps = { name: string; mood: Mood; tick: number; boredSince: number; style: object };

/** Один зритель. Все кадры лежат стопкой, виден только текущий — так кадры не мигают при смене. */
function Sprite({ name, mood, tick, boredSince, style }: SpriteProps) {
  const ch = CHARACTERS[name];
  const frames = useMemo(() => [ch.idle, ch.surprised, ...ch.intro, ...ch.loop], [ch]);
  let current = 0;
  if (mood === 'surprised') current = 1;
  else if (mood === 'bored' && ch.loop.length > 0) {
    const t = Math.max(0, tick - boredSince);
    current = t < ch.intro.length ? 2 + t : 2 + ch.intro.length + (Math.floor((t - ch.intro.length) / ch.hold) % ch.loop.length);
  }
  return (
    <View style={style}>
      {frames.map((src, i) => (
        <Image key={i} source={src} style={[StyleSheet.absoluteFill, styles.fill, { opacity: i === current ? 1 : 0 }]} resizeMode="contain" />
      ))}
    </View>
  );
}

type JuryStripProps = { writing?: Partial<Record<JurorId, boolean>>; scale: number; left?: number; top?: number };

/** Трое жюри за столом. Каждый — отдельная колонка с двумя состояниями: сидит и пишет. */
export function JuryStrip({ writing, scale, left = 0, top = 0 }: JuryStripProps) {
  const { cuts, h } = SCENE.jury;
  return (
    <>
      {JURORS.map((id, j) => (
        <View key={id} style={{ position: 'absolute', left: left + cuts[j] * scale, top, width: (cuts[j + 1] - cuts[j]) * scale, height: h * scale }}>
          <Image source={JURY[id].idle} style={[StyleSheet.absoluteFill, styles.fill, { opacity: writing?.[id] ? 0 : 1 }]} />
          <Image source={JURY[id].writing} style={[StyleSheet.absoluteFill, styles.fill, { opacity: writing?.[id] ? 1 : 0 }]} />
        </View>
      ))}
    </>
  );
}

/** Жюри за столом на всю ширину блока: кто спрашивает — смотрит на тебя, остальные пишут. */
export function JuryTable({ speaking }: { speaking?: string }) {
  const [width, setWidth] = useState(0);
  const writing = speaking ? (Object.fromEntries(JURORS.map((id) => [id, id !== speaking])) as Record<JurorId, boolean>) : undefined;
  return (
    <View style={{ width: '100%', aspectRatio: SCENE.jury.w / SCENE.jury.h }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && <JuryStrip writing={writing} scale={width / SCENE.jury.w} />}
    </View>
  );
}

type AudienceSceneProps = { attention: number; width: number; height: number };

/**
 * Зал на весь экран: стена и пол, толпа силуэтов, десять живых зрителей, жюри за столом, кулисы.
 * Раскладка — горизонтальная или вертикальная — выбирается по размеру окна, сцена заполняет его целиком.
 */
export function AudienceScene({ attention, width, height }: AudienceSceneProps) {
  const tick = useTick();
  const orientation: Orientation = width > height ? 'landscape' : 'portrait';
  const scene = SCENE[orientation];
  const layers = LAYERS[orientation];
  const k = Math.max(width / scene.w, height / scene.h);
  const w = scene.w * k;
  const h = scene.h * k;

  const current = moods(attention, scene.front.length);
  // с какого такта каждый зритель скучает — чтобы «достаёт телефон» игралось с начала
  const [since, setSince] = useState<number[]>(() => scene.front.map(() => -1));
  useEffect(() => {
    setSince((prev) => current.map((m, i) => (m === 'bored' ? (prev[i] >= 0 ? prev[i] : tick) : -1)));
    // пересчитываем только при смене настроений
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.join()]);

  // жюри время от времени пишет: каждый — в своём ритме
  const writing = Object.fromEntries(JURORS.map((id, j) => [id, (tick + j * 9) % 26 < 7])) as Record<JurorId, boolean>;

  const sp = SCENE.sprite;
  const juryScale = scene.jury.scale * k;
  return (
    <View style={[styles.window, { width, height }]}>
      <View style={{ position: 'absolute', left: (width - w) / 2, top: (height - h) / 2, width: w, height: h }}>
        <Image source={layers.background} style={[StyleSheet.absoluteFill, styles.fill]} />
        <Image source={layers.crowd} style={[StyleSheet.absoluteFill, styles.fill]} />
        {scene.front.map((slot, i) => {
          const s = slot.scale * k;
          return (
            <Sprite
              key={slot.character}
              name={slot.character}
              mood={current[i]}
              tick={tick}
              boredSince={since[i] ?? tick}
              style={{ position: 'absolute', left: slot.x * k - sp.ax * s, top: slot.baseline * k - sp.ay * s, width: sp.w * s, height: sp.h * s }}
            />
          );
        })}
        <JuryStrip writing={writing} scale={juryScale} left={w / 2 - (SCENE.jury.w * juryScale) / 2} top={scene.jury.tableTopY * k - SCENE.jury.tableY * juryScale} />
        <Image source={layers.curtains} style={[StyleSheet.absoluteFill, styles.fill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden', backgroundColor: c.cream },
  fill: { width: '100%', height: '100%' },
});
