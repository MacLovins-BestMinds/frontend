import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Pace, PitchLimits } from '@/api/types';
import { c, font, formatRange, formatTime, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useStayAwake } from '@/hooks/useStayAwake';
import { translate, useT } from '@/i18n';
import { alarmPermission, enableAlarm, isAway, onReturn, ring, unlockSound, type AlarmPermission } from '@/notify/alarm';
import { pitchLimitsFor, useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { goBack, useGoOnStage } from '@/ui/nav';
import { Brief } from '@/ui/Brief';
import { TicketButton } from '@/ui/decor';
import { levelName } from '@/ui/LevelPicker';
import { Button, Card, Chip, Container, ErrorText, Field, H1, Label, Muted, P, Page, Small, Tag } from '@/ui/primitives';

// названия и пояснения темпов — в словаре prep
const PACES: Pace[] = ['slow', 'normal', 'fast'];
// длины питча на выбор, кроме лимитов уровня; своя — «до N минут», нижняя граница — 40% от неё
const LENGTHS: PitchLimits[] = [
  { min: 120, max: 300 },
  { min: 300, max: 600 },
];
const CUSTOM_MAX_MIN = 20;
const customLimits = (minutes: number): PitchLimits => ({ min: Math.max(20, Math.round((minutes * 24) / 10) * 10), max: minutes * 60 });
const sameLimits = (a: PitchLimits | null, b: PitchLimits) => !!a && a.min === b.min && a.max === b.max;

const WARN_SEC = 60; // за минуту до конца зовём игрока из соседних вкладок
const GO_DELAY_SEC = 5; // время вышло, игрок на экране: несколько секунд собраться
const BACK_DELAY_SEC = 10; // игрок только что вернулся из другой вкладки — даём чуть больше
const PREP_MIN_LEFT_SEC = 10;
const PREP_MAX_SEC = 30 * 60;

export default function Prep() {
  useStayAwake();
  const t = useT('prep');
  const tc = useT('common');
  const { wide } = useLayout();
  const goOnStage = useGoOnStage();
  const { user, mode, topic, ownPitch, round, notes, pace, difficulty, pitchLimits, setRound, setNotes, setPace, setPitchLimits } = useGame();
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  // время вышло: не выкидываем на сцену мгновенно, а даём несколько секунд собраться
  const [goIn, setGoIn] = useState<number | null>(null);
  // время вышло, пока игрок был в другой вкладке: сцена ждёт его возвращения
  const [waiting, setWaiting] = useState(false);
  const [alarm, setAlarm] = useState<AlarmPermission>(alarmPermission);
  const [customMin, setCustomMin] = useState(() => (pitchLimits ? Math.round(pitchLimits.max / 60) : 7));
  const [customOpen, setCustomOpen] = useState(false);
  // раунд не создался — «Попробовать ещё раз» увеличивает счётчик и запрос уходит снова
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user || !topic || round) return;
    const ownData = ownPitch ?? (mode === 'own' ? { title: topic.title, text: topic.brief, audience: topic.audience } : undefined);
    setError('');
    api
      .createRound(user.user_id, mode, mode === 'own' ? undefined : topic.id, ownData, difficulty)
      // ответ пришёл, когда игрок уже взял другую тему (быстро вернулся и выбрал снова) — этот раунд не наш
      .then((created) => useGame.getState().topic === topic && setRound(created, difficulty))
      .catch((e: Error) => useGame.getState().topic === topic && setError(t('errRound', { message: e.message })));
    // уровень выбран до подготовки и на ней не меняется
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, topic, ownPitch, round, mode, setRound, attempt]);

  useEffect(() => {
    if (round && endsAt === null) setEndsAt(Date.now() + round.prep_sec * 1000);
  }, [round, endsAt]);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setLeft(Math.max(0, (endsAt - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 500);
    // вкладка снова видна — сразу показываем верное время, не дожидаясь интервала
    const back = onReturn(tick);
    // зовём одиночными таймерами: в фоновой вкладке браузер придерживает интервалы, а их — почти нет
    const rest = endsAt - Date.now();
    const title = topic?.title ?? translate('prep', 'yourTopic');
    const calls: (() => void)[] = [];
    // тексты берём в момент звонка — на том языке, что выбран сейчас
    const timers = [
      rest > WARN_SEC * 1000 &&
        setTimeout(() => calls.push(ring(translate('prep', 'ringSoonTitle'), translate('prep', 'ringSoonBody', { title }))), rest - WARN_SEC * 1000),
      rest > 0 &&
        setTimeout(() => {
          tick();
          calls.push(ring(translate('prep', 'ringUpTitle'), translate('prep', 'ringUpBody')));
        }, rest),
    ];
    return () => {
      clearInterval(id);
      back();
      timers.forEach((t) => t && clearTimeout(t));
      calls.forEach((stop) => stop());
    };
  }, [endsAt, topic?.title]);

  // время вышло: игрок здесь — короткий отсчёт; в другой вкладке — ждём, пока он вернётся
  useEffect(() => {
    if (left !== 0 || goIn !== null) return;
    if (!isAway()) {
      setWaiting(false);
      setGoIn(GO_DELAY_SEC);
      return;
    }
    setWaiting(true);
    return onReturn(() => {
      setWaiting(false);
      setGoIn((g) => g ?? BACK_DELAY_SEC);
    });
  }, [left, goIn]);

  useEffect(() => {
    if (goIn === null) return;
    // ушёл во время отсчёта — без него на сцену не выходим
    if (isAway()) return setGoIn(null);
    if (goIn <= 0) {
      goOnStage();
      return;
    }
    const id = setTimeout(() => setGoIn(goIn - 1), 1000);
    return () => clearTimeout(id);
  }, [goIn]);

  if (!user || !topic) return <Redirect href="/" />;

  const limits = pitchLimitsFor(round, pitchLimits);
  const levelLimits = pitchLimitsFor(round, null);
  const custom = customOpen || (!!pitchLimits && !LENGTHS.some((l) => sameLimits(pitchLimits, l)));

  /** Добавить или убрать время подготовки; после конца «+1 мин» запускает таймер заново. */
  const addTime = (sec: number) => {
    unlockSound();
    setGoIn(null);
    setWaiting(false);
    const now = Date.now();
    setEndsAt((e) => Math.min(now + PREP_MAX_SEC * 1000, Math.max(now + PREP_MIN_LEFT_SEC * 1000, Math.max(e ?? now, now) + sec * 1000)));
  };
  const turnOnAlarm = async () => setAlarm(await enableAlarm());
  const pickCustom = (minutes: number) => {
    const m = Math.max(1, Math.min(CUSTOM_MAX_MIN, minutes));
    setCustomMin(m);
    setCustomOpen(true);
    setPitchLimits(customLimits(m));
  };

  const warning = left !== null && left > 0 && left <= WARN_SEC;
  const over = left === 0;
  const hot = warning || over;

  return (
    <Page
      sticky
      footer={
        round ? (
          <TicketButton title={t('ready')} stubTop={t('stubPitch')} stubBottom={formatRange(limits.min, limits.max)} onPress={() => goOnStage()} stretch={!wide} />
        ) : null
      }>
      <AppHeader corner={{ icon: 'back', label: tc('back'), onPress: () => goBack() }} />
      <Container style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.left, wide && styles.leftWide]}>
          <View style={styles.head}>
            <H1 style={!wide && styles.titleNarrow}>{t('title')}</H1>
            <Tag>{levelName(difficulty)}</Tag>
          </View>
          {error && !round ? (
            <Card tone="accent">
              <P>{error}</P>
              <Button size="sm" variant="ink" title={tc('tryAgain')} onPress={() => setAttempt((n) => n + 1)} style={styles.retry} />
            </Card>
          ) : null}
          <View style={[styles.board, hot && { borderColor: c.bad }]}>
            <Text style={styles.boardLabel}>{t('untilStage')}</Text>
            <Text style={[styles.timer, hot && { color: '#FF8A7A' }]}>{left === null ? '—:——' : formatTime(left)}</Text>
            <View style={styles.adjust}>
              {[
                { label: t('minus', { n: 1 }), sec: -60, off: left === null || left <= PREP_MIN_LEFT_SEC + 1 },
                { label: t('plus', { n: 1 }), sec: 60, off: left === null },
                { label: t('plus', { n: 5 }), sec: 300, off: left === null },
              ].map((b) => (
                <Pressable
                  key={b.sec}
                  accessibilityRole="button"
                  accessibilityLabel={t(b.sec > 0 ? 'addMinutes' : 'removeMinutes', { n: Math.abs(b.sec / 60) })}
                  disabled={b.off}
                  onPress={() => addTime(b.sec)}
                  style={({ pressed }) => [styles.adjustButton, b.off && { opacity: 0.4 }, pressed && { backgroundColor: c.graphite }]}>
                  <Text style={styles.adjustText}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {warning && <P>{t('lessThanMinute')}</P>}
          {over && (
            <Card tone="accent">
              <Label style={{ color: c.ink }}>{t('timeUp')}</Label>
              {waiting ? <P>{t('waitingTab')}</P> : goIn !== null ? <P>{t('goingIn', { n: goIn })}</P> : null}
              <View style={styles.overActions}>
                <Button size="sm" variant="ink" title={t('goNow')} onPress={() => goOnStage()} />
                <Button size="sm" variant="secondary" title={t('oneMore')} onPress={() => addTime(60)} />
              </View>
            </Card>
          )}
          {/* на телефоне тема — сразу под таймером: о чём говорить, должно быть видно, пока идёт время */}
          {!wide ? <Brief topic={topic} minSec={limits.min} maxSec={limits.max} /> : null}
          {alarm === 'default' ? (
            <Card flat style={styles.alarm}>
              <Label>{t('researching')}</Label>
              <Muted>{t('researchingText')}</Muted>
              <Button size="sm" variant="secondary" title={t('notify')} onPress={turnOnAlarm} style={styles.alarmButton} />
            </Card>
          ) : (
            <Small>{alarm === 'granted' ? t('alarmOn') : alarm === 'denied' ? t('alarmDenied') : t('alarmNone')}</Small>
          )}
          <Field placeholder={t('notesPlaceholder')} value={notes} onChangeText={setNotes} multiline accessibilityLabel={t('notes')} style={styles.notes} />
          <Muted>{t('noNotes')}</Muted>
          <View style={styles.paceBlock}>
            <Label>{t('length')}</Label>
            <View style={styles.lengths} accessibilityRole="radiogroup">
              <Chip title={t('levelLength', { range: formatRange(levelLimits.min, levelLimits.max) })} selected={!pitchLimits && !customOpen} onPress={() => (setCustomOpen(false), setPitchLimits(null))} />
              {LENGTHS.map((l) => (
                <Chip key={l.max} title={formatRange(l.min, l.max)} selected={!customOpen && sameLimits(pitchLimits, l)} onPress={() => (setCustomOpen(false), setPitchLimits(l))} />
              ))}
              <Chip title={t('custom')} selected={custom} onPress={() => pickCustom(customMin)} />
            </View>
            {custom && (
              <View style={styles.stepper}>
                <Pressable accessibilityRole="button" accessibilityLabel={t('minuteLess')} disabled={customMin <= 1} onPress={() => pickCustom(customMin - 1)} style={[styles.stepButton, customMin <= 1 && { opacity: 0.4 }]}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.stepValue}>{t('upTo', { n: customMin })}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t('minuteMore')} disabled={customMin >= CUSTOM_MAX_MIN} onPress={() => pickCustom(customMin + 1)} style={[styles.stepButton, customMin >= CUSTOM_MAX_MIN && { opacity: 0.4 }]}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            )}
            <Small>{t('speakFor', { range: formatRange(limits.min, limits.max), max: formatTime(limits.max) })}</Small>
          </View>
          <View style={styles.paceBlock}>
            <Label>{t('pace')}</Label>
            <View style={styles.paces} accessibilityRole="radiogroup">
              {PACES.map((p) => {
                const selected = p === pace;
                return (
                  <Pressable
                    key={p}
                    accessibilityRole="radio"
                    aria-checked={selected}
                    onPress={() => setPace(p)}
                    style={[styles.pace, selected && styles.paceOn, selected && shadow(3)]}>
                    <Text style={styles.paceName}>{t(`pace.${p}`)}</Text>
                    <Text style={styles.paceNote}>{t(`pace.${p}.note`)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {round ? <ErrorText>{error}</ErrorText> : null}
        </View>
        {wide ? (
          <View style={[styles.right, styles.rightWide]}>
            <Brief topic={topic} minSec={limits.min} maxSec={limits.max} />
          </View>
        ) : null}
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
  adjust: { flexDirection: 'row', gap: 8 },
  adjustButton: { borderRadius: 999, borderWidth: 2, borderColor: c.onInkMuted, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center' },
  adjustText: { fontFamily: font.semi, fontSize: 14, color: c.onInk, fontVariant: ['tabular-nums'] },
  retry: { alignSelf: 'flex-start', marginTop: 4 },
  overActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  alarm: { gap: 6 },
  alarmButton: { alignSelf: 'flex-start', marginTop: 4 },
  notes: { minHeight: 180 },
  paceBlock: { gap: 8 },
  lengths: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper, ...outline },
  stepText: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: c.ink },
  stepValue: { fontFamily: font.bold, fontSize: 16, color: c.ink, minWidth: 110, textAlign: 'center', fontVariant: ['tabular-nums'] },
  paces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pace: { flexGrow: 1, flexBasis: 150, backgroundColor: c.paper, borderRadius: 16, padding: 12, gap: 2, ...outline },
  paceOn: { backgroundColor: c.orange },
  paceName: { fontFamily: font.bold, fontSize: 16, color: c.ink },
  paceNote: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: c.ink },
});
