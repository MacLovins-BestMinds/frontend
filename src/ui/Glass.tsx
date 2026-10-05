import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { c, font, outline } from '@/design/theme';

// настоящее «жидкое стекло» есть только на iOS 26+; на сайте — матовое стекло CSS, на Android — плотная плашка
const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();
const web = Platform.OS === 'web';

// backdropFilter есть только в вебе — в типах React Native его нет
const frosted = (tint: string) => ({ backgroundColor: tint, backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' }) as unknown as ViewStyle;

/** Стеклянная поверхность: полоса шапки, подложка под кнопки. */
export function GlassSurface({ children, style, round = 999 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; round?: number }) {
  if (liquid) {
    return (
      <GlassView glassEffectStyle="regular" tintColor="rgba(255,248,231,0.35)" style={[{ borderRadius: round, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  return <View style={[{ borderRadius: round }, web ? [frosted('rgba(255,250,238,0.62)'), styles.webEdge] : styles.solid, style]}>{children}</View>;
}

export type GlassIcon = 'back' | 'home' | 'close' | 'globe' | 'profile';

/** Значки навигации одной линией — для стеклянных кнопок и дока. */
export function Icon({ name, color = c.ink, size = 20 }: { name: GlassIcon; color?: string; size?: number }) {
  const d = {
    back: 'M15 5l-7 7 7 7',
    home: 'M4 11l8-7 8 7M6 10v9h4v-5h4v5h4v-9',
    close: 'M6 6l12 12M18 6L6 18',
    globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9s1.1-6.4 3.6-9',
    profile: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8M4.5 20.5c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5',
  }[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

/**
 * Кнопка-пилюля на стекле: «назад», «домой», язык, «Войти». Нажатие слегка сжимает её, в вебе при наведении
 * стекло становится плотнее. Без title — круглая кнопка 44×44 с одним значком (label обязателен для скринридера).
 * tone="ink" — тушь с оранжевой подписью: главное действие шапки («Войти») или выбранная вкладка.
 * selected — это вкладка (ссылки «Главная» и «Профиль» в шапке компьютера): роль tab и состояние selected;
 * без него это обычная кнопка.
 */
export function GlassButton({
  title,
  icon,
  onPress,
  label,
  tone = 'glass',
  selected,
}: {
  title?: string;
  icon?: GlassIcon;
  onPress: () => void;
  label?: string;
  tone?: 'glass' | 'ink';
  selected?: boolean;
}) {
  const ink = tone === 'ink';
  const color = ink ? c.orange : c.ink;
  const content = (
    <View style={[styles.row, !title && styles.iconOnly]}>
      {icon ? <Icon name={icon} color={color} /> : null}
      {title ? (
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
    </View>
  );
  const tab = selected !== undefined;
  return (
    <Pressable
      accessibilityRole={tab ? 'tab' : 'button'}
      accessibilityState={tab ? { selected } : undefined}
      accessibilityLabel={label ?? title}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
      {({ hovered }: { pressed: boolean; hovered?: boolean }) =>
        ink ? (
          <View style={[styles.pill, styles.ink]}>{content}</View>
        ) : liquid ? (
          <GlassView glassEffectStyle="regular" isInteractive tintColor="rgba(255,248,231,0.3)" style={styles.pill}>
            {content}
          </GlassView>
        ) : (
          <View style={[styles.pill, web ? [frosted(hovered ? 'rgba(255,252,244,0.92)' : 'rgba(255,250,238,0.7)'), styles.webEdge] : styles.solid]}>{content}</View>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: 999, ...(web ? ({ transitionProperty: 'transform', transitionDuration: '160ms' } as object) : null) },
  pressed: { transform: [{ scale: 0.94 }] },
  pill: { borderRadius: 999, minHeight: 44, justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 16 },
  iconOnly: { width: 44, paddingLeft: 0, paddingRight: 0, justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 15, color: c.ink },
  solid: { backgroundColor: c.paper, ...outline },
  ink: { backgroundColor: c.ink, borderWidth: 2.5, borderColor: c.ink },
  webEdge: { borderWidth: 1.5, borderColor: 'rgba(42,36,28,0.18)', boxShadow: '0 6px 20px rgba(42,36,28,0.10), inset 0 1px 0 rgba(255,255,255,0.7)' } as ViewStyle,
});
