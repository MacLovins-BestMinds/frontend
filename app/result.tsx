import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';

import { c, font, formatDate } from '@/design/theme';
import { useReviewInsights } from '@/hooks/useInsights';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { rankLabel } from '@/i18n/ranks';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { BetterVersion } from '@/ui/BetterVersion';
import { Highlights } from '@/ui/Highlights';
import { goBack, goMenu, goTab, useBackAction } from '@/ui/nav';
import { DashedLine, Paddle, Stamp } from '@/ui/decor';
import type { PitchPlayerHandle } from '@/ui/PitchPlayer';
import { Recording } from '@/ui/Recording';
import { Button, Card, Container, ErrorText, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

export default function Result() {
  const t = useT('result');
  const tc = useT('common');
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const { result, delivery, juryAnswers, juryQuestions, pitchAudioUri, pitchVideoUri, pitchVideoOffset, mode, reviewOf, round, flow, betterVersion, ownPitch, openReview, startOwnPitch } = useGame();
  // Разбор из истории открывается по адресу /result?round=<id>: его можно обновить в браузере, и он грузится сам.
  // Без round — разбор только что сыгранного раунда (из памяти).
  const { round: historyId } = useLocalSearchParams<{ round?: string }>();
  const history = !!historyId || !!reviewOf;
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // без входа экран уходит на лендинг — разбор у сервера не спрашиваем
    if (!user || !historyId || useGame.getState().reviewOf?.id === historyId) return;
    let alive = true;
    setLoadError('');
    api
      .roundReview(historyId)
      .then((review) => alive && openReview(review))
      .catch((e: Error) => alive && setLoadError(t('errOpen', { message: e.message })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, historyId, attempt]);
  // ход мысли и питч без запинок готовятся на сервере в фоне: у раунда из истории могут прийти готовыми
  const insights = useReviewInsights(delivery ? (reviewOf?.id ?? round?.round_id ?? null) : null, flow, betterVersion);
  // играет что-то одно: запись выступления или озвучка без запинок
  const recording = useRef<PitchPlayerHandle>(null);
  const polished = useRef<PitchPlayerHandle>(null);
  // угловая кнопка: только что сыгранный раунд окончен — домой; разбор из истории — назад в профиль.
  // Системная «назад» на Android делает то же самое (docs/ux.md)
  const leave = () => (history ? goBack('/profile') : goMenu());
  useBackAction(leave);
  const corner = history
    ? { icon: 'back' as const, label: t('backToProgress'), onPress: leave }
    : { icon: 'home' as const, label: tc('home'), onPress: leave };

  if (!user) return <Redirect href="/" />;
  // разбор из истории ещё грузится (или не загрузился) — шапка с «назад» уже на месте
  if (historyId && reviewOf?.id !== historyId) {
    return (
      <Page sticky>
        <AppHeader corner={corner} />
        <Container style={styles.main}>
          {loadError ? (
            <Card flat style={styles.loadCard}>
              <ErrorText>{loadError}</ErrorText>
              <Button title={tc('tryAgain')} variant="secondary" size="sm" onPress={() => setAttempt((n) => n + 1)} style={styles.retry} />
            </Card>
          ) : (
            <ActivityIndicator color={c.ink} style={styles.loading} />
          )}
        </Container>
      </Page>
    );
  }
  if (!result) return <Redirect href="/" />;

  /** Следующий раунд: свой питч — тот же текст ещё раз, иначе — колесо. Экран разбора заменяется следующим. */
  const again = () => {
    if (mode === 'own' && ownPitch) {
      startOwnPitch(ownPitch);
      router.replace('/prep');
    } else router.replace('/wheel');
  };

  const duration = delivery?.metrics.duration_sec ?? 0;
  const paddle = wide ? 150 : 88;
  const notes = delivery
    ? {
        content: delivery.scores.content.criteria.length ? t('bestLine', { quote: [...delivery.scores.content.criteria].sort((a, b) => b.score - a.score)[0].quote }) : undefined,
        delivery: t('deliveryNote', { wpm: delivery.metrics.wpm, fillers: delivery.metrics.fillers, pauses: delivery.metrics.long_pauses }),
      }
    : { content: undefined, delivery: undefined };
  const pron = delivery?.pronunciation;
  const tipsCard = delivery ? (
    <Card tone="accent">
      <H3>{t('threeTips')}</H3>
      {delivery.tips.map((tip, i) => (
        <P key={tip}>
          {i + 1}. {tip}
        </P>
      ))}
    </Card>
  ) : null;

  return (
    <Page sticky>
      <AppHeader corner={corner} />
      <Container style={styles.main}>
        <View style={styles.head}>
          <H1 style={!wide && styles.titleNarrow}>{wide ? t('title') : t('titleShort')}</H1>
          {history && reviewOf && <Muted>{t('fromHistory', { title: reviewOf.title, date: formatDate(reviewOf.created_at, { day: 'numeric', month: 'long' }) })}</Muted>}
        </View>

        <View style={[styles.top, wide && styles.topWide]}>
          <View style={[styles.score, wide && styles.scoreWide]}>
            <View style={wide ? undefined : styles.grow}>
              <Label style={{ color: c.orange }}>{t('roundScore')}</Label>
              <View style={styles.scoreRow}>
                <Text style={[styles.total, !wide && { fontSize: 72, lineHeight: 78 }]}>{Math.round(result.total)}</Text>
                <Text style={styles.outOf}>{t('outOf')}</Text>
              </View>
            </View>
            <View style={[styles.stampRow, wide && styles.stampRowWide]}>
              {wide ? <DashedLine color="#5E584C" style={styles.stampRule} /> : null}
              <Stamp title={rankLabel(tc, result.rank.title)} caption={t('stampRank')} trend={result.rank.trend} size={wide ? 132 : 104} color={c.orange} tilt={-9} />
              {wide && <Small style={styles.stampNote}>{t('stampNote')}</Small>}
            </View>
          </View>
          <View style={[styles.paddles, wide && styles.paddlesWide]}>
            <Paddle value={result.content} label={t('content')} weight={mode === 'warmup' ? '50%' : '40%'} note={wide ? notes.content : undefined} size={paddle} tilt={-5} />
            <Paddle value={result.delivery} label={t('delivery')} weight={mode === 'warmup' ? '50%' : '40%'} note={wide ? notes.delivery : undefined} size={paddle} tilt={4} accent />
            {mode !== 'warmup' && (
              <Paddle value={result.jury} label={wide ? t('juryAnswers') : t('juryShort')} weight="20%" note={wide && juryAnswers[0] ? juryAnswers[0].comment : undefined} size={paddle} tilt={-3} />
            )}
          </View>
        </View>

        {delivery && (
          <>
            {/* самое полезное — коротко и первым: на телефоне до записи и расшифровки, на компьютере — в правой колонке */}
            {!wide && <Highlights delivery={delivery} wide={wide} />}
            {!wide && tipsCard}
            <View style={[styles.columns, wide && styles.columnsWide]}>
              <View style={[styles.left, wide && styles.leftWide]}>
                <Recording
                  ref={recording}
                  flow={insights.flow}
                  onPlay={() => polished.current?.pause()}
                  delivery={delivery}
                  audioUri={pitchAudioUri}
                  videoUri={pitchVideoUri}
                  videoOffset={pitchVideoOffset}
                  duration={duration}
                  wide={wide}
                  noRecording={history ? t('noRecordingHistory') : t('noRecording')}
                />
              </View>

              <View style={[styles.side, wide && styles.sideWide]}>
                {wide && <Highlights delivery={delivery} wide={wide} />}
                {wide && tipsCard}
                <BetterVersion ref={polished} better={insights.better} onPlay={() => recording.current?.pause()} />
                {juryAnswers.length > 0 && (
                  <Card flat>
                    <H3>{t('juryQuestions')}</H3>
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
                    <H3>{t('pronunciation')}</H3>
                    <P>
                      {t('pronOverall', { overall: pron.overall_score, accuracy: pron.accuracy_score, fluency: pron.fluency_score })}
                      {pron.prosody_score !== null ? t('pronProsody', { prosody: pron.prosody_score }) : ''}.
                    </P>
                    {pron.words.length > 0 && <Muted>{t('pronWords', { words: pron.words.slice(0, 6).map((w) => w.word).join(', ') })}</Muted>}
                    {pron.tips.map((tip) => (
                      <Muted key={tip}>• {tip}</Muted>
                    ))}
                  </Card>
                )}
              </View>
            </View>
          </>
        )}

        <View style={[styles.actions, !wide && styles.actionsNarrow]}>
          {history ? (
            <Button title={t('backToProgress')} onPress={leave} />
          ) : (
            <Button title={mode === 'own' && ownPitch ? t('pitchAgain') : t('another')} onPress={again} />
          )}
          <Button title={history ? tc('home') : t('yourProgress')} variant="secondary" onPress={() => (history ? goMenu() : goTab('/profile'))} />
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 64, gap: 24 },
  loading: { marginTop: 48 },
  loadCard: { gap: 12 },
  retry: { alignSelf: 'flex-start' },
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
  stampRowWide: { paddingTop: 18, alignSelf: 'stretch' },
  stampRule: { position: 'absolute', top: 0, left: 0, right: 0 },
  stampNote: { flex: 1, color: c.onInkMuted, fontSize: 15, lineHeight: 21 },
  paddles: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  paddlesWide: { flex: 2, gap: 16, paddingTop: 8 },
  columns: { gap: 20 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  left: { gap: 20 },
  leftWide: { flex: 1.5, gap: 24 },
  side: { gap: 20 },
  sideWide: { flex: 1, gap: 24 },
  answer: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  answerScore: { fontFamily: font.display, fontSize: 18, lineHeight: 24, color: c.ink, minWidth: 34 },
  answerQuestion: { fontSize: 16, lineHeight: 22 },
  answerComment: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  actionsNarrow: { flexDirection: 'column', gap: 12 },
});
