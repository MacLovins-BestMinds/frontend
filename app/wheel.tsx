import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { api } from '@/api/client';
import type { Difficulty, Spin } from '@/api/types';
import { findAudience } from '@/content/audiences';
import { c } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { goBack } from '@/ui/nav';
import { TicketButton, Wheel } from '@/ui/decor';
import { LevelPicker } from '@/ui/LevelPicker';
import { Button, Card, Container, ErrorText, H1, H3, Label, Muted, Page } from '@/ui/primitives';

const SPIN_MS = 1400;
// сколько минут на подготовку даёт каждый уровень
const PREP_MIN: Record<Difficulty, string> = { easy: '5 min', medium: '4 min', hard: '3 min' };
type Phase = 'idle' | 'category' | 'case' | 'done';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function WheelScreen() {
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const startTopic = useGame((s) => s.startTopic);
  const difficulty = useGame((s) => s.difficulty);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const turns = useSharedValue(0);
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turns.value * 360}deg` }] }));

  const rotate = () => {
    turns.value = withTiming(turns.value + 3 + Math.random(), { duration: SPIN_MS, easing: Easing.out(Easing.cubic) });
  };

  // две прокрутки подряд: категория → кейс
  const run = async (level: Difficulty = difficulty) => {
    setError('');
    setSpin(null);
    setPhase('category');
    rotate();
    try {
      const [result] = await Promise.all([api.spin(level), wait(SPIN_MS)]);
      setSpin(result);
      setPhase('case');
      rotate();
      await wait(SPIN_MS);
      setPhase('done');
    } catch (e) {
      setError(`The wheel did not spin: ${(e as Error).message}`);
      setPhase('idle');
    }
  };

  useEffect(() => {
    run();
    // крутим один раз при входе
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return <Redirect href="/" />;

  const spinning = phase === 'category' || phase === 'case';
  const ready = phase === 'done' && spin;
  const audience = spin ? findAudience(spin.case.audience) : undefined;
  const size = wide ? 380 : 250;

  return (
    <Page
      sticky
      footer={
        <View style={styles.actions}>
          {ready ? (
            <TicketButton
              title="Take this topic"
              stubTop={PREP_MIN[difficulty]}
              stubBottom="→"
              onPress={() => {
                startTopic('training', spin.case);
                router.push('/prep');
              }}
              stretch={!wide}
            />
          ) : null}
          <Button title="Spin again" variant="secondary" disabled={spinning} onPress={() => run()} style={!wide ? styles.full : undefined} />
        </View>
      }>
      <AppHeader glass back={() => goBack()} />
      <Container style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.wheelBox, wide && styles.wheelBoxWide]}>
          <Svg width={34} height={38} viewBox="0 0 28 32" style={styles.pointer}>
            <Path d="M14 30 L2 2 H26 Z" fill={c.ink} stroke={c.ink} strokeWidth={3} strokeLinejoin="round" />
          </Svg>
          <Animated.View style={wheelStyle}>
            <Wheel size={size} pointer={false} />
          </Animated.View>
        </View>
        <View style={styles.side}>
          <H1 style={!wide && styles.titleNarrow}>Topic wheel</H1>
          {/* тема зависит от уровня: сменил уровень — колесо крутится заново */}
          <LevelPicker
            value={difficulty}
            disabled={spinning}
            compact
            onChange={(level) => {
              if (level === difficulty) return;
              setDifficulty(level);
              run(level);
            }}
          />
          <Card flat>
            <Label>Category</Label>
            <H3>{spin ? spin.category.title : 'Spinning…'}</H3>
          </Card>
          <Card>
            <Label>What you pitch</Label>
            <H3>{ready ? spin.case.title : spinning ? 'Spinning…' : '—'}</H3>
            {ready && (
              <Muted>
                Audience: {audience ? `${audience.name.toLowerCase()} — they care about ${audience.focus.toLowerCase()}` : spin.case.audience}
              </Muted>
            )}
          </Card>
          <ErrorText>{error}</ErrorText>
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 48, gap: 24 },
  mainWide: { flexDirection: 'row', alignItems: 'center', gap: 64, paddingTop: 40 },
  wheelBox: { alignItems: 'center' },
  wheelBoxWide: { flex: 1 },
  pointer: { marginBottom: -14, zIndex: 1 },
  side: { gap: 18, flex: 1 },
  titleNarrow: { fontSize: 28, lineHeight: 34 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  full: { width: '100%' },
});
