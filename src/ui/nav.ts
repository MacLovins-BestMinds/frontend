import { router, useFocusEffect, useNavigation, type Href } from 'expo-router';
import { useCallback, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

// Правила навигации — docs/ux.md. Здесь только действия, которыми их выполняют экраны.

/** Назад по стеку — с анимацией «назад». Некуда (страницу открыли по ссылке) — на запасной экран. */
export function goBack(fallback: Href = '/menu') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * На вкладку («Главная» или «Профиль») одним действием: экраны раунда поверх вкладок закрываются с анимацией
 * «назад» и открывается нужная вкладка. Вкладок в стеке нет (зашли по ссылке) — они встают вместо текущего экрана.
 */
export function goTab(href: '/menu' | '/profile') {
  // dismissTo с самой вкладки ничего не делает (закрывать нечего) — там вкладку просто переключаем
  if (router.canDismiss()) router.dismissTo(href);
  else router.navigate(href);
}

/**
 * Переключить вкладку изнутри вкладок (карточка звания на «Главной», вкладки в шапке компьютера): напрямую через
 * навигатор вкладок, как это делают док и системная панель. Маршрутный navigate отсюда после возврата браузерным
 * «назад» мог не переключить вкладку.
 */
export function useSwitchTab() {
  const navigation = useNavigation();
  return useCallback((tab: 'menu' | 'profile') => navigation.navigate(tab as never), [navigation]);
}

/** На вкладку «Главная». */
export function goMenu() {
  goTab('/menu');
}

/**
 * Системная кнопка «назад» на Android делает то же, что кнопка в углу шапки этого экрана (или что передали).
 * handler = null — обычное поведение (шаг назад по стеку). На iOS аппаратной кнопки нет, а свайп назад на экранах
 * раунда выключен в app/_layout.tsx; в браузере «назад» ведёт по истории, она для раунда устроена так же (docs/ux.md).
 */
export function useBackAction(handler: (() => void) | null) {
  const latest = useRef(handler);
  latest.current = handler;
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!latest.current) return false;
        latest.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );
}

/**
 * Выход на сцену с подготовки. Под сценой остаются только вкладки: колесо, свой питч и подготовка уходят из стека
 * (и из истории браузера). Поэтому «назад» с жюри и разбора ведёт на «Главную», а не на старое колесо,
 * а «Ещё раунд» не кладёт второе колесо поверх первого. Вкладки сохраняются как были (та же вкладка, тот же скролл).
 */
export function useGoOnStage() {
  const navigation = useNavigation();
  return useCallback(() => {
    const tabs = navigation.getState()?.routes.find((r) => r.name === '(tabs)');
    navigation.reset({ index: 1, routes: [tabs ?? { name: '(tabs)' }, { name: 'stage' }] } as Parameters<typeof navigation.reset>[0]);
  }, [navigation]);
}
