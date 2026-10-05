import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { useGame } from '@/store/game';

import { Logo } from './decor';
import { GlassButton, GlassSurface } from './Glass';
import { LangSwitch } from './LangSwitch';
import { goTab } from './nav';
import { Container } from './primitives';

export type HeaderTab = 'menu' | 'profile';
const SLOT = 44; // место под «назад»: оно есть на каждом экране, занято или пустое, поэтому логотип не двигается
const NICK_MAX = 14;

/**
 * Одна шапка на все экраны, кроме сцены, и везде одинаковая: стеклянная полоса, которая прилипает к верху
 * (Page sticky) и уходит под строку статуса. Слева — место под «назад», затем логотип, справа — язык и,
 * если экран передал, одна его кнопка (на лендинге — «Войти»). Ничего не прыгает от экрана к экрану.
 * На компьютере в браузере по центру стоят вкладки: «Главная» и профиль под ником игрока — это единственная
 * кнопка аккаунта. На телефоне и в приложении вкладки живут внизу (док сайта или системная панель), в шапке их нет.
 */
export function AppHeader({ children, back, nav }: { children?: ReactNode; back?: () => void; nav?: HeaderTab }) {
  const { wide } = useLayout();
  const insets = useSafeAreaInsets();
  const t = useT('common');
  const user = useGame((s) => s.user);
  const links = wide && Platform.OS === 'web' && !!user;
  const nick = user ? (user.nick.length > NICK_MAX ? `${user.nick.slice(0, NICK_MAX - 1)}…` : user.nick) : '';
  return (
    <GlassSurface round={0} style={styles.bar}>
      <Container style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.slot}>{back ? <GlassButton icon="back" label={t('back')} onPress={back} /> : null}</View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Stager"
          hitSlop={8}
          onPress={() => (user ? goTab('/menu') : router.dismissTo('/'))}
          style={styles.logo}>
          <Logo size={wide ? 22 : 18} />
        </Pressable>
        <View style={styles.middle} accessibilityRole={links ? 'tablist' : undefined}>
          {links ? (
            <>
              <GlassButton icon="home" title={t('home')} active={nav === 'menu'} onPress={() => nav !== 'menu' && goTab('/menu')} />
              <GlassButton
                icon="profile"
                title={nick}
                label={`${t('profile')}: ${user?.nick}`}
                active={nav === 'profile'}
                onPress={() => nav !== 'profile' && goTab('/profile')}
              />
            </>
          ) : null}
        </View>
        <View style={styles.actions}>
          <LangSwitch />
          {children}
        </View>
      </Container>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(42,36,28,0.14)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 },
  slot: { width: SLOT, height: SLOT, justifyContent: 'center' },
  logo: { minHeight: SLOT, justifyContent: 'center' },
  middle: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
