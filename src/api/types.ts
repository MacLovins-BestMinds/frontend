// Типы строго по контрактам из docs/tz (Часть 1) и схемам бэкенда.

export type Mode = 'training' | 'daily' | 'own' | 'warmup';

export type Rank = { title: string; trend: 'up' | 'down' | 'flat' | string };

export type User = { user_id: string; nick: string; rank: Rank };

export type Category = { id: string; title: string };

export type SourceLink = { title: string; url: string };

export type Case = {
  id: string;
  title: string;
  brief: string;
  audience: string;
  /** 2–3 предложения о теме на английском (Википедия). */
  summary?: string | null;
  /** Проверенные ссылки: Википедия + 1–2 сайта. */
  sources?: SourceLink[];
};

export type Spin = { category: Category; case: Case };

export type Daily = { date: string; case: Case };

export type Round = {
  round_id: string;
  prep_sec: number;
  pitch_min_sec: number;
  pitch_max_sec: number;
};

export type TimelineEvent = {
  type: 'filler' | 'long_pause' | 'hesitation' | 'pace' | 'gaze_off' | 'good_pause';
  t: number;
  text: string;
};

export type Delivery = {
  transcript: string;
  scores: {
    content: { total: number; criteria: { name: string; score: number; quote: string }[] };
    delivery: {
      total: number;
      fillers: number;
      pace: number;
      gaze: number;
      pauses: number;
      timing: number;
    };
  };
  metrics: {
    duration_sec: number;
    words: number;
    wpm: number;
    fillers: number;
    fillers_per_min: number;
    long_pauses: number;
    gaze_on_ratio: number;
  };
  events: TimelineEvent[];
  tips: string[];
};

export type JurorId = 'strict' | 'kind' | 'skeptic';

export type JuryQuestion = { id: string; juror: JurorId; text: string; audio_url: string };

export type JuryAnswer = { score: number; comment: string };

export type Finish = {
  total: number;
  content: number;
  delivery: number;
  jury: number;
  rank: Rank;
};

export type LeaderboardEntry = { nick: string; score: number };

export type GazePoint = { t: number; on: boolean };

export type AudienceId = 'contest_jury' | 'business' | 'teachers' | 'public';

export type PitchBlock = {
  kind: 'hook' | 'problem' | 'solution' | 'why_us' | 'call_to_action';
  title: string;
  text: string;
};

export type RefineResponse = {
  text: string;
  notes: string[];
  blocks: PitchBlock[];
};

export type OwnPitchInput = {
  title: string;
  text: string;
  audience: string;
};
