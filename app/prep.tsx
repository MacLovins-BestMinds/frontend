import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Pace } from '@/api/types';
import { c, font, formatTime, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useStayAwake } from '@/hooks/useStayAwake';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { GlassButton } from '@/ui/Glass';
import { goBack, goMenu } from '@/ui/nav';
import { Brief } from '@/ui/Brief';
import { TicketButton } from '@/ui/decor';
import { levelName } from '@/ui/LevelPicker';
import { Card, Container, ErrorText, Field, H1, Label, Muted, P, Page, Tag } from '@/ui/primitives';

const PACES: { id: Pace; name: string; note: string }[] = [
  { id: 'slow', name: 'Calm', note: 'Take your time. Nobody minds slow speech.' },
  { id: 'normal', name: 'Normal', note: 'About 120–160 words a minute.' },
  { id: 'fast', name: 'Fast', note: 'Energetic. Slow down and the room gets bored.' },
];
const WARN_SEC = 30;
const GO_DELAY_SEC = 5;

export default function Prep() {
  useStayAwake();
  const { wide } = useLayout();
  const { user, mode, topic, ownPitch, round, notes, pace, difficulty, setRound, setNotes, setPace } = useGame();
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  // время вышло: не выкидываем на сцену мгновенно, а даём несколько секунд собраться
  const [goIn, setGoIn] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !topic || round) return;
    const ownData = ownPitch ?? (mode === 'own' ? { title: topic.title, text: topic.brief, audience: topic.audience } : undefined);
    api
      .createRound(user.user_id, mode, mode === 'own' ? undefined : topic.id, ownData, difficulty)
      .then(setRound)
      .catch((e: Error) => setError(`Could not create the round: ${e.message}`));
    // уровень выбран до подготовки и на ней не меняется
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!user || !topic) return <Redirect href="/" />;

  const warning = left !== null && left > 0 && left <= WARN_SEC;
  const hot = warning || goIn !== null;

  return (
    <Page sticky>
      <AppHeader glass back={() => goBack()}>
        <GlassButton icon="home" label="Menu" onPress={goMenu} />
      </AppHeader>
      <Container style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.left, wide && styles.leftWide]}>
          <View style={styles.head}>
            <H1 style={!wide && styles.titleNarrow}>Preparation</H1>
            <Tag>{levelName(difficulty)}</Tag>
          </View>
          <View style={[styles.board, hot && { borderColor: c.bad }]}>
            <Text style={styles.boardLabel}>until you go on stage</Text>
            <Text style={[styles.timer, hot && { color: '#FF8A7A' }]}>{left === null ? '—:——' : formatTime(left)}</Text>
          </View>
          {warning && <P>Less than {WARN_SEC} seconds left — finish your notes and get ready.</P>}
          {goIn !== null && (
            <Card tone="accent">
              <Label style={{ color: c.ink }}>Preparation time is up</Label>
              <P>Going on stage in {goIn}…</P>
            </Card>
          )}
          <Field
            placeholder="Notes for yourself — AI will compare them with what you actually say"
            value={notes}
            onChangeText={setNotes}
            multiline
            accessibilityLabel="Notes for yourself"
            style={styles.notes}
          />
          <Muted>There are no notes on stage: just the room, the time and the attention bar.</Muted>
          <View style={styles.paceBlock}>
            <Label>Your pace</Label>
            <View style={styles.paces} accessibilityRole="radiogroup">
              {PACES.map((p) => {
                const selected = p.id === pace;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    aria-checked={selected}
                    onPress={() => setPace(p.id)}
                    style={[styles.pace, selected && styles.paceOn, selected && shadow(3)]}>
                    <Text style={styles.paceName}>{p.name}</Text>
                    <Text style={styles.paceNote}>{p.note}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ErrorText>{error}</ErrorText>
          {round ? <TicketButton title="Ready — go on stage" stubTop="pitch" stubBottom="1–3 min" onPress={() => router.replace('/stage')} stretch={!wide} /> : null}
        </View>
        <View style={[styles.right, wide && styles.rightWide]}>
          <Brief topic={topic} minSec={round?.pitch_min_sec ?? 60} maxSec={round?.pitch_max_sec ?? 180} />
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 56, gap: 22 },
  mainWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, paddingTop: 16 },
  left: { gap: 18 },
  leftWide: { flex: 1 },
  right: { gap: 22 },
  rightWide: { flex: 1.2 },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  titleNarrow: { fontSize: 28, lineHeight: 34 },
  board: { backgroundColor: c.ink, borderRadius: 20, paddingVertical: 14, alignItems: 'center', borderWidth: 2.5, borderColor: c.ink, transform: [{ rotate: '-1.5deg' }] },
  boardLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: c.onInkMuted },
  timer: { fontFamily: font.display, fontSize: 64, lineHeight: 72, color: c.orange, fontVariant: ['tabular-nums'] },
  notes: { minHeight: 180 },
  paceBlock: { gap: 8 },
  paces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pace: { flexGrow: 1, flexBasis: 150, backgroundColor: c.paper, borderRadius: 16, padding: 12, gap: 2, ...outline },
  paceOn: { backgroundColor: c.orange },
  paceName: { fontFamily: font.bold, fontSize: 16, color: c.ink },
  paceNote: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: c.ink },
});
