import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { renderSlides } from '@/slides/render';
import { SlideFrame } from '@/ui/SlideFrame';

import { api } from '@/api/client';
import * as DocumentPicker from 'expo-document-picker';

import type { AudienceId, FitSlides, PickedFile, RefineResponse } from '@/api/types';
import { audiences } from '@/content/audiences';
import { c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useT } from '@/i18n';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { goBack } from '@/ui/nav';
import { okToStartNewRound } from '@/ui/newRound';
import { TicketButton } from '@/ui/decor';
import { PREP_MIN } from '@/ui/LevelPicker';
import { Button, Card, Container, ErrorText, Field, H1, Label, Muted, Page, Small } from '@/ui/primitives';

type RefineMode = 'structure' | 'improve';

export default function OwnPitch() {
  const t = useT('own');
  const tc = useT('common');
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const startOwnPitch = useGame((s) => s.startOwnPitch);
  const slides = useGame((s) => s.slides);
  const setSlides = useGame((s) => s.setSlides);
  const [slideAt, setSlideAt] = useState(0);
  // экран остаётся под сценой: стрелки должны листать слайды только там, где игрок сейчас находится
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  // черновик живёт в состоянии игры: «назад» и возврат с подготовки его не стирают
  const draft = useGame((s) => s.ownDraft);
  const setOwnDraft = useGame((s) => s.setOwnDraft);
  const difficulty = useGame((s) => s.difficulty);
  const { title, text } = draft;
  const audience = draft.audience as AudienceId;
  const setTitle = (value: string) => setOwnDraft({ title: value });
  const setAudience = (value: AudienceId) => setOwnDraft({ audience: value });
  const setText = (value: string) => setOwnDraft({ text: value });
  const [original, setOriginal] = useState('');
  const [refined, setRefined] = useState<RefineResponse | null>(null);
  const [loading, setLoading] = useState<RefineMode | 'slides' | 'show' | null>(null);
  const [deck, setDeck] = useState<PickedFile | null>(null);
  const [fitted, setFitted] = useState<FitSlides | null>(null);
  const [error, setError] = useState('');
  // что ИИ поменял и исходный текст — по нажатию, чтобы карточка с результатом оставалась короткой
  const [details, setDetails] = useState(false);

  if (!user) return <Redirect href="/" />;

  const refine = async (mode: RefineMode) => {
    if (!text.trim()) return setError(t('errNoText'));
    setError('');
    setLoading(mode);
    try {
      // ИИ работает с тем, что сейчас в поле (с правками игрока); «было» — текст прямо перед этой правкой,
      // его и вернёт «Вернуть мой»
      setOriginal(text);
      setRefined(await api.refine(text.trim(), audience, mode));
      setDetails(false);
    } catch (e) {
      setError(t('errAi', { message: (e as Error).message }));
    } finally {
      setLoading(null);
    }
  };

  const pickDeck = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setDeck({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined, file: asset.file });
    setFitted(null);
    setSlides([]);
    setSlideAt(0);
  };

  /** Раскладывает питч по слайдам: что говорить на каждом. Слайд про демо становится «Demo time.». */
  const fit = async () => {
    if (!deck) return;
    setError('');
    setLoading('slides');
    try {
      setOriginal(text);
      setFitted(await api.fitSlides(deck, title.trim(), text.trim(), audience));
    } catch (e) {
      setError(t('errFit', { message: (e as Error).message.replace(/^\d+: /, '') }));
    } finally {
      setLoading(null);
    }
  };

  /** Показ с презентацией: слайды будут стоять на сцене рядом с камерой, листаются стрелками. */
  const present = async () => {
    if (!deck) return;
    setError('');
    setLoading('show');
    try {
      setSlides(await renderSlides(deck));
      setSlideAt(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const start = async () => {
    if (loading) return; // ИИ или слайды ещё работают — их результат иначе потерялся бы
    if (!title.trim()) return setError(t('errTitle'));
    if (!text.trim()) return setError(t('errBody'));
    // незаконченный раунд не пропадает молча: сначала спрашиваем
    if (!(await okToStartNewRound())) return;
    startOwnPitch({ title: title.trim(), text: text.trim(), audience });
    // экран своего питча заменяется подготовкой: дальше идёт раунд, и «назад» из него ведёт на «Главную»
    // (docs/ux.md); черновик хранится и снова откроется со всем текстом
    router.replace('/prep');
  };

  return (
    <Page
      sticky
      footer={
        // ошибка — прямо над кнопкой «Дальше»: внизу длинной страницы её не видно, и кнопка казалась мёртвой
        <View style={styles.footer}>
          <ErrorText>{error}</ErrorText>
          <TicketButton title={t('next')} stubTop={tc('minutes', { n: PREP_MIN[difficulty] })} stubBottom="→" onPress={start} stretch={!wide} />
        </View>
      }>
      <AppHeader corner={{ icon: 'back', label: tc('back'), onPress: () => goBack() }} />
      <Container style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.col, wide && styles.colWide]}>
          <H1 style={!wide && styles.titleNarrow}>{t('title')}</H1>
          <Muted>{t('lead')}</Muted>
          <Card flat>
            <Label>{t('step1')}</Label>
            <Field
              placeholder={t('titlePlaceholder')}
              value={title}
              onChangeText={(v) => (setTitle(v), setError(''))}
              maxLength={120}
              accessibilityLabel={t('titleLabel')}
            />
          </Card>
          <Card flat>
            <Label>{t('step2')}</Label>
            <Small>{t('audienceNote')}</Small>
            <View style={styles.audiences}>
              {audiences().map((a) => {
                const selected = a.id === audience;
                return (
                  <Pressable
                    key={a.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setAudience(a.id)}
                    style={[styles.audience, selected && styles.audienceSelected]}
                  >
                    <Text style={styles.audienceName}>{a.name}</Text>
                    <Text style={styles.audienceFocus}>{a.focus}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>
        <View style={[styles.col, wide && styles.colWide]}>
          <Card flat>
            <Label>{t('step3')}</Label>
            <Field
              placeholder={t('textPlaceholder')}
              value={text}
              onChangeText={(v) => (setText(v), setError(''))}
              multiline
              maxLength={5000}
              accessibilityLabel={t('textLabel')}
              style={styles.text}
            />
            <View style={styles.refine}>
              <Button title={t('structure')} variant="secondary" size="sm" loading={loading === 'structure'} disabled={loading !== null} onPress={() => refine('structure')} />
              <Button title={t('improve')} variant="secondary" size="sm" loading={loading === 'improve'} disabled={loading !== null} onPress={() => refine('improve')} />
            </View>
            <Small>{t('keep')}</Small>
          </Card>
          <Card flat>
            <Label>{t('step4')}</Label>
            <Small>{t('deckNote')}</Small>
            <View style={styles.refine}>
              <Button title={deck ? t('chooseAnother') : t('upload')} variant="secondary" size="sm" disabled={loading !== null} onPress={pickDeck} />
              {deck && <Button title={t('fit')} size="sm" loading={loading === 'slides'} disabled={loading !== null} onPress={fit} />}
              {/* слайды могли остаться с прошлого раза (файла уже нет) — их всё равно можно выключить */}
              {(deck || slides.length > 0) && (
                <Button
                  title={slides.length ? t('slidesOn') : t('present')}
                  variant={slides.length ? 'ink' : 'primary'}
                  size="sm"
                  loading={loading === 'show'}
                  disabled={loading !== null}
                  onPress={slides.length ? () => setSlides([]) : present}
                />
              )}
            </View>
            {deck && <Text style={styles.file} numberOfLines={1}>{deck.name}</Text>}
            {slides.length > 0 && (
              <View style={styles.preview}>
                <SlideFrame slides={slides} index={slideAt} onIndex={setSlideAt} width={wide ? 340 : 260} tilt={-1.5} keys={focused} />
                <Small>{t('previewNote', { button: t('slidesOn') })}</Small>
              </View>
            )}
          </Card>
          {fitted && (
            <Card tone="accent">
              <Label style={{ color: c.ink }}>{t('slideBySlide')}</Label>
              <ScrollView style={styles.slides} contentContainerStyle={styles.slidesInner} nestedScrollEnabled>
              {fitted.slides.map((s) => (
                <View key={s.n} style={styles.slide}>
                  <View style={[styles.slideNum, s.kind === 'demo' && { backgroundColor: c.ink }]}>
                    <Text style={[styles.slideNumText, s.kind === 'demo' && { color: c.orange }]}>{s.n}</Text>
                  </View>
                  <View style={styles.slideBody}>
                    <Text style={styles.slideTitle}>{s.title}</Text>
                    <Text style={[styles.note, s.kind === 'demo' && styles.demo]}>{s.text}</Text>
                  </View>
                </View>
              ))}
              </ScrollView>
              <View style={styles.refine}>
                <Button title={t('useText')} variant="ink" size="sm" onPress={() => setText(fitted.text)} />
                <Button title={t('restore')} variant="secondary" size="sm" onPress={() => original && setText(original)} />
              </View>
            </Card>
          )}
          {refined && (
            <Card tone="accent" style={styles.result}>
              <View style={styles.resultHead}>
                <Label style={styles.resultLabel}>{t('improved')}</Label>
                <Button title={t('useText')} variant="ink" size="sm" onPress={() => setText(refined.text)} />
                <Button title={t('restore')} variant="secondary" size="sm" onPress={() => original && setText(original)} />
              </View>
              {/* длинный текст прокручивается внутри, а не растягивает страницу */}
              <ScrollView style={styles.resultBox} nestedScrollEnabled>
                <Text style={styles.resultText}>{refined.text}</Text>
              </ScrollView>
              {(refined.notes.length > 0 || original) && (
                <Pressable accessibilityRole="button" onPress={() => setDetails(!details)} style={styles.toggle}>
                  <Text style={styles.toggleText}>
                    {details ? t('hideChanges') : t('showChanges')}
                    {refined.notes.length ? ` (${refined.notes.length})` : ''} {details ? '▴' : '▾'}
                  </Text>
                </Pressable>
              )}
              {details && (
                <View style={styles.details}>
                  {refined.notes.map((n) => (
                    <Text key={n} style={styles.small}>
                      • {n}
                    </Text>
                  ))}
                  {original ? (
                    <>
                      <Text style={styles.was}>{t('before')}</Text>
                      <Text style={styles.small}>{original}</Text>
                    </>
                  ) : null}
                </View>
              )}
            </Card>
          )}
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 56, gap: 22 },
  footer: { gap: 8 },
  mainWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, paddingTop: 16 },
  col: { gap: 20 },
  colWide: { flex: 1 },
  titleNarrow: { fontSize: 28, lineHeight: 34 },
  audiences: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  audience: { flexGrow: 1, flexBasis: 200, backgroundColor: c.paper, borderRadius: 16, padding: 14, gap: 4, ...outline },
  audienceSelected: { backgroundColor: c.orange, ...shadow(4) },
  audienceName: { fontFamily: font.bold, fontSize: 17, color: c.ink },
  audienceFocus: { fontFamily: font.body, fontSize: 14, lineHeight: 19, color: c.ink },
  text: { minHeight: 220 },
  refine: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  note: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: c.ink },
  result: { gap: 10, padding: 18 },
  resultHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  resultLabel: { color: c.ink, flexGrow: 1 },
  resultBox: { maxHeight: 200, backgroundColor: c.paper, borderRadius: 12, borderWidth: 2, borderColor: c.ink, paddingHorizontal: 12, paddingVertical: 10 },
  resultText: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: c.ink },
  toggle: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  toggleText: { fontFamily: font.semi, fontSize: 14, color: c.ink, textDecorationLine: 'underline' },
  details: { gap: 6 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: c.ink },
  was: { fontFamily: font.bold, fontSize: 14, color: c.ink, marginTop: 6 },
  file: { fontFamily: font.semi, fontSize: 14, color: c.graphite },
  preview: { gap: 14, marginTop: 6, alignItems: 'flex-start' },
  slides: { maxHeight: 260 },
  slidesInner: { gap: 10 },
  slide: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  slideNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', marginTop: 2, ...outline },
  slideNumText: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  slideBody: { flex: 1, gap: 2 },
  slideTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: c.ink },
  demo: { fontFamily: font.display, fontSize: 18, lineHeight: 24 },
});
