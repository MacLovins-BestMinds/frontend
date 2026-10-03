// Local mocks for EXPO_PUBLIC_USE_MOCKS=1: the app works without a backend.
// The answers mirror ?mock=1 on the backend.

import type {
  AuthSession,
  Daily,
  Delivery,
  Finish,
  JuryAnswer,
  JuryQuestion,
  LeaderboardEntry,
  Profile,
  Progress,
  RefineResponse,
  RoundReview,
  Round,
  Spin,
  User,
} from './types';

const SPINS: Spin[] = [
  {
    category: { id: 'food', title: '🍕 Food' },
    case: {
      id: 'favourite_food',
      title: 'My Favourite Food',
      brief: 'Tell the room about the food you love most and make them hungry.',
      audience: 'general public',
      summary: 'Say what the food is, describe how it tastes, tell when you last had it, and finish with why everybody should try it.',
      sources: [],
    },
  },
  {
    category: { id: 'animals', title: '🐶 Animals' },
    case: {
      id: 'cats_or_dogs',
      title: 'Cats or Dogs',
      brief: 'Pick a side — cats or dogs — and convince the room you are right.',
      audience: 'general public',
      summary: 'Say your choice first, give three simple reasons, tell one funny story, and finish with a clear last line.',
      sources: [],
    },
  },
  {
    category: { id: 'travel', title: '✈️ Travel' },
    case: {
      id: 'visit_my_city',
      title: 'Why You Should Visit My City',
      brief: 'Convince the room to spend a weekend in your city or town.',
      audience: 'general public',
      summary: 'Start with one thing your city is known for, add two places to see and one thing to eat, and finish with an invitation.',
      sources: [],
    },
  },
];

let spinIndex = 0;

const REFINE_BLOCKS: RefineResponse['blocks'] = [
  { kind: 'hook', title: 'Hook', text: "Imagine your grandmother can't remember if she took her pill." },
  { kind: 'problem', title: 'Problem', text: 'Older people miss their medicine every day.' },
  { kind: 'solution', title: 'Solution', text: 'A smart pill box that beeps and notifies the family.' },
  { kind: 'why_us', title: 'Why us', text: 'A pilot in three pharmacies, two hundred families in a month.' },
  { kind: 'call_to_action', title: 'Call to action', text: "We're looking for pharmacy chains as partners." },
];

const render = (blocks: RefineResponse['blocks']) => blocks.map((b) => `${b.title}: ${b.text}`).join('\n');

export const mocks = {
  session: (nick: string): AuthSession => ({
    access_token: 'mock-token',
    user: { user_id: 'u_mock', nick, rank: { title: 'Pitcher', trend: 'up' } },
  }),

  progress: (): Progress => {
    const titles = ['My Favourite Food', 'Cats or Dogs', 'Why You Should Visit My City', 'My Morning', 'A Film Everyone Should Watch', 'My Superpower', 'Drink More Water', 'My Hobby'];
    const totals = [74, 71, 69, 72, 64, 61, 55, 52];
    const day = 24 * 3600 * 1000;
    const history = totals.map((total, i) => ({
      id: `rnd_mock_${i}`,
      mode: i === 2 ? 'daily' : 'training',
      title: titles[i],
      created_at: new Date(Date.now() - i * day).toISOString(),
      total,
      content: total + 3,
      delivery: total - 4,
      jury: total + 2,
      duration_sec: 95 + i * 4,
      wpm: 168 - i * 3,
      fillers_per_min: 1.8 + i * 0.5,
      long_pauses: i % 3,
      repeats: 1 + (i % 4),
      gaze_on_ratio: null,
    }));
    return {
      nick: 'tester',
      rank: { title: 'Pitcher', trend: 'up' },
      rank_score: 70,
      next_rank: { title: 'Orator', points_needed: 5 },
      rounds_total: history.length,
      minutes_total: 14.2,
      average: 64.8,
      best: 74,
      streak_days: 8,
      skills: [
        { key: 'content', title: 'Content', value: 73, delta: 6.4, better: 'higher', unit: '' },
        { key: 'delivery', title: 'Delivery', value: 66, delta: 3.1, better: 'higher', unit: '' },
        { key: 'jury', title: 'Jury answers', value: 72, delta: -1.2, better: 'higher', unit: '' },
      ],
      habits: [
        { key: 'fillers_per_min', title: 'Filler words', value: 2.8, delta: -1.9, better: 'lower', unit: 'per min' },
        { key: 'wpm', title: 'Pace', value: 162, delta: 9, better: 'range', unit: 'words/min' },
        { key: 'long_pauses', title: 'Long pauses', value: 1, delta: 0, better: 'lower', unit: 'per pitch' },
        { key: 'repeats', title: 'Repeats', value: 2.4, delta: -0.6, better: 'lower', unit: 'per pitch' },
      ],
      insights: [
        { kind: 'good', title: 'Your strong side: content', text: '73 on average over your last rounds.' },
        { kind: 'focus', title: 'Work on: delivery', text: '66 on average. Slow down at the start and keep a steady pace — delivery is where you lose the most points.' },
        { kind: 'good', title: 'Fewer filler words', text: 'Down to 2.8 per minute from 4.7. Keep replacing them with a short pause.' },
      ],
      history,
    };
  },

  roundReview: (roundId: string): RoundReview => {
    const round = mocks.progress().history.find((r) => r.id === roundId) ?? mocks.progress().history[0];
    return {
      round,
      result: { total: round.total, content: round.content, delivery: round.delivery, jury: round.jury, rank: { title: 'Pitcher', trend: 'up' } },
      delivery: mocks.delivery(),
      jury_questions: mocks.juryQuestions(),
      jury_answers: mocks.juryQuestions().map((q) => ({ ...mocks.juryAnswer(), question_id: q.id })),
    };
  },

  spin: (): Spin => SPINS[spinIndex++ % SPINS.length],

  daily: (): Daily => ({ date: new Date().toISOString().slice(0, 10), case: SPINS[0].case }),

  createRound: (): Round => ({
    round_id: 'rnd_mock_123',
    prep_sec: 300,
    pitch_min_sec: 60,
    pitch_max_sec: 180,
  }),

  refine: (mode: 'structure' | 'improve'): RefineResponse => {
    if (mode === 'structure') {
      return {
        text: render(REFINE_BLOCKS),
        notes: ['The text is sorted into five blocks; your words are almost unchanged.'],
        blocks: REFINE_BLOCKS,
      };
    }
    const blocks = REFINE_BLOCKS.map((b) =>
      b.kind === 'problem' ? { ...b, text: 'Older people miss [what share] of their doses — and end up in hospital.' } : b,
    );
    return {
      text: render(blocks),
      notes: [
        'Weak spot: there is no number for the size of the problem — business people have nothing to hold on to.',
        'Weak spot: you never say how much the device costs.',
        'Changed: the problem is tied to its consequences, with a placeholder left for the number.',
      ],
      blocks,
    };
  },

  delivery: (): Delivery => ({
    transcript:
      "Imagine it's eight in the morning and your grandmother can't remember if she took her blood pressure pill. " +
      'Um, this happens every day to millions of older people. ' +
      "We built a smart pill box: it beeps, lights up and notifies the family if the box isn't opened on time. " +
      'A pilot in three pharmacies, in three pharmacies, two hundred families in a month. ' +
      "We're looking for pharmacy chains as partners — let's talk after the pitch.",
    scores: {
      content: {
        total: 72,
        criteria: [
          { name: 'topic', score: 85, quote: 'We built a smart pill box' },
          { name: 'structure', score: 70, quote: "We're looking for pharmacy chains as partners" },
          { name: 'clarity', score: 75, quote: 'it beeps, lights up and notifies the family' },
          { name: 'persuasion', score: 60, quote: 'A pilot in three pharmacies, two hundred families in a month' },
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
      { type: 'filler', t: 8.2, text: '«um»', start: 107, end: 109 },
      { type: 'gaze_off', t: 31.0, text: 'Looking away for 4 s', start: 166, end: 166 },
      { type: 'long_pause', t: 52.4, text: 'Pause of 3.6 s mid-phrase', start: 233, end: 233 },
      { type: 'repeat', t: 66.0, text: 'Repeated: «in three pharmacies»', start: 296, end: 315 },
      { type: 'pace', t: 78.0, text: 'Pace 196 words/min — too fast', start: 350, end: 350 },
    ],
    tips: [
      'Open with a number: how many doses older people miss.',
      'Look at the screen when you give the pilot results — it is your strongest moment.',
      'Replace "um" with a short pause.',
    ],
  }),

  // one question from each jury member, in table order
  juryQuestions: (): JuryQuestion[] => [
    { id: 'q1', juror: 'strict', text: 'How much does the pill box cost, and who pays for it?', audio_url: '' },
    { id: 'q2', juror: 'kind', text: 'Two hundred families in a month — how many of them stayed with you?', audio_url: '' },
    { id: 'q3', juror: 'skeptic', text: "What if grandma doesn't use a smartphone — who gets the notification?", audio_url: '' },
  ],

  juryAnswer: (): JuryAnswer => ({
    score: 68,
    comment: 'To the point, but a concrete number was missing.',
  }),

  finish: (): Finish => ({
    total: 75.5,
    content: 70,
    delivery: 80,
    jury: 80,
    rank: { title: 'Orator', trend: 'up' },
  }),

  leaderboard: (): LeaderboardEntry[] => [
    { nick: 'alex', score: 88.5 },
    { nick: 'maria', score: 79 },
  ],

  profile: (): Profile => ({
    nick: 'tester',
    rank: { title: 'Orator', trend: 'up' },
    last_rounds: [
      { id: 'rnd_mock_1', mode: 'training', total: 75.5, content: 70, delivery: 80, jury: 80, created_at: new Date().toISOString() },
    ],
  }),
};
