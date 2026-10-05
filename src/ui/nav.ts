import { router, type Href } from 'expo-router';

/** Назад по стеку — с анимацией «назад». Некуда (страницу открыли по ссылке) — на запасной экран. */
export function goBack(fallback: Href = '/menu') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * На вкладку («Главная» или «Профиль»): экраны раунда поверх вкладок закрываются с анимацией «назад»,
 * затем выбирается нужная вкладка. Если вкладок в стеке нет (зашли по ссылке), они открываются вместо текущего экрана.
 */
export function goTab(href: '/menu' | '/profile') {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(href);
}

/** В меню — на вкладку «Главная». */
export function goMenu() {
  goTab('/menu');
}
