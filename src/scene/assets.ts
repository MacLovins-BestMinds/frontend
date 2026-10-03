// Картинки сцены. Сгенерировано, руками не править.
/* eslint-disable @typescript-eslint/no-require-imports */

export type CharacterAnim = {
  kind: 'phone' | 'sleep' | 'whistle' | null;
  idle: number;
  surprised: number;
  /** кадры «достаёт телефон», играются один раз */
  intro: number[];
  loop: number[];
  /** сколько тактов держать каждый кадр цикла */
  hold: number;
};

export const CHARACTERS: Record<string, CharacterAnim> = {
  beanie_floral_jacket: {
    kind: "phone",
    idle: require('../../assets/characters/beanie_floral_jacket/idle.webp'),
    surprised: require('../../assets/characters/beanie_floral_jacket/surprised.webp'),
    intro: [require('../../assets/characters/beanie_floral_jacket/intro_1.webp'), require('../../assets/characters/beanie_floral_jacket/intro_2.webp')],
    loop: [require('../../assets/characters/beanie_floral_jacket/loop_1.webp'), require('../../assets/characters/beanie_floral_jacket/loop_2.webp'), require('../../assets/characters/beanie_floral_jacket/loop_3.webp')],
    hold: 1,
  },
  beret_flower_dress: {
    kind: "phone",
    idle: require('../../assets/characters/beret_flower_dress/idle.webp'),
    surprised: require('../../assets/characters/beret_flower_dress/surprised.webp'),
    intro: [require('../../assets/characters/beret_flower_dress/intro_1.webp'), require('../../assets/characters/beret_flower_dress/intro_2.webp')],
    loop: [require('../../assets/characters/beret_flower_dress/loop_1.webp'), require('../../assets/characters/beret_flower_dress/loop_2.webp'), require('../../assets/characters/beret_flower_dress/loop_3.webp')],
    hold: 1,
  },
  glasses_argyle: {
    kind: "phone",
    idle: require('../../assets/characters/glasses_argyle/idle.webp'),
    surprised: require('../../assets/characters/glasses_argyle/surprised.webp'),
    intro: [require('../../assets/characters/glasses_argyle/intro_1.webp'), require('../../assets/characters/glasses_argyle/intro_2.webp')],
    loop: [require('../../assets/characters/glasses_argyle/loop_1.webp'), require('../../assets/characters/glasses_argyle/loop_2.webp'), require('../../assets/characters/glasses_argyle/loop_3.webp')],
    hold: 1,
  },
  sailor_girl: {
    kind: "sleep",
    idle: require('../../assets/characters/sailor_girl/idle.webp'),
    surprised: require('../../assets/characters/sailor_girl/surprised.webp'),
    intro: [],
    loop: [require('../../assets/characters/sailor_girl/loop_1.webp'), require('../../assets/characters/sailor_girl/loop_2.webp'), require('../../assets/characters/sailor_girl/loop_3.webp')],
    hold: 1,
  },
  beanie_orange_sweater: {
    kind: "sleep",
    idle: require('../../assets/characters/beanie_orange_sweater/idle.webp'),
    surprised: require('../../assets/characters/beanie_orange_sweater/surprised.webp'),
    intro: [],
    loop: [require('../../assets/characters/beanie_orange_sweater/loop_1.webp'), require('../../assets/characters/beanie_orange_sweater/loop_2.webp'), require('../../assets/characters/beanie_orange_sweater/loop_3.webp')],
    hold: 1,
  },
  headphones_girl: {
    kind: "sleep",
    idle: require('../../assets/characters/headphones_girl/idle.webp'),
    surprised: require('../../assets/characters/headphones_girl/surprised.webp'),
    intro: [],
    loop: [require('../../assets/characters/headphones_girl/loop_1.webp'), require('../../assets/characters/headphones_girl/loop_2.webp'), require('../../assets/characters/headphones_girl/loop_3.webp')],
    hold: 1,
  },
  beret_flower_coat: {
    kind: null,
    idle: require('../../assets/characters/beret_flower_coat/idle.webp'),
    surprised: require('../../assets/characters/beret_flower_coat/surprised.webp'),
    intro: [],
    loop: [],
    hold: 1,
  },
  messy_hair_stripes: {
    kind: "whistle",
    idle: require('../../assets/characters/messy_hair_stripes/idle.webp'),
    surprised: require('../../assets/characters/messy_hair_stripes/surprised.webp'),
    intro: [],
    loop: [require('../../assets/characters/messy_hair_stripes/loop_1.webp'), require('../../assets/characters/messy_hair_stripes/loop_2.webp')],
    hold: 3,
  },
  bun_hoodie: {
    kind: "whistle",
    idle: require('../../assets/characters/bun_hoodie/idle.webp'),
    surprised: require('../../assets/characters/bun_hoodie/surprised.webp'),
    intro: [],
    loop: [require('../../assets/characters/bun_hoodie/loop_1.webp'), require('../../assets/characters/bun_hoodie/loop_2.webp')],
    hold: 3,
  },
  bucket_hat: {
    kind: "whistle",
    idle: require('../../assets/characters/bucket_hat/idle.webp'),
    surprised: require('../../assets/characters/bucket_hat/surprised.webp'),
    intro: [],
    loop: [require('../../assets/characters/bucket_hat/loop_1.webp'), require('../../assets/characters/bucket_hat/loop_2.webp')],
    hold: 3,
  },
};

export const LAYERS = {
  landscape: {
    background: require('../../assets/scene/landscape/background.webp'),
    crowd: require('../../assets/scene/landscape/crowd.webp'),
    curtains: require('../../assets/scene/landscape/curtains.webp'),
  },
  portrait: {
    background: require('../../assets/scene/portrait/background.webp'),
    crowd: require('../../assets/scene/portrait/crowd.webp'),
    curtains: require('../../assets/scene/portrait/curtains.webp'),
  },
} as const;

export const JURY = {
  strict: { idle: require('../../assets/jury/strict_idle.webp'), writing: require('../../assets/jury/strict_writing.webp') },
  kind: { idle: require('../../assets/jury/kind_idle.webp'), writing: require('../../assets/jury/kind_writing.webp') },
  skeptic: { idle: require('../../assets/jury/skeptic_idle.webp'), writing: require('../../assets/jury/skeptic_writing.webp') },
} as const;

export const ART = {
  hero: require('../../assets/scene/hero.jpg'),
  row: require('../../assets/scene/row.webp'),
} as const;
