import type { PickedFile } from '@/api/types';
import { translate } from '@/i18n';

/** Слайд презентации как картинка: адрес и отношение ширины к высоте. */
export type Slide = { uri: string; ratio: number };

/**
 * Превращает презентацию в картинки слайдов для показа на сцене. В приложении пока не работает —
 * показ слайдов есть только в браузере (render.web.ts).
 */
export async function renderSlides(_file: PickedFile): Promise<Slide[]> {
  throw new Error(translate('common', 'errSlidesApp'));
}
