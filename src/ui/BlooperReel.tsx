import { Pressable, StyleSheet, Text, View } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';
import { useT } from '@/i18n';

import type { ReelSegment } from './reel';

type ScreenProps = {
  segment: ReelSegment;
  index: number;
  count: number;
  /** Сколько отрезка уже прошло, 0–1. */
  progress: number;
  /** Поверх кадра видео; иначе — отдельный тёмный «экран» для записи без видео. */
  framed: boolean;
};

/**
 * Экран нарезки: значок «нарезка», счётчик «3/9» и подпись ошибки — что это и какое слово или фраза.
 * Поверх видео — прозрачный слой; без видео — тёмная плашка того же вида, звук идёт из плеера под ней.
 */
export function ReelScreen({ segment, index, count, progress, framed }: ScreenProps) {
  const t = useT('insights');
  const items = segment.items.slice(0, 2);
  return (
    <View pointerEvents="none" style={framed ? styles.overlay : styles.stage} accessibilityLiveRegion="polite">
      <View style={styles.top}>
        <View style={styles.chip}>
          <View style={styles.rec} />
          <Text style={styles.chipText}>{t('reelTitle')}</Text>
        </View>
        <View style={styles.chip} accessibilityLabel={t('reelPosition', { i: index + 1, n: count })}>
          <Text style={[styles.chipText, styles.count]}>
            {index + 1}/{count}
          </Text>
        </View>
      </View>
      <View style={[styles.caption, !framed && styles.captionStage]}>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <View style={styles.itemHead}>
              <View style={[styles.swatch, { backgroundColor: item.color }]} />
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            {item.detail ? (
              <Text style={styles.itemDetail} numberOfLines={2}>
                {item.detail}
              </Text>
            ) : null}
          </View>
        ))}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

type BarProps = {
  /** Сколько отрезков в нарезке. */
  count: number;
  /** Номер текущего отрезка; null — нарезка не идёт, показываем кнопку запуска. */
  index: number | null;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
};

/** Под плеером: кнопка «Нарезка факапов» или, пока она идёт, переходы и «Стоп». */
export function ReelBar({ count, index, onStart, onPrev, onNext, onStop }: BarProps) {
  const t = useT('insights');
  if (index === null) {
    return (
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => [styles.start, pressed && styles.pressed]}>
          <View style={styles.rec} />
          <Text style={styles.startText}>{t('reelTitle')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </Pressable>
        <Text style={styles.note}>{t('reelNote', { n: count })}</Text>
      </View>
    );
  }
  const first = index === 0;
  const last = index >= count - 1;
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('reelPrev')} disabled={first} onPress={onPrev} style={[styles.skip, first && styles.off]}>
        <Text style={styles.skipText}>‹</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('reelStopLabel')} onPress={onStop} style={({ pressed }) => [styles.stop, pressed && styles.pressed]}>
        <View style={styles.square} />
        <Text style={styles.stopText}>{t('reelStop')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('reelNext')} disabled={last} onPress={onNext} style={[styles.skip, last && styles.off]}>
        <Text style={styles.skipText}>›</Text>
      </Pressable>
      <Text style={styles.position}>{t('reelPosition', { i: index + 1, n: count })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 10, justifyContent: 'space-between' },
  stage: { minHeight: 170, padding: 12, gap: 14, justifyContent: 'space-between', borderRadius: 18, backgroundColor: c.lens, ...outline, ...shadow(4) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase', color: c.onInk },
  count: { fontVariant: ['tabular-nums'], letterSpacing: 0 },
  // красная точка, как у записи
  rec: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.markBad },
  caption: { alignSelf: 'flex-start', maxWidth: '100%', gap: 8, backgroundColor: c.paper, borderRadius: 14, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, ...outline },
  captionStage: { alignSelf: 'stretch' },
  item: { gap: 2 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: c.ink },
  itemTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: c.ink, flexShrink: 1 },
  itemDetail: { fontFamily: font.italic, fontSize: 14, lineHeight: 19, color: c.graphite },
  track: { height: 4, borderRadius: 2, backgroundColor: c.markPause, overflow: 'hidden', minWidth: 160 },
  fill: { height: '100%', backgroundColor: c.ink },
  bar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  start: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 14, paddingHorizontal: 14, backgroundColor: c.ink, ...shadow(3, c.orange) },
  startText: { fontFamily: font.bold, fontSize: 15, lineHeight: 19, color: c.onInk },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: c.orange },
  badgeText: { fontFamily: font.bold, fontSize: 12, color: c.ink, fontVariant: ['tabular-nums'] },
  note: { flex: 1, minWidth: 160, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: c.graphite },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  skip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.ink, backgroundColor: c.paper },
  skipText: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: c.ink },
  off: { opacity: 0.35 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderRadius: 20, paddingHorizontal: 16, backgroundColor: c.ink },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: c.onInk },
  stopText: { fontFamily: font.bold, fontSize: 15, lineHeight: 19, color: c.onInk },
  position: { flex: 1, textAlign: 'right', fontFamily: font.semi, fontSize: 14, color: c.ink, fontVariant: ['tabular-nums'] },
});
