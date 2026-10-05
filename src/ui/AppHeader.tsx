import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { c, font } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { useGame } from '@/store/game';

import { Flower } from './decor';
import { GlassButton, GlassSurface } from './Glass';
import { LangSwitch } from './LangSwitch';
import { useSwitchTab } from './nav';
import { Container } from './primitives';

export type HeaderTab = 'menu' | 'profile';

/** Кнопка в левом углу шапки — единственный выход с экрана раунда (docs/ux.md). */
export type Corner = {
  /** back — шаг назад; home — на «Главную» (раунд окончен); close — выйти из раунда (с подтверждением). */
  icon: 'back' | 'home' | 'close';
  /** Что скажет скринридер: «Назад», «На главную», «Закончить раунд». */
  label: string;
  onPress: () => void;
};

const SLOT = 44;
const NICK_MAX = 14;

/**
 * Одна шапка на все экраны, кроме сцены, и везде одинаковая (правила — docs/ux.md):
 * - левый угол: на «Главной», в «Профиле» и на лендинге — цветок Stager; на экранах раунда на его месте кнопка
 *   (назад, домой или закрыть). Надпись «Stager» стоит в одном и том же месте на всех экранах;
 * - центр: на компьютере в браузере — вкладки «Главная» и профиль под ником, только на этих двух вкладках
 *   (на телефоне вкладки внизу: док сайта или системная панель приложения; в раунде их нет нигде);
 * - справа: язык и не больше одной кнопки экрана (на лендинге — «Войти»).
 * Логотип не нажимается: куда идти, говорят вкладки и угловая кнопка.
 */
export function AppHeader({ children, corner, tab }: { children?: ReactNode; corner?: Corner; tab?: HeaderTab }) {
  const { wide } = useLayout();
  const insets = useSafeAreaInsets();
  const t = useT('common');
  const user = useGame((s) => s.user);
  const switchTab = useSwitchTab();
  const links = !!tab && !!user && wide && Platform.OS === 'web';
  const nick = user ? (user.nick.length > NICK_MAX ? `${user.nick.slice(0, NICK_MAX - 1)}…` : user.nick) : '';
  return (
    // стеклянная полоса во всю ширину: тянется под строку статуса, прилипает к верху (Page sticky)
    <GlassSurface round={0} style={styles.bar}>
      <Container style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.slot}>
          {corner ? <GlassButton icon={corner.icon} label={corner.label} onPress={corner.onPress} /> : <Flower size={wide ? 30 : 26} />}
        </View>
        <Text style={[styles.wordmark, wide && styles.wordmarkWide]} accessibilityRole="text" numberOfLines={1}>
          Stager
        </Text>
        <View style={styles.middle} accessibilityRole={links ? 'tablist' : undefined}>
          {links ? (
            <>
              <GlassButton icon="home" title={t('home')} tone={tab === 'menu' ? 'ink' : 'glass'} selected={tab === 'menu'} onPress={() => tab !== 'menu' && switchTab('menu')} />
              <GlassButton
                icon="profile"
                title={nick}
                label={`${t('profile')}: ${user?.nick}`}
                tone={tab === 'profile' ? 'ink' : 'glass'}
                selected={tab === 'profile'}
                onPress={() => tab !== 'profile' && switchTab('profile')}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  slot: { width: SLOT, height: SLOT, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: c.ink },
  wordmarkWide: { fontSize: 23, lineHeight: 29 },
  middle: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
