import type { ConfirmOptions } from './confirm';

export type { ConfirmOptions } from './confirm';

/**
 * Сайт: Alert из react-native-web ничего не показывает, поэтому подтверждение — стандартный диалог браузера.
 * Он одинаково работает на компьютере и в мобильном Safari и не зависит от раскладки страницы.
 */
export function confirm({ title, message }: ConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(true);
  return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
}
