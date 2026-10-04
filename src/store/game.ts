import { create } from 'zustand';

import { Platform } from 'react-native';

import { onUnauthorized, setAuthToken } from '@/api/client';
import type { Case, Delivery, Difficulty, Finish, HistoryRound, Pace, JuryAnswer, JuryQuestion, Mode, OwnPitchInput, Round, RoundReview, User } from '@/api/types';

const SESSION_KEY = 'stage-zero-session';

type Saved = { user: User; token: string };

// На сайте помним вход между перезагрузками; в приложении пока нет — нужно отдельное хранилище.
function loadSession(): Saved | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Saved | null;
    return saved?.user && saved.token ? saved : null;
  } catch {
    return null;
  }
}

function saveSession(saved: Saved | null) {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    if (saved) localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // хранилище недоступно — просто не запоминаем
  }
}

const saved = loadSession();
setAuthToken(saved?.token ?? null);

type GameState = {
  user: User | null;
  token: string | null;
  /** Открыт разбор старого раунда из истории (записи у него нет); null — только что сыгранный раунд. */
  reviewOf: HistoryRound | null;
  /** Какой камерой снимать выступление: фронтальной или задней. */
  camera: 'user' | 'environment';
  setCamera: (camera: 'user' | 'environment') => void;
  /** Темп, которым игрок собирается говорить: спокойный, обычный или быстрый. */
  pace: Pace;
  setPace: (pace: Pace) => void;
  /** Уровень сложности раунда. */
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
  openReview: (review: RoundReview) => void;
  mode: Mode;
  topic: Case | null;
  ownPitch: OwnPitchInput | null;
  round: Round | null;
  notes: string;
  delivery: Delivery | null;
  juryAnswers: JuryAnswer[];
  result: Finish | null;

  juryQuestions: JuryQuestion[];
  /** запись питча — чтобы в разборе проигрывать с нужного места */
  pitchAudioUri: string | null;
  /** видеозапись питча (только в браузере) и на сколько секунд она началась позже звука */
  pitchVideoUri: string | null;
  pitchVideoOffset: number;
  setPitchVideo: (uri: string | null, offset: number) => void;
  setJuryQuestions: (questions: JuryQuestion[]) => void;
  setPitchAudio: (uri: string | null) => void;
  startTopic: (mode: Mode, topic: Case) => void;
  startOwnPitch: (own: OwnPitchInput) => void;
  setRound: (round: Round) => void;
  setNotes: (notes: string) => void;
  setDelivery: (delivery: Delivery) => void;
  addJuryAnswer: (answer: JuryAnswer) => void;
  setResult: (result: Finish) => void;
};

export const useGame = create<GameState>((set) => ({
  user: saved?.user ?? null,
  token: saved?.token ?? null,
  reviewOf: null,
  camera: 'user',
  pace: 'normal',
  difficulty: 'easy',
  juryQuestions: [],
  pitchAudioUri: null,
  pitchVideoUri: null,
  pitchVideoOffset: 0,
  mode: 'training',
  topic: null,
  ownPitch: null,
  round: null,
  notes: '',
  delivery: null,
  juryAnswers: [],
  result: null,

  setCamera: (camera) => set({ camera }),
  setPace: (pace) => set({ pace }),
  setDifficulty: (difficulty) => set({ difficulty }),
  signIn: (user, token) => {
    setAuthToken(token);
    saveSession({ user, token });
    set({ user, token });
  },
  signOut: () => {
    setAuthToken(null);
    saveSession(null);
    set({ user: null, token: null, round: null, delivery: null, result: null, reviewOf: null, juryAnswers: [], juryQuestions: [], pitchAudioUri: null, pitchVideoUri: null });
  },
  openReview: (review) =>
    set({
      reviewOf: review.round,
      mode: review.round.mode as Mode,
      topic: { id: review.round.id, title: review.round.title, brief: '', audience: '' },
      round: null,
      delivery: review.delivery,
      juryQuestions: review.jury_questions,
      juryAnswers: review.jury_answers,
      result: review.result,
      pitchAudioUri: null,
      pitchVideoUri: null,
    }),
  setJuryQuestions: (juryQuestions) => set({ juryQuestions }),
  setPitchAudio: (pitchAudioUri) => set({ pitchAudioUri }),
  setPitchVideo: (pitchVideoUri, pitchVideoOffset) => set({ pitchVideoUri, pitchVideoOffset }),
  startTopic: (mode, topic) =>
    set({ mode, topic, ownPitch: null, round: null, notes: '', delivery: null, juryAnswers: [], juryQuestions: [], pitchAudioUri: null, pitchVideoUri: null, result: null, reviewOf: null }),
  startOwnPitch: (own) =>
    set({
      mode: 'own',
      topic: {
        id: 'own',
        title: own.title,
        brief: own.text,
        audience: own.audience,
      },
      ownPitch: own,
      round: null,
      notes: own.text,
      delivery: null,
      juryAnswers: [],
      juryQuestions: [],
      pitchAudioUri: null,
      pitchVideoUri: null,
      result: null,
      reviewOf: null,
    }),
  setRound: (round) => set({ round }),
  setNotes: (notes) => set({ notes }),
  setDelivery: (delivery) => set({ delivery }),
  addJuryAnswer: (answer) => set((s) => ({ juryAnswers: [...s.juryAnswers, answer] })),
  setResult: (result) =>
    set((s) => {
      const user = s.user ? { ...s.user, rank: result.rank } : s.user;
      if (user && s.token) saveSession({ user, token: s.token });
      return { result, user };
    }),
}));

// сервер перестал принимать токен — выходим, экраны сами вернут на главную
onUnauthorized(() => useGame.getState().signOut());
