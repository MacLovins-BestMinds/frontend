import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { GoogleButton } from '@/auth/GoogleButton';
import { c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { ART, CHARACTERS } from '@/scene/assets';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { GlassButton } from '@/ui/Glass';
import { Backdrop } from '@/ui/Backdrop';
import { Bubble, Flower, Rays, Spark, Squiggle, Stamp, TicketButton, Valance } from '@/ui/decor';
import { Button, Card, Container, ErrorText, Field, H2, H3, Label, Muted, P, Small, Tag } from '@/ui/primitives';

// тексты шагов, реакций и режимов — в словаре landing (src/i18n/strings/landing.ts)
const STEPS = ['1', '2', '3'] as const;

const REACTIONS = [
  { id: 'react1', img: CHARACTERS.beanie_floral_jacket.loop[0], tilt: -5 },
  { id: 'react2', img: CHARACTERS.sailor_girl.idle, tilt: 4 },
  { id: 'react3', img: CHARACTERS.bun_hoodie.idle, tilt: -4, calm: true },
  { id: 'react4', img: CHARACTERS.beanie_orange_sweater.surprised, tilt: 5, good: true },
] as const;

const MODES = ['mode1', 'mode2', 'mode3'] as const;

// лучи рампы в финальной секции — чуть светлее оранжевого
const RAY = '#F9B947';

const RANKS = [
  { id: 'novice', range: 'under', tilt: -7 },
  { id: 'speaker', range: '40–59', tilt: 5 },
  { id: 'pitcher', range: '60–74', tilt: -4 },
  { id: 'orator', range: '75–87', tilt: 8 },
  { id: 'legend', range: 'up', tilt: -6, top: true },
] as const;

/** Заголовок с волнистым подчёркиванием под последним словом. */
function Headline({ size }: { size: number }) {
  const t = useT('landing');
  const words = t('headline').split(' ');
  const style = { fontFamily: font.display, fontSize: size, lineHeight: size * 1.12, color: c.ink };
  return (
    <View style={styles.headline} accessibilityRole="header" accessibilityLabel={`${t('headline')} ${t('headlineLast')}`}>
      {words.map((w, i) => (
        <Text key={i} style={style}>
          {w}{' '}
        </Text>
      ))}
      <View>
        <Text style={style}>{t('headlineLast')}</Text>
        <View style={styles.squiggle}>
          <Squiggle />
        </View>
      </View>
    </View>
  );
}

export default function Landing() {
  const t = useT('landing');
  const tc = useT('common');
  const { wide, width } = useLayout();
  const user = useGame((s) => s.user);
  const signIn = useGame((s) => s.signIn);
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const anchors = useRef<Record<string, number>>({});
  const [finalHeight, setFinalHeight] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  // после регистрации ждём код из письма; devCode — код в ответе сервера, когда почта на нём не настроена
  const [pending, setPending] = useState<{ email: string; sent: boolean; devCode: string | null } | null>(null);
  const [code, setCode] = useState('');
  const [googleId, setGoogleId] = useState<string | null>(null);

  // кнопка Google появляется, только если вход через Google настроен на сервере; спрашиваем при открытии формы
  useEffect(() => {
    if (!loginOpen) return;
    api
      .authConfig()
      .then((config) => setGoogleId(config.google_client_id))
      .catch(() => setGoogleId(null));
  }, [loginOpen]);
  const [creating, setCreating] = useState(false); // «создать аккаунт» вместо «войти»
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); // «новый код в пути» после повторной отправки

  /** Окно входа: «Войти» в шапке — для вернувшихся, главная кнопка лендинга — создать аккаунт (новые люди приходят с неё). */
  const openLogin = (create: boolean) => {
    setCreating(create);
    setPending(null);
    setError('');
    setNotice('');
    setLoginOpen(true);
  };
  // пока запрос идёт, окно не закрываем: иначе вход завершится «за кадром»
  const closeLogin = () => {
    if (!loading) setLoginOpen(false);
  };
  const jump = (id: string) => scroll.current?.scrollTo({ y: anchors.current[id] ?? 0, animated: true });
  const mark = (id: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    anchors.current[id] = e.nativeEvent.layout.y;
  };

  const done = (session: { user: Parameters<typeof signIn>[0]; access_token: string }) => {
    signIn(session.user, session.access_token);
    setLoginOpen(false);
    setPending(null);
    setPassword('');
    setCode('');
    router.replace('/menu');
  };
  const withGoogle = async (idToken: string) => {
    setLoading(true);
    setError('');
    try {
      done(await api.google(idToken));
    } catch (e) {
      setError(t('errGoogle', { message: (e as Error).message.replace(/^\d+: /, '') }));
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    if (!pending) return;
    setError('');
    setNotice('');
    try {
      const sent = await api.resendCode(pending.email);
      setPending({ email: sent.email, sent: sent.sent, devCode: sent.dev_code });
      setCode('');
      if (sent.sent) setNotice(t('codeResent'));
    } catch (e) {
      setError((e as Error).message.replace(/^\d+: /, ''));
    }
  };

  const enter = async () => {
    setLoading(true);
    setError('');
    try {
      if (pending) return done(await api.verify(pending.email, code.trim(), nick.trim()));
      if (creating) {
        const sent = await api.signup(email.trim(), nick.trim(), password);
        // подтверждение почты на сервере выключено — аккаунт готов, входим сразу
        if (sent.access_token && sent.user) return done({ user: sent.user, access_token: sent.access_token });
        setCode('');
        return setPending({ email: sent.email, sent: sent.sent, devCode: sent.dev_code });
      }
      done(await api.login(email.trim(), password));
    } catch (e) {
      const raw = (e as Error).message;
      const message = raw.replace(/^\d+: /, '');
      // почта не подтверждена (вход отвечает 403; текст сервер может прислать на другом языке) — отправляем новый код и просим его ввести
      if (!pending && !creating && (raw.startsWith('403') || message.startsWith('Confirm your email'))) {
        try {
          const sent = await api.resendCode(email.trim());
          setCode('');
          return setPending({ email: sent.email, sent: sent.sent, devCode: sent.dev_code });
        } catch {
          // код не отправился — покажем исходную ошибку
        }
      }
      setError(pending ? message : creating ? t('errCreate', { message }) : t('errSignIn', { message }));
    } finally {
      setLoading(false);
    }
  };

  // кто уже вошёл, лендинг не видит: сразу вкладки (вход помнится между запусками, см. src/store/session.ts)
  if (user) return <Redirect href="/menu" />;

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  // войти можно по почте или по нику (аккаунты, заведённые раньше по нику, тоже есть); создать — только с почтой
  const canEnter = pending
    ? code.trim().length >= 4
    : creating
      ? validEmail && password.length >= 6 && nick.trim().length >= 2
      : email.trim().length >= 2 && password.length >= 6;

  const cta = <TicketButton title={t('cta')} stubTop={t('ctaStubTop')} stubBottom={t('ctaStubBottom')} onPress={() => openLogin(true)} stretch={!wide} />;

  return (
    <View style={styles.page}>
      <Backdrop crowd={false} />
      {/* фон до краёв экрана, отступы безопасной зоны — внутри прокрутки */}
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.grow, { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        stickyHeaderIndices={[0]}>
        {/* та же стеклянная шапка, что и на остальных экранах; единственная кнопка — «Войти» */}
        <AppHeader>
          <GlassButton title={t('signIn')} tone="ink" onPress={() => openLogin(false)} />
        </AppHeader>

        {/* Первый экран */}
        <Container style={[styles.hero, wide ? styles.heroWide : styles.heroNarrow]}>
          <View style={[styles.heroText, wide && styles.heroTextWide]}>
            <Tag>{t('tag')}</Tag>
            <Headline size={wide ? 54 : 31} />
            <Muted style={wide ? styles.lead : undefined}>
              {wide ? t('leadWide') : t('leadNarrow')}
            </Muted>
            {wide ? (
              <>
                <View style={styles.ctaRow}>
                  {cta}
                  <Button title={t('howItWorks')} variant="secondary" onPress={() => jump('how')} />
                </View>
                <Small>{t('free')}</Small>
              </>
            ) : (
              <View style={styles.stepsNarrow}>
                {STEPS.map((n) => (
                  <View key={n} style={styles.stepRow}>
                    <Text style={styles.stepRowNum}>{n}</Text>
                    <Text style={styles.stepRowText}>{t(`step${n}.short`)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {wide ? (
            <View style={styles.heroArt}>
              <View style={styles.heroFrame}>
                <View style={styles.heroClip}>
                  <Image source={ART.hero} style={styles.heroImage} resizeMode="cover" accessibilityLabel={t('heroImage')} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.ctaNarrow}>
              {cta}
              <Small style={styles.center}>{t('free')}</Small>
            </View>
          )}
        </Container>

        {wide && (
          <>
            {/* Как это работает */}
            <View style={styles.dark} onLayout={mark('how')}>
              <Valance width={width} />
              <Container style={styles.section}>
                <H2 style={styles.onInk}>{t('howItWorks')}</H2>
                <View style={styles.row}>
                  {STEPS.map((n) => (
                    <View key={n} style={styles.stepCard}>
                      <Text style={styles.stepNum}>{n}</Text>
                      <H3>{t(`step${n}.title`)}</H3>
                      <Muted>{t(`step${n}.text`)}</Muted>
                    </View>
                  ))}
                </View>
              </Container>
            </View>

            {/* Зал живой */}
            <Container style={styles.section}>
              <View style={styles.sectionHead}>
                <H2>{t('roomTitle')}</H2>
                <Muted style={styles.lead}>{t('roomLead')}</Muted>
              </View>
              <View style={styles.row}>
                {REACTIONS.map((r) => {
                  const good = 'good' in r && r.good;
                  const calm = 'calm' in r && r.calm;
                  return (
                    <Card key={r.id} tone={good ? 'accent' : 'paper'} style={styles.reaction}>
                      <View>
                        <Image source={r.img} style={styles.reactionImage} resizeMode="contain" />
                        <Bubble text={t(`${r.id}.say`)} dark={good} tilt={r.tilt} style={{ top: 4, left: 0 }} />
                      </View>
                      <H3 style={styles.reactionTitle}>{t(`${r.id}.title`)}</H3>
                      {good ? <P style={styles.reactionText}>{t(`${r.id}.text`)}</P> : <Muted style={styles.reactionText}>{t(`${r.id}.text`)}</Muted>}
                      <Text style={[styles.delta, (good || calm) && { color: c.ink }]}>{t(`${r.id}.delta`)}</Text>
                    </Card>
                  );
                })}
              </View>
            </Container>

            {/* Режимы */}
            <Container style={[styles.section, styles.noTop]}>
              <H2>{t('modesTitle')}</H2>
              <View style={styles.row}>
                {MODES.map((m) => (
                  <Card key={m} style={styles.mode}>
                    <Label>{t(`${m}.label`)}</Label>
                    <H3 style={styles.modeTitle}>{t(`${m}.title`)}</H3>
                    <Muted>{t(`${m}.text`)}</Muted>
                  </Card>
                ))}
              </View>
            </Container>

            {/* Звания */}
            <Container style={[styles.section, styles.noTop]}>
              <Card flat style={styles.ranks}>
                <View style={styles.sectionHead}>
                  <H2 style={styles.ranksTitle}>{t('ranksTitle')}</H2>
                  <Muted>{t('ranksText')}</Muted>
                </View>
                <View style={styles.stamps}>
                  {RANKS.map((r) => (
                    <Stamp
                      key={r.id}
                      title={tc(`rank.${r.id}`)}
                      caption={r.range === 'under' ? t('rankUnder', { n: 40 }) : r.range === 'up' ? t('rankUp', { n: 88 }) : r.range}
                      captionBelow
                      size={148}
                      tilt={r.tilt}
                      fill={'top' in r && r.top ? c.orange : undefined}
                    />
                  ))}
                </View>
              </Card>
            </Container>
          </>
        )}

        {/* Финал: зал ждёт */}
        <View style={[styles.final, !wide && styles.finalNarrow]} onLayout={(e) => setFinalHeight(e.nativeEvent.layout.height)}>
          {finalHeight > 0 && <Rays width={width} height={finalHeight} color={RAY} />}
          {wide && (
            <>
              <View style={styles.finalValance}>
                <Valance width={width} background="transparent" fill={c.ink} stroke={c.ink} dots={c.orange} />
              </View>
              <View style={[styles.finalDoodle, { left: '9%', top: 96, transform: [{ rotate: '-14deg' }] }]}>
                <Flower size={72} center={c.orange} />
              </View>
              <View style={[styles.finalDoodle, { left: '19%', top: 196 }]}>
                <Spark size={34} />
              </View>
              <View style={[styles.finalDoodle, { right: '10%', top: 110, transform: [{ rotate: '12deg' }] }]}>
                <Spark size={64} />
              </View>
              <View style={[styles.finalDoodle, { right: '20%', top: 214, transform: [{ rotate: '18deg' }] }]}>
                <Flower size={44} center={c.orange} />
              </View>
              <Container style={styles.finalInner}>
                <View style={styles.finalTag}>
                  <Text style={styles.finalTagText}>{t('curtain')}</Text>
                </View>
                <H2 style={styles.finalTitle}>{t('finalTitle')}</H2>
                <TicketButton title={t('cta')} stubTop={t('ctaStubTop')} stubBottom={t('ctaStubBottom')} onPress={() => openLogin(true)} style={styles.finalTicket} />
              </Container>
            </>
          )}
          <View style={[styles.rowImage, !wide && styles.rowImageNarrow]}>
            <Image source={ART.row} style={styles.heroImage} resizeMode="contain" accessibilityLabel={t('rowImage')} />
            {wide && (
              <>
                <Bubble text={t('bubbleWaiting')} tilt={-6} style={{ left: '6%', top: -6 }} />
                <Bubble text={t('bubbleTurn')} dark tilt={5} style={{ left: '46%', top: 2 }} />
                <Bubble text={t('bubbleGo')} tilt={7} style={{ right: '7%', top: -2 }} />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={loginOpen} transparent animationType="fade" onRequestClose={closeLogin}>
        {/* клавиатура не закрывает поля и кнопки: окно поднимается над ней и прокручивается, если не влезает */}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeLogin} accessibilityLabel={tc('close')} />
            <ScrollView style={styles.loginScroll} contentContainerStyle={styles.loginScrollInner} keyboardShouldPersistTaps="handled">
            <Card style={styles.login}>
              <View style={styles.close}>
                <GlassButton icon="close" label={tc('close')} onPress={closeLogin} />
              </View>
              {pending ? (
                <>
                  <Label>{t('confirmEmail')}</Label>
                  <H3>{t('enterCode')}</H3>
                  <Small>{pending.sent ? t('codeSent', { email: pending.email }) : pending.devCode ? t('codeHere', { code: pending.devCode }) : t('codeFailed')}</Small>
                  <Field placeholder={t('codePlaceholder')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus onSubmitEditing={() => canEnter && enter()} accessibilityLabel={t('codeLabel')} />
                  {notice ? <Small style={styles.notice}>{notice}</Small> : null}
                  <ErrorText>{error}</ErrorText>
                  <Button title={t('confirm')} onPress={enter} disabled={!canEnter} loading={loading} />
                  <View style={styles.codeLinks}>
                    <Button title={t('resend')} variant="secondary" size="sm" onPress={resend} />
                    <Button title={tc('back')} variant="secondary" size="sm" onPress={() => (setPending(null), setError(''), setNotice(''))} />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.tabs}>
                    {[false, true].map((mode) => (
                      <Pressable
                        key={String(mode)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: creating === mode }}
                        onPress={() => (setCreating(mode), setError(''))}
                        style={[styles.tab, creating === mode && styles.tabOn]}>
                        <Text style={[styles.tabText, creating === mode && styles.tabTextOn]}>{mode ? t('createAccount') : t('signIn')}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <H3>{creating ? t('announce') : t('welcomeBack')}</H3>
                  {/* кнопка Google есть только на сайте; в приложении разделитель «или по почте» был бы ни к чему */}
                  {googleId && Platform.OS === 'web' && (
                    <>
                      <GoogleButton clientId={googleId} onToken={withGoogle} onError={setError} />
                      <View style={styles.or}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>{t('orEmail')}</Text>
                        <View style={styles.orLine} />
                      </View>
                    </>
                  )}
                  <Field
                    placeholder={creating ? t('email') : t('emailOrNick')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={200}
                    autoFocus
                    accessibilityLabel={creating ? t('email') : t('emailOrNick')}
                  />
                  {creating && <Field placeholder={t('nickPlaceholder')} value={nick} onChangeText={setNick} autoCapitalize="none" autoCorrect={false} maxLength={50} accessibilityLabel={t('nick')} />}
                  <Field
                    placeholder={creating ? t('passwordNew') : t('password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={100}
                    onSubmitEditing={() => canEnter && enter()}
                    accessibilityLabel={t('password')}
                  />
                  <ErrorText>{error}</ErrorText>
                  <Button title={creating ? t('createAccount') : t('stepOut')} onPress={enter} disabled={!canEnter} loading={loading} />
                  <Small>{creating ? t('nickNote') : t('accountNote')}</Small>
                </>
              )}
            </Card>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.cream },
  grow: { flexGrow: 1 },
  hero: { gap: 24 },
  heroWide: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingTop: 28, paddingBottom: 72 },
  heroNarrow: { paddingTop: 12, paddingBottom: 20 },
  heroText: { gap: 16 },
  heroTextWide: { flex: 1, gap: 24 },
  headline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  squiggle: { position: 'absolute', left: 0, right: 0, bottom: -10 },
  lead: { fontSize: 20, lineHeight: 29, maxWidth: 720 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  ctaNarrow: { gap: 10 },
  center: { textAlign: 'center' },
  stepsNarrow: { gap: 10, marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.paper, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, ...outline },
  stepRowNum: { fontFamily: font.display, fontSize: 20, color: c.burnt, minWidth: 20 },
  stepRowText: { fontFamily: font.semi, fontSize: 15, color: c.ink, flex: 1 },
  heroArt: { flex: 1.15 },
  heroFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, transform: [{ rotate: '1.2deg' }], ...outline, ...shadow(8) },
  heroClip: { flex: 1, borderRadius: 22, overflow: 'hidden' },
  heroImage: { position: 'absolute', width: '100%', height: '100%' },
  dark: { backgroundColor: c.ink },
  section: { paddingVertical: 72, gap: 36 },
  noTop: { paddingTop: 0 },
  sectionHead: { gap: 10 },
  onInk: { color: c.onInk },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  stepCard: { flexGrow: 1, flexBasis: 280, backgroundColor: c.cream, borderRadius: 20, padding: 28, gap: 10 },
  stepNum: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: c.burnt },
  reaction: { flexGrow: 1, flexBasis: 230, padding: 20, gap: 6 },
  reactionImage: { width: '100%', height: 240 },
  reactionTitle: { fontSize: 19 },
  reactionText: { fontSize: 16 },
  delta: { fontFamily: font.bold, fontSize: 15, color: c.bad },
  mode: { flexGrow: 1, flexBasis: 300, padding: 28 },
  modeTitle: { fontSize: 24, lineHeight: 30 },
  ranks: { padding: 36, gap: 24, borderRadius: 24 },
  ranksTitle: { fontSize: 28, lineHeight: 34 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'center' },
  final: { backgroundColor: c.orange, borderTopWidth: 2.5, borderTopColor: c.ink, paddingTop: 64, alignItems: 'center', overflow: 'hidden' },
  finalNarrow: { paddingTop: 14, marginTop: 'auto' },
  finalInner: { alignItems: 'center', gap: 24, paddingTop: 36 },
  finalValance: { position: 'absolute', left: 0, top: -2.5 },
  finalDoodle: { position: 'absolute' },
  finalTag: { alignSelf: 'center', backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, transform: [{ rotate: '-2deg' }] },
  finalTagText: { fontFamily: font.bold, fontSize: 13, lineHeight: 17, letterSpacing: 1, textTransform: 'uppercase', color: c.orange },
  finalTicket: { alignSelf: 'center', backgroundColor: c.paper },
  finalTitle: { fontSize: 40, lineHeight: 46, textAlign: 'center' },
  rowImage: { width: '100%', maxWidth: 1100, aspectRatio: 1649 / 417, marginTop: 24 },
  rowImageNarrow: { width: 600, maxWidth: 600, height: 152, aspectRatio: undefined, marginTop: 0 },
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,20,24,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginScroll: { width: '100%', maxWidth: 420, flexGrow: 0 },
  loginScrollInner: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  notice: { color: c.good },
  login: { gap: 14 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 2, backgroundColor: c.onInkMuted },
  orText: { fontFamily: font.semi, fontSize: 13, color: c.graphite },
  codeLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 999, padding: 3, backgroundColor: c.cream, ...outline },
  tab: { paddingHorizontal: 16, minHeight: 38, justifyContent: 'center', borderRadius: 999 },
  tabOn: { backgroundColor: c.ink },
  tabText: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  tabTextOn: { color: c.orange },
});
