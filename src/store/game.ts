import { create } from 'zustand';

import type { Case, Delivery, Finish, JuryAnswer, Mode, OwnPitchInput, Round, User } from '@/api/types';

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

  setUser: (user: User) => void;
  startTopic: (mode: Mode, topic: Case) => void;
  startOwnPitch: (own: OwnPitchInput) => void;
  setRound: (round: Round) => void;
  setNotes: (notes: string) => void;
  setDelivery: (delivery: Delivery) => void;
  addJuryAnswer: (answer: JuryAnswer) => void;
  setResult: (result: Finish) => void;
};

export const useGame = create<GameState>((set) => ({
  user: null,
  mode: 'training',
  topic: null,
  ownPitch: null,
  round: null,
  notes: '',
  delivery: null,
  juryAnswers: [],
  result: null,

  setUser: (user) => set({ user }),
  startTopic: (mode, topic) =>
    set({ mode, topic, ownPitch: null, round: null, notes: '', delivery: null, juryAnswers: [], result: null }),
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
      result: null,
    }),
  setRound: (round) => set({ round }),
  setNotes: (notes) => set({ notes }),
  setDelivery: (delivery) => set({ delivery }),
  addJuryAnswer: (answer) => set((s) => ({ juryAnswers: [...s.juryAnswers, answer] })),
  setResult: (result) =>
    set((s) => ({ result, user: s.user ? { ...s.user, rank: result.rank } : s.user })),
}));
