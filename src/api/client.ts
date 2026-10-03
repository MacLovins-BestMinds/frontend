import { Platform } from 'react-native';

import { env } from '@/config/env';

import { mocks } from './mocks';
import type {
  Daily,
  Delivery,
  Finish,
  GazePoint,
  JuryAnswer,
  JuryQuestion,
  LeaderboardEntry,
  Mode,
  OwnPitchInput,
  RefineResponse,
  Round,
  Spin,
  User,
} from './types';

const MOCK_DELAY_MS = 400;

function mocked<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.apiUrl) throw new Error('Не задан EXPO_PUBLIC_API_URL');
  const res = await fetch(env.apiUrl.replace(/\/$/, '') + path, init);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      // тело не JSON — хватит кода ответа
    }
    throw new Error(`${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function appendAudio(form: FormData, uri: string) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    // Chrome пишет webm, Safari — mp4: имя файла по реальному типу записи
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', blob, `audio.${ext}`);
  } else {
    // React Native кладёт файл в multipart по объекту с uri
    form.append('audio', { uri, name: 'audio.m4a', type: 'audio/mp4' } as unknown as Blob);
  }
}

/** Абсолютный адрес для audio_url вопроса жюри; пустая строка, если озвучки нет. */
export function mediaUrl(path: string): string {
  if (!path || /^https?:/.test(path)) return path;
  return env.apiUrl.replace(/\/$/, '') + path;
}

export const api = {
  auth: (nick: string) =>
    env.useMocks ? mocked(mocks.auth(nick)) : post<User>('/api/game/auth', { nick }),

  spin: () => (env.useMocks ? mocked(mocks.spin()) : request<Spin>('/api/game/spin')),

  daily: () => (env.useMocks ? mocked(mocks.daily()) : request<Daily>('/api/game/daily')),

  createRound: (userId: string, mode: Mode, caseId?: string, own?: OwnPitchInput) =>
    env.useMocks
      ? mocked(mocks.createRound())
      : post<Round>('/api/game/rounds', {
          user_id: userId,
          mode,
          case_id: mode === 'own' ? undefined : caseId,
          own: mode === 'own' ? own : undefined,
        }),

  refine: (text: string, audience: string, mode: 'structure' | 'improve') =>
    env.useMocks
      ? mocked(mocks.refine(mode))
      : post<RefineResponse>('/api/ai/refine', { text, audience, mode }),

  delivery: async (roundId: string, audioUri: string | null, gaze: GazePoint[] = [], notes = '') => {
    if (env.useMocks) return mocked(mocks.delivery());
    if (!audioUri) throw new Error('Нет записи выступления');
    const form = new FormData();
    await appendAudio(form, audioUri);
    form.append('gaze', JSON.stringify(gaze));
    // заметки с подготовки: ИИ подскажет, что из запланированного так и не прозвучало
    if (notes.trim()) form.append('notes', notes.trim());
    return request<Delivery>(`/api/ai/rounds/${roundId}/delivery`, { method: 'POST', body: form });
  },

  juryQuestions: async (roundId: string) => {
    if (env.useMocks) return mocked(mocks.juryQuestions());
    const res = await post<{ questions: JuryQuestion[] }>(`/api/ai/rounds/${roundId}/jury/questions`);
    return res.questions;
  },

  juryAnswer: async (roundId: string, questionId: string, audioUri: string | null) => {
    if (env.useMocks) return mocked(mocks.juryAnswer());
    if (!audioUri) throw new Error('Нет записи ответа');
    const form = new FormData();
    form.append('question_id', questionId);
    await appendAudio(form, audioUri);
    return request<JuryAnswer>(`/api/ai/rounds/${roundId}/jury/answer`, {
      method: 'POST',
      body: form,
    });
  },

  finish: (roundId: string) =>
    env.useMocks ? mocked(mocks.finish()) : post<Finish>(`/api/game/rounds/${roundId}/finish`),

  leaderboard: () =>
    env.useMocks
      ? mocked(mocks.leaderboard())
      : request<LeaderboardEntry[]>('/api/game/leaderboard/daily'),
};
