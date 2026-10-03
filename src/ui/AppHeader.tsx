import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { c, font, outline } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';

import { Logo } from './decor';
import { Container } from './primitives';

/** Шапка: логотип слева, справа — что передали (ник, «В меню», «Войти»). */
export function AppHeader({ children, home = '/menu' }: { children?: ReactNode; home?: '/' | '/menu' }) {
  const { wide } = useLayout();
  return (
    <Container style={[styles.header, { paddingTop: wide ? 24 : 16 }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Stage Zero" onPress={() => router.replace(home)} style={styles.logo}>
        <Logo size={wide ? 22 : 18} />
      </Pressable>
      {children}
    </Container>
  );
}

/** Ник в плашке с кружком-инициалом. */
export function NickChip({ nick }: { nick: string }) {
  return (
    <View style={styles.nick}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{nick.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={styles.nickText} numberOfLines={1}>
        {nick}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 12 },
  logo: { flexGrow: 1, minHeight: 44, justifyContent: 'center' },
  nick: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.paper, borderRadius: 999, paddingLeft: 6, paddingRight: 16, paddingVertical: 6, maxWidth: 220, ...outline },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.bold, fontSize: 15, color: c.onInk },
  nickText: { fontFamily: font.bold, fontSize: 16, color: c.ink, flexShrink: 1 },
});
