import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { c, font, formatTime } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useStayAwake } from '@/hooks/useStayAwake';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Brief } from '@/ui/Brief';
import { TicketButton } from '@/ui/decor';
import { Button, Card, Container, ErrorText, Field, H1, Label, Muted, P, Page } from '@/ui/primitives';

const WARN_SEC = 30;
const GO_DELAY_SEC = 5;

export default function Prep() {
  useStayAwake();
  const { wide } = useLayout();
  const { user, mode, topic, ownPitch, round, notes, setRound, setNotes } = useGame();
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  // время вышло: не выкидываем на сцену мгновенно, а даём несколько секунд собраться
  const [goIn, setGoIn] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !topic || round) return;
    const ownData = ownPitch ?? (mode === 'own' ? { title: topic.title, text: topic.brief, audience: topic.audience } : undefined);
    api
      .createRound(user.user_id, mode, mode === 'own' ? undefined : topic.id, ownData)
      .then(setRound)
      .catch((e: Error) => setError(`Could not create the round: ${e.message}`));
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
    <Page>
      <AppHeader>
        <Button title="Menu" variant="secondary" size="sm" onPress={() => router.replace('/menu')} />
      </AppHeader>
      <Container style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.left, wide && styles.leftWide]}>
          <H1 style={!wide && styles.titleNarrow}>Preparation</H1>
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
  titleNarrow: { fontSize: 28, lineHeight: 34 },
  board: { backgroundColor: c.ink, borderRadius: 20, paddingVertical: 14, alignItems: 'center', borderWidth: 2.5, borderColor: c.ink, transform: [{ rotate: '-1.5deg' }] },
  boardLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: c.onInkMuted },
  timer: { fontFamily: font.display, fontSize: 64, lineHeight: 72, color: c.orange, fontVariant: ['tabular-nums'] },
  notes: { minHeight: 180 },
});
