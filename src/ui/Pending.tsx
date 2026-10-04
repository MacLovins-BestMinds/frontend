import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { c, font, formatTime } from '@/design/theme';

import { Card, H3, Muted } from './primitives';

type Props = {
  title: string;
  /** Шаги по порядку; current — индекс того, что идёт сейчас (до него — готово, после — впереди). */
  steps: string[];
  current: number;
  /** Сколько это обычно длится — чтобы ожидание не казалось зависанием. */
  note?: string;
  style?: StyleProp<ViewStyle>;
};

/** Карточка ожидания: что уже сделано, что идёт прямо сейчас и сколько секунд прошло. */
export function Pending({ title, steps, current, note, style }: Props) {
  const [startedAt] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.head} accessibilityLiveRegion="polite">
        <ActivityIndicator color={c.ink} />
        <H3 style={styles.title}>{title}</H3>
        <Text style={styles.elapsed}>{formatTime(elapsed)}</Text>
      </View>
      <View style={styles.steps}>
        {steps.map((step, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <View key={step} style={styles.step}>
              <View style={[styles.dot, done && styles.dotDone, now && styles.dotNow]}>
                <Text style={[styles.dotText, done && { color: c.onInk }]}>{done ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.stepText, now && styles.stepNow, i > current && styles.stepLater]}>{step}</Text>
            </View>
          );
        })}
      </View>
      {note ? <Muted>{note}</Muted> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  elapsed: { fontFamily: font.semi, fontSize: 15, color: c.graphite, fontVariant: ['tabular-nums'] },
  steps: { gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper, borderWidth: 2, borderColor: c.ink },
  dotDone: { backgroundColor: c.ink },
  dotNow: { backgroundColor: c.orange },
  dotText: { fontFamily: font.bold, fontSize: 13, color: c.ink },
  stepText: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: c.ink, flexShrink: 1 },
  stepNow: { fontFamily: font.bold },
  stepLater: { color: c.graphite },
});
