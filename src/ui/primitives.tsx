import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';

import { Backdrop } from './Backdrop';

type Children = { children?: ReactNode };

// в приложении страницы въезжают нативным переходом стека; в браузере стек не анимирует — страница появляется сама
const enter = Platform.OS === 'web' ? FadeInDown.duration(320).withInitialValues({ opacity: 0, transform: [{ translateY: 18 }] }) : undefined;

/**
 * Экран: кремовый фон с рисунками и силуэтами зала, прокрутка. Ширину держит Container.
 * Фон и прокрутка идут до самых краёв экрана: текст уезжает под строку статуса и полоску «домой»,
 * а отступы безопасной зоны стоят внутри прокрутки — сверху и снизу нет голых полос.
 * sticky — первый ребёнок (стеклянная шапка) прилипает к верху и сама уходит под строку статуса.
 * footer — главные кнопки экрана: приклеены к низу и всегда под пальцем, контент прокручивается под ними.
 */
export function Page({ children, scroll = true, sticky = false, footer }: Children & { scroll?: boolean; sticky?: boolean; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const sides = { paddingLeft: insets.left, paddingRight: insets.right };
  // контенту нужен отступ снизу на высоту панели, иначе последние карточки окажутся под ней
  const [footerHeight, setFooterHeight] = useState(0);
  const bottom = footer ? footerHeight + 16 : insets.bottom + 16;
  return (
    <View style={styles.page}>
      <Backdrop />
      <Animated.View entering={enter} style={[styles.body, sides]}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.pageContent, { paddingTop: sticky ? 0 : insets.top, paddingBottom: bottom }]}
            scrollIndicatorInsets={{ top: sticky ? 0 : insets.top, bottom: footer ? footerHeight : insets.bottom }}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={sticky ? [0] : undefined}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.body, { paddingTop: insets.top, paddingBottom: footer ? footerHeight : insets.bottom }]}>{children}</View>
        )}
      </Animated.View>
      {footer ? (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + 12, paddingLeft: insets.left, paddingRight: insets.right }]}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
          <Container>{footer}</Container>
        </View>
      ) : null}
    </View>
  );
}

/** Колонка контента: до 1200 px на сайте, с полями по краям. */
export function Container({ children, style, narrow }: Children & { style?: StyleProp<ViewStyle>; narrow?: boolean }) {
  const { pad } = useLayout();
  return (
    <View style={[styles.container, { paddingHorizontal: pad, maxWidth: narrow ? 760 : 1200 }, style]}>{children}</View>
  );
}

type TextProps = Children & { style?: StyleProp<TextStyle>; numberOfLines?: number };
const text = (base: TextStyle) =>
  function T({ children, style, numberOfLines }: TextProps) {
    return (
      <Text style={[base, style]} numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  };

export const H1 = text({ fontFamily: font.display, fontSize: 44, lineHeight: 50, color: c.ink });
export const H2 = text({ fontFamily: font.display, fontSize: 30, lineHeight: 36, color: c.ink });
export const H3 = text({ fontFamily: font.bold, fontSize: 21, lineHeight: 27, color: c.ink });
export const P = text({ fontFamily: font.body, fontSize: 17, lineHeight: 25, color: c.ink });
export const Muted = text({ fontFamily: font.body, fontSize: 16, lineHeight: 23, color: c.graphite });
export const Small = text({ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: c.graphite });
export const Label = text({
  fontFamily: font.bold,
  fontSize: 13,
  lineHeight: 17,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: c.burnt,
});
export const Num = text({ fontFamily: font.display, fontSize: 40, lineHeight: 46, color: c.ink });

export function ErrorText({ children }: Children) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ink';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, style, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        Platform.OS === 'web' && styles.buttonWeb,
        size === 'sm' && styles.buttonSm,
        size === 'lg' && styles.buttonLg,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ink' && styles.inkButton,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ink' ? c.onInk : c.ink} />
      ) : (
        <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, variant === 'ink' && { color: c.onInk }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type CardProps = Children & { tone?: 'paper' | 'accent' | 'ink'; flat?: boolean; style?: StyleProp<ViewStyle> };

export function Card({ children, tone = 'paper', flat, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        !flat && tone !== 'ink' && shadow(5),
        tone === 'accent' && { backgroundColor: c.orange },
        tone === 'ink' && styles.cardInk,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Метка-плашка: «Тренажёр выступлений». */
export function Tag({ children }: Children) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{children}</Text>
    </View>
  );
}

export function Chip({ title, selected, onPress }: { title: string; selected?: boolean; onPress?: () => void }) {
  const body = <Text style={[styles.chipText, selected && { color: c.onInk }]}>{title}</Text>;
  const style = [styles.chip, selected && { backgroundColor: c.ink }];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={style}>
      {body}
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={c.graphite}
      {...props}
      style={[styles.field, props.multiline && styles.fieldMultiline, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.cream },
  body: { flex: 1 },
  pageContent: { flexGrow: 1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: 'rgba(249, 247, 225, 0.94)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(22, 20, 24, 0.12)',
  },
  container: { width: '100%', alignSelf: 'center' },
  error: { fontFamily: font.semi, fontSize: 15, lineHeight: 21, color: c.bad },
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...outline,
  },
  buttonSm: { minHeight: 44, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8 },
  buttonLg: { minHeight: 60, paddingHorizontal: 30 },
  primary: { backgroundColor: c.orange, ...shadow(5) },
  secondary: { backgroundColor: c.paper },
  inkButton: { backgroundColor: c.ink, ...shadow(4, c.paper) },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  // в браузере нажатие и отпускание идут плавно; в приложении Pressable отрисовывает их сам
  buttonWeb: { transitionProperty: 'transform, box-shadow, opacity', transitionDuration: '120ms' } as ViewStyle,
  buttonText: { fontFamily: font.bold, fontSize: 18, lineHeight: 23, color: c.ink, textAlign: 'center' },
  buttonTextSm: { fontSize: 15, lineHeight: 19 },
  card: { backgroundColor: c.paper, borderRadius: 20, padding: 24, gap: 10, ...outline },
  cardInk: { backgroundColor: c.ink, borderWidth: 0 },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: c.orange,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    ...outline,
  },
  tagText: { fontFamily: font.bold, fontSize: 13, lineHeight: 17, letterSpacing: 1, textTransform: 'uppercase', color: c.ink },
  chip: { borderRadius: 999, borderWidth: 2, borderColor: c.ink, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  chipText: { fontFamily: font.semi, fontSize: 15, lineHeight: 19, color: c.ink },
  field: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: font.body,
    fontSize: 17,
    color: c.ink,
    backgroundColor: c.paper,
    ...outline,
  },
  fieldMultiline: { minHeight: 140, textAlignVertical: 'top' },
});
