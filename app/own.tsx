import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import * as DocumentPicker from 'expo-document-picker';

import type { AudienceId, FitSlides, PickedFile, RefineResponse } from '@/api/types';
import { AUDIENCES } from '@/content/audiences';
import { c, font, outline, shadow } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { useGame } from '@/store/game';
import { AppHeader } from '@/ui/AppHeader';
import { goBack } from '@/ui/nav';
import { TicketButton } from '@/ui/decor';
import { Button, Card, Container, ErrorText, Field, H1, Label, Muted, Page, Small } from '@/ui/primitives';

type RefineMode = 'structure' | 'improve';

export default function OwnPitch() {
  const { wide } = useLayout();
  const user = useGame((s) => s.user);
  const startOwnPitch = useGame((s) => s.startOwnPitch);
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState<AudienceId>('business');
  const [text, setText] = useState('');
  const [original, setOriginal] = useState('');
  const [refined, setRefined] = useState<RefineResponse | null>(null);
  const [loading, setLoading] = useState<RefineMode | 'slides' | null>(null);
  const [deck, setDeck] = useState<PickedFile | null>(null);
  const [fitted, setFitted] = useState<FitSlides | null>(null);
  const [error, setError] = useState('');
  // что ИИ поменял и исходный текст — по нажатию, чтобы карточка с результатом оставалась короткой
  const [details, setDetails] = useState(false);

  if (!user) return <Redirect href="/" />;

  const refine = async (mode: RefineMode) => {
    if (!text.trim()) return setError('Write your talking points or pitch text first');
    setError('');
    setLoading(mode);
    try {
      // «было» — всегда исходный текст автора, даже если улучшаем второй раз
      const source = original || text;
      if (!original) setOriginal(text);
      setRefined(await api.refine(source.trim(), audience, mode));
      setDetails(false);
    } catch (e) {
      setError(`The AI helper did not respond: ${(e as Error).message}`);
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
  };

  /** Раскладывает питч по слайдам: что говорить на каждом. Слайд про демо становится «Demo time.». */
  const fit = async () => {
    if (!deck) return;
    setError('');
    setLoading('slides');
    try {
      if (!original) setOriginal(text);
      setFitted(await api.fitSlides(deck, title.trim(), (original || text).trim(), audience));
    } catch (e) {
      setError(`Could not fit the text to the slides: ${(e as Error).message.replace(/^\d+: /, '')}`);
    } finally {
      setLoading(null);
    }
  };

  const start = () => {
    if (!title.trim()) return setError('Add the name of your idea or the topic of the pitch');
    if (!text.trim()) return setError('Add at least a couple of sentences or talking points');
    startOwnPitch({ title: title.trim(), text: text.trim(), audience });
    router.push('/prep');
  };

  return (
    <Page sticky footer={<TicketButton title="On to preparation" stubTop="5 min" stubBottom="→" onPress={start} stretch={!wide} />}>
      <AppHeader glass back={() => goBack()} />
      <Container style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.col, wide && styles.colWide]}>
          <H1 style={!wide && styles.titleNarrow}>Your own pitch</H1>
          <Muted>Pitch your own idea. Pick an audience and write the text — the jury will ask about it.</Muted>
          <Card flat>
            <Label>1. Topic or project name</Label>
            <Field
              placeholder="For example: a smart coffee machine that remembers your order"
              value={title}
              onChangeText={(v) => (setTitle(v), setError(''))}
              maxLength={120}
              accessibilityLabel="Topic or project name"
            />
          </Card>
          <Card flat>
            <Label>2. Who you are pitching to</Label>
            <Small>The audience changes the style of the jury questions and how strict the room is.</Small>
            <View style={styles.audiences}>
              {AUDIENCES.map((a) => {
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
            <Label>3. Pitch text or talking points</Label>
            <Field
              placeholder="What the problem is, what you offer, why you, and what you are asking for"
              value={text}
              onChangeText={(v) => (setText(v), setError(''))}
              multiline
              maxLength={5000}
              accessibilityLabel="Pitch text"
              style={styles.text}
            />
            <View style={styles.refine}>
              <Button title="Structure" variant="secondary" size="sm" loading={loading === 'structure'} disabled={loading !== null} onPress={() => refine('structure')} />
              <Button title="Structure and improve" variant="secondary" size="sm" loading={loading === 'improve'} disabled={loading !== null} onPress={() => refine('improve')} />
            </View>
            <Small>You can keep it as is — then just go on stage.</Small>
          </Card>
          <Card flat>
            <Label>4. Presentation (optional)</Label>
            <Small>Upload your slides as PDF or PPTX and the text will be laid out slide by slide. A slide about a demo becomes “Demo time”.</Small>
            <View style={styles.refine}>
              <Button title={deck ? 'Choose another file' : 'Upload slides'} variant="secondary" size="sm" disabled={loading !== null} onPress={pickDeck} />
              {deck && <Button title="Fit text to slides" size="sm" loading={loading === 'slides'} disabled={loading !== null} onPress={fit} />}
            </View>
            {deck && <Text style={styles.file} numberOfLines={1}>{deck.name}</Text>}
          </Card>
          {fitted && (
            <Card tone="accent">
              <Label style={{ color: c.ink }}>Your pitch, slide by slide</Label>
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
                <Button title="Use this text" variant="ink" size="sm" onPress={() => setText(fitted.text)} />
                <Button title="Restore mine" variant="secondary" size="sm" onPress={() => original && setText(original)} />
              </View>
            </Card>
          )}
          {refined && (
            <Card tone="accent" style={styles.result}>
              <View style={styles.resultHead}>
                <Label style={styles.resultLabel}>Improved text</Label>
                <Button title="Use this text" variant="ink" size="sm" onPress={() => setText(refined.text)} />
                <Button title="Restore mine" variant="secondary" size="sm" onPress={() => original && setText(original)} />
              </View>
              {/* длинный текст прокручивается внутри, а не растягивает страницу */}
              <ScrollView style={styles.resultBox} nestedScrollEnabled>
                <Text style={styles.resultText}>{refined.text}</Text>
              </ScrollView>
              {(refined.notes.length > 0 || original) && (
                <Pressable accessibilityRole="button" onPress={() => setDetails(!details)} style={styles.toggle}>
                  <Text style={styles.toggleText}>
                    {details ? 'Hide' : 'Show'} what changed{refined.notes.length ? ` (${refined.notes.length})` : ''} {details ? '▴' : '▾'}
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
                      <Text style={styles.was}>Before</Text>
                      <Text style={styles.small}>{original}</Text>
                    </>
                  ) : null}
                </View>
              )}
            </Card>
          )}
          <ErrorText>{error}</ErrorText>
        </View>
      </Container>
    </Page>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 8, paddingBottom: 56, gap: 22 },
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
  slides: { maxHeight: 260 },
  slidesInner: { gap: 10 },
  slide: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  slideNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', marginTop: 2, ...outline },
  slideNumText: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  slideBody: { flex: 1, gap: 2 },
  slideTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: c.ink },
  demo: { fontFamily: font.display, fontSize: 18, lineHeight: 24 },
});
