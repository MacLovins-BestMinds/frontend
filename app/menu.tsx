import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Case, LeaderboardEntry } from '@/api/types';
import { useGame } from '@/store/game';
import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/ui/kit';
import { TREND, colors } from '@/ui/theme';

export default function Menu() {
  const user = useGame((s) => s.user);
  const startTopic = useGame((s) => s.startTopic);
  const [daily, setDaily] = useState<Case | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .daily()
      .then((d) => setDaily(d.case))
      .catch((e: Error) => setError(`Тема дня не загрузилась: ${e.message}`));
    api
      .leaderboard()
      .then(setLeaders)
      .catch(() => setLeaders([]));
  }, []);

  if (!user) return <Redirect href="/" />;

  return (
    <Screen>
      <Title>Привет, {user.nick}</Title>
      <Card>
        <Label>Звание</Label>
        <Text style={styles.rank}>
          {user.rank.title} {TREND[user.rank.trend] ?? ''}
        </Text>
      </Card>

      <Card>
        <Label>Тренировка</Label>
        <Body muted>Колесо выбирает категорию и кейс. Крутить можно сколько угодно.</Body>
        <Button title="Крутить колесо" onPress={() => router.push('/wheel')} />
      </Card>

      <Card>
        <Label>Тема дня</Label>
        <Body>{daily ? daily.title : 'Загружаю…'}</Body>
        <ErrorText>{error}</ErrorText>
        <Button
          title="Выступить"
          variant="secondary"
          disabled={!daily}
          onPress={() => {
            if (!daily) return;
            startTopic('daily', daily);
            router.push('/prep');
          }}
        />
        {leaders.length > 0 && (
          <View style={styles.leaders}>
            {leaders.slice(0, 5).map((l, i) => (
              <Body key={l.nick} muted>
                {i + 1}. {l.nick} — {Math.round(l.score)}
              </Body>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Label>Свой питч</Label>
        <Body muted>Своя тема и текст, выбор аудитории. ИИ поможет со структурой.</Body>
        <Button
          title="Выступить со своим питчем"
          variant="secondary"
          onPress={() => router.push('/own' as any)}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rank: { fontSize: 24, fontWeight: '800', color: colors.text },
  leaders: { marginTop: 4 },
});
