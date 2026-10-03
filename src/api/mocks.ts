// Локальные моки для EXPO_PUBLIC_USE_MOCKS=1: приложение работает без бэкенда.
// Ответы повторяют ?mock=1 на бэкенде.

import type {
  Daily,
  Delivery,
  Finish,
  JuryAnswer,
  JuryQuestion,
  LeaderboardEntry,
  RefineResponse,
  Round,
  Spin,
  User,
} from './types';

const SPINS: Spin[] = [
  {
    category: { id: "philosophy", title: "🏛 Philosophy for Life" },
    case: {
      id: "stoicism",
      title: "Stoicism",
      brief: "Explain in simple words what Stoicism is and convince teachers it's worth discussing with students.",
      audience: "преподаватели",
      summary: "Stoicism is a philosophical movement and practical guide to living, emphasizing daily self-discipline and moral improvement, which originated in the Hellenistic period of ancient Greece and continued well into the Roman Imperial period.",
      sources: [
        { title: "Wikipedia: Stoicism", url: "https://en.wikipedia.org/wiki/Stoicism" },
        { title: "Britannica: Stoicism", url: "https://www.britannica.com/topic/Stoicism" },
        { title: "Simple English Wikipedia: Stoicism (easy English)", url: "https://simple.wikipedia.org/wiki/Stoicism" },
      ],
    },
  },
  {
    category: { id: "thinking_traps", title: "🧠 Thinking Traps" },
    case: {
      id: "sunk_cost",
      title: "The Sunk Cost Fallacy",
      brief: "Explain the sunk cost trap with an example and convince business people to shut down failing projects in time.",
      audience: "бизнесмены",
      summary: "In economics and business decision-making, a sunk cost is a cost that has already been incurred and cannot be recovered. Sunk costs are contrasted with prospective costs, which are future costs that may be avoided if action is taken.",
      sources: [
        { title: "Wikipedia: Sunk cost", url: "https://en.wikipedia.org/wiki/Sunk_cost" },
        { title: "Investopedia: Sunk cost", url: "https://www.investopedia.com/terms/s/sunkcost.asp" },
      ],
    },
  },
  {
    category: { id: "space", title: "🚀 Space and the Universe" },
    case: {
      id: "fermi_paradox",
      title: "The Fermi Paradox",
      brief: "Explain why we still haven't met aliens and convince the audience of your answer.",
      audience: "широкая публика",
      summary: "The Fermi paradox is the seeming inconsistency between the lack of evidence of extraterrestrial civilizations and the apparently high likelihood of their existence.",
      sources: [
        { title: "Wikipedia: Fermi paradox", url: "https://en.wikipedia.org/wiki/Fermi_paradox" },
        { title: "Britannica: Fermi paradox", url: "https://www.britannica.com/science/Fermi-paradox" },
        { title: "Simple English Wikipedia: Fermi paradox (easy English)", url: "https://simple.wikipedia.org/wiki/Fermi_paradox" },
      ],
    },
  },
];

let spinIndex = 0;

export const mocks = {
  auth: (nick: string): User => ({
    user_id: 'u_mock',
    nick,
    rank: { title: 'Новичок', trend: 'flat' },
  }),

  spin: (): Spin => SPINS[spinIndex++ % SPINS.length],

  daily: (): Daily => ({ date: new Date().toISOString().slice(0, 10), case: SPINS[0].case }),

  createRound: (): Round => ({
    round_id: 'rnd_mock_123',
    prep_sec: 300,
    pitch_min_sec: 60,
    pitch_max_sec: 180,
  }),

  delivery: (): Delivery => ({
    transcript:
      'Представьте: бабушка в восемь утра не помнит, выпила ли она таблетку от давления. ' +
      'Ну, это происходит каждый день с миллионами пожилых людей. ' +
      'Мы сделали умную таблетницу: она пищит, светится и присылает родственникам уведомление, ' +
      'если ячейка не открылась вовремя. Пилот в трёх аптеках, двести семей за месяц. ' +
      'Нам нужны партнёры среди аптечных сетей — давайте поговорим после выступления.',
    scores: {
      content: {
        total: 72,
        criteria: [
          { name: 'topic', score: 85, quote: 'Мы сделали умную таблетницу' },
          { name: 'structure', score: 70, quote: 'Нам нужны партнёры среди аптечных сетей' },
          {
            name: 'clarity',
            score: 75,
            quote: 'она пищит, светится и присылает родственникам уведомление',
          },
          { name: 'persuasion', score: 60, quote: 'Пилот в трёх аптеках, двести семей за месяц' },
        ],
      },
      delivery: { total: 78, fillers: 85, pace: 100, gaze: 70, pauses: 90, timing: 100 },
    },
    metrics: {
      duration_sec: 94.5,
      words: 212,
      wpm: 135,
      fillers: 3,
      fillers_per_min: 1.9,
      long_pauses: 1,
      gaze_on_ratio: 0.64,
    },
    events: [
      { type: 'filler', t: 8.2, text: '«ну»' },
      { type: 'gaze_off', t: 31.0, text: 'Взгляд мимо зала 4 секунды' },
      { type: 'long_pause', t: 52.4, text: 'Пауза 3.6 секунды посреди фразы' },
      { type: 'good_pause', t: 70.1, text: 'Удачная пауза перед цифрами' },
    ],
    tips: [
      'Начни с цифры: сколько приёмов лекарств пропускают пожилые.',
      'Смотри в телефон, когда называешь результаты пилота — это самый сильный момент.',
      'Замени «ну» короткой паузой.',
    ],
  }),

  juryQuestions: (): JuryQuestion[] => [
    {
      id: 'q1',
      juror: 'strict',
      text: 'А если бабушка не пользуется смартфоном, кто получит уведомление?',
      audio_url: '',
    },
    {
      id: 'q2',
      juror: 'kind',
      text: 'Двести семей за месяц — сколько из них остались с вами?',
      audio_url: '',
    },
    {
      id: 'q3',
      juror: 'skeptic',
      text: 'Сколько стоит таблетница и кто за неё платит?',
      audio_url: '',
    },
  ],

  juryAnswer: (): JuryAnswer => ({
    score: 68,
    comment: 'По существу, но не хватило конкретной цифры.',
  }),

  finish: (): Finish => ({
    total: 75.5,
    content: 70,
    delivery: 80,
    jury: 80,
    rank: { title: 'Оратор', trend: 'up' },
  }),

  leaderboard: (): LeaderboardEntry[] => [
    { nick: 'alex', score: 88.5 },
    { nick: 'maria', score: 79 },
  ],

  refine: (mode: 'structure' | 'improve'): RefineResponse => ({
    text:
      'Представьте, что 70% стартапов тратят месяцы на поиск первых клиентов вслепую.\n\n' +
      'Проблема: Основатели не умеют быстро тестировать гипотезы и сливают бюджет.\n\n' +
      'Решение: Наш сервис автоматически находит целевую аудиторию и собирает обратную связь за 24 часа.\n\n' +
      'Почему мы: Уже 40 команд закрыли первые продажи в первый же месяц работы.\n\n' +
      'Призыв: Давайте подключим ваш проект к закрытой бете прямо сегодня.',
    notes:
      mode === 'structure'
        ? [
            'Текст чётко структурирован по пяти классическим блокам питча.',
            'Сохранены все ключевые мысли автора, улучшена связность переходов.',
          ]
        : [
            'Добавлен конкретный хук с понятной цифрой в начале.',
            'Усилена аргументация в блоке «Почему мы» (указаны первые результаты).',
            'Сформулирован чёткий призыв к действию в конце.',
          ],
    blocks: [
      {
        kind: 'hook',
        title: 'Хук',
        text: 'Представьте, что 70% стартапов тратят месяцы на поиск первых клиентов вслепую.',
      },
      {
        kind: 'problem',
        title: 'Проблема',
        text: 'Основатели не умеют быстро тестировать гипотезы и сливают бюджет.',
      },
      {
        kind: 'solution',
        title: 'Решение',
        text: 'Наш сервис автоматически находит целевую аудиторию и собирает обратную связь за 24 часа.',
      },
      {
        kind: 'why_us',
        title: 'Почему мы',
        text: 'Уже 40 команд закрыли первые продажи в первый же месяц работы.',
      },
      {
        kind: 'call_to_action',
        title: 'Призыв к действию',
        text: 'Давайте подключим ваш проект к закрытой бете прямо сегодня.',
      },
    ],
  }),
};
