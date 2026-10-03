import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Case, LeaderboardEntry, Profile } from '@/api/types';
import { AUDIENCES, findAudience } from '@/content/audiences';
import { c, font, formatDay, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useGame } from '@/store/game';
import { AppHeader, NickChip } from '@/ui/AppHeader';
import { Tape, TrendArrow, Wheel } from '@/ui/decor';
import { Button, Card, Chip, Container, ErrorText, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

export default function Menu() {
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const startTopic = useGame((s) => s.startTopic);
  const [daily, setDaily] = useState<{ date: string; topic: Case } | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api
      .daily()
      .then((d) => setDaily({ date: d.date, topic: d.case }))
      .catch((e: Error) => setError(`Could not load the topic of the day: ${e.message}`));
    api.leaderboard().then(setLeaders).catch(() => setLeaders([]));
    api.profile(user.user_id).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  if (!user) return <Redirect href="/" />;

  const rank = profile?.rank ?? user.rank;
  const rounds = profile?.last_rounds ?? [];
  const average = rounds.length ? Math.round(rounds.reduce((sum, r) => sum + r.total, 0) / rounds.length) : null;
  const goDaily = () => {
    if (!daily) return;
    startTopic('daily', daily.topic);
    router.push('/prep');
  };
  const audience = daily ? findAudience(daily.topic.audience)?.name ?? daily.topic.audience : '';

  const rankCard = (
    <Pressable accessibilityRole="link" accessibilityLabel="Your profile and progress" onPress={() => router.push('/profile')} style={[styles.rank, wide ? styles.rankWide : styles.rankNarrow]}>
      <View style={styles.rankText}>
        <Label style={styles.rankLabel}>Rank</Label>
        <Text style={[styles.rankTitle, !wide && { fontSize: 16, lineHeight: 21 }]}>{rank.title}</Text>
        {wide && <Small style={styles.rankNote}>{average === null ? 'no rounds yet' : `average over ${rounds.length} ${plural(rounds.length)}: ${average}`} · see progress</Small>}
      </View>
      <TrendArrow trend={rank.trend} size={wide ? 44 : 22} />
    </Pressable>
  );

  const training = (
    <Card tone="accent" style={[styles.training, wide && styles.trainingWide]}>
      <View style={[styles.wheel, wide ? styles.wheelWide : styles.wheelNarrow]} pointerEvents="none">
        <Wheel size={wide ? 340 : 200} />
      </View>
      <Label style={styles.ink}>Training</Label>
      <Text style={[styles.trainingTitle, !wide && styles.trainingTitleNarrow]}>Spin the wheel, get a topic</Text>
      <P style={[styles.trainingText, !wide && { fontSize: 15, lineHeight: 21, maxWidth: 210 }]}>
        {wide ? 'A category, then a case. 5 minutes to prepare and 1–3 minutes to pitch. The wheel is free — spin as many times as you like.' : '5 minutes to prepare, 1–3 minutes to pitch.'}
      </P>
      <Button title="Spin the wheel" variant="ink" onPress={() => router.push('/wheel')} style={styles.trainingButton} />
    </Card>
  );

  const dailyCard = (
    <View style={[styles.poster, shadow(wide ? 6 : 4), wide && styles.posterWide]}>
      <Tape style={{ left: 36 }} tilt={-6} />
      <Tape style={{ right: 36 }} tilt={5} />
      <View style={styles.posterHead}>
        <Label style={styles.grow}>Topic of the day</Label>
        {daily && <Chip title={formatDay(daily.date)} />}
      </View>
      <H3 style={wide ? styles.posterTitle : undefined}>{daily ? daily.topic.title : 'Loading…'}</H3>
      {daily && <Muted>Audience: {audience.toLowerCase()}</Muted>}
      <ErrorText>{error}</ErrorText>
      {leaders.length > 0 && (
        <View style={styles.leaders}>
          <Text style={styles.leadersTitle}>Today’s leaderboard</Text>
          {leaders.slice(0, wide ? 5 : 3).map((l, i) => (
            <View key={l.nick} style={styles.leader}>
              <View style={[styles.place, i === 0 && { backgroundColor: c.orange }]}>
                <Text style={styles.placeText}>{i + 1}</Text>
              </View>
              <Text style={[styles.leaderNick, l.nick === user.nick && { fontFamily: font.bold }]} numberOfLines={1}>
                {l.nick}
              </Text>
              <Text style={styles.leaderScore}>{Math.round(l.score)}</Text>
            </View>
          ))}
        </View>
      )}
      <Button title="Pitch the topic of the day" variant="secondary" disabled={!daily} onPress={goDaily} style={[styles.posterButton, shadow(4)]} />
    </View>
  );

  const own = (
    <Card flat style={[styles.own, wide && styles.ownWide]}>
      <View style={styles.ownText}>
        <Label>Your own pitch</Label>
        <H3>{wide ? 'Bring your own topic and text' : 'Your topic, text and audience'}</H3>
        {wide && <Muted>Pick an audience. Keep your text as is, structure it, or structure and improve it — the jury will ask about it.</Muted>}
      </View>
      {wide && (
        <View style={styles.audiences}>
          {AUDIENCES.map((a) => (
            <Chip key={a.id} title={a.name} />
          ))}
        </View>
      )}
      {wide ? (
        <Button title="Write a pitch" variant="secondary" onPress={() => router.push('/own')} style={shadow(4)} />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Write your own pitch" onPress={() => router.push('/own')} style={styles.ownArrow}>
          <TrendArrow trend="flat" size={22} color={c.ink} />
        </Pressable>
      )}
    </Card>
  );

  return (
    <Page>
      {wide ? (
        <AppHeader>
          <Pressable accessibilityRole="link" accessibilityLabel="Your profile and progress" onPress={() => router.push('/profile')}>
            <NickChip nick={user.nick} />
          </Pressable>
        </AppHeader>
      ) : null}
      <Container style={[styles.main, !wide && styles.mainNarrow]}>
        <View style={styles.hello}>
          <View style={styles.grow}>
            {wide ? <H1>Hi, {user.nick}</H1> : <Small>Hi,</Small>}
            {wide ? <Muted style={styles.lead}>Choose what you will bring to the room today.</Muted> : <Text style={styles.nickNarrow}>{user.nick}</Text>}
          </View>
          {rankCard}
        </View>
        <View style={wide ? styles.cardsWide : styles.cardsNarrow}>
          {training}
          {dailyCard}
        </View>
        {own}
      </Container>
    </Page>
  );
}

function plural(n: number) {
  return n === 1 ? 'round' : 'rounds';
}

const styles = StyleSheet.create({
  main: { paddingTop: 16, paddingBottom: 72, gap: 32 },
  mainNarrow: { paddingTop: 20, paddingBottom: 32, gap: 20 },
  grow: { flex: 1 },
  ink: { color: c.ink },
  hello: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 },
  lead: { fontSize: 20, lineHeight: 28, marginTop: 6 },
  nickNarrow: { fontFamily: font.display, fontSize: 24, lineHeight: 29, color: c.ink },
  rank: { backgroundColor: c.ink, flexDirection: 'row', alignItems: 'center' },
  rankWide: { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20, gap: 20, minWidth: 340 },
  rankNarrow: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  rankText: { flexGrow: 1 },
  rankLabel: { color: c.orange, fontSize: 11 },
  rankTitle: { fontFamily: font.display, fontSize: 28, lineHeight: 35, color: c.onInk },
  rankNote: { color: c.onInkMuted, fontSize: 15 },
  cardsWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 28, alignItems: 'stretch' },
  cardsNarrow: { gap: 22 },
  training: { overflow: 'hidden', borderRadius: 24, gap: 12 },
  trainingWide: { flexGrow: 1.3, flexBasis: 420, padding: 32, minHeight: 380, gap: 16 },
  wheel: { position: 'absolute', transform: [{ rotate: '11deg' }] },
  wheelWide: { right: -70, bottom: -110 },
  wheelNarrow: { right: -62, bottom: -74 },
  trainingTitle: { fontFamily: font.display, fontSize: 32, lineHeight: 38, color: c.ink, maxWidth: 420 },
  trainingTitleNarrow: { fontSize: 22, lineHeight: 26, maxWidth: 220 },
  trainingText: { maxWidth: 440 },
  trainingButton: { alignSelf: 'flex-start', marginTop: 'auto' },
  poster: { backgroundColor: c.paper, borderRadius: 6, padding: 22, paddingTop: 30, gap: 12, transform: [{ rotate: '1deg' }], ...outline },
  posterWide: { flexGrow: 1, flexBasis: 360, padding: 32, paddingTop: 38, gap: 14 },
  posterHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posterTitle: { fontSize: 24, lineHeight: 30 },
  posterButton: { marginTop: 'auto' },
  leaders: { borderTopWidth: 2, borderTopColor: c.ink, borderStyle: 'dashed', paddingTop: 12, gap: 8 },
  leadersTitle: { fontFamily: font.bold, fontSize: 15, color: c.ink },
  leader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  place: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  placeText: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  leaderNick: { fontFamily: font.body, fontSize: 16, color: c.ink, flex: 1 },
  leaderScore: { fontFamily: font.bold, fontSize: 16, color: c.ink },
  own: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 18 },
  ownWide: { flexWrap: 'wrap', gap: 28, padding: 30, borderRadius: 24 },
  ownText: { flexGrow: 1, flexBasis: 200, flexShrink: 1, gap: 6 },
  audiences: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexGrow: 1, flexBasis: 300, flexShrink: 1 },
  ownArrow: { width: 48, height: 48, borderRadius: 14, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', ...outline },
});
