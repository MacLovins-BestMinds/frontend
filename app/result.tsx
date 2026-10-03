import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { TimelineEvent } from '@/api/types';
import { useGame } from '@/store/game';
import { Body, Button, Card, Label, Screen, Title } from '@/ui/kit';
import { TREND, colors, formatTime } from '@/ui/theme';

const EVENT_COLOR: Record<TimelineEvent['type'], string> = {
  filler: colors.bad,
  long_pause: colors.warn,
  pace: colors.warn,
  gaze_off: colors.bad,
  good_pause: colors.good,
};

const STRETCH_SEC = 15;
const MISTAKES: TimelineEvent['type'][] = ['filler', 'long_pause', 'pace'];

/** Сколько 15-секундных отрезков прошли без паразитов, долгих пауз и сбоев темпа. */
function cleanStretches(events: TimelineEvent[], durationSec: number): { clean: number; total: number } {
  const total = Math.floor(durationSec / STRETCH_SEC);
  const dirty = new Set(
    events.filter((e) => MISTAKES.includes(e.type)).map((e) => Math.floor(e.t / STRETCH_SEC)),
  );
  let clean = 0;
  for (let i = 0; i < total; i++) if (!dirty.has(i)) clean++;
  return { clean, total };
}

export default function Result() {
  const { result, delivery, juryAnswers } = useGame();

  if (!result) return <Redirect href="/" />;

  // взгляд пока не отслеживается (нет камеры) — не показываем его в разборе
  const events = delivery ? delivery.events.filter((e) => e.type !== 'gaze_off') : [];
  const stretches = delivery ? cleanStretches(delivery.events, delivery.metrics.duration_sec) : null;

  const parts = [
    { title: 'Содержание', weight: '40%', value: result.content },
    { title: 'Подача', weight: '40%', value: result.delivery },
    { title: 'Ответы жюри', weight: '20%', value: result.jury },
  ];

  return (
    <Screen>
      <Title>Разбор</Title>
      <Card style={styles.center}>
        <Text style={styles.total}>{Math.round(result.total)}</Text>
        <Body muted>из 100</Body>
        <Text style={styles.rank}>
          {result.rank.title} {TREND[result.rank.trend] ?? ''}
        </Text>
      </Card>

      <View style={styles.parts}>
        {parts.map((p) => (
          <Card key={p.title} style={styles.part}>
            <Text style={styles.partValue}>{Math.round(p.value)}</Text>
            <Text style={styles.partTitle}>{p.title}</Text>
            <Text style={styles.partTitle}>{p.weight}</Text>
          </Card>
        ))}
      </View>

      {delivery && (
        <>
          <Card>
            <Label>Советы</Label>
            {delivery.tips.map((tip) => (
              <Body key={tip}>• {tip}</Body>
            ))}
          </Card>
          <Card>
            <Label>Моменты выступления</Label>
            {events.length === 0 && <Body muted>Ошибок не отмечено.</Body>}
            {events.map((e, i) => (
              <View key={i} style={styles.event}>
                <View style={[styles.dot, { backgroundColor: EVENT_COLOR[e.type] ?? colors.muted }]} />
                <Body>
                  {formatTime(e.t)} · {e.text}
                </Body>
              </View>
            ))}
          </Card>
          <Card>
            <Label>Цифры</Label>
            <Body>Темп: {delivery.metrics.wpm} слов в минуту</Body>
            <Body>Слова-паразиты: {delivery.metrics.fillers}</Body>
            <Body>Долгие паузы: {delivery.metrics.long_pauses}</Body>
            {stretches && stretches.total > 0 && (
              <Body>
                Отрезков по {STRETCH_SEC} секунд без ошибок: {stretches.clean} из {stretches.total}
              </Body>
            )}
            <Body>Длительность: {formatTime(delivery.metrics.duration_sec)}</Body>
          </Card>
          <Card>
            <Label>Транскрипт</Label>
            <Body muted>{delivery.transcript}</Body>
          </Card>
        </>
      )}

      {juryAnswers.length > 0 && (
        <Card>
          <Label>Ответы жюри</Label>
          {juryAnswers.map((a, i) => (
            <Body key={i}>
              {i + 1}. {a.score} — {a.comment}
            </Body>
          ))}
        </Card>
      )}

      <Button title="Ещё раунд" onPress={() => router.replace('/wheel')} />
      <Button title="В меню" variant="secondary" onPress={() => router.replace('/menu')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  total: { fontSize: 72, fontWeight: '800', color: colors.accent },
  rank: { fontSize: 22, fontWeight: '800', color: colors.text },
  parts: { flexDirection: 'row', gap: 10 },
  part: { flex: 1, alignItems: 'center', gap: 2 },
  partValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  partTitle: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
