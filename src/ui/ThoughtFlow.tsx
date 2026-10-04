import { memo, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FlowMoment } from '@/api/types';
import { c, font, formatTime } from '@/design/theme';
import type { Polled } from '@/hooks/useInsights';
import { translate, useT } from '@/i18n';

import type { PlayerMark } from './PitchPlayer';
import { Card, H3, Muted, P, Small } from './primitives';

/** Цвет момента: удачи зелёные, провалы красно-оранжевые — так же, как удачная пауза и ошибки речи. */
export const toneColor = (tone: FlowMoment['tone']) => (tone === 'good' ? c.markGood : c.markBad);

/** Название момента на текущем языке: «Hook», «Зацепка»; незнакомый вид — как пришёл. */
export function momentName(kind: FlowMoment['kind']): string {
  return translate('insights', `kind.${kind}`) || kind;
}

/** Моменты хода мысли на дорожку плеера: круглые отметки рядом с отметками речи. */
export function flowMarks(moments: FlowMoment[]): PlayerMark[] {
  return moments.map((m) => ({ t: m.t, color: toneColor(m.tone), label: `${momentName(m.kind)} ${translate('insights', 'quote', { text: m.quote })}`, dot: true }));
}

type Props = {
  state: Polled<unknown>['state'];
  summary: string | null;
  /** Моменты по времени. */
  moments: FlowMoment[];
  /** Какой момент звучит сейчас; -1 — никакой. */
  active: number;
  /** Включить запись с момента; нет — записи нет, моменты просто список. */
  onSeek?: (seconds: number) => void;
  wide: boolean;
};

/** Полоска-заглушка, пока ИИ читает питч: мягко мерцает, место под список уже занято. */
function Shimmer() {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 700, useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.skeleton, { opacity: pulse }]}>
      {[0.55, 0.85, 0.7].map((w, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonDot} />
          <View style={styles.grow}>
            <View style={[styles.skeletonBar, { width: '28%' }]} />
            <View style={[styles.skeletonBar, { width: `${w * 100}%` }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * Ход мысли: краткий вывод ИИ и моменты по порядку — где питч зацепил зал, а где потерял нить.
 * Нажатие на момент включает запись с этого места; момент, который звучит сейчас, подсвечен.
 */
export const ThoughtFlow = memo(function ThoughtFlow({ state, summary, moments, active, onSeek, wide }: Props) {
  const t = useT('insights');

  return (
    <Card flat style={[styles.card, wide && styles.cardWide]}>
      <H3>{t('flowTitle')}</H3>
      {state === 'waiting' ? (
        <View style={styles.reading} accessibilityLiveRegion="polite">
          <View style={styles.readingHead}>
            <ActivityIndicator color={c.ink} />
            <Text style={styles.readingText}>{t('flowReading')}</Text>
          </View>
          <Muted>{t('flowReadingNote')}</Muted>
          <Shimmer />
        </View>
      ) : state === 'none' ? (
        <Muted>{t('flowNone')}</Muted>
      ) : (
        <>
          {summary ? <P>{summary}</P> : null}
          {moments.length === 0 ? (
            <Muted>{t('flowEmpty')}</Muted>
          ) : (
            <View>
              {moments.map((m, i) => {
                const color = toneColor(m.tone);
                const name = momentName(m.kind);
                const time = formatTime(m.t);
                return (
                  <Pressable
                    key={`${m.t}-${i}`}
                    disabled={!onSeek}
                    onPress={onSeek ? () => onSeek(m.t) : undefined}
                    accessibilityRole={onSeek ? 'button' : undefined}
                    accessibilityLabel={`${name}, ${time}. ${m.quote} ${m.comment}`}
                    accessibilityHint={onSeek ? t('flowPlay', { time }) : undefined}
                    style={({ pressed }) => [styles.moment, i === active && styles.momentOn, pressed && styles.pressed]}>
                    {/* слева — нить: кружок момента и линия к следующему */}
                    <View style={styles.rail}>
                      <View style={[styles.dot, { backgroundColor: color }]}>
                        <Text style={styles.dotGlyph}>{m.tone === 'good' ? '✓' : '!'}</Text>
                      </View>
                      {i < moments.length - 1 ? <View style={styles.line} /> : null}
                    </View>
                    <View style={styles.body}>
                      <View style={styles.meta}>
                        <View style={[styles.badge, { backgroundColor: color }]}>
                          <Text style={styles.badgeText}>{name}</Text>
                        </View>
                        <Text style={styles.time}>{time}</Text>
                      </View>
                      {m.quote ? <Text style={styles.quote}>{t('quote', { text: m.quote })}</Text> : null}
                      {m.comment ? <Text style={styles.comment}>{m.comment}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          {onSeek && moments.length > 0 ? <Small>{t('flowTap')}</Small> : null}
        </>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 22, gap: 14 },
  cardWide: { padding: 30, borderRadius: 24 },
  grow: { flex: 1, gap: 8 },
  reading: { gap: 10 },
  readingHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readingText: { fontFamily: font.bold, fontSize: 17, lineHeight: 23, color: c.ink, flexShrink: 1 },
  skeleton: { gap: 16, paddingTop: 4 },
  skeletonRow: { flexDirection: 'row', gap: 12 },
  skeletonDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.markPause },
  skeletonBar: { height: 12, borderRadius: 6, backgroundColor: c.markPause },
  moment: { flexDirection: 'row', gap: 12, borderRadius: 14, paddingHorizontal: 8, paddingTop: 6, marginHorizontal: -8 },
  // момент, который звучит сейчас
  momentOn: { backgroundColor: c.cream },
  pressed: { opacity: 0.7 },
  rail: { width: 24, alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  dotGlyph: { fontFamily: font.bold, fontSize: 12, lineHeight: 15, color: c.ink },
  line: { flex: 1, width: 2.5, backgroundColor: c.ink, marginTop: 2, marginBottom: -6 },
  body: { flex: 1, gap: 4, paddingBottom: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: 999, borderWidth: 2, borderColor: c.ink, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: c.ink },
  time: { fontFamily: font.semi, fontSize: 13, color: c.graphite, fontVariant: ['tabular-nums'] },
  quote: { fontFamily: font.italic, fontSize: 16, lineHeight: 23, color: c.ink },
  comment: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: c.graphite },
});
