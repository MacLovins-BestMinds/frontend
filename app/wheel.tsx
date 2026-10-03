import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { api } from '@/api/client';
import type { Spin } from '@/api/types';
import { useGame } from '@/store/game';
import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/ui/kit';
import { findAudience } from '@/content/audiences';
import { colors } from '@/ui/theme';

const SPIN_MS = 1400;

type Phase = 'idle' | 'category' | 'case' | 'done';

export default function Wheel() {
  const user = useGame((s) => s.user);
  const startTopic = useGame((s) => s.startTopic);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const turns = useSharedValue(0);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turns.value * 360}deg` }],
  }));

  const rotate = () => {
    turns.value = withTiming(turns.value + 3, {
      duration: SPIN_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  // две прокрутки подряд: категория → кейс
  const run = async () => {
    setError('');
    setSpin(null);
    setPhase('category');
    rotate();
    try {
      const [result] = await Promise.all([api.spin(), wait(SPIN_MS)]);
      setSpin(result);
      setPhase('case');
      rotate();
      await wait(SPIN_MS);
      setPhase('done');
    } catch (e) {
      setError(`Колесо не прокрутилось: ${(e as Error).message}`);
      setPhase('idle');
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return <Redirect href="/" />;

  const spinning = phase === 'category' || phase === 'case';

  return (
    <Screen>
      <Title>Колесо</Title>
      <View style={styles.wheelBox}>
        <Animated.View style={[styles.wheel, wheelStyle]}>
          <Text style={styles.wheelFace}>🎡</Text>
        </Animated.View>
      </View>

      <Card>
        <Label>Категория</Label>
        <Body>{spin ? spin.category.title : 'Кручу…'}</Body>
      </Card>
      <Card>
        <Label>Что питчишь</Label>
        <Body>{phase === 'done' && spin ? spin.case.title : spinning ? 'Кручу…' : '—'}</Body>
        {phase === 'done' && spin && <AudienceLine value={spin.case.audience} />}
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button
        title="Беру эту тему"
        disabled={phase !== 'done' || !spin}
        onPress={() => {
          if (!spin) return;
          startTopic('training', spin.case);
          router.push('/prep');
        }}
      />
      <Button title="Крутить ещё" variant="secondary" disabled={spinning} onPress={run} />
      <Button title="В меню" variant="secondary" onPress={() => router.replace('/menu')} />
    </Screen>
  );
}

function AudienceLine({ value }: { value: string }) {
  const audience = findAudience(value);
  return (
    <Body muted>
      Перед кем: {audience ? `${audience.icon} ${audience.name} — им важно: ${audience.focus.toLowerCase()}` : value}
    </Body>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  wheelBox: { alignItems: 'center', paddingVertical: 8 },
  wheel: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelFace: { fontSize: 84 },
});
