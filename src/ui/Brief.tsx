import type { Case } from '@/api/types';

import { Body, Card, Label } from './kit';

/** Карточка темы с блоком «Что от тебя хотят». */
export function Brief({ topic, minSec, maxSec }: { topic: Case; minSec: number; maxSec: number }) {
  return (
    <>
      <Card>
        <Label>Тема</Label>
        <Body>{topic.title}</Body>
        <Body muted>{topic.brief}</Body>
      </Card>
      <Card>
        <Label>Что от тебя хотят</Label>
        <Body>• Питч идеи продукта: зачем он нужен и кому.</Body>
        <Body>• Кому питчим: {topic.audience}.</Body>
        <Body>
          • Сколько: {Math.round(minSec / 60)}–{Math.round(maxSec / 60)} минуты.
        </Body>
        <Body>• Жюри проверит слабые места идеи и то, что ты реально скажешь.</Body>
      </Card>
    </>
  );
}
