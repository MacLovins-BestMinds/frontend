import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, mediaUrl } from '@/api/client';
import type { JuryQuestion } from '@/api/types';
import { playUrl, type Playback } from '@/audio/playback';
import { useRecorder } from '@/audio/useRecorder';
import { c, font, jurorName, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { useT } from '@/i18n';
import { JURORS, JuryTable } from '@/scene/AudienceScene';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Bubble, DashedLine, Valance } from '@/ui/decor';
import { confirm } from '@/ui/confirm';
import { goMenu, useBackAction } from '@/ui/nav';
import { Pending } from '@/ui/Pending';
import { Button, Card, Container, ErrorText, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

const ANSWER_SEC = 30;
const TIPS = ['tip1', 'tip2', 'tip3'] as const;
type Phase = 'loading' | 'question' | 'answering' | 'sending' | 'comment' | 'finishing';

export default function Jury() {
  const t = useT('jury');
  const tc = useT('common');
  const { wide } = useLayout();
  const { user, round, roundDifficulty, difficulty, addJuryAnswer, setJuryQuestions, setResult } = useGame();
  // жюри спрашивает и оценивает по уровню раунда, а не по тому, что сейчас выбрано на «Главной»
  const level = roundDifficulty ?? difficulty;
  const recorder = useRecorder();
  const [questions, setQuestions] = useState<JuryQuestion[]>([]);
  // вернулись к жюри с «Главной» (раунд не был закончен) — продолжаем с первого вопроса без ответа
  const [index, setIndex] = useState(() => useGame.getState().juryAnswers.length);
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
  const ending = useRef(false);
  // ответ или пропуск, который сейчас уходит на сервер: «Закончить раунд» дожидается его, чтобы не пропустить тот же вопрос
  const inflight = useRef<Promise<void> | null>(null);
  const track = (job: Promise<void>) => {
    inflight.current = job;
    void job.finally(() => {
      if (inflight.current === job) inflight.current = null;
    });
    return job;
  };
  const phaseRef = useRef<Phase>('loading');
  phaseRef.current = phase;
  // игрок ушёл с экрана: ответы, которые придут позже, никуда его не уводят, а микрофон и озвучка выключаются
  const gone = useRef(false);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  useEffect(
    () => () => {
      gone.current = true;
      player.current?.stop();
      void recorderRef.current.stop();
    },
    [],
  );

  const question = questions[index];

  const load = () => {
    if (!round) return;
    setError('');
    api
      .juryQuestions(round.round_id, level)
      .then((q) => {
        setQuestions(q);
        setJuryQuestions(q);
        // протокол жюри: баллы за вопросы, на которые уже ответили до ухода с экрана
        const answered = useGame.getState().juryAnswers;
        setScores(Object.fromEntries(q.slice(0, answered.length).map((item, i) => [item.juror, answered[i].score])));
        // раунд в это время заканчивают (✕) — экран ведёт endRound
        if (ending.current) return;
        // ответы на все вопросы уже есть, а итог не посчитан — сразу «Смотреть разбор»
        if (q.length && answered.length >= q.length) {
          setIndex(q.length - 1);
          setPhase('comment');
        } else setPhase('question');
      })
      .catch((e: Error) => !ending.current && setError(t('errLoad', { message: e.message })));
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
    setError('');
    setLeft(ANSWER_SEC);
    setPhase('answering');
    // микрофон не включился — не ждём впустую 30 секунд, а сразу говорим, что не так
    if (!(await recorder.start())) {
      setPhase('question');
      setError(t('noMic'));
    }
  };

  /**
   * Закончить раунд сейчас: оставшиеся вопросы пропускаются (0 баллов), раунд считается, и игрок видит разбор.
   * Питч не теряется никогда. Это выход с жюри (крестик в шапке, «назад» на Android); если сервер не отвечает,
   * рядом с ошибкой есть ещё «Продолжить позже» — на «Главную» с сохранённым раундом.
   */
  const endRound = async () => {
    // итог уже считается («Смотреть разбор») — второй раз не начинаем
    if (!round || ending.current || phaseRef.current === 'finishing') return;
    const ok = await confirm({ title: t('endTitle'), message: t('endText'), ok: t('endOk'), cancel: tc('cancel'), destructive: true });
    // пока шёл вопрос, игрок мог успеть нажать «Смотреть разбор»
    if (!ok || gone.current || ending.current || (phaseRef.current as Phase) === 'finishing') return;
    ending.current = true;
    player.current?.stop();
    const wasAnswering = phaseRef.current === 'answering';
    // «Подводим итог» — сразу после подтверждения, даже если ещё уходит ответ
    setPhase('finishing');
    setError('');
    // список вопросов: на экране, а если он ещё не загрузился (вернулись к раунду с «Главной») — сохранённый
    // или с сервера, иначе неотвеченные вопросы не получили бы свои 0 баллов
    let all = questions.length ? questions : useGame.getState().juryQuestions;
    try {
      // пока был открыт вопрос, таймер мог отправить ответ: ждём его, он засчитается как ответ, а не как пропуск
      if (inflight.current) await inflight.current;
      if (wasAnswering) await recorder.stop();
      if (!all.length) {
        all = await api.juryQuestions(round.round_id, level);
        setJuryQuestions(all);
      }
      if (!questions.length) setQuestions(all);
      const answered = useGame.getState().juryAnswers.length;
      for (const q of all.slice(answered)) addJuryAnswer(await api.jurySkip(round.round_id, q.id));
      setResult(await api.finish(round.round_id));
      if (!gone.current) router.replace('/result');
    } catch (e) {
      setError(t('errResult', { message: (e as Error).message }));
      const answered = useGame.getState().juryAnswers.length;
      answerUri.current = null;
      setComment(null);
      if (all.length && answered >= all.length) {
        // все вопросы уже закрыты, не посчитался только итог — «Смотреть разбор» попробует ещё раз
        setIndex(all.length - 1);
        setPhase('comment');
      } else {
        setIndex(answered);
        setPhase(all.length ? 'question' : 'loading');
      }
    } finally {
      ending.current = false;
    }
  };
  useBackAction(() => void endRound());
  // сайт: раунд живёт только в памяти вкладки — обновление или закрытие спрашивает подтверждение
  useLeaveGuard(true);

  /** Пропустить вопрос: 0 баллов, сразу комментарий и «Дальше». Запись ответа, если шла, выбрасываем. */
  const skip = () => track(skipNow());
  const skipNow = async () => {
    if (!round || !question || sending.current || ending.current) return;
    sending.current = true;
    player.current?.stop();
    if (phase === 'answering') await recorder.stop();
    answerUri.current = null;
    setPhase('sending');
    setError('');
    try {
      const answer = await api.jurySkip(round.round_id, question.id);
      addJuryAnswer(answer);
      setScores((s) => ({ ...s, [question.juror]: answer.score }));
      // раунд в это время заканчивают (✕): экран ведёт endRound
      if (ending.current) return;
      setComment({ score: answer.score, text: answer.comment });
      setPhase('comment');
    } catch (e) {
      if (ending.current) return;
      setError(t('errSkip', { message: (e as Error).message }));
      setPhase('question');
    } finally {
      sending.current = false;
    }
  };

  const sendAnswer = () => track(sendNow());
  const sendNow = async () => {
    // таймер на нуле и нажатие «Ответ готов» могут совпасть — отправляем один раз; раунд заканчивают — не отправляем
    if (!round || !question || sending.current || ending.current) return;
    sending.current = true;
    setPhase('sending');
    setError('');
    try {
      answerUri.current = answerUri.current ?? (await recorder.stop());
      const answer = await api.juryAnswer(round.round_id, question.id, answerUri.current, level);
      addJuryAnswer(answer);
      setScores((s) => ({ ...s, [question.juror]: answer.score }));
      if (ending.current) return;
      setComment({ score: answer.score, text: answer.comment });
      setPhase('comment');
    } catch (e) {
      if (ending.current) return;
      const message = (e as Error).message;
      setComment(null);
      if (message.startsWith('422')) {
        // запись не читается — повторная отправка того же файла не поможет, записываем заново
        answerUri.current = null;
        setError(t('notRecorded'));
        setPhase('question');
      } else {
        setError(t('errSend', { message }));
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
    if (!round || ending.current || phaseRef.current === 'finishing') return;
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
      if (!gone.current) router.replace('/result');
    } catch (e) {
      setError(t('errResult', { message: (e as Error).message }));
      setPhase('comment');
    }
  };

  if (!user || !round) return <Redirect href="/" />;

  const speaking = phase === 'question' || phase === 'answering' ? question?.juror : undefined;
  const speakerAt = question ? JURORS.indexOf(question.juror) : -1;

  const actions = (
    <>
      {phase === 'loading' && error !== '' && <Button title={tc('tryAgain')} variant="secondary" onPress={load} />}
      {phase === 'answering' && (
        <View style={styles.countdown}>
          <Text style={styles.countdownValue}>{Math.ceil(left)}</Text>
          <Text style={styles.countdownLabel}>{t('secondsLeft', { n: Math.ceil(left) })}</Text>
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
        <Button title={t('playQuestion')} variant="secondary" onPress={() => playQuestion(mediaUrl(question.audio_url))} />
      )}
      {phase === 'question' && <Button title={t('answer')} onPress={startAnswer} />}
      {(phase === 'answering' || phase === 'sending') && <Button title={t('done')} loading={phase === 'sending'} onPress={sendAnswer} />}
      {/* «Пропустить» — под главной кнопкой и мельче: во время ответа рядом с «Готово» его легко нажать случайно */}
      {(phase === 'question' || phase === 'answering') && (
        <Button title={t('skip')} variant="secondary" size="sm" onPress={skip} style={styles.skip} />
      )}
      {(phase === 'comment' || phase === 'finishing') && (
        <Button
          title={!comment && answerUri.current ? t('sendAgain') : index + 1 < questions.length ? t('nextQuestion') : t('seeReview')}
          loading={phase === 'finishing'}
          onPress={next}
        />
      )}
      {/* сервер не отвечает — уйти можно и без него: раунд сохранится, «Главная» предложит его продолжить */}
      {error !== '' && phase !== 'finishing' && (
        <Button title={t('later')} variant="secondary" size="sm" onPress={goMenu} style={styles.skip} />
      )}
    </>
  );

  /** Протокол жюри: кто уже спросил и что поставил. */
  const sheet = (
    <Card flat style={styles.sheet}>
      <Label>{t('sheet')}</Label>
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
            <Text style={styles.sheetName}>{jurorName(id)}</Text>
            <Text style={[styles.sheetState, score !== undefined && styles.sheetScore]}>{score !== undefined ? score : now ? t('askingNow') : t('upNext')}</Text>
          </View>
        );
      })}
    </Card>
  );

  const tips = (
    <Card tone="accent" style={styles.tips}>
      <H3>{t('howToAnswer')}</H3>
      {TIPS.map((tip, i) => (
        <P key={tip} style={styles.tip}>
          {i + 1}. {t(tip)}
        </P>
      ))}
    </Card>
  );

  return (
    <Page sticky>
      <AppHeader corner={{ icon: 'close', label: t('endRound'), onPress: () => void endRound() }} />
      <Container style={styles.main}>
        <View style={styles.head}>
          <H1 style={!wide && styles.titleNarrow}>{t('title')}</H1>
          <Muted>{t('lead')}</Muted>
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
                    <Bubble text={t('bubble')} dark tilt={-6} style={{ top: wide ? -6 : -24, left: `${8 + speakerAt * 31}%` }} />
                  )}
                </View>
                <View style={styles.names}>
                  {JURORS.map((id) => (
                    <Text key={id} style={[styles.name, speaking === id && styles.nameOn]}>
                      {jurorName(id)}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            {phase === 'loading' && !error && (
              <Pending
                title={t('conferring')}
                steps={[t('stepScored'), t('stepQuestions'), t('stepAnswer')]}
                current={1}
                note={t('conferringNote')}
              />
            )}
            {phase === 'finishing' && (
              <Pending title={t('addingUp')} steps={[t('stepAnswers'), t('stepFinal')]} current={1} />
            )}
            {question && phase !== 'finishing' && (
              <Card style={styles.questionCard}>
                <Label>{t('questionOf', { n: index + 1, total: questions.length, juror: jurorName(question.juror) })}</Label>
                <H3 style={[styles.question, wide && styles.questionWide]}>{question.text}</H3>
              </Card>
            )}
            {!wide && actions}
          </View>

          <View style={[styles.side, wide && styles.sideWide]}>
            {wide && actions}
            {sheet}
            {tips}
            {wide && <Small>{t('countdownNote')}</Small>}
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
  skip: { alignSelf: 'center' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  verdictScore: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: c.ink },
});
