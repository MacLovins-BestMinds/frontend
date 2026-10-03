import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { api } from '@/api/client';
import { useGame } from '@/store/game';
import { Brief } from '@/ui/Brief';
import { Button, ErrorText, Screen, Title } from '@/ui/kit';
import { useStayAwake } from '@/ui/useStayAwake';
import { colors, formatTime } from '@/ui/theme';

export default function Prep() {
  useStayAwake();
  const { user, mode, topic, round, notes, setRound, setNotes } = useGame();
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !topic || round) return;
    api
      .createRound(user.user_id, mode, topic.id)
      .then(setRound)
      .catch((e: Error) => setError(`Раунд не создался: ${e.message}`));
  }, [user, topic, round, mode, setRound]);

  useEffect(() => {
    if (!round) return;
    const endsAt = Date.now() + round.prep_sec * 1000;
    const tick = () => setLeft(Math.max(0, (endsAt - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [round]);

  // время вышло — на сцену
  useEffect(() => {
    if (left === 0) router.replace('/stage');
  }, [left]);

  if (!user || !topic) return <Redirect href="/" />;

  return (
    <Screen>
      <Title>Подготовка</Title>
      <Text style={styles.timer}>{left === null ? '—:——' : formatTime(left)}</Text>
      <Brief
        topic={topic}
        minSec={round?.pitch_min_sec ?? 60}
        maxSec={round?.pitch_max_sec ?? 180}
      />
      <TextInput
        style={styles.notes}
        placeholder="Заметки для себя"
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
