// Координаты сцены в пикселях исходных картинок. Сгенерировано из макета сцены, руками не править.

export const SCENE = {
  "sprite": {
    "w": 416,
    "h": 580,
    "ax": 208,
    "ay": 567
  },
  "jury": {
    "w": 1536,
    "h": 478,
    "tableY": 333,
    "cuts": [
      0,
      546,
      965,
      1536
    ],
    "names": [
      "strict",
      "kind",
      "skeptic"
    ]
  },
  "landscape": {
    "w": 1920,
    "h": 1080,
    "front": [
      {
        "character": "beret_flower_dress",
        "x": 285,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "headphones_girl",
        "x": 435,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "beret_flower_coat",
        "x": 585,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "beanie_floral_jacket",
        "x": 735,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "bucket_hat",
        "x": 885,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "beanie_orange_sweater",
        "x": 1035,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "messy_hair_stripes",
        "x": 1185,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "glasses_argyle",
        "x": 1335,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "bun_hoodie",
        "x": 1485,
        "baseline": 745,
        "scale": 0.74
      },
      {
        "character": "sailor_girl",
        "x": 1635,
        "baseline": 745,
        "scale": 0.74
      }
    ],
    "jury": {
      "scale": 0.85,
      "tableTopY": 975
    }
  },
  "portrait": {
    "w": 1080,
    "h": 2338,
    "front": [
      {
        "character": "beret_flower_dress",
        "x": 262,
        "baseline": 1740,
        "scale": 0.66
      },
      {
        "character": "headphones_girl",
        "x": 422,
        "baseline": 1740,
        "scale": 0.66
      },
      {
        "character": "beret_flower_coat",
        "x": 582,
        "baseline": 1740,
        "scale": 0.66
      },
      {
        "character": "beanie_floral_jacket",
        "x": 742,
        "baseline": 1740,
        "scale": 0.66
      },
      {
        "character": "bucket_hat",
        "x": 902,
        "baseline": 1740,
        "scale": 0.66
      },
      {
        "character": "beanie_orange_sweater",
        "x": 178,
        "baseline": 1900,
        "scale": 0.76
      },
      {
        "character": "messy_hair_stripes",
        "x": 338,
        "baseline": 1900,
        "scale": 0.76
      },
      {
        "character": "glasses_argyle",
        "x": 498,
        "baseline": 1900,
        "scale": 0.76
      },
      {
        "character": "bun_hoodie",
        "x": 658,
        "baseline": 1900,
        "scale": 0.76
      },
      {
        "character": "sailor_girl",
        "x": 818,
        "baseline": 1900,
        "scale": 0.76
      }
    ],
    "jury": {
      "scale": 0.7,
      "tableTopY": 2236
    }
  }
} as const;

export type Orientation = 'landscape' | 'portrait';
