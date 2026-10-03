import { Redirect, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TimelineEvent } from '@/api/types';
import { c, font, formatTime } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Paddle, Stamp } from '@/ui/decor';
import { PitchPlayer, type PitchPlayerHandle } from '@/ui/PitchPlayer';
import { PitchVideo } from '@/ui/PitchVideo';
import { Button, Card, Container, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

const MARK: Record<TimelineEvent['type'], { color: string; name: string }> = {
  filler: { color: c.markFiller, name: 'filler word' },
  repeat: { color: c.markRepeat, name: 'repeat' },
  long_pause: { color: c.markPause, name: 'pause mid-phrase' },
  hesitation: { color: c.markPause, name: 'hesitation' },
  pace: { color: c.markPace, name: 'pace' },
  gaze_off: { color: c.markGaze, name: 'looking away' },
  good_pause: { color: c.markPause, name: 'pause' },
};
const LEGEND = ['filler', 'repeat', 'long_pause', 'pace'] as const;

/** Кусок транскрипта: обычный текст, отмеченное место (паразит, повтор) или значок между словами (пауза, темп). */
type Piece = { text: string; event?: TimelineEvent; badge?: boolean; before?: string; after?: string };

/** Подпись значка между словами: «… 3.6 s …» для паузы, «fast · 196/min» для темпа, «eyes away · 4 s» для взгляда. */
function badge(e: TimelineEvent): string {
  const n = e.text.match(/\d+(\.\d+)?/)?.[0] ?? '';
  if (e.type === 'gaze_off') return `eyes away · ${n} s`;
  if (e.type === 'pace') return `${e.text.includes('fast') ? 'fast' : 'slow'} · ${n}/min`;
  return `… ${n} s …`;
}

/** Все ошибки прямо в тексте: бэкенд отдаёт место каждой (start/end в символах транскрипта). */
function markTranscript(transcript: string, events: TimelineEvent[]): Piece[] {
  const placed = events
    .filter((e) => typeof e.start === 'number' && typeof e.end === 'number')
    .sort((a, b) => a.start! - b.start! || a.end! - b.end!);
  if (!placed.length) return markFillersByText(transcript, events);
  const pieces: Piece[] = [];
  let at = 0;
  for (const e of placed) {
    const start = Math.min(e.start!, transcript.length);
    const end = Math.min(e.end!, transcript.length);
    if (end > start && start < at) continue; // место уже занято другой отметкой — событие остаётся в списке ниже
    if (start > at) {
      pieces.push({ text: transcript.slice(at, start) });
      at = start;
    }
    if (end > start) {
      pieces.push({ text: transcript.slice(start, end), event: e });
      at = end;
    } else {
      // значок не должен слипаться со словами: пробел ставим там, где его нет в тексте
      const spaced = (ch: string | undefined) => (ch === undefined || /\s/.test(ch) ? '' : ' ');
      pieces.push({ text: badge(e), event: e, badge: true, before: spaced(transcript[at - 1]), after: spaced(transcript[at]) });
    }
  }
  pieces.push({ text: transcript.slice(at) });
  return pieces;
}

/** Запасной путь для разборов без мест в тексте: помечает слова-паразиты поиском по тексту. */
function markFillersByText(transcript: string, events: TimelineEvent[]): Piece[] {
  const fillers = events.filter((e) => e.type === 'filler');
  const words = [...new Set(fillers.map((e) => e.text.replace(/[«»"]/g, '').trim().toLowerCase()).filter(Boolean))];
  if (!words.length) return [{ text: transcript }];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\p{L}])(${escaped.join('|')})(?![\\p{L}])`, 'giu');
  const queue = [...fillers];
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of transcript.matchAll(re)) {
    const at = queue.findIndex((e) => e.text.toLowerCase().includes(m[0].toLowerCase()));
    if (at < 0) continue;
    const [event] = queue.splice(at, 1);
    if (m.index > last) pieces.push({ text: transcript.slice(last, m.index) });
    pieces.push({ text: m[0], event });
    last = m.index + m[0].length;
  }
  pieces.push({ text: transcript.slice(last) });
  return pieces;
}

export default function Result() {
  const { wide } = useLayout();
  const { result, delivery, juryAnswers, juryQuestions, pitchAudioUri, pitchVideoUri, pitchVideoOffset, mode } = useGame();
  const player = useRef<PitchPlayerHandle>(null);
  const [playback, setPlayback] = useState({ time: 0, playing: false });

  const pieces = useMemo(() => (delivery ? markTranscript(delivery.transcript, delivery.events) : []), [delivery]);

  if (!result) return <Redirect href="/" />;

  /** Маркер в транскрипте или в списке событий: запись играет с этого места. */
  const playFrom = (t: number) => player.current?.playFrom(t);

  const duration = delivery?.metrics.duration_sec ?? 0;
  const paddle = wide ? 150 : 88;
  const notes = delivery
    ? {
        content: delivery.scores.content.criteria.length ? `best line: “${[...delivery.scores.content.criteria].sort((a, b) => b.score - a.score)[0].quote}”` : undefined,
        delivery: `${delivery.metrics.wpm} words per minute, fillers: ${delivery.metrics.fillers}, long pauses: ${delivery.metrics.long_pauses}`,
      }
    : { content: undefined, delivery: undefined };
  const pron = delivery?.pronunciation;

  // когда игрок не смотрел в зал: начало и длительность берём из событий разбора
  const away = (delivery?.events ?? [])
    .filter((e) => e.type === 'gaze_off')
    .map((e) => ({ from: e.t, to: e.t + Number(e.text.match(/\d+(\.\d+)?/)?.[0] ?? 0) }));
  const awayNow = away.some((s) => playback.time >= s.from && playback.time <= s.to);
  const contact = delivery?.metrics.gaze_on_ratio;
  const longest = Math.round(Math.max(0, ...away.map((s) => s.to - s.from)));

  return (
    <Page>
      <AppHeader>
        <Button title="Menu" variant="secondary" size="sm" onPress={() => router.replace('/menu')} />
      </AppHeader>
      <Container style={styles.main}>
        <H1 style={!wide && styles.titleNarrow}>{wide ? 'Pitch review' : 'Review'}</H1>

        <View style={[styles.top, wide && styles.topWide]}>
          <View style={[styles.score, wide && styles.scoreWide]}>
            <View style={wide ? undefined : styles.grow}>
              <Label style={{ color: c.orange }}>Round score</Label>
              <View style={styles.scoreRow}>
                <Text style={[styles.total, !wide && { fontSize: 72, lineHeight: 78 }]}>{Math.round(result.total)}</Text>
                <Text style={styles.outOf}>out of 100</Text>
              </View>
            </View>
            <View style={[styles.stampRow, wide && styles.stampRowWide]}>
              <Stamp title={result.rank.title} caption="rank" trend={result.rank.trend} size={wide ? 132 : 104} color={c.orange} tilt={-9} />
              {wide && <Small style={styles.stampNote}>The jury has stamped it. Your rank is based on the average score of your last five rounds.</Small>}
            </View>
          </View>
          <View style={[styles.paddles, wide && styles.paddlesWide]}>
            <Paddle value={result.content} label="Content" weight={mode === 'warmup' ? '50%' : '40%'} note={wide ? notes.content : undefined} size={paddle} tilt={-5} />
            <Paddle value={result.delivery} label="Delivery" weight={mode === 'warmup' ? '50%' : '40%'} note={wide ? notes.delivery : undefined} size={paddle} tilt={4} accent />
            {mode !== 'warmup' && (
              <Paddle value={result.jury} label={wide ? 'Jury answers' : 'Jury'} weight="20%" note={wide && juryAnswers[0] ? juryAnswers[0].comment : undefined} size={paddle} tilt={-3} />
            )}
          </View>
        </View>

        {delivery && (
          <View style={[styles.columns, wide && styles.columnsWide]}>
            <View style={[styles.left, wide && styles.leftWide]}>
            <Card flat style={[styles.recording, wide && styles.recordingWide]}>
              <H3>Your recording</H3>
              {pitchVideoUri ? (
                <View style={[styles.watch, wide && styles.watchWide]}>
                  <View style={wide ? styles.watchVideo : undefined}>
                    <PitchVideo uri={pitchVideoUri} offset={pitchVideoOffset} time={playback.time} playing={playback.playing} note={awayNow ? 'eyes off the room' : undefined} />
                  </View>
                  <View style={styles.contact}>
                    <Label>Eye contact</Label>
                    {typeof contact === 'number' ? (
                      <>
                        <Text style={styles.contactValue}>{Math.round(contact * 100)}%</Text>
                        <Muted>
                          {away.length === 0
                            ? 'You kept your eyes on the room the whole time. That is exactly how it should feel to them.'
                            : `You looked away ${away.length === 1 ? 'once' : `${away.length} times`} for more than 3 seconds, the longest for ${longest} s. Keep the room in sight even while you think.`}
                        </Muted>
                      </>
                    ) : (
                      <Muted>Eye contact is not measured in the browser yet, so it is not part of your score. Watch the recording: are your eyes on the room?</Muted>
                    )}
                  </View>
                </View>
              ) : null}
              {pitchAudioUri ? (
                <>
                  <PitchPlayer
                    ref={player}
                    uri={pitchAudioUri}
                    fallbackDuration={duration}
                    marks={delivery.events.map((e) => ({ t: e.t, color: MARK[e.type]?.color ?? c.markPause }))}
                    onTime={(time, playing) => setPlayback({ time, playing })}
                  />
                  <Small>Tap a marker in the text to play from that moment, or drag the slider.</Small>
                </>
              ) : (
                <Small>The recording of this pitch is not available — markers only show the time.</Small>
              )}
            </Card>
            <Card flat style={[styles.transcript, wide && styles.transcriptWide]}>
              <View style={styles.transcriptHead}>
                <H3 style={styles.transcriptTitle}>Transcript</H3>
                <View style={styles.legend}>
                  {[...LEGEND, ...(away.length ? (['gaze_off'] as const) : [])].map((t) => (
                    <View key={t} style={styles.legendItem}>
                      <View style={[styles.swatch, { backgroundColor: MARK[t].color }]} />
                      <Text style={styles.legendText}>{MARK[t].name}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.transcriptText}>
                {pieces.map((p, i) =>
                  p.event ? (
                    <Text key={i}>
                      {p.before}
                    <Text
                      onPress={() => playFrom(p.event!.t)}
                      style={[styles.marked, p.badge && styles.badge, { backgroundColor: MARK[p.event.type]?.color ?? c.markPause }]}
                      accessibilityLabel={p.event.text}>
                      {p.badge ? `\u00A0${p.text.replace(/ /g, '\u00A0')}\u00A0` : p.text}
                    </Text>
                      {p.after}
                    </Text>
                  ) : (
                    p.text
                  ),
                )}
              </Text>

              {delivery.events.length > 0 && (
                <View style={styles.events}>
                  {delivery.events.map((e, i) => (
                    <Pressable key={i} accessibilityRole="button" onPress={() => playFrom(e.t)} style={[styles.event, { backgroundColor: MARK[e.type]?.color ?? c.markPause }]}>
                      <Text style={styles.eventTime}>{formatTime(e.t)}</Text>
                      <Text style={styles.eventText}>{e.text}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

            </Card>
            </View>

            <View style={[styles.side, wide && styles.sideWide]}>
              <Card tone="accent">
                <H3>Three tips</H3>
                {delivery.tips.map((tip, i) => (
                  <P key={tip}>
                    {i + 1}. {tip}
                  </P>
                ))}
              </Card>
              {juryAnswers.length > 0 && (
                <Card flat>
                  <H3>Jury questions</H3>
                  {juryAnswers.map((a, i) => (
                    <View key={i} style={styles.answer}>
                      <Text style={styles.answerScore}>{a.score}</Text>
                      <View style={styles.grow}>
                        {juryQuestions[i] ? <P style={styles.answerQuestion}>{juryQuestions[i].text}</P> : null}
                        <Muted style={styles.answerComment}>{a.comment}</Muted>
                      </View>
                    </View>
                  ))}
                </Card>
              )}
              {pron && (
                <Card flat>
                  <H3>Pronunciation</H3>
                  <P>
                    Overall {pron.overall_score}: sounds {pron.accuracy_score}, fluency {pron.fluency_score}
                    {pron.prosody_score !== null ? `, intonation ${pron.prosody_score}` : ''}.
                  </P>
                  {pron.words.length > 0 && <Muted>Words worth practising: {pron.words.slice(0, 6).map((w) => w.word).join(', ')}.</Muted>}
                  {pron.tips.map((tip) => (
                    <Muted key={tip}>• {tip}</Muted>
                  ))}
                </Card>
              )}
            </View>
          </View>
        )}

        <View style={[styles.actions, !wide && styles.actionsNarrow]}>
          <Button title="Another round" onPress={() => router.replace('/wheel')} />
          <Button title="Menu" variant="secondary" onPress={() => router.replace('/menu')} />
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 64, gap: 24 },
  grow: { flex: 1 },
  titleNarrow: { fontSize: 26, lineHeight: 32 },
  top: { gap: 20 },
  topWide: { flexDirection: 'row', alignItems: 'stretch', gap: 28 },
  score: { backgroundColor: c.ink, borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreWide: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', padding: 32, gap: 12, borderRadius: 24 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  total: { fontFamily: font.display, fontSize: 96, lineHeight: 104, color: c.orange },
  outOf: { fontFamily: font.body, fontSize: 18, color: c.onInkMuted },
  stampRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stampRowWide: { borderTopWidth: 2, borderTopColor: '#5E584C', borderStyle: 'dashed', paddingTop: 18, alignSelf: 'stretch' },
  stampNote: { flex: 1, color: c.onInkMuted, fontSize: 15, lineHeight: 21 },
  paddles: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  paddlesWide: { flex: 2, gap: 16, paddingTop: 8 },
  columns: { gap: 20 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  left: { gap: 20 },
  leftWide: { flex: 1.5, gap: 24 },
  recording: { borderRadius: 22, gap: 14 },
  recordingWide: { padding: 30, borderRadius: 24 },
  watch: { gap: 14 },
  watchWide: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  watchVideo: { flex: 1.2 },
  contact: { flex: 1, gap: 6 },
  contactValue: { fontFamily: font.display, fontSize: 48, lineHeight: 54, color: c.ink },
  transcript: { borderRadius: 22, gap: 14 },
  transcriptWide: { padding: 30, borderRadius: 24 },
  transcriptHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  transcriptTitle: { flexGrow: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, maxWidth: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: c.ink },
  legendText: { fontFamily: font.semi, fontSize: 13, color: c.ink },
  transcriptText: { fontFamily: font.body, fontSize: 18, lineHeight: 32, color: c.ink },
  marked: { fontFamily: font.semi, borderRadius: 6 },
  badge: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.2 },
  events: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 2, borderColor: c.ink, paddingHorizontal: 10, minHeight: 40, maxWidth: '100%' },
  eventTime: { fontFamily: font.bold, fontSize: 14, color: c.ink, fontVariant: ['tabular-nums'] },
  eventText: { fontFamily: font.medium, fontSize: 14, color: c.ink, flexShrink: 1 },
  side: { gap: 20 },
  sideWide: { flex: 1, gap: 24 },
  answer: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  answerScore: { fontFamily: font.display, fontSize: 18, lineHeight: 24, color: c.ink, minWidth: 34 },
  answerQuestion: { fontSize: 16, lineHeight: 22 },
  answerComment: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  actionsNarrow: { flexDirection: 'column', gap: 12 },
});
