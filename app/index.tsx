import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { api } from '@/api/client';
import { env } from '@/config/env';
import { useGame } from '@/store/game';
import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/ui/kit';
import { colors } from '@/ui/theme';

const STEPS = [
  { n: '1', title: 'Получаешь тему', text: 'Крутишь колесо: категория → кейс → готовая тема.' },
  { n: '2', title: '5 минут на подготовку', text: 'Читаешь бриф и набрасываешь заметки для себя.' },
  {
    n: '3',
    title: 'Выступаешь и отвечаешь жюри',
    text: 'Зал реагирует вживую, в конце жюри задаёт вопросы, а ИИ разбирает выступление.',
  },
];

export default function Start() {
  const setUser = useGame((s) => s.setUser);
  const [nick, setNick] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enter = async () => {
    setLoading(true);
    setError('');
    try {
      setUser(await api.auth(nick.trim()));
      router.replace('/menu');
    } catch (e) {
      setError(`Не получилось войти: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Stage Zero</Title>
      <Body muted>Тренажёр выступлений. Как это работает:</Body>
      {STEPS.map((s) => (
        <Card key={s.n}>
          <Label>Шаг {s.n}</Label>
          <Body>{s.title}</Body>
          <Body muted>{s.text}</Body>
        </Card>
      ))}
      <TextInput
        style={styles.input}
        placeholder="Твой ник"
        placeholderTextColor={colors.muted}
        value={nick}
        onChangeText={setNick}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={50}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Начать" onPress={enter} disabled={nick.trim().length < 2} loading={loading} />
      <Text style={styles.debug}>
        {env.useMocks ? 'Моки включены' : `API: ${env.apiUrl || 'не задан'}`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.card,
  },
  debug: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
