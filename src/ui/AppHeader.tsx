import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { c, font, outline } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';

import { Logo } from './decor';
import { GlassButton, GlassSurface } from './Glass';
import { LangSwitch } from './LangSwitch';
import { Container } from './primitives';

type Tab = 'menu' | 'profile';
const NAV: { tab: Tab; href: '/menu' | '/profile'; icon: 'home' | 'profile'; label: 'home' | 'profile' }[] = [
  { tab: 'menu', href: '/menu', icon: 'home', label: 'home' },
  { tab: 'profile', href: '/profile', icon: 'profile', label: 'profile' },
];

/**
 * Шапка: «назад» (если передан back), логотип, справа — переключатель языка и что передали (ник, «В меню», «Войти»).
 * glass — стеклянная полоса: на длинных страницах шапка прилипает к верху (Page sticky), а текст уезжает под неё.
 * nav — какая вкладка открыта: на компьютере в шапке стоят ссылки «Главная» и «Профиль» (на телефоне они в доке
 * внизу, в приложении — в системной панели вкладок).
 */
export function AppHeader({
  children,
  home = '/menu',
  back,
  glass = false,
  nav,
}: {
  children?: ReactNode;
  home?: '/' | '/menu';
  back?: () => void;
  glass?: boolean;
  nav?: Tab;
}) {
  const { wide } = useLayout();
  const insets = useSafeAreaInsets();
  const t = useT('common');
  const links = nav && wide && Platform.OS === 'web';
  // стеклянная полоса тянется под строку статуса: её отступ сверху — внутри стекла
  const row = (
    <Container style={[styles.header, { paddingTop: glass ? insets.top + 10 : wide ? 24 : 16, paddingBottom: glass ? 10 : 12 }]}>
      {back ? <GlassButton icon="back" title={wide ? t('back') : undefined} label={t('back')} onPress={back} /> : null}
      <Pressable accessibilityRole="link" accessibilityLabel="Stager" onPress={() => router.dismissTo(home)} style={[styles.logo, links && styles.logoFixed]}>
        <Logo size={wide ? 22 : 18} />
      </Pressable>
      {links ? (
        <View style={styles.nav} accessibilityRole="tablist">
          {NAV.map((item) => (
            <GlassButton key={item.tab} icon={item.icon} title={t(item.label)} active={item.tab === nav} onPress={() => item.tab !== nav && router.navigate(item.href)} />
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <LangSwitch />
        {children}
      </View>
    </Container>
  );
  if (!glass) return row;
  return (
    <GlassSurface round={0} style={styles.bar}>
      {row}
    </GlassSurface>
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
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(42,36,28,0.14)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { flexGrow: 1, flexShrink: 1, minHeight: 44, justifyContent: 'center' },
  // со ссылками логотип не растягивается: ссылки стоят по центру, язык и ник — справа
  logoFixed: { flexGrow: 0, flexBasis: 'auto', minWidth: 120 },
  nav: { flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nick: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.paper, borderRadius: 999, paddingLeft: 6, paddingRight: 16, paddingVertical: 6, maxWidth: 220, ...outline },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.bold, fontSize: 15, color: c.onInk },
  nickText: { fontFamily: font.bold, fontSize: 16, color: c.ink, flexShrink: 1 },
});
