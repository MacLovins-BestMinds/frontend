import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { GoogleButton } from '@/auth/GoogleButton';
import { c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { ART, CHARACTERS } from '@/scene/assets';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { Backdrop } from '@/ui/Backdrop';
import { Bubble, Flower, Rays, Spark, Squiggle, Stamp, TicketButton, Valance } from '@/ui/decor';
import { Button, Card, Container, ErrorText, Field, H2, H3, Label, Muted, P, Small, Tag } from '@/ui/primitives';

const STEPS = [
  { n: '1', title: 'You get a topic', short: 'The wheel gives you a topic', text: 'The wheel picks a simple everyday topic: your favourite food, cats or dogs, your city. Spin as many times as you like.' },
  { n: '2', title: 'Time to prepare', short: 'A few minutes to prepare', text: 'Read the brief, look things up in other tabs, jot down notes. Need longer? Add time — we ping you when it is up.' },
  { n: '3', title: 'You pitch and answer the jury', short: 'Pitch to the room, then jury questions', text: '1–3 minutes in front of the room, or as long as you choose, then one question from each jury member. At the end — a review and a rank.' },
];

const REACTIONS = [
  { img: CHARACTERS.beanie_floral_jacket.loop[0], say: '…hello?', title: 'A long silence', text: 'Go quiet for a few seconds and the phones come out.', delta: 'the room gets bored', tilt: -5 },
  { img: CHARACTERS.sailor_girl.idle, say: 'um…', title: 'Fillers and repeats', text: 'An “um” or a rushed line takes the sparkle away — nothing worse.', delta: 'the sparkle fades', tilt: 4 },
  { img: CHARACTERS.bun_hoodie.idle, say: 'go on', title: 'You start talking again', text: 'The room forgives quickly: speak, and everyone looks back at you.', delta: 'attention comes back', tilt: -4, calm: true },
  { img: CHARACTERS.beanie_orange_sweater.surprised, say: 'wow!', title: 'Confident and steady', text: 'Hold a thought without stumbling and their eyes light up.', delta: 'stars in their eyes', tilt: 5, good: true },
];

const MODES = [
  { label: 'Training', title: 'The wheel gives you a topic', text: 'Category → case → ready-made topic. Every case has a hidden catch that the jury builds its questions on.' },
  { label: 'Topic of the day', title: 'One topic for everyone', text: 'Today everyone pitches the same thing. Your best score of the day goes to the leaderboard.' },
  { label: 'Your own pitch', title: 'Your topic and text', text: 'Pick an audience: contest jury, business people, teachers or the general public. The text can be structured and improved.' },
];

// лучи рампы в финальной секции — чуть светлее оранжевого
const RAY = '#F9B947';

const RANKS = [
  { title: 'Novice', range: 'under 40', tilt: -7 },
  { title: 'Speaker', range: '40–59', tilt: 5 },
  { title: 'Pitcher', range: '60–74', tilt: -4 },
  { title: 'Orator', range: '75–87', tilt: 8 },
  { title: 'Legend', range: '88 and up', tilt: -6, top: true },
];

/** Заголовок с волнистым подчёркиванием под последним словом. */
function Headline({ size }: { size: number }) {
  const words = ['Pitch', 'to', 'a', 'room', 'that'];
  const style = { fontFamily: font.display, fontSize: size, lineHeight: size * 1.12, color: c.ink };
  return (
    <View style={styles.headline} accessibilityRole="header" accessibilityLabel="Pitch to a room that reacts">
      {words.map((w) => (
        <Text key={w} style={style}>
          {w}{' '}
        </Text>
      ))}
      <View>
        <Text style={style}>reacts</Text>
        <View style={styles.squiggle}>
          <Squiggle />
        </View>
      </View>
    </View>
  );
}

export default function Landing() {
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

  const start = () => (user ? router.push('/menu') : setLoginOpen(true));
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
    router.push('/menu');
  };
  const withGoogle = async (idToken: string) => {
    setLoading(true);
    setError('');
    try {
      done(await api.google(idToken));
    } catch (e) {
      setError(`Could not sign in with Google: ${(e as Error).message.replace(/^\d+: /, '')}`);
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    if (!pending) return;
    setError('');
    try {
      const sent = await api.resendCode(pending.email);
      setPending({ email: sent.email, sent: sent.sent, devCode: sent.dev_code });
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
      const message = (e as Error).message.replace(/^\d+: /, '');
      // почта не подтверждена — отправляем новый код и просим его ввести
      if (!pending && !creating && message.startsWith('Confirm your email')) {
        try {
          const sent = await api.resendCode(email.trim());
          setCode('');
          return setPending({ email: sent.email, sent: sent.sent, devCode: sent.dev_code });
        } catch {
          // код не отправился — покажем исходную ошибку
        }
      }
      setError(pending ? message : creating ? `Could not create the account: ${message}` : `Could not sign in: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canEnter = pending ? code.trim().length >= 4 : validEmail && password.length >= 6 && (!creating || nick.trim().length >= 2);

  const cta = <TicketButton title="Start training" stubTop="entry" stubBottom="free" onPress={start} stretch={!wide} />;

  return (
    <View style={styles.page}>
      <Backdrop crowd={false} />
      {/* фон до краёв экрана, отступы безопасной зоны — внутри прокрутки */}
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.grow, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}
        scrollIndicatorInsets={{ top: insets.top, bottom: insets.bottom }}>
        <AppHeader home="/">
          <Button title={user ? 'Menu' : 'Sign in'} variant="secondary" size="sm" onPress={start} style={wide ? shadow(3) : undefined} />
        </AppHeader>

        {/* Первый экран */}
        <Container style={[styles.hero, wide ? styles.heroWide : styles.heroNarrow]}>
          <View style={[styles.heroText, wide && styles.heroTextWide]}>
            <Tag>Public speaking trainer</Tag>
            <Headline size={wide ? 54 : 31} />
            <Muted style={wide ? styles.lead : undefined}>
              {wide
                ? 'You pitch to a drawn audience and a table of three jury members. Speak with confidence and their eyes light up; go quiet for too long and the phones come out. Then the jury asks questions out loud and AI reviews your pitch.'
                : 'Speak with confidence and their eyes light up; go quiet and the phones come out. Then the jury asks questions and AI reviews your pitch.'}
            </Muted>
            {wide ? (
              <>
                <View style={styles.ctaRow}>
                  {cta}
                  <Button title="How it works" variant="secondary" onPress={() => jump('how')} />
                </View>
                <Small>Free. You need a camera and a microphone.</Small>
              </>
            ) : (
              <View style={styles.stepsNarrow}>
                {STEPS.map((s) => (
                  <View key={s.n} style={styles.stepRow}>
                    <Text style={styles.stepRowNum}>{s.n}</Text>
                    <Text style={styles.stepRowText}>{s.short}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {wide ? (
            <View style={styles.heroArt}>
              <View style={styles.heroFrame}>
                <View style={styles.heroClip}>
                  <Image source={ART.hero} style={styles.heroImage} resizeMode="cover" accessibilityLabel="The stage: ten audience members, silhouettes behind them, the jury at a table in front" />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.ctaNarrow}>
              {cta}
              <Small style={styles.center}>Free. You need a camera and a microphone.</Small>
            </View>
          )}
        </Container>

        {wide && (
          <>
            {/* Как это работает */}
            <View style={styles.dark} onLayout={mark('how')}>
              <Valance width={width} />
              <Container style={styles.section}>
                <H2 style={styles.onInk}>How it works</H2>
                <View style={styles.row}>
                  {STEPS.map((s) => (
                    <View key={s.n} style={styles.stepCard}>
                      <Text style={styles.stepNum}>{s.n}</Text>
                      <H3>{s.title}</H3>
                      <Muted>{s.text}</Muted>
                    </View>
                  ))}
                </View>
              </Container>
            </View>

            {/* Зал живой */}
            <Container style={styles.section}>
              <View style={styles.sectionHead}>
                <H2>The room is alive</H2>
                <Muted style={styles.lead}>The audience listens with you: it lights up while you speak with confidence and drifts away when you stop.</Muted>
              </View>
              <View style={styles.row}>
                {REACTIONS.map((r) => (
                  <Card key={r.title} tone={r.good ? 'accent' : 'paper'} style={styles.reaction}>
                    <View>
                      <Image source={r.img} style={styles.reactionImage} resizeMode="contain" />
                      <Bubble text={r.say} dark={r.good} tilt={r.tilt} style={{ top: 4, left: 0 }} />
                    </View>
                    <H3 style={styles.reactionTitle}>{r.title}</H3>
                    {r.good ? <P style={styles.reactionText}>{r.text}</P> : <Muted style={styles.reactionText}>{r.text}</Muted>}
                    <Text style={[styles.delta, (r.good || r.calm) && { color: c.ink }]}>{r.delta}</Text>
                  </Card>
                ))}
              </View>
            </Container>

            {/* Режимы */}
            <Container style={[styles.section, styles.noTop]}>
              <H2>Three modes</H2>
              <View style={styles.row}>
                {MODES.map((m) => (
                  <Card key={m.label} style={styles.mode}>
                    <Label>{m.label}</Label>
                    <H3 style={styles.modeTitle}>{m.title}</H3>
                    <Muted>{m.text}</Muted>
                  </Card>
                ))}
              </View>
            </Container>

            {/* Звания */}
            <Container style={[styles.section, styles.noTop]}>
              <Card flat style={styles.ranks}>
                <View style={styles.sectionHead}>
                  <H2 style={styles.ranksTitle}>Progress is your rank</H2>
                  <Muted>It is based on the average score of your last five rounds. It can go up and down.</Muted>
                </View>
                <View style={styles.stamps}>
                  {RANKS.map((r) => (
                    <Stamp key={r.title} title={r.title} caption={r.range} captionBelow size={148} tilt={r.tilt} fill={r.top ? c.orange : undefined} />
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
                  <Text style={styles.finalTagText}>Curtain up</Text>
                </View>
                <H2 style={styles.finalTitle}>The room is waiting. Step out.</H2>
                <TicketButton title="Start training" stubTop="entry" stubBottom="free" onPress={start} style={styles.finalTicket} />
              </Container>
            </>
          )}
          <View style={[styles.rowImage, !wide && styles.rowImageNarrow]}>
            <Image source={ART.row} style={styles.heroImage} resizeMode="contain" accessibilityLabel="Ten audience members in a row" />
            {wide && (
              <>
                <Bubble text="we’re waiting!" tilt={-6} style={{ left: '6%', top: -6 }} />
                <Bubble text="your turn" dark tilt={5} style={{ left: '46%', top: 2 }} />
                <Bubble text="go on!" tilt={7} style={{ right: '7%', top: -2 }} />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={loginOpen} transparent animationType="fade" onRequestClose={() => setLoginOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLoginOpen(false)} accessibilityLabel="Close">
          <Pressable style={styles.loginWrap} onPress={() => {}}>
            <Card style={styles.login}>
              {pending ? (
                <>
                  <Label>Confirm your email</Label>
                  <H3>Enter the code</H3>
                  <Small>
                    {pending.sent
                      ? `We sent a 6-digit code to ${pending.email}. It works for 15 minutes.`
                      : `Mail is not set up on this server, so the code is shown right here: ${pending.devCode ?? 'see the server log'}.`}
                  </Small>
                  <Field placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus onSubmitEditing={() => canEnter && enter()} accessibilityLabel="Confirmation code" />
                  <ErrorText>{error}</ErrorText>
                  <Button title="Confirm and step out" onPress={enter} disabled={!canEnter} loading={loading} />
                  <View style={styles.codeLinks}>
                    <Button title="Send a new code" variant="secondary" size="sm" onPress={resend} />
                    <Button title="Back" variant="secondary" size="sm" onPress={() => (setPending(null), setError(''))} />
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
                        <Text style={[styles.tabText, creating === mode && styles.tabTextOn]}>{mode ? 'Create account' : 'Sign in'}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <H3>{creating ? 'How should we announce you?' : 'Welcome back'}</H3>
                  {googleId && (
                    <>
                      <GoogleButton clientId={googleId} onToken={withGoogle} onError={setError} />
                      <View style={styles.or}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>or with email</Text>
                        <View style={styles.orLine} />
                      </View>
                    </>
                  )}
                  <Field placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={200} autoFocus accessibilityLabel="Email" />
                  {creating && <Field placeholder="Nickname — shown on the leaderboard" value={nick} onChangeText={setNick} autoCapitalize="none" autoCorrect={false} maxLength={50} accessibilityLabel="Nickname" />}
                  <Field
                    placeholder={creating ? 'Password, at least 6 characters' : 'Password'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={100}
                    onSubmitEditing={() => canEnter && enter()}
                    accessibilityLabel="Password"
                  />
                  <ErrorText>{error}</ErrorText>
                  <Button title={creating ? 'Create account' : 'Step out'} onPress={enter} disabled={!canEnter} loading={loading} />
                  <Small>
                    {creating
                      ? 'Your nickname shows on the leaderboard. Played before under a nickname? Use the same one — your rounds stay with you.'
                      : 'Your rounds, rank and progress are kept in your account.'}
                  </Small>
                </>
              )}
            </Card>
          </Pressable>
        </Pressable>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(22,20,24,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginWrap: { width: '100%', maxWidth: 420 },
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
