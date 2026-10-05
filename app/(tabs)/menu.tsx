import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Case, LeaderboardEntry, Profile } from '@/api/types';
import { audiences, findAudience } from '@/content/audiences';
import { c, font, formatDay, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { rankLabel } from '@/i18n/ranks';
import { useGame, useUnfinishedRound } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { confirm } from '@/ui/confirm';
import { useSwitchTab } from '@/ui/nav';
import { okToStartNewRound } from '@/ui/newRound';
import { DashedLine, Tape, TrendArrow, Wheel } from '@/ui/decor';
import { LevelPicker } from '@/ui/LevelPicker';
import { Button, Card, Chip, Container, ErrorText, H1, H3, Label, Muted, P, Page, Small } from '@/ui/primitives';

export default function Menu() {
  const t = useT('menu');
  const tc = useT('common');
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const startTopic = useGame((s) => s.startTopic);
  const discardRound = useGame((s) => s.discardRound);
  const switchTab = useSwitchTab();
  const unfinished = useUnfinishedRound();
  const difficulty = useGame((s) => s.difficulty);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const [daily, setDaily] = useState<{ date: string; topic: Case } | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const setOwnDraft = useGame((s) => s.setOwnDraft);
  const [trainingWidth, setTrainingWidth] = useState(0);

  // Вкладка остаётся в памяти: тему дня, рейтинг и звание обновляем при каждом заходе на неё — после раунда
  // здесь уже новое звание и место в рейтинге. Язык сменили — тоже заново: текст темы сервер присылает на языке интерфейса.
  useFocusEffect(
    useCallback(() => {
      if (!user) return undefined;
      let alive = true;
      api
        .daily()
        .then((d) => {
          if (!alive) return;
          setDaily({ date: d.date, topic: d.case });
          setError('');
        })
        .catch((e: Error) => alive && setError(t('errDaily', { message: e.message })));
      api.leaderboard().then((l) => alive && setLeaders(l)).catch(() => alive && setLeaders([]));
      api.profile(user.user_id).then((pr) => alive && setProfile(pr)).catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [user, t, attempt]),
  );

  if (!user) return <Redirect href="/" />;

  /** Бросить незаконченный раунд — только осознанно: его питч и разбор не сохранятся. */
  const discard = async () => {
    if (await confirm({ title: t('discardTitle'), message: t('discardText'), ok: t('discard'), cancel: tc('cancel'), destructive: true })) discardRound();
  };

  const rank = profile?.rank ?? user.rank;
  const rounds = profile?.last_rounds ?? [];
  const average = rounds.length ? Math.round(rounds.reduce((sum, r) => sum + r.total, 0) / rounds.length) : null;
  const goDaily = async () => {
    if (!daily || !(await okToStartNewRound())) return;
    startTopic('daily', daily.topic);
    router.push('/prep');
  };
  const audience = daily ? findAudience(daily.topic.audience)?.name ?? daily.topic.audience : '';

  const rankCard = (
    <Pressable accessibilityRole="link" accessibilityLabel={t('profileLink')} onPress={() => switchTab('profile')} style={[styles.rank, wide ? styles.rankWide : styles.rankNarrow]}>
      <View style={styles.rankText}>
        <Label style={styles.rankLabel}>{t('rank')}</Label>
        <Text style={[styles.rankTitle, !wide && { fontSize: 16, lineHeight: 21 }]}>{rankLabel(tc, rank.title)}</Text>
        {wide && (
          <Small style={styles.rankNote}>
            {average === null ? t('noRounds') : t('average', { n: rounds.length, avg: average })} · {t('seeProgress')}
          </Small>
        )}
      </View>
      <TrendArrow trend={rank.trend} size={wide ? 44 : 22} />
    </Pressable>
  );

  // Колесо растёт вместе с карточкой, а текст оставляет под него место справа — так они не налезают друг на друга.
  const wheel = wide ? Math.max(220, Math.min(340, trainingWidth * 0.52)) : Math.max(150, Math.min(200, trainingWidth * 0.5));
  const wheelRoom = wheel * 0.8 - (wide ? 32 : 24) + 8; // видимая часть колеса минус поле карточки

  const training = (
    <Card tone="accent" style={[styles.training, wide && styles.trainingWide]}>
      <View style={styles.measure} onLayout={(e) => setTrainingWidth(e.nativeEvent.layout.width)} pointerEvents="none" />
      <View style={[styles.wheel, { right: -wheel * 0.2, bottom: -wheel * (wide ? 0.4 : 0.37) }]} pointerEvents="none">
        <Wheel size={wheel} />
      </View>
      <Label style={styles.ink}>{tc('mode.training')}</Label>
      <Text style={[styles.trainingTitle, !wide && styles.trainingTitleNarrow, { marginRight: wheelRoom * 0.55 }]}>{t('trainingTitle')}</Text>
      <P style={[styles.trainingText, !wide && { fontSize: 15, lineHeight: 21 }, { marginRight: wheelRoom }]}>{wide ? t('trainingWide') : t('trainingNarrow')}</P>
      <Button title={t('spin')} variant="ink" onPress={() => router.push('/wheel')} style={styles.trainingButton} />
    </Card>
  );

  const dailyCard = (
    <View style={[styles.poster, shadow(wide ? 6 : 4), wide && styles.posterWide]}>
      <Tape style={{ left: 36 }} tilt={-6} />
      <Tape style={{ right: 36 }} tilt={5} />
      <View style={styles.posterHead}>
        <Label style={styles.grow}>{tc('mode.daily')}</Label>
        {daily && <Chip title={formatDay(daily.date)} />}
      </View>
      <H3 style={wide ? styles.posterTitle : undefined}>{daily ? daily.topic.title : error ? '—' : tc('loading')}</H3>
      {daily && <Muted>{t('audience', { audience: audience.toLowerCase() })}</Muted>}
      <ErrorText>{error}</ErrorText>
      {error && !daily ? <Button title={tc('tryAgain')} variant="secondary" size="sm" onPress={() => setAttempt((n) => n + 1)} style={styles.retry} /> : null}
      {leaders.length > 0 && (
        <View style={styles.leaders}>
          <DashedLine color={c.ink} style={styles.leadersRule} />
          <Text style={styles.leadersTitle}>{t('leaders')}</Text>
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
      <Button title={t('pitchDaily')} variant="secondary" disabled={!daily} onPress={goDaily} style={[styles.posterButton, shadow(4)]} />
    </View>
  );

  const own = (
    <Card flat style={[styles.own, wide && styles.ownWide]}>
      <View style={styles.ownText}>
        <Label>{t('ownLabel')}</Label>
        <H3>{wide ? t('ownTitleWide') : t('ownTitleNarrow')}</H3>
        {wide && <Muted>{t('ownText')}</Muted>}
      </View>
      {wide && (
        <View style={styles.audiences}>
          {audiences().map((a) => (
            <Chip
              key={a.id}
              title={a.name}
              onPress={() => {
                setOwnDraft({ audience: a.id });
                router.push('/own');
              }}
            />
          ))}
        </View>
      )}
      {wide ? (
        <Button title={t('write')} variant="secondary" onPress={() => router.push('/own')} style={shadow(4)} />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={t('writeLabel')} onPress={() => router.push('/own')} style={styles.ownArrow}>
          <TrendArrow trend="flat" size={22} color={c.ink} />
        </Pressable>
      )}
    </Card>
  );

  return (
    <Page sticky>
      {/* ник и звание — в приветствии ниже; профиль — вкладка (док внизу, панель в приложении, ссылка в шапке на компьютере) */}
      <AppHeader tab="menu" />
      <Container style={[styles.main, !wide && styles.mainNarrow]}>
        <View style={styles.hello}>
          <View style={styles.grow}>
            {wide ? <H1>{t('hello', { name: user.nick })}</H1> : <Small>{t('helloShort')}</Small>}
            {wide ? <Muted style={styles.lead}>{t('lead')}</Muted> : <Text style={styles.nickNarrow}>{user.nick}</Text>}
          </View>
          {rankCard}
        </View>
        {/* незаконченный раунд: питч разобран, жюри ждёт — сюда попадают, если ушли с раунда назад */}
        {unfinished ? (
          <Card tone="accent" style={styles.unfinished}>
            <Label style={styles.ink}>{t('unfinishedLabel')}</Label>
            <H3>{unfinished.title}</H3>
            <P>{t('unfinishedText')}</P>
            <View style={styles.unfinishedActions}>
              <Button title={t('continueRound')} variant="ink" onPress={() => router.push('/jury')} />
              <Button title={t('discard')} variant="secondary" size="sm" onPress={() => void discard()} />
            </View>
          </Card>
        ) : null}
        {/* свой питч невысокий: на компьютере — сразу под приветствием, на телефоне — под колесом */}
        {wide ? own : null}
        <View style={styles.levelBlock}>
          <Label>{tc('difficulty')}</Label>
          <LevelPicker value={difficulty} onChange={setDifficulty} compact={!wide} />
        </View>
        <View style={wide ? styles.cardsWide : styles.cardsNarrow}>
          {training}
          {wide ? null : own}
          {dailyCard}
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 16, paddingBottom: 72, gap: 32 },
  mainNarrow: { paddingTop: 4, paddingBottom: 32, gap: 20 },
  grow: { flex: 1 },
  levelBlock: { gap: 8 },
  retry: { alignSelf: 'flex-start' },
  unfinished: { gap: 8 },
  unfinishedActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 4 },
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
  measure: { position: 'absolute', left: 0, right: 0, top: 0, height: 0 },
  wheel: { position: 'absolute', transform: [{ rotate: '11deg' }] },
  trainingTitle: { fontFamily: font.display, fontSize: 32, lineHeight: 38, color: c.ink },
  trainingTitleNarrow: { fontSize: 22, lineHeight: 26 },
  trainingText: {},
  trainingButton: { alignSelf: 'flex-start', marginTop: 'auto' },
  poster: { backgroundColor: c.paper, borderRadius: 6, padding: 22, paddingTop: 30, gap: 12, transform: [{ rotate: '1deg' }], ...outline },
  posterWide: { flexGrow: 1, flexBasis: 360, padding: 32, paddingTop: 38, gap: 14 },
  posterHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posterTitle: { fontSize: 24, lineHeight: 30 },
  posterButton: { marginTop: 'auto' },
  leaders: { paddingTop: 14, gap: 8 },
  leadersRule: { position: 'absolute', top: 0, left: 0, right: 0 },
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
