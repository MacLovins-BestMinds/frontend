import { Platform } from 'react-native';

import { env } from '@/config/env';

import { mocks } from './mocks';
import type {
  AuthSession,
  Daily,
  Delivery,
  Finish,
  GazePoint,
  JuryAnswer,
  JuryQuestion,
  LeaderboardEntry,
  Mode,
  OwnPitchInput,
  Profile,
  Progress,
  RefineResponse,
  Round,
  RoundReview,
  Spin,
  User,
} from './types';

const MOCK_DELAY_MS = 400;

function mocked<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

let token: string | null = null;
let onSignedOut: () => void = () => {};

/** Токен вошедшего пользователя: с ним идёт каждый запрос. null — выйти. */
export function setAuthToken(value: string | null) {
  token = value;
}

/** Что сделать, когда сервер перестал принимать токен (истёк или пользователь удалён). */
export function onUnauthorized(handler: () => void) {
  onSignedOut = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set');
  const headers = { ...(init?.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(env.apiUrl.replace(/\/$/, '') + path, { ...init, headers });
  // вход по неверному паролю тоже отвечает 401 — выходим только там, где токен был отправлен
  if (res.status === 401 && token && !path.startsWith('/api/auth/')) onSignedOut();
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
  /** Вход по нику и паролю. */
  login: (nick: string, password: string) =>
    env.useMocks ? mocked(mocks.session(nick)) : post<AuthSession>('/api/auth/login', { nick, password }),

  /** Новый аккаунт. Ник, заведённый раньше без пароля, закрепляется этим паролем вместе с историей. */
  register: (nick: string, password: string) =>
    env.useMocks ? mocked(mocks.session(nick)) : post<AuthSession>('/api/auth/register', { nick, password }),

  /** История всех раундов и трекер прогресса вошедшего пользователя. */
  progress: () => (env.useMocks ? mocked(mocks.progress()) : request<Progress>('/api/game/progress')),

  /** Разбор раунда из истории. */
  roundReview: (roundId: string) =>
    env.useMocks ? mocked(mocks.roundReview(roundId)) : request<RoundReview>(`/api/game/rounds/${roundId}/review`),

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
    if (!audioUri) throw new Error('There is no recording of the pitch');
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
    if (!audioUri) throw new Error('There is no recording of the answer');
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

  profile: (userId: string) =>
    env.useMocks
      ? mocked(mocks.profile())
      : request<Profile>(`/api/game/profile?user_id=${encodeURIComponent(userId)}`),

  leaderboard: () =>
    env.useMocks
      ? mocked(mocks.leaderboard())
      : request<LeaderboardEntry[]>('/api/game/leaderboard/daily'),
};
