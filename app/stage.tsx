import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { startLive, type LiveEvent } from '@/audio/live';
import { useRecorder } from '@/audio/useRecorder';
import { env } from '@/config/env';
import { c, font, formatTime, outline } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useStayAwake } from '@/hooks/useStayAwake';
import { AudienceScene } from '@/scene/AudienceScene';
import { CameraFrame } from '@/scene/CameraFrame';
import { startCapture, type Capture, type CaptureResult } from '@/video/capture';
import { useGame } from '@/store/game';
import { Bulbs, EyeIcon } from '@/ui/decor';
import { Button } from '@/ui/primitives';

// Зал простой: говоришь уверенно и долго — зал удивляется; долго молчишь или не смотришь на него — скучает.
// Оговорки (паразит, темп) только гасят восторг и никогда не делают зал скучающим.
const START_ATTENTION = 50; // середина шкалы — спокойный зал: никто не скучает и не в восторге
const NEUTRAL = 50; // ниже этого опускает только молчание
const SILENCE_SEC = 3; // столько тишины зал не замечает
const AWAY_SEC = 2; // столько можно не смотреть в зал (взглянуть в заметки)
const FLUENT_SEC = 6; // столько речи без оговорок — «в ударе», внимание растёт вдвое быстрее
const STEP_SEC = 0.5;
const MOCK_MIN_SEC = 5;
// Без микрофона на моках речь имитируется: 18 секунд «говорим», 9 секунд «молчим».
const MOCK_CYCLE_SEC = 27;
const MOCK_TALK_SEC = 18;

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Сколько восторга снимает оговорка. Долгая пауза — ноль: на тишину зал реагирует сам. */
function slip(e: LiveEvent): number {
  if (e.type === 'filler') return e.burst ? 8 : 3;
  if (e.type === 'pace') return 3;
  return 0;
}

/**
 * Внимание через полсекунды: silent — сколько секунд тишины, away — сколько секунд игрок не смотрит в зал,
 * fluent — сколько секунд речи без оговорок.
 */
function drift(a: number, silent: number, away: number, fluent: number): number {
  if (silent >= SILENCE_SEC) return clamp(a - (a > 60 ? 5 : 3)); // молчишь — восторг гаснет быстро, потом зал скучает
  if (away >= AWAY_SEC) return clamp(a - (a > 60 ? 4 : 2)); // говоришь, но не смотришь в зал — контакт теряется
  if (silent > 1) return a; // короткая пауза ничего не меняет
  if (a < NEUTRAL) return clamp(a + 4); // заговорил — зал сразу возвращается
  return clamp(a + (fluent >= FLUENT_SEC ? 1 : 0.5));
}

export default function Stage() {
  useStayAwake();
  const { user, topic, round, notes, setDelivery, setPitchAudio, setPitchVideo } = useGame();
  const { width, height } = useLayout();
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
  const fluentSince = useRef(0);
  const capture = useRef<Capture | null>(null);
  const shot = useRef<CaptureResult | null>(null); // результат съёмки: при повторной отправке берём его же
  const awaySince = useRef<number | null>(null); // с какой секунды игрок не смотрит в зал; null — смотрит

  const now = () => (Date.now() - startedAt.current) / 1000;
  const onVoice = (speaking: boolean) => {
    voiceKnown.current = true;
    voiceRun.current = speaking ? voiceRun.current + 1 : 0;
    if (voiceRun.current < 2) return;
    const t = now();
    if (t - lastVoice.current > 2) fluentSince.current = t; // после паузы уверенная речь считается заново
    lastVoice.current = t;
  };

  const minSec = env.useMocks ? MOCK_MIN_SEC : (round?.pitch_min_sec ?? 60);
  const maxSec = round?.pitch_max_sec ?? 180;

  useEffect(() => {
    recorder.start().then(setMicOk);
    startedAt.current = Date.now();
    const id = setInterval(() => setElapsed(now()), 250);
    // живой поток: микрофон говорит залу, звучит ли голос, а бэкенд присылает оговорки (на моках — только голос)
    stopLive.current = startLive(env.useMocks ? null : (round?.round_id ?? null), {
      onVoice,
      onEvent: (e) => {
        fluentSince.current = now();
        setAttention((a) => (a <= NEUTRAL ? a : Math.max(NEUTRAL, a - slip(e))));
      },
    });
    return () => {
      clearInterval(id);
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
        if (t - lastVoice.current > 2) fluentSince.current = t;
        lastVoice.current = t;
      }
    }
    const away = awaySince.current === null ? 0 : t - awaySince.current;
    if (away >= AWAY_SEC) fluentSince.current = t; // без контакта с залом «в ударе» не считается
    setAttention((a) => drift(a, t - lastVoice.current, away, t - fluentSince.current));
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
      setDelivery(await api.delivery(round.round_id, audioUri.current, shot.current?.gaze ?? [], notes));
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
        <CameraFrame
          onReady={(video, stream) => {
            if (finished.current) return;
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
  cameraPortrait: { alignSelf: 'center', marginTop: 8 },
  cameraLandscape: { alignSelf: 'flex-end', marginRight: 96, marginTop: 6 },
  notice: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  noticeText: { fontFamily: font.bold, fontSize: 14, color: c.bad, backgroundColor: c.paper, borderRadius: 12, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8, ...outline },
});
