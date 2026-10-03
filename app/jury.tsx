import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { api, mediaUrl } from '@/api/client';
import type { JuryQuestion } from '@/api/types';
import { useRecorder } from '@/audio/useRecorder';
import { useGame } from '@/store/game';
import { JuryTable } from '@/ui/AudienceStage';
import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/ui/kit';
import { JUROR, colors } from '@/ui/theme';

const ANSWER_SEC = 30;

type Phase = 'loading' | 'question' | 'answering' | 'sending' | 'comment' | 'finishing';

export default function Jury() {
  const { user, round, addJuryAnswer, setResult } = useGame();
  const recorder = useRecorder();
  const [questions, setQuestions] = useState<JuryQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [left, setLeft] = useState(ANSWER_SEC);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const player = useRef<AudioPlayer | null>(null);
  const answerUri = useRef<string | null>(null);

  const question = questions[index];

  const load = () => {
    if (!round) return;
    setError('');
    api
      .juryQuestions(round.round_id)
      .then((q) => {
        setQuestions(q);
        setPhase('question');
      })
      .catch((e: Error) => setError(`Вопросы не пришли: ${e.message}`));
  };

  useEffect(load, [round]);

  // член жюри «говорит»: проигрываем озвучку вопроса
  useEffect(() => {
    if (phase !== 'question' || !question?.audio_url) return;
    const url = mediaUrl(question.audio_url);
    let cancelled = false;
    // сначала проверяем, что mp3 существует: на AI_MOCK бэкенд отдаёт ссылку без файла
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (cancelled || !res.ok) return;
        player.current = createAudioPlayer(url);
        player.current.play();
      })
      .catch((e) => console.warn('Озвучка вопроса не проигралась', e));
    return () => {
      cancelled = true;
      player.current?.remove();
      player.current = null;
    };
  }, [phase, question]);

  const startAnswer = async () => {
    player.current?.pause();
    answerUri.current = null;
    setLeft(ANSWER_SEC);
    setPhase('answering');
    await recorder.start();
  };

  const sendAnswer = async () => {
    if (!round || !question) return;
    setPhase('sending');
    setError('');
    try {
      answerUri.current = answerUri.current ?? (await recorder.stop());
      const answer = await api.juryAnswer(round.round_id, question.id, answerUri.current);
      addJuryAnswer(answer);
      setComment(`${answer.score} — ${answer.comment}`);
      setPhase('comment');
    } catch (e) {
      setError(`Ответ не отправился: ${(e as Error).message}`);
      setPhase('comment');
      setComment('');
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
    if (comment === '' && answerUri.current) {
      // прошлый ответ не ушёл — пробуем ещё раз
      return sendAnswer();
    }
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setComment('');
      setPhase('question');
      return;
    }
    setPhase('finishing');
    try {
      setResult(await api.finish(round.round_id));
      router.replace('/result');
    } catch (e) {
      setError(`Итог не посчитался: ${(e as Error).message}`);
      setPhase('comment');
    }
  };

  if (!user || !round) return <Redirect href="/" />;

  return (
    <Screen>
      <Title>Вопросы жюри</Title>
      <JuryTable speaking={phase === 'question' ? question?.juror : undefined} />

      {phase === 'loading' && <Body muted>Жюри совещается…</Body>}
      {phase === 'loading' && error !== '' && (
        <Button title="Попробовать ещё раз" variant="secondary" onPress={load} />
      )}

      {question && (
        <Card>
          <Label>
            Вопрос {index + 1} из {questions.length} · {JUROR[question.juror]?.name ?? question.juror}
          </Label>
          <Body>{question.text}</Body>
        </Card>
      )}

      {phase === 'answering' && <Text style={styles.timer}>{Math.ceil(left)}</Text>}
      {phase === 'comment' && comment !== '' && (
        <Card>
          <Label>Оценка ответа</Label>
          <Body>{comment}</Body>
        </Card>
      )}
      <ErrorText>{error}</ErrorText>

      {phase === 'question' && <Button title="Ответить (до 30 секунд)" onPress={startAnswer} />}
      {(phase === 'answering' || phase === 'sending') && (
        <Button title="Ответ готов" loading={phase === 'sending'} onPress={sendAnswer} />
      )}
      {(phase === 'comment' || phase === 'finishing') && (
        <Button
          title={
            comment === '' && answerUri.current
              ? 'Отправить ответ ещё раз'
              : index + 1 < questions.length
                ? 'Следующий вопрос'
                : 'К разбору'
          }
          loading={phase === 'finishing'}
          onPress={next}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
