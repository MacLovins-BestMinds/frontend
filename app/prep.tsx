import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { api } from '@/api/client';
import { useGame } from '@/store/game';
import { Brief } from '@/ui/Brief';
import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/ui/kit';
import { useStayAwake } from '@/ui/useStayAwake';
import { colors, formatTime } from '@/ui/theme';

const WARN_SEC = 30;
const GO_DELAY_SEC = 5;

export default function Prep() {
  useStayAwake();
  const { user, mode, topic, ownPitch, round, notes, setRound, setNotes } = useGame();
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  // время вышло: не выкидываем на сцену мгновенно, а даём несколько секунд собраться
  const [goIn, setGoIn] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !topic || round) return;
    const ownData =
      ownPitch ??
      (mode === 'own' ? { title: topic.title, text: topic.brief, audience: topic.audience } : undefined);
    api
      .createRound(user.user_id, mode, mode === 'own' ? undefined : topic.id, ownData)
      .then(setRound)
      .catch((e: Error) => setError(`Раунд не создался: ${e.message}`));
  }, [user, topic, ownPitch, round, mode, setRound]);

  useEffect(() => {
    if (!round) return;
    const endsAt = Date.now() + round.prep_sec * 1000;
    const tick = () => setLeft(Math.max(0, (endsAt - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [round]);

  useEffect(() => {
    if (left === 0) setGoIn((g) => g ?? GO_DELAY_SEC);
  }, [left]);

  useEffect(() => {
    if (goIn === null) return;
    if (goIn <= 0) {
      router.replace('/stage');
      return;
    }
    const id = setTimeout(() => setGoIn(goIn - 1), 1000);
    return () => clearTimeout(id);
  }, [goIn]);

  const warning = left !== null && left > 0 && left <= WARN_SEC;

  if (!user || !topic) return <Redirect href="/" />;

  return (
    <Screen>
      <Title>Подготовка</Title>
      <Text style={[styles.timer, (warning || goIn !== null) && styles.timerWarn]}>
        {left === null ? '—:——' : formatTime(left)}
      </Text>
      {warning && <Body>⏳ Осталось меньше {WARN_SEC} секунд — допиши заметки и соберись.</Body>}
      {goIn !== null && (
        <Card>
          <Label>Время подготовки вышло</Label>
          <Body>Выходим на сцену через {goIn}…</Body>
          <Button title="На сцену сейчас" onPress={() => router.replace('/stage')} />
        </Card>
      )}
      <Brief
        topic={topic}
        minSec={round?.pitch_min_sec ?? 60}
        maxSec={round?.pitch_max_sec ?? 180}
      />
      <TextInput
        style={styles.notes}
        placeholder="Заметки для себя — ИИ сверит их с тем, что ты скажешь"
        placeholderTextColor={colors.muted}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Я готов" disabled={!round} onPress={() => router.replace('/stage')} />
      <Button title="В меню" variant="secondary" onPress={() => router.replace('/menu')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timerWarn: { color: colors.bad },
  notes: {
    minHeight: 120,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    textAlignVertical: 'top',
  },
});
