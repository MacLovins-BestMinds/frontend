import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, mediaUrl } from '@/api/client';
import type { JuryQuestion } from '@/api/types';
import { playUrl, type Playback } from '@/audio/playback';
import { useRecorder } from '@/audio/useRecorder';
import { JUROR_NAME, c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { JURORS, JuryTable } from '@/scene/AudienceScene';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Bubble, DashedLine, Valance } from '@/ui/decor';
import { Button, Card, Container, ErrorText, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

const ANSWER_SEC = 30;
const TIPS = ['Answer the question first, explain after.', 'One number beats three adjectives.', 'Thirty seconds: do not retell the pitch.'];
type Phase = 'loading' | 'question' | 'answering' | 'sending' | 'comment' | 'finishing';

export default function Jury() {
  const { wide } = useLayout();
  const { user, round, difficulty, addJuryAnswer, setJuryQuestions, setResult } = useGame();
  const recorder = useRecorder();
  const [questions, setQuestions] = useState<JuryQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [left, setLeft] = useState(ANSWER_SEC);
  const [comment, setComment] = useState<{ score: number; text: string } | null>(null);
  const [error, setError] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [boothWidth, setBoothWidth] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const player = useRef<Playback | null>(null);
  const answerUri = useRef<string | null>(null);
  const sending = useRef(false);

  const question = questions[index];

  const load = () => {
    if (!round) return;
    setError('');
    api
      .juryQuestions(round.round_id, difficulty)
      .then((q) => {
        setQuestions(q);
        setJuryQuestions(q);
        setPhase('question');
      })
      .catch((e: Error) => setError(`Could not load the questions: ${e.message}`));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [round]);

  const playQuestion = (url: string) => {
    player.current?.stop();
    setAudioBlocked(false);
    player.current = playUrl(url, () => setAudioBlocked(true));
  };

  // член жюри «говорит»: проигрываем озвучку вопроса
  useEffect(() => {
    if (phase !== 'question' || !question?.audio_url) return;
    const url = mediaUrl(question.audio_url);
    let cancelled = false;
    // сначала проверяем, что mp3 существует: на AI_MOCK бэкенд отдаёт ссылку без файла
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled && res.ok) playQuestion(url);
      })
      .catch((e) => console.warn('The question audio did not play', e));
    return () => {
      cancelled = true;
      player.current?.stop();
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question]);

  const startAnswer = async () => {
    player.current?.stop();
    answerUri.current = null;
    setLeft(ANSWER_SEC);
    setPhase('answering');
    await recorder.start();
  };

  const sendAnswer = async () => {
    // таймер на нуле и нажатие «Ответ готов» могут совпасть — отправляем один раз
    if (!round || !question || sending.current) return;
    sending.current = true;
    setPhase('sending');
    setError('');
    try {
      answerUri.current = answerUri.current ?? (await recorder.stop());
      const answer = await api.juryAnswer(round.round_id, question.id, answerUri.current, difficulty);
      addJuryAnswer(answer);
      setScores((s) => ({ ...s, [question.juror]: answer.score }));
      setComment({ score: answer.score, text: answer.comment });
      setPhase('comment');
    } catch (e) {
      const message = (e as Error).message;
      setComment(null);
      if (message.startsWith('422')) {
        // запись не читается — повторная отправка того же файла не поможет, записываем заново
        answerUri.current = null;
        setError('The answer was not recorded. Please record it again.');
        setPhase('question');
      } else {
        setError(`Could not send the answer: ${message}`);
        setPhase('comment');
      }
    } finally {
      sending.current = false;
    }
  };

  // обратный отсчёт ответа, по нулю отправляем сами
  useEffect(() => {
    if (phase !== 'answering') return;
    const endsAt = Date.now() + ANSWER_SEC * 1000;
    const id = setInterval(() => {
      const rest = Math.max(0, (endsAt - Date.now()) / 1000);
      setLeft(rest);
      if (rest === 0) {
        clearInterval(id);
        sendAnswer();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const next = async () => {
    if (!round) return;
    setError('');
    // прошлый ответ не ушёл — пробуем ещё раз
    if (!comment && answerUri.current) return sendAnswer();
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setComment(null);
      setPhase('question');
      return;
    }
    setPhase('finishing');
    try {
      setResult(await api.finish(round.round_id));
      router.replace('/result');
    } catch (e) {
      setError(`Could not compute the result: ${(e as Error).message}`);
      setPhase('comment');
    }
  };

  if (!user || !round) return <Redirect href="/" />;

  const speaking = phase === 'question' || phase === 'answering' ? question?.juror : undefined;
  const speakerAt = question ? JURORS.indexOf(question.juror) : -1;

  const actions = (
    <>
      {phase === 'loading' && !error && <Muted>The jury is conferring…</Muted>}
      {phase === 'loading' && error !== '' && <Button title="Try again" variant="secondary" onPress={load} />}
      {phase === 'answering' && (
        <View style={styles.countdown}>
          <Text style={styles.countdownValue}>{Math.ceil(left)}</Text>
          <Text style={styles.countdownLabel}>seconds to answer</Text>
        </View>
      )}
      {phase === 'comment' && comment && (
        <Card tone="accent" style={styles.verdict}>
          <Text style={styles.verdictScore}>{comment.score}</Text>
          <P style={styles.grow}>{comment.text}</P>
        </Card>
      )}
      <ErrorText>{error}</ErrorText>
      {phase === 'question' && audioBlocked && question?.audio_url && (
        <Button title="Play the question" variant="secondary" onPress={() => playQuestion(mediaUrl(question.audio_url))} />
      )}
      {phase === 'question' && <Button title="Answer (up to 30 seconds)" onPress={startAnswer} />}
      {(phase === 'answering' || phase === 'sending') && <Button title="Done answering" loading={phase === 'sending'} onPress={sendAnswer} />}
      {(phase === 'comment' || phase === 'finishing') && (
        <Button
          title={!comment && answerUri.current ? 'Send the answer again' : index + 1 < questions.length ? 'Next question' : 'See the review'}
          loading={phase === 'finishing'}
          onPress={next}
        />
      )}
    </>
  );

  /** Протокол жюри: кто уже спросил и что поставил. */
  const sheet = (
    <Card flat style={styles.sheet}>
      <Label>Score sheet</Label>
      {JURORS.map((id, i) => {
        const asked = questions.findIndex((q) => q.juror === id);
        const score = scores[id];
        const now = question?.juror === id && score === undefined;
        return (
          <View key={id} style={styles.sheetRow}>
            {i > 0 ? <DashedLine color={c.onInkMuted} style={styles.sheetRule} /> : null}
            <View style={[styles.sheetDot, now && { backgroundColor: c.orange }, score !== undefined && { backgroundColor: c.ink }]}>
              <Text style={[styles.sheetDotText, score !== undefined && { color: c.onInk }]}>{asked >= 0 ? asked + 1 : i + 1}</Text>
            </View>
            <Text style={styles.sheetName}>{JUROR_NAME[id]}</Text>
            <Text style={[styles.sheetState, score !== undefined && styles.sheetScore]}>{score !== undefined ? score : now ? 'asking now' : 'up next'}</Text>
          </View>
        );
      })}
    </Card>
  );

  const tips = (
    <Card tone="accent" style={styles.tips}>
      <H3>How to answer</H3>
      {TIPS.map((tip, i) => (
        <P key={tip} style={styles.tip}>
          {i + 1}. {tip}
        </P>
      ))}
    </Card>
  );

  return (
    <Page sticky>
      <AppHeader glass />
      <Container style={styles.main}>
        <View style={styles.head}>
          <H1 style={!wide && styles.titleNarrow}>Jury questions</H1>
          <Muted>Three people at the table, one question each. You have thirty seconds per answer.</Muted>
        </View>
        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={[styles.left, wide && styles.leftWide]}>
            {/* ложа жюри: ламбрекен, стена с панелью и стол во всю ширину */}
            <View style={styles.booth}>
              <View style={styles.boothClip} onLayout={(e) => setBoothWidth(e.nativeEvent.layout.width)}>
                <View style={styles.wainscot} />
                {boothWidth > 0 && <Valance width={boothWidth} background="transparent" />}
                <View style={[styles.boothTable, !wide && styles.boothTableNarrow]}>
                  <JuryTable speaking={speaking} />
                  {phase === 'question' && speakerAt >= 0 && (
                    <Bubble text="question!" dark tilt={-6} style={{ top: wide ? -6 : -24, left: `${8 + speakerAt * 31}%` }} />
                  )}
                </View>
                <View style={styles.names}>
                  {JURORS.map((id) => (
                    <Text key={id} style={[styles.name, speaking === id && styles.nameOn]}>
                      {JUROR_NAME[id]}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            {question && (
              <Card style={styles.questionCard}>
                <Label>
                  Question {index + 1} of {questions.length} · {JUROR_NAME[question.juror] ?? question.juror}
                </Label>
                <H3 style={[styles.question, wide && styles.questionWide]}>{question.text}</H3>
              </Card>
            )}
            {!wide && actions}
          </View>

          <View style={[styles.side, wide && styles.sideWide]}>
            {wide && actions}
            {sheet}
            {tips}
            {wide && <Small>The countdown starts when you press Answer. Each answer is scored on its own.</Small>}
          </View>
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 120, gap: 20 },
  grow: { flex: 1 },
  head: { gap: 6 },
  titleNarrow: { fontSize: 28, lineHeight: 34 },
  columns: { gap: 20 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  left: { gap: 20 },
  leftWide: { flex: 1.7 },
  side: { gap: 20 },
  sideWide: { flex: 1 },
  booth: { backgroundColor: c.paper, borderRadius: 24, ...outline, ...shadow(6) },
  boothClip: { overflow: 'hidden', borderRadius: 22 },
  wainscot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', backgroundColor: '#F1E9C6', borderTopWidth: 2.5, borderTopColor: c.ink },
  boothTable: { marginHorizontal: 18, marginTop: 14 },
  boothTableNarrow: { marginHorizontal: 10, marginTop: 26 },
  names: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: c.ink, paddingVertical: 8 },
  name: { fontFamily: font.bold, fontSize: 14, color: c.onInkMuted, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  nameOn: { backgroundColor: c.orange, color: c.ink },
  questionCard: { transform: [{ rotate: '-0.6deg' }] },
  question: { fontSize: 22, lineHeight: 29 },
  questionWide: { fontSize: 26, lineHeight: 34 },
  sheet: { gap: 0, paddingVertical: 18 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  sheetRule: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheetDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper, borderWidth: 2, borderColor: c.ink },
  sheetDotText: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  sheetName: { fontFamily: font.bold, fontSize: 17, color: c.ink, flex: 1 },
  sheetState: { fontFamily: font.medium, fontSize: 14, color: c.graphite },
  sheetScore: { fontFamily: font.display, fontSize: 24, lineHeight: 28, color: c.ink },
  tips: { transform: [{ rotate: '0.8deg' }] },
  tip: { fontSize: 16, lineHeight: 22 },
  countdown: { alignSelf: 'center', alignItems: 'center', backgroundColor: c.ink, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 10, transform: [{ rotate: '-2deg' }] },
  countdownValue: { fontFamily: font.display, fontSize: 64, lineHeight: 72, color: c.orange, fontVariant: ['tabular-nums'] },
  countdownLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: c.onInkMuted },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  verdictScore: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: c.ink },
});
