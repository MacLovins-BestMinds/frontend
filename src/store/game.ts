import { create } from 'zustand';

import { Platform } from 'react-native';

import type { Case, Delivery, Finish, JuryAnswer, JuryQuestion, Mode, OwnPitchInput, Round, User } from '@/api/types';

const USER_KEY = 'stage-zero-user';

// На сайте помним вход между перезагрузками; в приложении пока нет — нужно отдельное хранилище.
function loadUser(): User | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveUser(user: User | null) {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // хранилище недоступно — просто не запоминаем
  }
}

type GameState = {
  user: User | null;
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
  setUser: (user: User | null) => void;
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
  user: loadUser(),
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

  setUser: (user) => {
    saveUser(user);
    set({ user });
  },
  setJuryQuestions: (juryQuestions) => set({ juryQuestions }),
  setPitchAudio: (pitchAudioUri) => set({ pitchAudioUri }),
  setPitchVideo: (pitchVideoUri, pitchVideoOffset) => set({ pitchVideoUri, pitchVideoOffset }),
  startTopic: (mode, topic) =>
    set({ mode, topic, ownPitch: null, round: null, notes: '', delivery: null, juryAnswers: [], juryQuestions: [], pitchAudioUri: null, pitchVideoUri: null, result: null }),
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
    }),
  setRound: (round) => set({ round }),
  setNotes: (notes) => set({ notes }),
  setDelivery: (delivery) => set({ delivery }),
  addJuryAnswer: (answer) => set((s) => ({ juryAnswers: [...s.juryAnswers, answer] })),
  setResult: (result) =>
    set((s) => {
      const user = s.user ? { ...s.user, rank: result.rank } : s.user;
      saveUser(user);
      return { result, user };
    }),
}));
