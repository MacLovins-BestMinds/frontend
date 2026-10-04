import { strings } from '../define';

// Колесо тем (app/wheel.tsx).
export default strings(
  {
    title: 'Topic wheel',
    errSpin: 'The wheel did not spin: {message}',
    take: 'Take this topic',
    again: 'Spin again',
    category: 'Category',
    spinning: 'Spinning…',
    whatYouPitch: 'What you pitch',
    audience: 'Audience: {name}',
    audienceCares: 'Audience: {name} — they care about {focus}',
  },
  {
    ru: {
      title: 'Колесо тем',
      errSpin: 'Колесо не прокрутилось: {message}',
      take: 'Беру эту тему',
      again: 'Крутить ещё',
      category: 'Категория',
      spinning: 'Кручу…',
      whatYouPitch: 'Что питчишь',
      audience: 'Аудитория: {name}',
      audienceCares: 'Аудитория: {name} — им важно: {focus}',
    },
    ro: {
      title: 'Roata temelor',
      errSpin: 'Roata nu s-a învârtit: {message}',
      take: 'Iau tema asta',
      again: 'Mai învârte o dată',
      category: 'Categorie',
      spinning: 'Se învârte…',
      whatYouPitch: 'Ce prezinți',
      audience: 'Public: {name}',
      audienceCares: 'Public: {name} — contează pentru ei: {focus}',
    },
  },
);
