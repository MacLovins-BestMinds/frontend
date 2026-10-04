import { router, type Href } from 'expo-router';

/** Назад по стеку — с анимацией «назад». Некуда (страницу открыли по ссылке) — на запасной экран. */
export function goBack(fallback: Href = '/menu') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * В меню: если оно уже есть в стеке, возвращаемся к нему, и экраны поверх уезжают с анимацией «назад».
 * Если меню в стеке нет (зашли по ссылке), оно открывается вместо текущего экрана.
 */
export function goMenu() {
  router.dismissTo('/menu');
}
