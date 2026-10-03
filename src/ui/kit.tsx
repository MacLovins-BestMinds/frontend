import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.accentText : colors.text} />
      ) : (
        <Text style={[styles.buttonText, !primary && styles.secondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  fill: { flex: 1 },
  button: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.cardLight },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonText: { fontSize: 17, fontWeight: '700', color: colors.accentText },
  secondaryText: { color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  muted: { color: colors.muted },
  error: { fontSize: 14, color: colors.bad },
});
