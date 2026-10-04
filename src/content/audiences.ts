import type { AudienceId } from '@/api/types';
import { LANGS, translate, translateIn } from '@/i18n';

export type Source = { title: string; url: string };

export type Audience = {
  id: AudienceId;
  name: string;
  /** What matters to this audience — short, for the choice cards. */
  focus: string;
  /** Who is in the room. */
  who: string;
  /** What the jury will ask about (the backend builds its questions the same way). */
  juryAsks: string;
  /** How to talk to this audience. */
  tips: string[];
  sources: Source[];
};

// Тексты аудиторий и подписи ссылок — в словаре audiences (src/i18n/strings/audiences.ts); здесь только адреса.
type SourceId = 'anderson' | 'treasure' | 'kawasaki' | 'duarte' | 'yc' | 'heath';

const URLS: Record<SourceId, string> = {
  anderson: 'https://www.ted.com/talks/chris_anderson_ted_s_secret_to_great_public_speaking',
  treasure: 'https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen',
  kawasaki: 'https://guykawasaki.com/the_102030_rule/',
  duarte: 'https://www.duarte.com/resources/books/resonate/',
  yc: 'https://www.ycombinator.com/library/4b-how-to-pitch-your-company',
  heath: 'https://heathbrothers.com/books/made-to-stick/',
};

const IDS: AudienceId[] = ['contest_jury', 'business', 'teachers', 'public'];

const SOURCES: Record<AudienceId, SourceId[]> = {
  contest_jury: ['kawasaki', 'duarte'],
  business: ['yc', 'kawasaki'],
  teachers: ['heath'],
  public: ['heath'],
};

const source = (id: SourceId): Source => ({ title: translate('audiences', `src.${id}`), url: URLS[id] });

/** General material on pitching and speaking — for any audience. На текущем языке. */
export function generalSources(): Source[] {
  return [source('anderson'), source('treasure')];
}

/** Аудитория на текущем языке. Вызывать при отрисовке: экран перерисуется вместе с useT при смене языка. */
export function audience(id: AudienceId): Audience {
  return {
    id,
    name: translate('audiences', `${id}.name`),
    focus: translate('audiences', `${id}.focus`),
    who: translate('audiences', `${id}.who`),
    juryAsks: translate('audiences', `${id}.juryAsks`),
    tips: [translate('audiences', `${id}.tip1`), translate('audiences', `${id}.tip2`), translate('audiences', `${id}.tip3`)],
    sources: SOURCES[id].map(source),
  };
}

/** Все аудитории на текущем языке. */
export function audiences(): Audience[] {
  return IDS.map(audience);
}

/** Audience by id (`business`) or by the name the backend sends (`business people`) — на любом из языков. */
export function findAudience(value: string): Audience | undefined {
  const v = value.trim().toLowerCase();
  const id = IDS.find((a) => a === v || LANGS.some((l) => translateIn(l.id, 'audiences', `${a}.name`).toLowerCase() === v));
  return id ? audience(id) : undefined;
}
