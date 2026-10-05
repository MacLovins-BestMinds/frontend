import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '@/api/types';
import { c, font, outline, shadow } from '@/design/theme';
import { translate, useT } from '@/i18n';

/** Уровень меняет весь раунд: тему, время на подготовку, строгость разбора, жюри и зала. Названия — в словаре common. */
export const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

/** Сколько минут на подготовку даёт уровень (как LEVEL_TIMING на сервере) — для подписи на кнопке «к подготовке». */
export const PREP_MIN: Record<Difficulty, number> = { easy: 5, medium: 4, hard: 3 };

const isLevel = (id: string): id is Difficulty => (LEVELS as string[]).includes(id);

/** Название уровня на текущем языке; вызывать при отрисовке экрана, который сам подписан на язык (useT). */
export const levelName = (id: string) => (isLevel(id) ? translate('common', `level.${id}`) : id);

type Props = { value: Difficulty; onChange: (level: Difficulty) => void; disabled?: boolean; compact?: boolean };

/** Выбор уровня сложности: три карточки (compact — только названия в одну строку). */
export function LevelPicker({ value, onChange, disabled, compact }: Props) {
  const t = useT('common');
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('difficulty')}>
      {LEVELS.map((level) => {
        const selected = level === value;
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            aria-checked={selected}
            disabled={disabled}
            onPress={() => onChange(level)}
            style={[styles.level, compact && styles.levelCompact, selected && styles.on, selected && shadow(3), disabled && !selected && styles.off]}>
            <Text style={styles.name}>{t(`level.${level}`)}</Text>
            {!compact && <Text style={styles.note}>{t(`level.${level}.note`)}</Text>}
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
