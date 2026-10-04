import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import type { Case } from '@/api/types';
import { findAudience, generalSources } from '@/content/audiences';
import { c, font, formatRange } from '@/design/theme';
import { useT } from '@/i18n';

import { Card, H3, Label, Muted, P } from './primitives';

/** Карточка темы, блок «Что от тебя хотят» и подсказки по аудитории с источниками. */
export function Brief({ topic, minSec, maxSec }: { topic: Case; minSec: number; maxSec: number }) {
  const t = useT('audiences');
  const audience = findAudience(topic.audience);
  // first the material on the topic itself, then how to talk to the audience and about speaking in general
  const sources = [...(topic.sources ?? []), ...(audience?.sources ?? []), ...generalSources()];
  return (
    <>
      <Card>
        <Label>{t('brief.topic')}</Label>
        <H3>{topic.title}</H3>
        <Muted>{topic.brief}</Muted>
      </Card>
      {topic.summary ? (
        <Card flat>
          <Label>{t('brief.plan')}</Label>
          <P>{topic.summary}</P>
        </Card>
      ) : null}
      <Card tone="accent">
        <Label style={{ color: c.ink }}>{t('brief.expected')}</Label>
        <P>{t('brief.audience', { audience: audience ? audience.name.toLowerCase() : topic.audience })}</P>
        {audience && <P>{t('brief.cares', { focus: audience.focus.toLowerCase() })}</P>}
        <P>{t('brief.length', { range: formatRange(minSec, maxSec) })}</P>
        {audience && <P>{t('brief.juryAsks', { asks: audience.juryAsks.toLowerCase() })}</P>}
      </Card>
      {audience && (
        <Card flat>
          <Label>{t('brief.howTo')}</Label>
          <Muted>{audience.who}</Muted>
          {audience.tips.map((tip) => (
            <P key={tip}>• {tip}</P>
          ))}
        </Card>
      )}
      <Card flat>
        <Label>{t('brief.read')}</Label>
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
