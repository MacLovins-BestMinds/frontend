import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import type { Case } from '@/api/types';
import { GENERAL_SOURCES, findAudience } from '@/content/audiences';

import { Body, Card, Label } from './kit';
import { colors } from './theme';

function formatRange(minSec: number, maxSec: number): string {
  if (maxSec < 60) return `${minSec}–${maxSec} секунд`;
  return `${Math.round(minSec / 60)}–${Math.round(maxSec / 60)} минуты`;
}

/** Карточка темы, блок «Что от тебя хотят» и подсказки по аудитории с источниками. */
export function Brief({ topic, minSec, maxSec }: { topic: Case; minSec: number; maxSec: number }) {
  const audience = findAudience(topic.audience);
  // сначала материалы по самой теме, потом — как говорить с аудиторией и о выступлениях вообще
  const sources = [...(topic.sources ?? []), ...(audience?.sources ?? []), ...GENERAL_SOURCES];

  return (
    <>
      <Card>
        <Label>Тема</Label>
        <Body>{topic.title}</Body>
        <Body muted>{topic.brief}</Body>
      </Card>
      {topic.summary ? (
        <Card>
          <Label>Коротко о теме (English)</Label>
          <Body>{topic.summary}</Body>
        </Card>
      ) : null}
      <Card>
        <Label>Что от тебя хотят</Label>
        <Body>• Кому: {audience ? `${audience.icon} ${audience.name}` : topic.audience}.</Body>
        {audience && <Body>• Им важно: {audience.focus.toLowerCase()}.</Body>}
        <Body>• Сколько говорить: {formatRange(minSec, maxSec)}.</Body>
        {audience && <Body>• Жюри спросит: {audience.juryAsks.toLowerCase()}</Body>}
      </Card>
      {audience && (
        <Card>
          <Label>Как говорить с этой аудиторией</Label>
          <Body muted>{audience.who}</Body>
          {audience.tips.map((tip) => (
            <Body key={tip}>• {tip}</Body>
          ))}
        </Card>
      )}
      <Card>
        <Label>Почитать и посмотреть</Label>
        {sources.map((s) => (
          <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} accessibilityRole="link">
            <Text style={styles.link}>↗ {s.title}</Text>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 15, lineHeight: 22, color: colors.accent, textDecorationLine: 'underline' },
});
