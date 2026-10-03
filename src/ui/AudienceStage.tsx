import { StyleSheet, Text, View } from 'react-native';

import { JUROR, colors } from './theme';

const SEATS = 12;

function face(attention: number, seat: number): string {
  // чем ниже внимание, тем больше зрителей отвлекается
  const bored = seat < Math.round(((70 - attention) / 70) * SEATS);
  if (attention >= 85) return seat % 3 === 0 ? '🤩' : '😀';
  if (!bored) return '🙂';
  return ['🥱', '😒', '📱'][seat % 3];
}

/**
 * Заглушка зала и стола жюри на эмодзи. Настоящие компоненты и ассеты делает универсал —
 * пропсы (attention 0–100) оставить такими же.
 */
export function AudienceStage({ attention }: { attention: number }) {
  return (
    <View style={styles.stage}>
      <View style={styles.audience}>
        {Array.from({ length: SEATS }, (_, i) => (
          <Text key={i} style={styles.face}>
            {face(attention, i)}
          </Text>
        ))}
      </View>
      <JuryTable />
      {/* яркость сцены равна вниманию */}
      <View style={[styles.dim, { opacity: Math.min(0.75, (100 - attention) / 100) }]} />
    </View>
  );
}

export function JuryTable({ speaking }: { speaking?: string }) {
  return (
    <View style={styles.jury}>
      {Object.entries(JUROR).map(([id, j]) => (
        <View key={id} style={[styles.juror, speaking === id && styles.speaking]}>
          <Text style={styles.jurorFace}>{j.face}</Text>
          <Text style={styles.jurorName}>{j.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card, padding: 16, gap: 16 },
  audience: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  face: { fontSize: 34, width: '15%', textAlign: 'center' },
  jury: { flexDirection: 'row', justifyContent: 'space-around' },
  juror: { alignItems: 'center', padding: 8, borderRadius: 14, minWidth: 84 },
  speaking: { backgroundColor: colors.cardLight },
  jurorFace: { fontSize: 44 },
  jurorName: { fontSize: 12, color: colors.muted },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000', pointerEvents: 'none' },
});
