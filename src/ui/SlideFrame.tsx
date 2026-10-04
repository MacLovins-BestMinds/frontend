import { useEffect } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { c, font, outline, shadow } from '@/design/theme';
import { useT } from '@/i18n';
import type { Slide } from '@/slides/render';

import { TrendArrow } from './decor';

type Props = {
  slides: Slide[];
  index: number;
  onIndex: (index: number) => void;
  width: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  /** Слушать стрелки клавиатуры (в браузере): ← и → листают слайды. */
  keys?: boolean;
};

/** Слайд презентации в рамке: листается стрелками на экране и на клавиатуре. */
export function SlideFrame({ slides, index, onIndex, width, tilt = -2, style, keys = true }: Props) {
  const t = useT('common');
  const last = slides.length - 1;
  const go = (step: number) => onIndex(Math.max(0, Math.min(last, index + step)));

  useEffect(() => {
    if (!keys || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      // в полях ввода стрелки двигают курсор, а не слайды
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // обработчик пересоздаётся при смене слайда
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, last, keys]);

  const slide = slides[index];
  if (!slide) return null;
  const small = width < 220;
  return (
    <View style={[styles.frame, shadow(small ? 3 : 5), { width, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Image source={{ uri: slide.uri }} style={{ width: '100%', aspectRatio: slide.ratio }} resizeMode="contain" accessibilityLabel={t('slide', { n: index + 1, total: slides.length })} />
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('prevSlide')} disabled={index === 0} onPress={() => go(-1)} hitSlop={8} style={[styles.arrow, styles.back, index === 0 && styles.off]}>
          <TrendArrow trend="flat" size={small ? 12 : 16} color={c.ink} />
        </Pressable>
        <Text style={[styles.count, small && { fontSize: 11 }]}>
          {index + 1} / {slides.length}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('nextSlide')} disabled={index === last} onPress={() => go(1)} hitSlop={8} style={[styles.arrow, index === last && styles.off]}>
          <TrendArrow trend="flat" size={small ? 12 : 16} color={c.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: c.paper, borderRadius: 14, overflow: 'hidden', ...outline },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.orange, borderTopWidth: 2.5, borderTopColor: c.ink, paddingHorizontal: 6, paddingVertical: 3 },
  arrow: { minWidth: 28, minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  back: { transform: [{ rotate: '180deg' }] },
  off: { opacity: 0.3 },
  count: { fontFamily: font.bold, fontSize: 13, color: c.ink, fontVariant: ['tabular-nums'] },
});
