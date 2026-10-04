import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '@/api/types';
import { c, font, outline, shadow } from '@/design/theme';

/** Уровень меняет весь раунд: тему, время на подготовку, строгость разбора, жюри и зала. */
export const LEVELS: { id: Difficulty; name: string; note: string }[] = [
  { id: 'easy', name: 'Easy', note: 'Everyday topics, 5 minutes to prepare, a forgiving room and jury.' },
  { id: 'medium', name: 'Medium', note: 'Topics you have to argue, 4 minutes to prepare, the jury asks why.' },
  { id: 'hard', name: 'Hard', note: 'Big ideas, 3 minutes to prepare, a strict jury and a cold room.' },
];

export const levelName = (id: string) => LEVELS.find((l) => l.id === id)?.name ?? id;

type Props = { value: Difficulty; onChange: (level: Difficulty) => void; disabled?: boolean; compact?: boolean };

/** Выбор уровня сложности: три карточки (compact — только названия в одну строку). */
export function LevelPicker({ value, onChange, disabled, compact }: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Difficulty">
      {LEVELS.map((level) => {
        const selected = level.id === value;
        return (
          <Pressable
            key={level.id}
            accessibilityRole="radio"
            aria-checked={selected}
            disabled={disabled}
            onPress={() => onChange(level.id)}
            style={[styles.level, compact && styles.levelCompact, selected && styles.on, selected && shadow(3), disabled && !selected && styles.off]}>
            <Text style={styles.name}>{level.name}</Text>
            {!compact && <Text style={styles.note}>{level.note}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  level: { flexGrow: 1, flexBasis: 170, backgroundColor: c.paper, borderRadius: 16, padding: 12, gap: 2, ...outline },
  levelCompact: { flexBasis: 80, alignItems: 'center', paddingVertical: 9, minHeight: 44, justifyContent: 'center' },
  on: { backgroundColor: c.orange },
  off: { opacity: 0.5 },
  name: { fontFamily: font.bold, fontSize: 16, color: c.ink },
  note: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: c.ink },
});
