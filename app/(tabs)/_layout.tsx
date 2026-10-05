import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { c, font } from '@/design/theme';
import { useT } from '@/i18n';
import { useGame } from '@/store/game';
import { Dock, DockProvider } from '@/ui/Dock';

// iOS: каждая вкладка получает свой SafeAreaProvider, и страницы (Page, AppHeader) сами отступают от строки статуса
// и от панели вкладок. Системная подстройка отступов прокрутки добавила бы те же отступы второй раз — сверху
// и снизу появлялись пустые полосы. На Android подстройка оборачивает вкладку в SafeAreaView снизу — её оставляем.
const MANUAL_INSETS = Platform.OS === 'ios';

/**
 * Две вкладки для тех, кто вошёл: главная (меню режимов) и профиль с прогрессом.
 * В приложении — системная панель вкладок: на iOS 26 это «жидкое стекло», которое прячется при прокрутке,
 * на Android — Material-панель. На сайте — свой стеклянный док внизу на телефоне и ссылки в шапке на компьютере.
 * Раунд (колесо, подготовка, сцена, жюри, разбор) открывается поверх вкладок — там док не мешает.
 */
export default function TabsLayout() {
  const t = useT('common');
  const user = useGame((s) => s.user);
  // вкладки — только для вошедших: без входа не показываем даже их рамку (док, системную панель)
  if (!user) return <Redirect href="/" />;
  if (Platform.OS === 'web') {
    return (
      <DockProvider>
        <Tabs tabBar={(props) => <Dock {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.cream } }}>
          <Tabs.Screen name="menu" options={{ title: t('home') }} />
          <Tabs.Screen name="profile" options={{ title: t('profile') }} />
        </Tabs>
      </DockProvider>
    );
  }
  return (
    <NativeTabs
      tintColor={c.ink}
      iconColor={{ default: c.graphite, selected: c.ink }}
      labelStyle={{ default: { fontFamily: font.semi, color: c.graphite }, selected: { fontFamily: font.bold, color: c.ink } }}
      minimizeBehavior="onScrollDown"
      rippleColor="rgba(247,166,30,0.35)"
      indicatorColor="rgba(247,166,30,0.4)">
      <NativeTabs.Trigger name="menu" disableAutomaticContentInsets={MANUAL_INSETS}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home' }} />
        <NativeTabs.Trigger.Label>{t('home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" disableAutomaticContentInsets={MANUAL_INSETS}>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md={{ default: 'account_circle', selected: 'account_circle' }} />
        <NativeTabs.Trigger.Label>{t('profile')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
