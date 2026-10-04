import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import type { Difficulty } from '@/api/types';
import { startLive, type LiveEvent } from '@/audio/live';
import { useRecorder } from '@/audio/useRecorder';
import { env } from '@/config/env';
import { c, font, formatTime, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useStayAwake } from '@/hooks/useStayAwake';
import { AudienceScene } from '@/scene/AudienceScene';
import { CameraFrame } from '@/scene/CameraFrame';
import { startCapture, type Capture, type CaptureResult } from '@/video/capture';
import { useGame } from '@/store/game';
import { Bulbs, EyeIcon } from '@/ui/decor';
import { Button } from '@/ui/primitives';

// Шкала внимания — это то, что зал думает о последних секундах выступления. Она складывается из трёх вещей:
// 1) звучит ли голос (сам по себе голос поднимает шкалу только до 60);
// 2) содержание: раз в несколько секунд сервер оценивает, по теме ли и по делу ли последние слова (см. ROOM);
// 3) оговорки: слова-паразиты и темп снимают баллы на 20 секунд, тишина и взгляд мимо зала — пока длятся.
// Шкала ничего не копит: перестал говорить по делу — она уходит вниз за несколько секунд.
const START_ATTENTION = 50; // середина шкалы — спокойный зал: никто не скучает и не удивлён
const VOICE_BASE = 42; // зал, когда в комнате тишина, но ещё не скучно
const VOICE_GAIN = 18; // столько добавляет непрерывная речь: 42 + 18 = 60 — потолок без содержания
const VOICE_WINDOW = 24; // доля речи считается за последние 12 секунд
const SLIP_WINDOW_SEC = 20; // столько зал помнит оговорку
const SLIP_MAX = 35;
const CONTENT_FRESH_SEC = 25; // оценка содержания старше — постепенно забывается
const SILENCE_SEC = 3; // столько тишины зал не замечает
const AWAY_SEC = 2; // столько можно не смотреть в зал (взглянуть в заметки)
const EASE = 0.3; // шкала идёт к цели плавно, а не прыгает
const STEP_SEC = 0.5;
const HINT_MS = 3500;
const HINT_MIN_MS = 1800;
const MOCK_MIN_SEC = 5;
// Без микрофона на моках речь имитируется: 18 секунд «говорим», 9 секунд «молчим».
const MOCK_CYCLE_SEC = 27;
const MOCK_TALK_SEC = 18;
// На моках сервера нет — оценку содержания имитируем, чтобы шкала и подсказки были видны.
const MOCK_CONTENT = [
  { score: 82, comment: 'Clear point' },
  { score: 34, comment: 'Give one example' },
  { score: 74, comment: '' },
  { score: 22, comment: 'Back to your topic' },
];

// Уровень сложности меняет характер зала: насколько больно бьют оговорки, сколько тишины он терпит
// и какое содержание его впечатляет (mid — оценка содержания, с которой зал не теряет и не прибавляет).
const ROOM: Record<Difficulty, { slip: number; silence: number; mid: number; gain: number }> = {
  easy: { slip: 0.7, silence: 4, mid: 45, gain: 0.7 },
  medium: { slip: 1, silence: 3, mid: 50, gain: 0.7 },
  hard: { slip: 1.6, silence: 2, mid: 60, gain: 0.85 },
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

type Slip = { t: number; cost: number };
type Hint = { text: string; tone: 'good' | 'bad' | 'info' };

/** Сколько баллов снимает оговорка. Долгая пауза — ноль: на тишину зал реагирует сам. */
function slipCost(e: LiveEvent): number {
  if (e.type === 'filler') return e.burst ? 12 : 6;
  if (e.type === 'pace') return 8;
  if (e.type === 'profanity') return 25; // ругань зал не прощает
  return 0;
}

/** Куда стремится шкала прямо сейчас. content — оценка содержания 0–100 или null, если её ещё не было. */
function goal(voice: number, content: number | null, slips: number, silent: number, away: number, room: (typeof ROOM)[Difficulty]): number {
  let v = VOICE_BASE + VOICE_GAIN * voice;
  if (content !== null) v += (content - room.mid) * room.gain;
  v -= Math.min(SLIP_MAX * room.slip, slips * room.slip);
  if (silent >= room.silence) v -= Math.min(45, (silent - room.silence + 1) * 8);
  if (away >= AWAY_SEC) v -= Math.min(30, (away - AWAY_SEC + 1) * 6);
  return clamp(v);
}

export default function Stage() {
  useStayAwake();
  const { user, topic, round, notes, camera, pace, difficulty, setCamera, setDelivery, setPitchAudio, setPitchVideo } = useGame();
  const { width, height, wide } = useLayout();
  const insets = useSafeAreaInsets();
  const recorder = useRecorder();
  const [elapsed, setElapsed] = useState(0);
  const [attention, setAttention] = useState(START_ATTENTION);
  const [micOk, setMicOk] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const audioUri = useRef<string | null>(null);
  const finished = useRef(false);
  const stopLive = useRef<() => void>(() => {});
  const startedAt = useRef(Date.now());
  const voiceKnown = useRef(false); // пришёл ли хоть раз уровень микрофона
  const voiceRun = useRef(0); // сколько кусков подряд звучит голос — одиночный щелчок речью не считаем
  const lastVoice = useRef(SILENCE_SEC); // на старте даём время собраться
  const spoke = useRef(false); // сказал ли игрок хоть что-то
  const voiceTicks = useRef<boolean[]>([]); // звучал ли голос в каждые из последних полсекунды
  const slips = useRef<Slip[]>([]);
  const content = useRef<{ score: number; t: number } | null>(null);
  const level = useRef(START_ATTENTION); // шкала без округления
  const silenceHinted = useRef(0); // про какую длину тишины уже подсказали
  const capture = useRef<Capture | null>(null);
  const shot = useRef<CaptureResult | null>(null); // результат съёмки: при повторной отправке берём его же
  const awaySince = useRef<number | null>(null); // с какой секунды игрок не смотрит в зал; null — смотрит
  const [hint, setHint] = useState<Hint | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hints = useRef<Hint[]>([]); // подсказки, ждущие своей очереди
  const hintShownAt = useRef(0); // когда показана текущая; 0 — на экране пусто

  const now = () => (Date.now() - startedAt.current) / 1000;
  /** Показать следующую подсказку из очереди; очередь пуста — убрать подсказку с экрана. */
  const nextHint = () => {
    const next = hints.current.shift();
    if (!next) {
      hintShownAt.current = 0;
      return setHint(null);
    }
    hintShownAt.current = Date.now();
    setHint(next);
    hintTimer.current = setTimeout(nextHint, hints.current.length ? HINT_MIN_MS : HINT_MS);
  };
  /**
   * Подсказка на экране: что зал заметил прямо сейчас. Несколько подряд (паразит и оценка содержания
   * приходят вместе) показываются по очереди, каждая хотя бы HINT_MIN_MS, чтобы её успели прочитать.
   */
  const say = (text: string, tone: Hint['tone']) => {
    hints.current.push({ text, tone });
    if (hints.current.length > 3) hints.current.shift();
    if (hintTimer.current) clearTimeout(hintTimer.current);
    const wait = hintShownAt.current ? Math.max(0, HINT_MIN_MS - (Date.now() - hintShownAt.current)) : 0;
    hintTimer.current = setTimeout(nextHint, wait);
  };
  const onVoice = (speaking: boolean) => {
    voiceKnown.current = true;
    voiceRun.current = speaking ? voiceRun.current + 1 : 0;
    if (voiceRun.current < 2) return;
    lastVoice.current = now();
    spoke.current = true;
  };
  const onContent = (score: number, comment: string) => {
    content.current = { score, t: now() };
    if (comment) say(comment, score >= 70 ? 'good' : score < 45 ? 'bad' : 'info');
    else if (score < 35) say('Back to your topic', 'bad');
  };
  const onEvent = (e: LiveEvent) => {
    if (e.type === 'content') return onContent(e.score, e.comment);
    // выбрал быстрый темп, а говоришь медленно — зал скучает вдвое сильнее
    const dragging = e.type === 'pace' && e.verdict === 'slow' && pace === 'fast';
    const cost = dragging ? 18 : slipCost(e);
    if (cost) slips.current.push({ t: now(), cost });
    if (e.type === 'filler') say(e.burst ? 'Fillers again — pause instead' : `Filler word: “${e.word}”`, 'bad');
    if (e.type === 'profanity') say('Watch your language!', 'bad');
    if (e.type === 'pace') say(e.verdict === 'fast' ? 'Too fast — slow down' : dragging ? 'You chose a fast pace — speed up' : 'Too slow — pick up the pace', 'bad');
  };

  const minSec = env.useMocks ? MOCK_MIN_SEC : (round?.pitch_min_sec ?? 60);
  const maxSec = round?.pitch_max_sec ?? 180;

  useEffect(() => {
    recorder.start().then(setMicOk);
    startedAt.current = Date.now();
    const id = setInterval(() => setElapsed(now()), 250);
    // живой поток: микрофон говорит залу, звучит ли голос, а бэкенд присылает оговорки и оценку содержания
    stopLive.current = startLive(env.useMocks ? null : (round?.round_id ?? null), { onVoice, onEvent }, pace);
    return () => {
      clearInterval(id);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      stopLive.current();
      capture.current?.stop();
      recorder.stop();
    };
    // запись и поток стартуют один раз при входе на сцену
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // в приложении уровень голоса даёт сама запись
  useEffect(() => {
    if (recorder.speaking !== undefined) onVoice(recorder.speaking);
  });

  const half = Math.floor(elapsed / STEP_SEC);
  useEffect(() => {
    if (half === 0 || sending) return;
    const t = half * STEP_SEC;
    if (!voiceKnown.current) {
      // уровня микрофона нет: на моках имитируем речь с паузами, с настоящим бэкендом считаем, что игрок говорит
      const talking = !env.useMocks || t % MOCK_CYCLE_SEC < MOCK_TALK_SEC;
      if (talking) {
        lastVoice.current = t;
        spoke.current = true;
      }
    }
    const silent = t - lastVoice.current;
    if (env.useMocks && silent < 1 && t % 7 === 0) {
      const mock = MOCK_CONTENT[(t / 7) % MOCK_CONTENT.length];
      onContent(mock.score, mock.comment);
    }

    voiceTicks.current.push(silent <= 1);
    if (voiceTicks.current.length > VOICE_WINDOW) voiceTicks.current.shift();
    const voice = voiceTicks.current.filter(Boolean).length / voiceTicks.current.length;

    slips.current = slips.current.filter((s) => t - s.t < SLIP_WINDOW_SEC);
    const slipTotal = slips.current.reduce((sum, s) => sum + s.cost * (1 - (t - s.t) / SLIP_WINDOW_SEC), 0);

    let heard: number | null = null;
    if (content.current) {
      const stale = Math.max(0, t - content.current.t - CONTENT_FRESH_SEC) / 15;
      heard = 50 + (content.current.score - 50) * Math.max(0, 1 - stale);
    }
    const away = awaySince.current === null ? 0 : t - awaySince.current;

    level.current += (goal(voice, heard, slipTotal, silent, away, ROOM[difficulty]) - level.current) * EASE;
    setAttention(Math.round(level.current));

    // подсказки про тишину и взгляд — их видно сразу, без сервера
    // на трудном уровне зал замечает тишину раньше
    const quiet = ROOM[difficulty].silence + 1;
    if (silent < ROOM[difficulty].silence) silenceHinted.current = 0;
    else if (silent >= quiet && silenceHinted.current < 4) {
      silenceHinted.current = 4;
      say(spoke.current ? 'You have gone quiet — keep talking' : 'The room is waiting — start talking', 'bad');
    } else if (silent >= 9 && silenceHinted.current < 9) {
      silenceHinted.current = 9;
      say(`Silent for ${Math.round(silent)} s — say your next point`, 'bad');
    }
    if (away >= 3 && away < 3 + STEP_SEC) say('Look at the room', 'bad');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [half, sending]);

  const finish = async () => {
    if (!round || finished.current) return;
    finished.current = true;
    setSending(true);
    setError('');
    stopLive.current();
    try {
      audioUri.current = audioUri.current ?? (await recorder.stop());
      setPitchAudio(audioUri.current);
      // видео остаётся в браузере для разбора, на бэкенд уходят только моменты, когда взгляд уходил из зала
      if (capture.current) {
        shot.current = await capture.current.stop();
        capture.current = null;
        setPitchVideo(shot.current.videoUri, shot.current.videoOffset);
      }
      setDelivery(await api.delivery(round.round_id, audioUri.current, shot.current?.gaze ?? [], notes, pace));
      router.replace('/jury');
    } catch (e) {
      setError(`Could not get the review: ${(e as Error).message}`);
      setSending(false);
      finished.current = false;
    }
  };

  // лимит времени вышел — заканчиваем сами
  useEffect(() => {
    if (elapsed >= maxSec && !finished.current) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, maxSec]);

  if (!user || !topic || !round) return <Redirect href="/" />;

  const landscape = width > height;
  const big = landscape && width >= 900;
  // вертикально панель встаёт между кулисами под ламбрекеном; горизонтально — поверх него
  const hud = landscape
    ? { top: insets.top + (big ? 28 : 10), left: insets.left + (big ? 40 : 24), right: insets.right + (big ? 40 : 24) }
    : { top: Math.max(insets.top + 8, height * 0.125), left: width * 0.135, right: width * 0.135 };
  const notice = error || (!micOk ? `The microphone is unavailable — nothing is being recorded${env.useMocks ? '; you can continue in mock mode' : ''}.` : '');

  const timer = (
    <View style={[styles.board, styles.timer, big && styles.timerBig]}>
      <Text style={[styles.timerValue, big && { fontSize: 32, lineHeight: 38 }]}>{formatTime(Math.min(elapsed, maxSec))}</Text>
      <Text style={styles.timerLimit}>/ {formatTime(maxSec)}</Text>
    </View>
  );
  const label = (
    <>
      <EyeIcon size={landscape ? 18 : 17} color={landscape ? c.ink : c.orange} />
      <Text style={[styles.attentionLabel, landscape && { color: c.ink }]}>Attention</Text>
    </>
  );
  const attentionBar = (
    <View style={[styles.board, landscape ? styles.attentionRow : styles.attentionColumn, big && styles.attentionBig]}>
      {landscape ? <View style={styles.attentionChip}>{label}</View> : <View style={styles.attentionHead}>{label}</View>}
      <View style={styles.bulbs}>
        <Bulbs value={attention} count={big ? 20 : 15} size={big ? 20 : landscape ? 13 : 11} />
      </View>
    </View>
  );
  const finishButton = (
    <Button
      size={big ? 'md' : 'sm'}
      title={elapsed < minSec ? `${formatTime(minSec - elapsed)} more` : landscape ? 'Finish pitch' : 'Finish\npitch'}
      disabled={elapsed < minSec}
      loading={sending}
      onPress={finish}
      style={styles.finish}
    />
  );

  return (
    <View style={styles.root}>
      <AudienceScene attention={attention} width={width} height={height} />
      <View style={[styles.hud, hud]} pointerEvents="box-none">
        {landscape ? (
          <View style={[styles.row, big && { gap: 20 }]}>
            {timer}
            <View style={styles.grow}>{attentionBar}</View>
            {finishButton}
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.grow}>{timer}</View>
              {finishButton}
            </View>
            {attentionBar}
          </>
        )}
        {hint ? (
          <View style={[styles.hint, landscape ? styles.hintLandscape : styles.hintPortrait]} accessibilityLiveRegion="polite">
            <View style={[styles.hintDot, hint.tone === 'good' && { backgroundColor: c.good }, hint.tone === 'info' && { backgroundColor: c.orange }]} />
            <Text style={styles.hintText}>{hint.text}</Text>
          </View>
        ) : null}
        <CameraFrame
          facing={camera}
          onFacing={setCamera}
          onReady={(video, stream) => {
            // видео в разборе показывается только на телефоне — на компьютере его не пишем, сцене легче
            if (finished.current || wide) return;
            // камеру сменили — прежний кусок видео закрываем, запись идёт дальше с новой камеры
            capture.current?.stop();
            capture.current = startCapture(video, stream, {
              clock: now,
              onLook: (on) => (awaySince.current = on ? null : now()),
            });
          }}
          size={big ? 280 : landscape ? 150 : 190}
          tilt={landscape ? 5 : -4}
          style={landscape ? [styles.cameraLandscape, big && { marginRight: 120, marginTop: 22 }] : styles.cameraPortrait}
        />
      </View>
      {notice ? (
        <View style={[styles.notice, { bottom: insets.bottom + 12 }]}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.cream },
  hud: { position: 'absolute', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  board: { backgroundColor: c.ink, borderRadius: 16, borderWidth: 2, borderColor: c.paper },
  timer: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'flex-start', flexShrink: 0, gap: 8, paddingHorizontal: 14, paddingVertical: 6, transform: [{ rotate: '-2deg' }] },
  timerBig: { paddingHorizontal: 18, paddingVertical: 8, borderWidth: 2.5 },
  timerValue: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: c.orange, fontVariant: ['tabular-nums'] },
  timerLimit: { fontFamily: font.semi, fontSize: 13, color: c.onInkMuted },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 999, paddingVertical: 6, paddingLeft: 7, paddingRight: 16, minHeight: 44 },
  attentionBig: { paddingVertical: 10, paddingLeft: 12, paddingRight: 22, gap: 18, borderWidth: 2.5 },
  attentionColumn: { gap: 9, borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  attentionHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  attentionChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.orange, borderRadius: 999, paddingLeft: 9, paddingRight: 13, paddingVertical: 5 },
  attentionLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: c.orange },
  bulbs: { flexDirection: 'row', flexGrow: 1 },
  finish: { transform: [{ rotate: '1.5deg' }] },
  cameraPortrait: { alignSelf: 'center', marginTop: 52 },
  cameraLandscape: { alignSelf: 'flex-end', marginRight: 96, marginTop: 6 },
  // подсказка стоит поверх сцены и не двигает рамку камеры
  hint: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.paper, borderRadius: 999, paddingLeft: 12, paddingRight: 18, minHeight: 42, maxWidth: '100%', ...outline, ...shadow(3) },
  hintLandscape: { left: 0, top: 64 },
  hintPortrait: { alignSelf: 'center', top: 132 },
  hintDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.bad, borderWidth: 2, borderColor: c.ink },
  hintText: { fontFamily: font.bold, fontSize: 16, lineHeight: 21, color: c.ink, flexShrink: 1 },
  notice: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  noticeText: { fontFamily: font.bold, fontSize: 14, color: c.bad, backgroundColor: c.paper, borderRadius: 12, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8, ...outline },
});
