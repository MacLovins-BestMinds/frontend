import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { env } from '@/config/env';
import { useRecorder } from '@/audio/useRecorder';
import { useGame } from '@/store/game';
import { AudienceStage } from '@/ui/AudienceStage';
import { Body, Button, ErrorText, Screen } from '@/ui/kit';
import { colors, formatTime } from '@/ui/theme';
import { useStayAwake } from '@/ui/useStayAwake';

const START_ATTENTION = 70;
const CLEAN_STREAK_SEC = 15;
const MOCK_EVENT_EVERY_SEC = 7;
const MOCK_MIN_SEC = 5;

// Пока живой поток WS /api/ai/live не подключён, на моках события зала имитируются по таймеру.
const MOCK_EVENTS = [
  { delta: -4, text: 'Слово-паразит — зритель морщится' },
  { delta: 4, text: 'Удачная пауза — зрители подаются вперёд' },
  { delta: -5, text: 'Слишком быстро — растерянные лица' },
  { delta: -6, text: 'Долгая пауза — зрители переглядываются' },
];

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export default function Stage() {
  useStayAwake();
  const { user, topic, round, notes, setDelivery } = useGame();
  const recorder = useRecorder();
  const [elapsed, setElapsed] = useState(0);
  const [attention, setAttention] = useState(START_ATTENTION);
  const [reaction, setReaction] = useState('Зал ждёт. Начинай говорить.');
  const [micOk, setMicOk] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const audioUri = useRef<string | null>(null);
  const finished = useRef(false);

  const minSec = env.useMocks ? MOCK_MIN_SEC : (round?.pitch_min_sec ?? 60);
  const maxSec = round?.pitch_max_sec ?? 180;

  useEffect(() => {
    recorder.start().then(setMicOk);
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250);
    return () => {
      clearInterval(id);
      recorder.stop();
    };
    // запись стартует один раз при входе на сцену
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const second = Math.floor(elapsed);
  useEffect(() => {
    if (second === 0 || sending) return;
    if (env.useMocks && second % MOCK_EVENT_EVERY_SEC === 0) {
      const event = MOCK_EVENTS[(second / MOCK_EVENT_EVERY_SEC - 1) % MOCK_EVENTS.length];
      setAttention((a) => clamp(a + event.delta));
      setReaction(event.text);
    } else if (second % CLEAN_STREAK_SEC === 0) {
      // зал понемногу теплеет; сообщение про «чистые» отрезки — только в разборе, по реальным событиям
      setAttention((a) => clamp(a + 3));
    }
  }, [second, sending]);

  const finish = async () => {
    if (!round) return;
    finished.current = true;
    setSending(true);
    setError('');
    try {
      audioUri.current = audioUri.current ?? (await recorder.stop());
      setDelivery(await api.delivery(round.round_id, audioUri.current, [], notes));
      router.replace('/jury');
    } catch (e) {
      setError(`Разбор не получен: ${(e as Error).message}`);
      setSending(false);
    }
  };

  // лимит времени вышел — заканчиваем сами
  useEffect(() => {
    if (elapsed >= maxSec && !finished.current) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, maxSec]);

  if (!user || !topic || !round) return <Redirect href="/" />;

  const shown = Math.min(elapsed, maxSec);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.timer}>{formatTime(shown)}</Text>
        <Text style={styles.limit}>
          {formatTime(minSec)}–{formatTime(maxSec)}
        </Text>
      </View>

      <View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${attention}%` }]} />
        </View>
        <Text style={styles.barLabel}>Внимание зала: {attention}</Text>
      </View>

      <AudienceStage attention={attention} />
      <Body>{sending ? 'Зал аплодирует. ИИ разбирает выступление…' : reaction}</Body>

      <Body muted>{topic.title}</Body>
      {notes ? <Body muted>Заметки: {notes}</Body> : null}
      {!micOk && (
        <ErrorText>
          Микрофон недоступен — запись не идёт{env.useMocks ? ', на моках можно продолжать' : ''}.
        </ErrorText>
      )}
      <ErrorText>{error}</ErrorText>
      <Button
        title={elapsed < minSec ? `Закончить можно через ${formatTime(minSec - elapsed)}` : 'Закончить питч'}
        disabled={elapsed < minSec}
        loading={sending}
        onPress={finish}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  timer: { fontSize: 48, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  limit: { fontSize: 16, color: colors.muted },
  barTrack: { height: 14, borderRadius: 7, backgroundColor: colors.card, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent },
  barLabel: { marginTop: 6, fontSize: 13, color: colors.muted },
});
