import { Redirect, router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { c, font } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Paddle, Stamp } from '@/ui/decor';
import type { PitchPlayerHandle } from '@/ui/PitchPlayer';
import { PitchVideo } from '@/ui/PitchVideo';
import { Transcript, type TranscriptHandle } from '@/ui/Transcript';
import { Button, Card, Container, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

export default function Result() {
  const { wide } = useLayout();
  const { result, delivery, juryAnswers, juryQuestions, pitchAudioUri, pitchVideoUri, pitchVideoOffset, mode, reviewOf } = useGame();
  const transcript = useRef<TranscriptHandle>(null);
  const video = useRef<PitchPlayerHandle>(null);

  if (!result) return <Redirect href="/" />;

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
  const contact = delivery?.metrics.gaze_on_ratio;
  const longest = Math.round(Math.max(0, ...away.map((s) => s.to - s.from)));

  return (
    <Page>
      <AppHeader>
        <Button title="Menu" variant="secondary" size="sm" onPress={() => router.replace('/menu')} />
      </AppHeader>
      <Container style={styles.main}>
        <View style={styles.head}>
          <H1 style={!wide && styles.titleNarrow}>{wide ? 'Pitch review' : 'Review'}</H1>
          {reviewOf && (
            <Muted>
              From your history: {reviewOf.title}, {new Date(reviewOf.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.
            </Muted>
          )}
        </View>

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
              {/* видео пока показываем только на телефоне; у него своя дорожка — только моменты, когда взгляд ушёл из зала */}
              {!wide && pitchVideoUri ? (
                <Card flat style={styles.recording}>
                  <H3>Your recording</H3>
                  <PitchVideo
                    ref={video}
                    uri={pitchVideoUri}
                    offset={pitchVideoOffset}
                    fallbackDuration={duration}
                    marks={away.map((s) => ({ t: s.from, color: c.markGaze }))}
                    notes={away.map((s) => ({ ...s, text: 'eyes off the room' }))}
                    onPlay={() => transcript.current?.pause()}
                  />
                  <View style={styles.contact}>
                    <Label>Eye contact</Label>
                    {typeof contact === 'number' ? (
                      <>
                        <Text style={styles.contactValue}>{Math.round(contact * 100)}%</Text>
                        <Muted>
                          {away.length === 0
                            ? 'You kept your eyes on the room the whole time.'
                            : `You looked away ${away.length === 1 ? 'once' : `${away.length} times`} for more than 3 seconds, the longest for ${longest} s. The markers on the track show where.`}
                        </Muted>
                      </>
                    ) : (
                      <Muted>Eye contact is not measured yet, so the track has no markers. Watch the recording: are your eyes on the room?</Muted>
                    )}
                  </View>
                </Card>
              ) : null}
              <Transcript
                ref={transcript}
                delivery={delivery}
                audioUri={pitchAudioUri}
                duration={duration}
                wide={wide}
                noRecording={reviewOf ? 'Recordings are not stored, so this round has only the transcript and the marks.' : 'The recording of this pitch is not available — markers only show the time.'}
                onPlay={() => video.current?.pause()}
              />
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
          {reviewOf ? (
            <Button title="Back to your progress" onPress={() => router.replace('/profile')} />
          ) : (
            <Button title="Another round" onPress={() => router.replace('/wheel')} />
          )}
          <Button title={reviewOf ? 'Menu' : 'Your progress'} variant="secondary" onPress={() => router.replace(reviewOf ? '/menu' : '/profile')} />
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 64, gap: 24 },
  grow: { flex: 1 },
  head: { gap: 4 },
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
  contact: { gap: 6 },
  contactValue: { fontFamily: font.display, fontSize: 48, lineHeight: 54, color: c.ink },
  side: { gap: 20 },
  sideWide: { flex: 1, gap: 24 },
  answer: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  answerScore: { fontFamily: font.display, fontSize: 18, lineHeight: 24, color: c.ink, minWidth: 34 },
  answerQuestion: { fontSize: 16, lineHeight: 22 },
  answerComment: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  actionsNarrow: { flexDirection: 'column', gap: 12 },
});
