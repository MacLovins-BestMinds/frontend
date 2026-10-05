import { StyleSheet, Text, View } from 'react-native';

import type { Delivery } from '@/api/types';
import { c, font, formatNumber, formatTime } from '@/design/theme';
import { useT } from '@/i18n';

import { Card, H3, Muted } from './primitives';

type Item = { key: string; text: string };

const MAX_ITEMS = 5;
const CRITERIA = ['topic', 'structure', 'clarity', 'persuasion', 'audience_fit', 'memorable'] as const;
const isCriterion = (name: string): name is (typeof CRITERIA)[number] => (CRITERIA as readonly string[]).includes(name);

/**
 * Что получилось и что поправить — одной картинкой, из цифр разбора: паразиты, темп, паузы, запинки, неуверенные
 * фразы, голос, взгляд, время и самые сильные и слабые критерии содержания. Считается на экране, без сервера.
 */
export function Highlights({ delivery, wide }: { delivery: Delivery; wide: boolean }) {
  const t = useT('result');
  const { metrics: m, scores, events } = delivery;
  const good: Item[] = [];
  const bad: Item[] = [];
  const count = (type: Delivery['events'][number]['type']) => events.filter((e) => e.type === type).length;
  const criterion = (name: string) => (isCriterion(name) ? t(`crit.${name}`) : name);

  // содержание: самый сильный и самый слабый критерий
  const sorted = [...scores.content.criteria].sort((a, b) => b.score - a.score);
  if (sorted.length) {
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.score >= 80) good.push({ key: 'content', text: best.quote ? t('hl.contentGood', { criterion: criterion(best.name), quote: best.quote }) : t('hl.contentGoodPlain', { criterion: criterion(best.name) }) });
    if (worst.score < 50) bad.push({ key: 'content', text: t('hl.contentBad', { criterion: criterion(worst.name) }) });
  }

  const swears = m.profanity ?? count('profanity');
  if (swears > 0) bad.push({ key: 'swearing', text: t('hl.swearing', { n: swears }) });

  // неуверенная речь: только у разборов, которые её искали (у старых метрики нет)
  if (m.weak_phrases !== undefined) {
    if (m.weak_phrases === 0) good.push({ key: 'weak', text: t('hl.weakGood') });
    else if (m.weak_phrases >= 3) bad.push({ key: 'weak', text: t('hl.weakBad', { n: m.weak_phrases }) });
  }

  if (m.fillers_per_min <= 1) good.push({ key: 'fillers', text: t('hl.fillersGood', { n: formatNumber(m.fillers_per_min, 1) }) });
  else if (m.fillers_per_min >= 3) bad.push({ key: 'fillers', text: t('hl.fillersBad', { n: formatNumber(m.fillers_per_min, 1) }) });

  if (scores.delivery.pace >= 85) good.push({ key: 'pace', text: t('hl.paceGood', { n: m.wpm }) });
  else if (scores.delivery.pace < 60) {
    const texts = events.filter((e) => e.type === 'pace').map((e) => e.text);
    const fast = texts.some((x) => /fast|быстр|rapid/i.test(x)) || (!texts.some((x) => /slow|медлен|lent/i.test(x)) && m.wpm > 150);
    bad.push({ key: 'pace', text: t(fast ? 'hl.paceFast' : 'hl.paceSlow', { n: m.wpm }) });
  }

  if (m.long_pauses === 0) good.push({ key: 'pauses', text: t('hl.pausesGood') });
  else if (m.long_pauses >= 2) bad.push({ key: 'pauses', text: t('hl.pausesBad', { n: m.long_pauses }) });

  if (m.monotone === true) bad.push({ key: 'voice', text: t('hl.monotone') });
  else if (m.monotone === false && m.pitch_variation != null) good.push({ key: 'voice', text: t('hl.voiceGood', { n: formatNumber(m.pitch_variation, 1) }) });
  if ((m.fades ?? 0) >= 2) bad.push({ key: 'fades', text: t('hl.fades', { n: m.fades ?? 0 }) });

  const stumbles = m.stumbles ?? count('stumble');
  if (stumbles >= 2) bad.push({ key: 'stumbles', text: t('hl.stumbles', { n: stumbles }) });
  const repeats = count('repeat');
  if (repeats >= 2) bad.push({ key: 'repeats', text: t('hl.repeats', { n: repeats }) });

  if (typeof m.gaze_on_ratio === 'number') {
    const pct = Math.round(m.gaze_on_ratio * 100);
    if (m.gaze_on_ratio >= 0.7) good.push({ key: 'gaze', text: t('hl.gazeGood', { n: pct }) });
    else if (m.gaze_on_ratio < 0.5) bad.push({ key: 'gaze', text: t('hl.gazeBad', { n: pct }) });
  }

  if (scores.delivery.timing === 100) good.push({ key: 'timing', text: t('hl.timingGood') });
  else if (scores.delivery.timing < 70) bad.push({ key: 'timing', text: t('hl.timingBad', { n: formatTime(m.duration_sec) }) });

  const column = (title: string, items: Item[], tone: 'good' | 'bad', empty: string) => (
    <View style={[styles.column, wide && styles.columnWide]}>
      <Text style={[styles.columnTitle, { color: tone === 'good' ? c.good : c.bad }]}>{title}</Text>
      {items.length === 0 ? (
        <Muted style={styles.empty}>{empty}</Muted>
      ) : (
        items.slice(0, MAX_ITEMS).map((item) => (
          <View key={item.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: tone === 'good' ? c.markGood : c.markBad }]}>
              <Text style={styles.dotGlyph}>{tone === 'good' ? '✓' : '!'}</Text>
            </View>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <Card flat style={[styles.card, wide && styles.cardWide]}>
      <H3>{t('highlights')}</H3>
      <View style={[styles.columns, wide && styles.columnsWide]}>
        {column(t('worked'), good, 'good', t('nothingGood'))}
        {column(t('fix'), bad, 'bad', t('nothingBad'))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, gap: 14 },
  cardWide: { padding: 30, borderRadius: 24 },
  columns: { gap: 18 },
  columnsWide: { flexDirection: 'row', gap: 28 },
  // на телефоне колонки идут одна под другой и растут по содержимому; flex: 1 там схлопывал их, и строки налезали
  column: { gap: 10 },
  columnWide: { flex: 1 },
  columnTitle: { fontFamily: font.bold, fontSize: 13, lineHeight: 17, letterSpacing: 1, textTransform: 'uppercase' },
  empty: { fontSize: 15, lineHeight: 21 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  dotGlyph: { fontFamily: font.bold, fontSize: 12, lineHeight: 14, color: c.ink },
  itemText: { flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: c.ink },
});
