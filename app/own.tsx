import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '@/api/client';
import type { AudienceId, RefineResponse } from '@/api/types';
import { useGame } from '@/store/game';
import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/ui/kit';
import { colors } from '@/ui/theme';

type AudienceItem = {
  id: AudienceId;
  name: string;
  icon: string;
  focus: string;
};

const AUDIENCES: AudienceItem[] = [
  {
    id: 'contest_jury',
    name: 'Жюри конкурса',
    icon: '🏆',
    focus: 'Новизна идеи, масштабируемость и реализуемость',
  },
  {
    id: 'business',
    name: 'Бизнесмены',
    icon: '💼',
    focus: 'Деньги, бизнес-модель, рынок и окупаемость',
  },
  {
    id: 'teachers',
    name: 'Преподаватели',
    icon: '🎓',
    focus: 'Обоснованность, логика, глубина и последствия',
  },
  {
    id: 'public',
    name: 'Широкая публика',
    icon: '👥',
    focus: 'Простота, эмоциональная польза для человека',
  },
];

export default function OwnPitch() {
  const user = useGame((s) => s.user);
  const startOwnPitch = useGame((s) => s.startOwnPitch);

  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState<AudienceId>('business');
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [refineResult, setRefineResult] = useState<RefineResponse | null>(null);
  const [refineMode, setRefineMode] = useState<'structure' | 'improve' | null>(null);
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [error, setError] = useState('');

  if (!user) return <Redirect href="/" />;

  const handleRefine = async (mode: 'structure' | 'improve') => {
    if (!text.trim()) {
      setError('Сначала напиши тезисы или текст питча');
      return;
    }
    setError('');
    setLoadingRefine(true);
    setRefineMode(mode);
    try {
      if (!originalText) {
        setOriginalText(text);
      }
      const res = await api.refine(text.trim(), audience, mode);
      setRefineResult(res);
    } catch (e) {
      setError(`Ошибка ИИ-помощника: ${(e as Error).message}`);
    } finally {
      setLoadingRefine(false);
    }
  };

  const applyRefinedText = () => {
    if (!refineResult?.text) return;
    setText(refineResult.text);
  };

  const revertToOriginal = () => {
    if (originalText) {
      setText(originalText);
    }
  };

  const handleStart = () => {
    if (!title.trim()) {
      setError('Укажи название идеи или тему питча');
      return;
    }
    if (!text.trim()) {
      setError('Добавь хотя бы пару предложений или тезисов своего питча');
      return;
    }

    startOwnPitch({
      title: title.trim(),
      text: text.trim(),
      audience,
    });

    router.push('/prep');
  };

  const selectedAudience = AUDIENCES.find((a) => a.id === audience) ?? AUDIENCES[1];

  return (
    <Screen>
      <Title>Свой питч</Title>
      <Body muted>
        Выступай со своей реальной идеей или проектом. Выбери аудиторию, напиши тезисы, а ИИ разложит их по
        блокам и усилит слабые места.
      </Body>

      <Card>
        <Label>1. Тема или название проекта</Label>
        <TextInput
          style={styles.input}
          placeholder="Например: Умная кофемашина с распознаванием лиц"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setError('');
          }}
          maxLength={120}
        />
      </Card>

      <Card>
        <Label>2. Для кого выступаешь</Label>
        <Body muted>Аудитория меняет стиль вопросов жюри и реакцию зала.</Body>
        <View style={styles.audienceGrid}>
          {AUDIENCES.map((item) => {
            const isSelected = item.id === audience;
            return (
              <Pressable
                key={item.id}
                onPress={() => setAudience(item.id)}
                style={[styles.audienceCard, isSelected && styles.audienceCardSelected]}
              >
                <View style={styles.audienceHeader}>
                  <Text style={styles.audienceIcon}>{item.icon}</Text>
                  <Text style={[styles.audienceTitle, isSelected && styles.audienceTitleSelected]}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.audienceFocus}>{item.focus}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Label>3. Текст питча или тезисы</Label>
        <Body muted>
          Напиши свой питч целиком или тезисно: в чём проблема, решение, почему ты и к чему призываешь.
        </Body>
        <TextInput
          style={styles.textArea}
          placeholder="Напиши текст выступления здесь..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError('');
          }}
          multiline
        />

        <View style={styles.refineButtons}>
          <Button
            title="Структурировать"
            variant="secondary"
            loading={loadingRefine && refineMode === 'structure'}
            disabled={!text.trim() || loadingRefine}
            onPress={() => handleRefine('structure')}
          />
          <Button
            title="Структурировать и улучшить"
            variant="secondary"
            loading={loadingRefine && refineMode === 'improve'}
            disabled={!text.trim() || loadingRefine}
            onPress={() => handleRefine('improve')}
          />
        </View>
      </Card>

      {refineResult && (
        <Card style={styles.refineCard}>
          <Label>Разбор и рекомендации ИИ</Label>
          {refineResult.notes.map((note, idx) => (
            <View key={idx} style={styles.noteRow}>
              <Text style={styles.noteBullet}>💡</Text>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}

          {refineResult.blocks && refineResult.blocks.length > 0 && (
            <View style={styles.blocksContainer}>
              <Label>Структура выступления (5 блоков)</Label>
              {refineResult.blocks.map((block, idx) => (
                <View key={idx} style={styles.blockItem}>
                  <Text style={styles.blockTitle}>{block.title}</Text>
                  <Text style={styles.blockContent}>
                    {block.text ? block.text : '⚠️ В твоём тексте не хватает этого блока'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.diffActions}>
            <Button title="Применить улучшенный вариант" onPress={applyRefinedText} />
            {originalText !== '' && originalText !== text && (
              <Button title="Вернуть исходный текст" variant="secondary" onPress={revertToOriginal} />
            )}
          </View>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>

      <Button
        title={`К подготовке (аудитория: ${selectedAudience.name})`}
        disabled={!title.trim() || !text.trim()}
        onPress={handleStart}
      />

      <Button title="В меню" variant="secondary" onPress={() => router.replace('/menu')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.cardLight,
  },
  audienceGrid: {
    gap: 10,
    marginTop: 4,
  },
  audienceCard: {
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  audienceCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#38314E',
  },
  audienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audienceIcon: {
    fontSize: 20,
  },
  audienceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  audienceTitleSelected: {
    color: colors.accent,
  },
  audienceFocus: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    paddingLeft: 28,
  },
  textArea: {
    minHeight: 140,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    backgroundColor: colors.cardLight,
    textAlignVertical: 'top',
  },
  refineButtons: {
    gap: 10,
    marginTop: 8,
  },
  refineCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 2,
  },
  noteBullet: {
    fontSize: 14,
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    flex: 1,
  },
  blocksContainer: {
    marginTop: 12,
    gap: 8,
  },
  blockItem: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  blockContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  diffActions: {
    marginTop: 12,
    gap: 10,
  },
});
