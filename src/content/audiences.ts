import type { AudienceId } from '@/api/types';

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

/** General material on pitching and speaking — for any audience. */
export const GENERAL_SOURCES: Source[] = [
  {
    title: "Chris Anderson: TED's secret to great public speaking (TED, 8 min)",
    url: 'https://www.ted.com/talks/chris_anderson_ted_s_secret_to_great_public_speaking',
  },
  {
    title: 'Julian Treasure: How to speak so that people want to listen (TED, 10 min)',
    url: 'https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen',
  },
];

export const AUDIENCES: Audience[] = [
  {
    id: 'contest_jury',
    name: 'Contest jury',
    focus: 'Novelty of the idea, scalability and feasibility',
    who: 'Experts who hear dozens of projects in a day and compare them with each other.',
    juryAsks: 'What is new about the idea, whether it can be built, and why you.',
    tips: [
      'In the first 15 seconds, say how you differ from what already exists.',
      'Show that the idea is feasible: the first step, the timeline, what is already done.',
      'End with one line the jury will remember after the tenth pitch.',
    ],
    sources: [
      { title: 'Guy Kawasaki: the 10/20/30 rule of pitching', url: 'https://guykawasaki.com/the_102030_rule/' },
      { title: 'Nancy Duarte, “Resonate”: how to build the story of a talk', url: 'https://www.duarte.com/resources/books/resonate/' },
    ],
  },
  {
    id: 'business',
    name: 'Business people',
    focus: 'Money, business model, market and payback',
    who: 'Entrepreneurs and investors: they think about risk and about when the money comes back.',
    juryAsks: 'Who pays, how much it costs, how big the market is and when it pays off.',
    tips: [
      'Name the customer who pays and the amount — without numbers, business people will not hear the idea.',
      'Explain in one sentence how you make money.',
      'Give proof of demand: a pilot, pre-orders, customer interviews.',
    ],
    sources: [
      { title: 'Y Combinator: how to pitch your company (Michael Seibel)', url: 'https://www.ycombinator.com/library/4b-how-to-pitch-your-company' },
      { title: 'Guy Kawasaki: the 10/20/30 rule of pitching', url: 'https://guykawasaki.com/the_102030_rule/' },
    ],
  },
  {
    id: 'teachers',
    name: 'Teachers',
    focus: 'Sound reasoning, logic, depth and consequences',
    who: 'School and university teachers: they value logic, evidence and care for students.',
    juryAsks: 'What the idea is based on, what happens to students and what the risks are.',
    tips: [
      'Rely on facts and examples rather than big promises.',
      'Show that you have thought about consequences and risks for students.',
      'Explain step by step: problem → cause → solution → result.',
    ],
    sources: [
      { title: 'Chip and Dan Heath, “Made to Stick”: how to make an idea clear and memorable', url: 'https://heathbrothers.com/books/made-to-stick/' },
    ],
  },
  {
    id: 'public',
    name: 'General public',
    focus: 'Simplicity and emotional benefit for a person',
    who: 'Ordinary people with no special knowledge: they care about what changes in their life.',
    juryAsks: 'Why I personally need this, whether it is easy to use and how much it costs.',
    tips: [
      'Start with a story or situation everyone will recognise.',
      'No jargon — explain it the way you would to a friend.',
      'Show the benefit with one vivid example.',
    ],
    sources: [
      { title: 'Chip and Dan Heath, “Made to Stick”: how to make an idea clear and memorable', url: 'https://heathbrothers.com/books/made-to-stick/' },
    ],
  },
];

/** Audience by id (`business`) or by the name the backend sends (`business people`). */
export function findAudience(value: string): Audience | undefined {
  const v = value.trim().toLowerCase();
  return AUDIENCES.find((a) => a.id === v || a.name.toLowerCase() === v);
}
