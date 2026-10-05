import { translate } from '@/i18n';
import { useGame } from '@/store/game';

import { confirm } from './confirm';

/**
 * Новая тема заменяет незаконченный раунд (питч разобран, жюри ждёт). Молча этого не делаем: спрашиваем.
 * true — можно начинать (незаконченного раунда нет или игрок согласился его бросить).
 */
export async function okToStartNewRound(): Promise<boolean> {
  const s = useGame.getState();
  if (!(s.round && s.delivery && !s.result && !s.reviewOf)) return true;
  return confirm({
    title: translate('menu', 'replaceTitle'),
    message: translate('menu', 'replaceText'),
    ok: translate('menu', 'replaceOk'),
    cancel: translate('common', 'cancel'),
    destructive: true,
  });
}
