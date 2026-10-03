import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import type { Case } from '@/api/types';
import { GENERAL_SOURCES, findAudience } from '@/content/audiences';
import { c, font } from '@/design/theme';

import { Card, H3, Label, Muted, P } from './primitives';

function formatRange(minSec: number, maxSec: number): string {
  if (maxSec < 60) return `${minSec}–${maxSec} seconds`;
  return `${Math.round(minSec / 60)}–${Math.round(maxSec / 60)} minutes`;
}

/** Карточка темы, блок «Что от тебя хотят» и подсказки по аудитории с источниками. */
export function Brief({ topic, minSec, maxSec }: { topic: Case; minSec: number; maxSec: number }) {
  const audience = findAudience(topic.audience);
  // first the material on the topic itself, then how to talk to the audience and about speaking in general
  const sources = [...(topic.sources ?? []), ...(audience?.sources ?? []), ...GENERAL_SOURCES];
  return (
    <>
      <Card>
        <Label>Topic</Label>
        <H3>{topic.title}</H3>
        <Muted>{topic.brief}</Muted>
      </Card>
      {topic.summary ? (
        <Card flat>
          <Label>An easy plan</Label>
          <P>{topic.summary}</P>
        </Card>
      ) : null}
      <Card tone="accent">
        <Label style={{ color: c.ink }}>What is expected of you</Label>
        <P>• Audience: {audience ? audience.name.toLowerCase() : topic.audience}.</P>
        {audience && <P>• They care about: {audience.focus.toLowerCase()}.</P>}
        <P>• How long to speak: {formatRange(minSec, maxSec)}.</P>
        {audience && <P>• The jury will ask: {audience.juryAsks.toLowerCase()}</P>}
      </Card>
      {audience && (
        <Card flat>
          <Label>How to talk to this audience</Label>
          <Muted>{audience.who}</Muted>
          {audience.tips.map((tip) => (
            <P key={tip}>• {tip}</P>
          ))}
        </Card>
      )}
      <Card flat>
        <Label>Read and watch</Label>
        {sources.map((s) => (
          <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} accessibilityRole="link" style={styles.linkRow}>
            <Text style={styles.link}>↗ {s.title}</Text>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  linkRow: { minHeight: 32, justifyContent: 'center' },
  link: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: c.burnt, textDecorationLine: 'underline' },
});
