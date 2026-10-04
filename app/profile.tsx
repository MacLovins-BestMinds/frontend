import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { api } from '@/api/client';
import type { HistoryRound, Progress, SkillTrend } from '@/api/types';
import { c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Spark, Stamp, TrendArrow } from '@/ui/decor';
import { levelName } from '@/ui/LevelPicker';
import { Button, Card, Chip, Container, ErrorText, H3, Label, Muted, P, Page } from '@/ui/primitives';

const RANKS = [
  { title: 'Novice', from: 0 },
  { title: 'Speaker', from: 40 },
  { title: 'Pitcher', from: 60 },
  { title: 'Orator', from: 75 },
  { title: 'Legend', from: 88 },
];
const MODE: Record<string, string> = { training: 'Training', daily: 'Topic of the day', own: 'Own pitch', warmup: 'Warm-up' };
const CHART_ROUNDS = 30;

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const num = (v: number | null, digits = 0) => (v === null ? '—' : v.toFixed(digits));

/** Стало лучше или хуже: для паразитов и пауз «меньше — лучше», темп оценивается по коридору, а не по росту. */
function verdict(t: SkillTrend): 'good' | 'bad' | 'same' {
  if (t.delta === null || Math.abs(t.delta) < 0.1 || t.better === 'range') return 'same';
  return t.delta > 0 === (t.better === 'higher') ? 'good' : 'bad';
}

function Delta({ trend }: { trend: SkillTrend }) {
  if (trend.delta === null) return <Text style={styles.deltaNone}>not enough rounds to compare</Text>;
  const v = verdict(trend);
  const sign = trend.delta > 0 ? '+' : '';
  return (
    <Text style={[styles.delta, v === 'good' && { color: c.good }, v === 'bad' && { color: c.bad }]}>
      {sign}
      {trend.delta.toFixed(1)} vs the 5 rounds before
    </Text>
  );
}

/** Баллы раундов от старых к новым и пороги званий — видно, к какому званию идёт линия. */
function ScoreChart({ rounds }: { rounds: HistoryRound[] }) {
  const [width, setWidth] = useState(0);
  const height = 230;
  const pad = { left: 30, right: 70, top: 14, bottom: 26 };
  const points = [...rounds].slice(0, CHART_ROUNDS).reverse();
  const x = (i: number) => pad.left + (points.length <= 1 ? (width - pad.left - pad.right) / 2 : (i / (points.length - 1)) * (width - pad.left - pad.right));
  const y = (v: number) => pad.top + (1 - v / 100) * (height - pad.top - pad.bottom);
  const line = points.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r.total).toFixed(1)}`).join(' ');
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }} accessibilityRole="image" accessibilityLabel={`Scores of your last ${points.length} rounds`}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {RANKS.slice(1).map((r) => (
            <Line key={r.title} x1={pad.left} x2={width - pad.right + 6} y1={y(r.from)} y2={y(r.from)} stroke={c.onInkMuted} strokeWidth={2} strokeDasharray="6 6" />
          ))}
          {RANKS.slice(1).map((r) => (
            <SvgText key={r.title} x={width - pad.right + 12} y={y(r.from) + 4} fontFamily={font.semi} fontSize={12} fill={c.graphite}>
              {r.title}
            </SvgText>
          ))}
          {[0, 50, 100].map((v) => (
            <SvgText key={v} x={pad.left - 8} y={y(v) + 4} fontFamily={font.medium} fontSize={11} fill={c.graphite} textAnchor="end">
              {v}
            </SvgText>
          ))}
          {points.length > 1 && <Path d={line} fill="none" stroke={c.ink} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />}
          {points.length > 1 && <Path d={line} fill="none" stroke={c.orange} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />}
          {points.map((r, i) => (
            <Circle key={r.id} cx={x(i)} cy={y(r.total)} r={i === points.length - 1 ? 7 : 4.5} fill={i === points.length - 1 ? c.orange : c.paper} stroke={c.ink} strokeWidth={2.5} />
          ))}
          {points.length > 0 && (
            <>
              <SvgText x={x(0)} y={height - 6} fontFamily={font.medium} fontSize={11} fill={c.graphite} textAnchor="start">
                {day(points[0].created_at)}
              </SvgText>
              {points.length > 1 && (
                <SvgText x={x(points.length - 1)} y={height - 6} fontFamily={font.medium} fontSize={11} fill={c.graphite} textAnchor="end">
                  {day(points[points.length - 1].created_at)}
                </SvgText>
              )}
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

/** Маленький график одной привычки за последние раунды. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <View style={{ height: 34 }} />;
  const w = 120;
  const h = 34;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (w - 8) + 4).toFixed(1)} ${(h - 5 - ((v - min) / span) * (h - 10)).toFixed(1)}`).join(' ');
  return (
    <Svg width={w} height={h}>
      <Path d={d} fill="none" stroke={c.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export default function Profile() {
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const signOut = useGame((s) => s.signOut);
  const openReview = useGame((s) => s.openReview);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .progress()
      .then(setProgress)
      .catch((e: Error) => setError(`Could not load your progress: ${e.message}`));
  }, [user]);

  if (!user) return <Redirect href="/" />;

  const open = async (round: HistoryRound) => {
    setOpening(round.id);
    setError('');
    try {
      openReview(await api.roundReview(round.id));
      router.push('/result');
    } catch (e) {
      setError(`Could not open the round: ${(e as Error).message}`);
    } finally {
      setOpening(null);
    }
  };

  const rank = progress?.rank ?? user.rank;
  const current = [...RANKS].reverse().find((r) => (progress?.rank_score ?? 0) >= r.from) ?? RANKS[0];
  const next = progress?.next_rank ? RANKS.find((r) => r.title === progress.next_rank?.title) : undefined;
  const toNext = next ? Math.max(0, Math.min(1, ((progress?.rank_score ?? 0) - current.from) / (next.from - current.from))) : 1;
  const history = progress?.history ?? [];
  const series = (key: keyof HistoryRound) =>
    [...history]
      .slice(0, 10)
      .reverse()
      .map((r) => r[key])
      .filter((v): v is number => typeof v === 'number');

  return (
    <Page>
      <AppHeader>
        <Button title="Menu" variant="secondary" size="sm" onPress={() => router.replace('/menu')} />
        <Button title="Sign out" variant="secondary" size="sm" onPress={() => (signOut(), router.replace('/'))} />
      </AppHeader>
      <Container style={[styles.main, !wide && styles.mainNarrow]}>
        <View style={[styles.row, !wide && styles.column]}>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={styles.heroText}>
              <Label style={{ color: c.orange }}>Your progress</Label>
              <Text style={[styles.nick, !wide && { fontSize: 30, lineHeight: 36 }]} numberOfLines={1}>
                {user.nick}
              </Text>
              {progress?.next_rank ? (
                <>
                  <View style={styles.rankBar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(toNext * 100) }}>
                    <View style={[styles.rankFill, { width: `${toNext * 100}%` }]} />
                  </View>
                  <Text style={styles.heroNote}>
                    {progress.next_rank.points_needed.toFixed(0)} more points on average to become {progress.next_rank.title}. The rank follows the average of your last five rounds — now {progress.rank_score.toFixed(0)}.
                  </Text>
                </>
              ) : progress ? (
                <Text style={styles.heroNote}>The highest rank. Keep the average of your last five rounds above 88 to stay a Legend.</Text>
              ) : null}
            </View>
            <Stamp title={rank.title} caption="rank" trend={rank.trend} size={wide ? 140 : 104} color={c.orange} tilt={-9} />
          </View>

          <View style={[styles.tiles, wide && styles.tilesWide]}>
            {[
              { label: 'Rounds played', value: progress ? String(progress.rounds_total) : '…', note: progress ? `${progress.minutes_total.toFixed(0)} min on stage` : '' },
              { label: 'Average score', value: progress?.rounds_total ? progress.average.toFixed(0) : '—', note: 'all rounds' },
              { label: 'Best round', value: progress?.rounds_total ? progress.best.toFixed(0) : '—', note: 'out of 100' },
              { label: 'Day streak', value: progress ? String(progress.streak_days) : '…', note: progress?.streak_days ? 'play today to keep it' : 'play today to start one' },
            ].map((t, i) => (
              <View key={t.label} style={[styles.tile, i === 3 && progress?.streak_days ? styles.tileAccent : null, shadow(4)]}>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileValue}>{t.value}</Text>
                <Text style={styles.tileNote}>{t.note}</Text>
              </View>
            ))}
          </View>
        </View>

        <ErrorText>{error}</ErrorText>
        {!progress && !error && <ActivityIndicator color={c.ink} />}

        {progress && progress.rounds_total === 0 && (
          <Card tone="accent" style={styles.empty}>
            <H3>No rounds yet</H3>
            <P>Play one round and this page fills up: your scores, pace, filler words and what to work on next.</P>
            <Button title="Spin the wheel" variant="ink" onPress={() => router.push('/wheel')} style={styles.start} />
          </Card>
        )}

        {progress && progress.rounds_total > 0 && (
          <>
            <View style={[styles.row, !wide && styles.column]}>
              <Card flat style={[styles.card, wide && { flex: 1.6 }]}>
                <H3>Scores round by round</H3>
                <Muted>Dashed lines are the rank thresholds. The line is your total score, oldest on the left.</Muted>
                <ScoreChart rounds={history} />
              </Card>
              <Card tone="accent" style={[styles.card, wide && { flex: 1 }]}>
                <H3>What the numbers say</H3>
                {progress.insights.map((insight) => (
                  <View key={insight.title} style={styles.insight}>
                    <View style={[styles.insightIcon, insight.kind === 'focus' && { backgroundColor: c.ink }]}>
                      {insight.kind === 'good' ? <Spark size={14} /> : <TrendArrow trend="flat" size={14} color={c.orange} />}
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightText}>{insight.text}</Text>
                    </View>
                  </View>
                ))}
                {progress.insights.length === 0 && <P>Play a few more rounds — advice needs something to compare.</P>}
              </Card>
            </View>

            <View style={[styles.row, !wide && styles.column]}>
              <Card flat style={[styles.card, wide && { flex: 1 }]}>
                <H3>Scores by part</H3>
                <Muted>Average of your last five rounds.</Muted>
                {progress.skills.map((s) => (
                  <View key={s.key} style={styles.skill}>
                    <View style={styles.skillHead}>
                      <Text style={styles.skillTitle}>{s.title}</Text>
                      <Text style={styles.skillValue}>{num(s.value)}</Text>
                    </View>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, s.value ?? 0))}%` }]} />
                    </View>
                    <Delta trend={s} />
                  </View>
                ))}
              </Card>
              <Card flat style={[styles.card, wide && { flex: 1.3 }]}>
                <H3>Speech habits</H3>
                <Muted>Average of your last five rounds; the line shows your last ten.</Muted>
                <View style={styles.habits}>
                  {progress.habits.map((h) => (
                    <View key={h.key} style={styles.habit}>
                      <Text style={styles.habitTitle}>{h.title}</Text>
                      <View style={styles.habitRow}>
                        <Text style={styles.habitValue}>{num(h.value, h.key === 'wpm' ? 0 : 1)}</Text>
                        <Text style={styles.habitUnit}>{h.unit}</Text>
                      </View>
                      <Sparkline values={series(h.key as keyof HistoryRound)} />
                      {h.better === 'range' ? <Text style={styles.deltaNone}>the room follows best at 120–160</Text> : <Delta trend={h} />}
                    </View>
                  ))}
                </View>
              </Card>
            </View>

            <Card flat style={styles.card}>
              <H3>All your pitches</H3>
              <Muted>Tap a round to read its review again. Recordings are not stored — only the transcript and the marks.</Muted>
              {history.map((r) => (
                <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Open the review of ${r.title}`} onPress={() => open(r)} style={({ pressed }) => [styles.round, pressed && { backgroundColor: c.cream }]}>
                  <View style={styles.roundScore}>
                    <Text style={styles.roundTotal}>{r.total.toFixed(0)}</Text>
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.roundTitle} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={styles.roundMeta}>
                      {day(r.created_at)} · {MODE[r.mode] ?? r.mode} · {levelName(r.difficulty ?? 'easy')}
                      {r.wpm ? ` · ${r.wpm} words/min` : ''}
                      {r.fillers_per_min !== null ? ` · ${r.fillers_per_min.toFixed(1)} fillers/min` : ''}
                    </Text>
                  </View>
                  {wide && (
                    <View style={styles.roundParts}>
                      <Chip title={`Content ${r.content.toFixed(0)}`} />
                      <Chip title={`Delivery ${r.delivery.toFixed(0)}`} />
                      {r.mode !== 'warmup' && <Chip title={`Jury ${r.jury.toFixed(0)}`} />}
                    </View>
                  )}
                  {opening === r.id ? <ActivityIndicator color={c.ink} /> : <TrendArrow trend="flat" size={20} color={c.ink} />}
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 12, paddingBottom: 140, gap: 28 },
  mainNarrow: { gap: 20 },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 28 },
  column: { flexDirection: 'column', gap: 20 },
  hero: { backgroundColor: c.ink, borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 18 },
  heroWide: { flex: 1.3, padding: 32, gap: 28 },
  heroText: { flex: 1, gap: 10 },
  nick: { fontFamily: font.display, fontSize: 44, lineHeight: 50, color: c.onInk },
  rankBar: { height: 16, borderRadius: 8, borderWidth: 2, borderColor: c.onInk, overflow: 'hidden' },
  rankFill: { height: '100%', backgroundColor: c.orange },
  heroNote: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: c.onInkMuted },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tilesWide: { flex: 1, gap: 18 },
  tile: { flexGrow: 1, flexBasis: '40%', backgroundColor: c.paper, borderRadius: 18, padding: 16, gap: 2, ...outline },
  tileAccent: { backgroundColor: c.orange },
  tileLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: c.graphite },
  tileValue: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: c.ink },
  tileNote: { fontFamily: font.body, fontSize: 13, color: c.graphite },
  empty: { gap: 12 },
  start: { alignSelf: 'flex-start' },
  card: { borderRadius: 24, gap: 12 },
  insight: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  insightIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', marginTop: 2, ...outline },
  insightTitle: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: c.ink },
  insightText: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: c.ink },
  skill: { gap: 5, marginTop: 4 },
  skillHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  skillTitle: { fontFamily: font.bold, fontSize: 16, color: c.ink, flex: 1 },
  skillValue: { fontFamily: font.display, fontSize: 24, lineHeight: 28, color: c.ink },
  bar: { height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.ink, backgroundColor: c.cream, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: c.orange },
  delta: { fontFamily: font.semi, fontSize: 13, color: c.graphite },
  deltaNone: { fontFamily: font.body, fontSize: 13, color: c.graphite },
  habits: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  habit: { flexGrow: 1, flexBasis: '42%', borderRadius: 16, borderWidth: 2, borderColor: c.ink, padding: 14, gap: 4 },
  habitTitle: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  habitRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  habitValue: { fontFamily: font.display, fontSize: 30, lineHeight: 34, color: c.ink },
  habitUnit: { fontFamily: font.medium, fontSize: 13, color: c.graphite },
  round: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: c.onInkMuted, borderStyle: 'dashed', borderRadius: 10, minHeight: 64 },
  roundScore: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', ...outline },
  roundTotal: { fontFamily: font.display, fontSize: 20, lineHeight: 24, color: c.ink },
  roundTitle: { fontFamily: font.bold, fontSize: 17, lineHeight: 23, color: c.ink },
  roundMeta: { fontFamily: font.body, fontSize: 14, lineHeight: 19, color: c.graphite },
  roundParts: { flexDirection: 'row', gap: 8 },
});
