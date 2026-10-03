import type { AudienceId } from '@/api/types';

export type Source = { title: string; url: string };

export type Audience = {
  id: AudienceId;
  name: string;
  icon: string;
  /** Что важно этой аудитории — коротко, для карточек выбора. */
  focus: string;
  /** Кто сидит в зале. */
  who: string;
  /** О чём спросит жюри (так же строятся вопросы на бэкенде). */
  juryAsks: string;
  /** Как говорить с этой аудиторией. */
  tips: string[];
  sources: Source[];
};

/** Общие материалы про питч и выступление — для любой аудитории. */
export const GENERAL_SOURCES: Source[] = [
  {
    title: 'Крис Андерсон, TED: секрет хорошего выступления (TED, 8 мин)',
    url: 'https://www.ted.com/talks/chris_anderson_ted_s_secret_to_great_public_speaking',
  },
  {
    title: 'Джулиан Трежер: как говорить, чтобы тебя слушали (TED, 10 мин)',
    url: 'https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen',
  },
];

export const AUDIENCES: Audience[] = [
  {
    id: 'contest_jury',
    name: 'Жюри конкурса',
    icon: '🏆',
    focus: 'Новизна идеи, масштабируемость и реализуемость',
    who: 'Эксперты, которые за день слушают десятки проектов и сравнивают их между собой.',
    juryAsks: 'Чем идея новая, можно ли её сделать и почему именно вы.',
    tips: [
      'В первых 15 секундах скажи, чем ты отличаешься от того, что уже есть.',
      'Покажи, что идея реализуема: первый шаг, сроки, что уже сделано.',
      'Закончи одной фразой, которую жюри запомнит после десятого питча.',
    ],
    sources: [
      {
        title: 'Гай Кавасаки: правило 10/20/30 для питча',
        url: 'https://guykawasaki.com/the_102030_rule/',
      },
      {
        title: 'Нэнси Дуарте, «Resonate»: как выстроить историю выступления',
        url: 'https://www.duarte.com/resources/books/resonate/',
      },
    ],
  },
  {
    id: 'business',
    name: 'Бизнесмены',
    icon: '💼',
    focus: 'Деньги, бизнес-модель, рынок и окупаемость',
    who: 'Предприниматели и инвесторы: думают о рисках и о том, когда вернутся деньги.',
    juryAsks: 'Кто платит, сколько стоит, какой рынок и когда окупится.',
    tips: [
      'Назови клиента, который платит, и сумму — без цифр бизнес не услышит идею.',
      'Одной фразой объясни, как вы зарабатываете.',
      'Приведи доказательство спроса: пилот, предзаказы, интервью с клиентами.',
    ],
    sources: [
      {
        title: 'Y Combinator: как питчить свою компанию (Майкл Сайбел)',
        url: 'https://www.ycombinator.com/library/4b-how-to-pitch-your-company',
      },
      {
        title: 'Гай Кавасаки: правило 10/20/30 для питча',
        url: 'https://guykawasaki.com/the_102030_rule/',
      },
    ],
  },
  {
    id: 'teachers',
    name: 'Преподаватели',
    icon: '🎓',
    focus: 'Обоснованность, логика, глубина и последствия',
    who: 'Учителя и преподаватели: ценят логику, доказательства и заботу об учениках.',
    juryAsks: 'На чём основана идея, что будет с учениками и какие у неё риски.',
    tips: [
      'Опирайся на факты и примеры, а не на громкие обещания.',
      'Покажи, что подумал о последствиях и рисках для учеников.',
      'Объясняй по шагам: проблема → причина → решение → результат.',
    ],
    sources: [
      {
        title: 'Чип и Дэн Хиз, «Made to Stick»: как сделать идею понятной и запоминающейся',
        url: 'https://heathbrothers.com/books/made-to-stick/',
      },
    ],
  },
  {
    id: 'public',
    name: 'Широкая публика',
    icon: '👥',
    focus: 'Простота, эмоциональная польза для человека',
    who: 'Обычные люди без специальных знаний: им важно, что изменится в их жизни.',
    juryAsks: 'Зачем это лично мне, просто ли пользоваться и сколько стоит.',
    tips: [
      'Начни с истории или ситуации, которую узнает каждый.',
      'Никаких терминов — объясняй так, как объяснил бы другу.',
      'Покажи пользу на одном живом примере.',
    ],
    sources: [
      {
        title: 'Чип и Дэн Хиз, «Made to Stick»: как сделать идею понятной и запоминающейся',
        url: 'https://heathbrothers.com/books/made-to-stick/',
      },
    ],
  },
];

/** Аудитория по id (`business`) или по названию с бэкенда (`бизнесмены`). */
export function findAudience(value: string): Audience | undefined {
  const v = value.trim().toLowerCase();
  return AUDIENCES.find((a) => a.id === v || a.name.toLowerCase() === v);
}
