// Локальные моки для EXPO_PUBLIC_USE_MOCKS=1: приложение работает без бэкенда.
// Ответы повторяют ?mock=1 на бэкенде.

import type {
  Daily,
  Delivery,
  Finish,
  JuryAnswer,
  JuryQuestion,
  LeaderboardEntry,
  Round,
  Spin,
  User,
} from './types';

const SPINS: Spin[] = [
  {
    category: { id: 'health', title: 'Здоровье' },
    case: {
      id: 'health-01',
      title: 'Умная таблетница, которая напоминает пожилым о лекарствах',
      brief:
        'Ты придумал умную таблетницу, которая напоминает пожилым о лекарствах. Убеди зал, что она нужна.',
      audience: 'бизнесмены',
    },
  },
  {
    category: { id: 'education', title: 'Образование' },
    case: {
      id: 'education-01',
      title: 'Приложение, которое учит школьников выступать',
      brief:
        'Ты сделал приложение, в котором школьники тренируют устные ответы перед нарисованным классом. Убеди зал, что оно нужно школам.',
      audience: 'преподаватели',
    },
  },
  {
    category: { id: 'city', title: 'Город' },
    case: {
      id: 'city-01',
      title: 'Сервис совместных поездок для соседей',
      brief:
        'Ты запускаешь сервис, где соседи по дому договариваются о совместных поездках на работу. Убеди зал, что люди будут им пользоваться.',
      audience: 'широкая публика',
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
};
