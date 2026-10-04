import { forwardRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { mediaUrl } from '@/api/client';
import type { BetterVersion as Better } from '@/api/types';
import { c, font, formatTime } from '@/design/theme';
import type { Polled } from '@/hooks/useInsights';
import { useT } from '@/i18n';

import { PitchPlayer, type PitchPlayerHandle } from './PitchPlayer';
import { Card, H3, Muted, P, Small } from './primitives';

const EXPECT_SEC = 40; // полоска ожидания подбирается к концу примерно за минуту и не упирается в него

/** Причину от сервера показываем, только если это фраза для человека, а не код ошибки или трассировка. */
function friendly(reason: string | null | undefined): string | null {
  const text = reason?.trim();
  if (!text || text.length > 160 || /error|exception|traceback|https?:|[{}[\]_<>]|\b\d{3}\b/i.test(text)) return null;
  return text;
}

/** Пока голос записывается: прошедшее время и полоска, которая честно не знает конца, но показывает движение. */
function Waiting() {
  const t = useT('insights');
  const [startedAt] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const progress = Math.min(0.92, 1 - Math.exp(-elapsed / EXPECT_SEC));
  return (
    <View style={styles.waiting} accessibilityLiveRegion="polite">
      <View style={styles.waitingHead}>
        <ActivityIndicator color={c.ink} />
        <Text style={styles.waitingText}>{t('betterPending')}</Text>
        <Text style={styles.elapsed}>{formatTime(elapsed)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Muted>{t('betterPendingNote')}</Muted>
    </View>
  );
}

type Props = {
  better: Polled<Better>;
  /** Озвучка заиграла — запись выступления стоит остановить. */
  onPlay?: () => void;
};

/**
 * «Твой питч без запинок»: тот же питч, озвученный голосом игрока, и чистый текст под спойлером.
 * Готовится на сервере в фоне — пока разбор читается, карточка показывает ожидание и ничему не мешает.
 * ref — плеер озвучки: разбор ставит его на паузу, когда включают запись выступления.
 */
export const BetterVersion = forwardRef<PitchPlayerHandle, Props>(function BetterVersion({ better, onPlay }, ref) {
  const t = useT('insights');
  const [open, setOpen] = useState(false);
  const wasPlaying = useRef(false);
  const ready = better.state === 'ready' ? better.data : null;
  const url = ready?.audio_url ? mediaUrl(ready.audio_url) : null;
  const text = ready?.text?.trim() ?? '';

  let body;
  if (better.state === 'waiting') body = <Waiting />;
  else if (!url && !text) body = <Muted>{friendly(better.data?.reason) ?? t('betterNone')}</Muted>;
  else
    body = (
      <>
        <Muted>{url ? t('betterReady') : t('betterTextOnly')}</Muted>
        {url ? (
          <PitchPlayer
            ref={ref}
            uri={url}
            fallbackDuration={0}
            marks={[]}
            onTime={(_time, playing) => {
              if (playing && !wasPlaying.current) onPlay?.();
              wasPlaying.current = playing;
            }}
          />
        ) : null}
        {text && url ? (
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {open ? t('betterHideText') : t('betterShowText')} {open ? '▴' : '▾'}
            </Text>
          </Pressable>
        ) : null}
        {text && (open || !url) ? <P style={styles.script}>{text}</P> : null}
      </>
    );

  return (
    <Card flat style={styles.card}>
      <H3>{t('betterTitle')}</H3>
      {body}
      {better.state === 'waiting' || url ? <Small>{t('betterPrivacy')}</Small> : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 22, gap: 12 },
  waiting: { gap: 10 },
  waitingHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitingText: { flex: 1, fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: c.ink },
  elapsed: { fontFamily: font.semi, fontSize: 14, color: c.graphite, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, borderWidth: 2, borderColor: c.ink, backgroundColor: c.paper, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.orange },
  toggle: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  toggleText: { fontFamily: font.bold, fontSize: 15, color: c.burnt, textDecorationLine: 'underline' },
  script: { fontSize: 16, lineHeight: 24, borderLeftWidth: 3, borderLeftColor: c.orange, paddingLeft: 12 },
});
