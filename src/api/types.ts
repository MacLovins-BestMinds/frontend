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
  type: 'filler' | 'repeat' | 'profanity' | 'long_pause' | 'hesitation' | 'pace' | 'gaze_off' | 'good_pause';
  t: number;
  text: string;
  /** Место в transcript (символы). start === end — точка между словами (пауза, темп). */
  start?: number | null;
  end?: number | null;
};

/** Слово расшифровки: где стоит в transcript (символы) и когда звучит в записи (секунды). */
export type WordMark = { start: number; end: number; t: number; t_end: number };

export type Delivery = {
  transcript: string;
  /** Слова со временем — по ним в разборе подсвечивается текущее слово. У старых раундов их нет. */
  words?: WordMark[];
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
    /** Доля времени со взглядом в зал; null — взгляд не измерялся. */
    gaze_on_ratio: number | null;
  };
  events: TimelineEvent[];
  tips: string[];
  /** Оценка английского произношения; null — не настроено или речь не на английском. */
  pronunciation?: Pronunciation | null;
};

export type Pronunciation = {
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  prosody_score: number | null;
  mispronounced_words_count: number;
  monotone: boolean;
  words: { word: string; t: number; accuracy: number; error: string }[];
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

export type RoundSummary = { id: string; mode: string; total: number; content: number; delivery: number; jury: number; created_at: string };

export type Profile = { nick: string; rank: Rank; last_rounds: RoundSummary[] };

/** Вход по нику и паролю: токен уходит в заголовке Authorization каждого запроса. */
export type AuthSession = { access_token: string; user: User };

/** Один сыгранный раунд в истории: баллы и привычки речи из разбора. */
export type HistoryRound = {
  id: string;
  mode: string;
  difficulty?: string;
  title: string;
  created_at: string;
  total: number;
  content: number;
  delivery: number;
  jury: number;
  duration_sec: number | null;
  wpm: number | null;
  fillers_per_min: number | null;
  long_pauses: number | null;
  repeats: number | null;
  gaze_on_ratio: number | null;
};

/** Среднее за последние 5 раундов и изменение к 5 предыдущим. */
export type SkillTrend = {
  key: string;
  title: string;
  value: number | null;
  delta: number | null;
  better: 'higher' | 'lower' | 'range';
  unit: string;
};

export type Insight = { kind: 'good' | 'focus'; title: string; text: string };

export type Progress = {
  nick: string;
  rank: Rank;
  rank_score: number;
  next_rank: { title: string; points_needed: number } | null;
  rounds_total: number;
  minutes_total: number;
  average: number;
  best: number;
  streak_days: number;
  skills: SkillTrend[];
  habits: SkillTrend[];
  insights: Insight[];
  history: HistoryRound[];
};

/** Разбор раунда из истории: без записи — звук и видео на сервере не хранятся. */
export type RoundReview = {
  round: HistoryRound;
  result: Finish;
  delivery: Delivery | null;
  jury_questions: JuryQuestion[];
  jury_answers: (JuryAnswer & { question_id: string })[];
};

/** Темп, которым игрок хочет говорить: от него зависит, что зал считает «слишком медленно». */
export type Pace = 'slow' | 'normal' | 'fast';

/** Регистрация по почте: дальше нужен код из письма. dev_code приходит, только если почта на сервере не настроена. */
export type Signup = {
  email: string;
  sent: boolean;
  dev_code: string | null;
  /** Подтверждение почты на сервере выключено — вход уже выполнен, код не нужен. */
  access_token?: string | null;
  user?: User | null;
};

/** Уровень сложности: чем выше, тем глубже вопросы жюри, строже оценка ответов и жёстче зал. */
export type Difficulty = 'easy' | 'medium' | 'hard';

export type FitSlide = { n: number; title: string; kind: 'talk' | 'demo'; text: string };
/** Питч, разложенный по слайдам презентации. */
export type FitSlides = { slides: FitSlide[]; text: string };

/** Файл презентации из системного выбора файлов: в браузере — File, в приложении — uri. */
export type PickedFile = { uri: string; name: string; mimeType?: string; file?: File };
