/*
 * ЯДРО: квинтовый круг, ключевые знаки и модуляции.
 *
 * CIRCLE — 12 узлов по часовой стрелке. В каждом узле:
 *   major/minor — названия тональностей,
 *   count/kind  — количество ключевых знаков и их вид (# или b),
 *   signatures  — сами знаки по порядку появления.
 */
export const CIRCLE = [
  { major: "C", minor: "Am", count: 0, kind: "", index: 0 },
  { major: "G", minor: "Em", count: 1, kind: "#", index: 1 },
  { major: "D", minor: "Bm", count: 2, kind: "#", index: 2 },
  { major: "A", minor: "F#m", count: 3, kind: "#", index: 3 },
  { major: "E", minor: "C#m", count: 4, kind: "#", index: 4 },
  { major: "B", minor: "G#m", count: 5, kind: "#", index: 5 },
  { major: "F#", minor: "D#m", count: 6, kind: "#", index: 6 },
  { major: "Db", minor: "Bbm", count: 5, kind: "b", index: 7 },
  { major: "Ab", minor: "Fm", count: 4, kind: "b", index: 8 },
  { major: "Eb", minor: "Cm", count: 3, kind: "b", index: 9 },
  { major: "Bb", minor: "Gm", count: 2, kind: "b", index: 10 },
  { major: "F", minor: "Dm", count: 1, kind: "b", index: 11 },
];

// Три энгармонические записи для 15 мажорных тональностей.
export const ENHARMONIC_KEYS = [
  { major: "Cb", minor: "Abm", count: 7, kind: "b", index: 5 },
  { major: "Gb", minor: "Ebm", count: 6, kind: "b", index: 6 },
  { major: "C#", minor: "A#m", count: 7, kind: "#", index: 7 },
];

// Порядок появления знаков: фа-до-соль-ре-ля-ми-си (диезы),
// си-ми-ля-ре-соль-до-фа (бемоли).
export const KEY_ORDER = {
  "#": ["F", "C", "G", "D", "A", "E", "B"],
  b: ["B", "E", "A", "D", "G", "C", "F"],
};

export function keySignText(key) {
  if (!key.count) return "без знаков";
  return `${key.count} ${key.kind === "#" ? "диез" : "бемоль"}${key.count > 1 ? key.count === 2 || key.count === 3 || key.count === 4 ? "а" : "ов" : ""}`;
}

/** Список ключевых знаков для подсказки. */
export function keySignList(key) {
  if (!key.count) return [];
  return KEY_ORDER[key.kind].slice(0, key.count);
}

/** Соседи по кругу — тональности на 1 шаг в обе стороны. */
export function circleNeighbours(index) {
  const left = CIRCLE[(index + 11) % 12];
  const right = CIRCLE[(index + 1) % 12];
  return { left, right };
}

/**
 * Аккорды тональности с функциями: I ii iii IV V vi vii°.
 * Возвращает [{ roman, name, fn, type }] — без построения полных объектов,
 * чтобы модуль оставался лёгким (полные аккорды строит ui/sections/harmony).
 */
export const DEGREE_INFO = [
  { roman: "I", degree: 0, quality: "мажор", fn: "T", note: "тоника — дом" },
  { roman: "ii", degree: 1, quality: "минор", fn: "S", note: "субдоминанта, часто с секстой" },
  { roman: "iii", degree: 2, quality: "минор", fn: "T", note: "слабая тоника" },
  { roman: "IV", degree: 3, quality: "мажор", fn: "S", note: "движение прочь от дома" },
  { roman: "V", degree: 4, quality: "мажор", fn: "D", note: "доминанта, тянет в I" },
  { roman: "vi", degree: 5, quality: "минор", fn: "T", note: "параллельный минор" },
  { roman: "vii°", degree: 6, quality: "уменьшённый", fn: "D", note: "вводный, самый острый" },
];

/**
 * Модуляции: как перейти из текущей тональности.
 * Возвращает массив { target, how, chord, explanation }.
 */
export function modulations(index) {
  const current = CIRCLE[index];
  const { left, right } = circleNeighbours(index);
  const relative = current.minor;
  return [
    {
      target: right.major,
      how: "вверх по кругу (на квинту)",
      chord: "V → I новой тональности",
      explanation: `${current.major} → ${right.major}: сыграй ${current.major}7 или D-аккорд новой тональности как «мостик». Общий аккорд — ${relative.replace("m", "")}m7 (ii новой тональности).`,
    },
    {
      target: left.major,
      how: "вниз по кругу (на кварту)",
      chord: "IV → I новой тональности",
      explanation: `${current.major} → ${left.major}: новый аккорд IV старой тональности уже намекает на новую.`,
    },
    {
      target: relative,
      how: "параллельный минор",
      chord: "i вместо I",
      explanation: `Замени ${current.major} на ${relative}, остальные аккорды могут остаться: смена центра без смены знаков.`,
    },
  ];
}

/** Ключевые знаки в виде строки: «F♯ C♯». */
export function prettySigns(key) {
  return keySignList(key).join(" · ");
}
