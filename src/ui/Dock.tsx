import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { c, font } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';

import { GlassSurface, Icon, type GlassIcon } from './Glass';

/** Вкладки дока: имя маршрута в группе (tabs) → значок и подпись (словарь common). */
export const TABS: Record<string, { icon: GlassIcon; label: 'home' | 'profile' }> = {
  menu: { icon: 'home', label: 'home' },
  profile: { icon: 'profile', label: 'profile' },
};

type DockState = { height: number; setHeight: (height: number) => void };
const DockContext = createContext<DockState>({ height: 0, setHeight: () => {} });

/** Экраны под доком узнают его высоту и оставляют под ним место, чтобы последние карточки не прятались за ним. */
export function DockProvider({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);
  return <DockContext.Provider value={{ height, setHeight }}>{children}</DockContext.Provider>;
}

/** Сколько места снизу занимает док; 0 — дока на экране нет. */
export function useDockInset(): number {
  return useContext(DockContext).height;
}

/**
 * Нижний док сайта на телефоне: стеклянная пилюля с вкладками «Главная» и «Профиль», висит над контентом
 * и учитывает нижнюю безопасную зону (панель Safari, полоска «домой»). На компьютере дока нет — вкладки стоят
 * в шапке (AppHeader nav). В приложении вместо него системная панель вкладок (app/(tabs)/_layout.tsx).
 */
export function Dock({ state, navigation, descriptors }: BottomTabBarProps) {
  const t = useT('common');
  const { wide } = useLayout();
  const insets = useSafeAreaInsets();
  const { setHeight } = useContext(DockContext);
  // на компьютере дока нет — страницы не оставляют под него место
  useEffect(() => {
    if (wide) setHeight(0);
  }, [wide, setHeight]);
  if (wide) return null;
  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <GlassSurface round={30} style={styles.dock}>
        <View style={styles.row} accessibilityRole="tablist">
          {state.routes.map((route, index) => {
            const tab = TABS[route.name];
            if (!tab) return null;
            const active = state.index === index;
            const label = descriptors[route.key]?.options.title ?? t(tab.label);
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
                onPress={onPress}
                style={(s) => {
                  const { pressed, hovered } = s as PressableStateCallbackType & { hovered?: boolean };
                  return [styles.tab, active && styles.tabOn, !active && (pressed || hovered) && styles.tabHover, pressed && styles.pressed];
                }}>
                <Icon name={tab.icon} color={active ? c.orange : c.ink} size={22} />
                <Text style={[styles.label, active && styles.labelOn]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  dock: { padding: 6 },
  row: { flexDirection: 'row', gap: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 128,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 24,
    ...(Platform.OS === 'web' ? ({ transitionProperty: 'background-color, transform', transitionDuration: '160ms' } as object) : null),
  },
  tabOn: { backgroundColor: c.ink },
  tabHover: { backgroundColor: 'rgba(42,36,28,0.08)' },
  pressed: { transform: [{ scale: 0.96 }] },
  label: { fontFamily: font.bold, fontSize: 15, color: c.ink },
  labelOn: { color: c.orange },
});
