/*
 * data/progressions.js — квинтовый круг, диатонические аккорды тональности, пути модуляции,
 * расширенные гармонические прогрессии (мажорные, минорные, джазовые, 12-тактовый блюз)
 * и ритмические модели для модуля «Ритм и грув».
 */

import { plural, prettyNote, spellInterval } from "./notes.js";
import { getTriad, getSeventh, makeChord } from "./chords.js";
import { getScale, scaleNames } from "./scales.js";

export const ROMANS_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
export const ROMANS_MINOR = ["i", "ii°", "♭III", "iv", "v", "♭VI", "♭VII"];
export const FUNCTIONS = ["T", "S", "T", "S", "D", "T", "D"];

export const FUNCTION_LABELS = {
  T: "Тоника (дом, опора)",
  S: "Субдоминанта (уход, расширение)",
  D: "Доминанта (напряжение, тяга к T)",
};

export const CIRCLE = [
  { major: "C", minor: "Am", count: 0, kind: "" },
  { major: "G", minor: "Em", count: 1, kind: "#" },
  { major: "D", minor: "Bm", count: 2, kind: "#" },
  { major: "A", minor: "F#m", count: 3, kind: "#" },
  { major: "E", minor: "C#m", count: 4, kind: "#" },
  { major: "B", minor: "G#m", count: 5, kind: "#" },
  { major: "F#", minor: "D#m", count: 6, kind: "#" },
  { major: "Db", minor: "Bbm", count: 5, kind: "b" },
  { major: "Ab", minor: "Fm", count: 4, kind: "b" },
  { major: "Eb", minor: "Cm", count: 3, kind: "b" },
  { major: "Bb", minor: "Gm", count: 2, kind: "b" },
  { major: "F", minor: "Dm", count: 1, kind: "b" },
];

export const ENHARMONIC_KEYS = [
  { major: "Cb", minor: "Abm", count: 7, kind: "b", circleIndex: 5 },
  { major: "Gb", minor: "Ebm", count: 6, kind: "b", circleIndex: 6 },
  { major: "C#", minor: "A#m", count: 7, kind: "#", circleIndex: 7 },
];

export const KEY_ORDER = {
  "#": ["F#", "C#", "G#", "D#", "A#", "E#", "B#"],
  b: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"],
};

export function keyCountText(key) {
  if (!key.count) return "0 знаков";
  const sign =
    key.kind === "#"
      ? plural(key.count, ["диез", "диеза", "диезов"])
      : plural(key.count, ["бемоль", "бемоля", "бемолей"]);
  return `${key.count} ${sign}`;
}

export function keySignText(key) {
  if (!key.count) return "Нет знаков (только натуральные ноты)";
  return KEY_ORDER[key.kind].slice(0, key.count).map(prettyNote).join(" · ");
}

// Диатонические трезвучия мажорной или натуральной минорной тональности (I–vii° / i–♭VII).
export function chordOfDegree(root, degree, mode = "major") {
  if (mode === "minor") {
    const minorScale = getScale("naturalMinor");
    const name = scaleNames(root, minorScale)[degree];
    const triadId = [
      "minor",
      "dim",
      "major",
      "minor",
      "minor",
      "major",
      "major",
    ][degree];
    const fn = ["T", "S", "T", "S", "D", "S", "D"][degree];
    return {
      ...makeChord(name, getTriad(triadId)),
      degree,
      roman: ROMANS_MINOR[degree],
      fn,
    };
  }
  const majorScale = getScale("major");
  const name = scaleNames(root, majorScale)[degree];
  const triadId = ["major", "minor", "minor", "major", "major", "minor", "dim"][
    degree
  ];
  return {
    ...makeChord(name, getTriad(triadId)),
    degree,
    roman: ROMANS_MAJOR[degree],
    fn: FUNCTIONS[degree],
  };
}

export function diatonicChordsOfKey(tonic, mode = "major") {
  return Array.from({ length: 7 }, (_, i) => chordOfDegree(tonic, i, mode));
}

// Переходы для плавной модуляции в родственные тональности (1-я степень родства по Способину).
export function getModulationPaths(circleIndex, currentKeyObj = null) {
  const cur = currentKeyObj || CIRCLE[circleIndex];
  const cw = CIRCLE[(circleIndex + 1) % 12]; // Квинта вверх (доминанта)
  const ccw = CIRCLE[(circleIndex + 11) % 12]; // Квинта вниз (субдоминанта)
  const curMinorRoot = cur.minor.slice(0, -1);
  const domOfRelMinor = spellInterval(curMinorRoot, 7, 4);
  const domOfCw = spellInterval(cw.major, 7, 4);
  const domOfCcw = spellInterval(ccw.major, 7, 4);

  return [
    {
      relation: "Параллельный минор (0 новых знаков)",
      target: `${prettyNote(curMinorRoot)}m`,
      pivotHint: `Общий аккорд: ${prettyNote(cur.major)} или Dm/ii → доминанта ${prettyNote(domOfRelMinor)}7 → ${prettyNote(curMinorRoot)}m`,
    },
    {
      relation: "В тональность доминанты (+1 шаг по часовой)",
      target: `${prettyNote(cw.major)} мажор / ${prettyNote(cw.minor.slice(0, -1))}m`,
      pivotHint: `Введи побочную доминанту ${prettyNote(domOfCw)}7 → разрешение в новую тонику ${prettyNote(cw.major)}`,
    },
    {
      relation: "В тональность субдоминанты (−1 шаг против часовой)",
      target: `${prettyNote(ccw.major)} мажор / ${prettyNote(ccw.minor.slice(0, -1))}m`,
      pivotHint: `Сделай текущую тонику доминантсептаккордом ${prettyNote(domOfCcw)}7 → шаг в ${prettyNote(ccw.major)}`,
    },
  ];
}

/*
 * Расширенный каталог прогрессий.
 * Каждая ступень описана объектом { interval: [semitones, steps], kind: 'major'|'minor'|'dim'|'dom7'|'m7'|'maj7', roman, fn }.
 */
export const PROGRESSIONS = [
  {
    id: "1451",
    name: "I – IV – V – I (классический каданс)",
    mode: "major",
    steps: [
      { semi: 0, letStep: 0, kind: "major", roman: "I", fn: "T" },
      { semi: 5, letStep: 3, kind: "major", roman: "IV", fn: "S" },
      { semi: 7, letStep: 4, kind: "major", roman: "V", fn: "D" },
      { semi: 0, letStep: 0, kind: "major", roman: "I", fn: "T" },
    ],
    melodicMoves:
      "Веди мелодию по ближайшим аккордовым тонам: 3-я ступень (E в C) → 4-я (F над F) → 2-я или 7-я (D/B над G) → возврат в 1-ю или 3-ю (C/E).",
    description:
      "Фундамент тональной музыки: дом (T) → движение (S) → напряжение (D) → разрешение домой (T).",
  },
  {
    id: "1564",
    name: "I – V – vi – IV (поп-рок баллада)",
    mode: "major",
    steps: [
      { semi: 0, letStep: 0, kind: "major", roman: "I", fn: "T" },
      { semi: 7, letStep: 4, kind: "major", roman: "V", fn: "D" },
      { semi: 9, letStep: 5, kind: "minor", roman: "vi", fn: "T" },
      { semi: 5, letStep: 3, kind: "major", roman: "IV", fn: "S" },
    ],
    melodicMoves:
      "Нисходящая певучая линия в верхнем голосе: 1 → 7 → 6 → 4 (в C-мажоре: C → B → A → F) или удержание общего звука C/G («педаль» на 1–2 струнах).",
    description:
      "Самая узнаваемая прогрессия стадионных гимнов («Let It Be», «With or Without You», «No Woman, No Cry»).",
  },
  {
    id: "1645",
    name: "I – vi – IV – V (лирические 50-е)",
    mode: "major",
    steps: [
      { semi: 0, letStep: 0, kind: "major", roman: "I", fn: "T" },
      { semi: 9, letStep: 5, kind: "minor", roman: "vi", fn: "T" },
      { semi: 5, letStep: 3, kind: "major", roman: "IV", fn: "S" },
      { semi: 7, letStep: 4, kind: "major", roman: "V", fn: "D" },
    ],
    melodicMoves:
      "Обыгрывай мажорной пентатоникой от тоники (в C: C D E G A), подчёркивая на V аккорде вводный тон B перед возвратом в C.",
    description:
      "Мягкий переход от светлой тоники в параллельный минор («Stand By Me», «Every Breath You Take»).",
  },
  {
    id: "251",
    name: "ii7 – V7 – Imaj7 – Imaj7 (джазовый оборот ii–V–I)",
    mode: "major",
    steps: [
      { semi: 2, letStep: 1, kind: "m7", roman: "ii7", fn: "S" },
      { semi: 7, letStep: 4, kind: "dom7", roman: "V7", fn: "D" },
      { semi: 0, letStep: 0, kind: "maj7", roman: "Imaj7", fn: "T" },
      { semi: 0, letStep: 0, kind: "maj7", roman: "Imaj7", fn: "T" },
    ],
    melodicMoves:
      "Линия «гид-тонов» (терций и септим) движется по полтона вниз: в C-мажоре C (септима Dm7) → B (терция G7) → B/E (септима/терция Cmaj7).",
    description:
      "Золотое ядро джаза, босса-новы и нео-соула: плавное шагание баса по квинтам вниз (D → G → C).",
  },
  {
    id: "minor145",
    name: "i – iv – v – i (натуральный минор)",
    mode: "minor",
    steps: [
      { semi: 0, letStep: 0, kind: "minor", roman: "i", fn: "T" },
      { semi: 5, letStep: 3, kind: "minor", roman: "iv", fn: "S" },
      { semi: 7, letStep: 4, kind: "minor", roman: "v", fn: "D" },
      { semi: 0, letStep: 0, kind: "minor", roman: "i", fn: "T" },
    ],
    melodicMoves:
      "Минорная пентатоника от тоники (в Am: A C D E G) идеально ложится на все три минорных трезвучия без единой «опасной» ноты!",
    description:
      "Сдержанная минорная классика рока и баллад («Black Magic Woman», народные песни).",
  },
  {
    id: "minor145V7",
    name: "i – iv – V7 – i (гармонический минор)",
    mode: "minor",
    steps: [
      { semi: 0, letStep: 0, kind: "minor", roman: "i", fn: "T" },
      { semi: 5, letStep: 3, kind: "minor", roman: "iv", fn: "S" },
      { semi: 7, letStep: 4, kind: "dom7", roman: "V7", fn: "D" },
      { semi: 0, letStep: 0, kind: "minor", roman: "i", fn: "T" },
    ],
    melodicMoves:
      "На аккордах i и iv играй натуральный минор/пентатонику, а на V7 замени ♭7 ступень на вводный тон ♯7 (в Am на аккорде E7 сыграй G♯ → A)!",
    description:
      "Классический и цыганский минор с острой мажорной доминантой V7, неудержимо тянущей домой.",
  },
  {
    id: "andalusian",
    name: "i – ♭VII – ♭VI – V7 (андалузский оборот)",
    mode: "minor",
    steps: [
      { semi: 0, letStep: 0, kind: "minor", roman: "i", fn: "T" },
      { semi: 10, letStep: 6, kind: "major", roman: "♭VII", fn: "D" },
      { semi: 8, letStep: 5, kind: "major", roman: "♭VI", fn: "S" },
      { semi: 7, letStep: 4, kind: "dom7", roman: "V7", fn: "D" },
    ],
    melodicMoves:
      "Повтори шагающий бас в верхнем голосе: 1 → ♭7 → ♭6 → 5 (в Am: A → G → F → E, а в терции аккорда E7 зазвучит G♯).",
    description:
      "Знаменитый испанский каданс («Hit the Road Jack», «Sultans of Swing», фламенко).",
  },
  {
    id: "blues12",
    name: "12-тактовый блюз (I7 – IV7 – V7)",
    mode: "blues",
    steps: [
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 5, letStep: 3, kind: "dom7", roman: "IV7", fn: "S" },
      { semi: 5, letStep: 3, kind: "dom7", roman: "IV7", fn: "S" },
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 7, letStep: 4, kind: "dom7", roman: "V7", fn: "D" },
      { semi: 5, letStep: 3, kind: "dom7", roman: "IV7", fn: "S" },
      { semi: 0, letStep: 0, kind: "dom7", roman: "I7", fn: "T" },
      { semi: 7, letStep: 4, kind: "dom7", roman: "V7", fn: "D" },
    ],
    melodicMoves:
      "Строй соло по принципу «вопрос — ответ» (call & response) в минорной блюзовой гамме; при переходе на IV7 вкусно подчеркнуть его терцию (♭7 ступень тональности)!",
    description:
      "Три куплета по 4 такта из трёх доминантсептаккордов I7, IV7 и V7 с тёрнэраундом (V7) в 12-м такте.",
  },
];

export function getProgression(id) {
  return PROGRESSIONS.find((item) => item.id === id) || PROGRESSIONS[0];
}

function chordTypeByKind(kind) {
  if (kind === "dom7" || kind === "m7" || kind === "maj7") {
    return getSeventh(kind);
  }
  return getTriad(kind);
}

export function progressionChords(root, progression) {
  return progression.steps.map((step, index) => {
    const chordRoot = spellInterval(root, step.semi, step.letStep);
    const type = chordTypeByKind(step.kind);
    return {
      ...makeChord(chordRoot, type),
      barNumber: index + 1,
      roman: step.roman,
      fn: step.fn,
    };
  });
}

// Готовые гитарные схемы 12-тактового блюза в A и E для раздела 10.
export const BLUES_12BAR_GUIDES = {
  A: {
    key: "A",
    title: "12-тактовый блюз в Ля (A7 – D7 – E7)",
    chords: {
      I7: {
        symbol: "A7",
        openShape: "x–0–2–0–2–0 (открытый A7) или баррэ 5–7–5–6–5–5 (5-й лад)",
        notes: "A – C♯ – E – G",
      },
      IV7: {
        symbol: "D7",
        openShape: "x–x–0–2–1–2 (открытый D7) или C7-форма x–5–4–5–3–x",
        notes: "D – F♯ – A – C",
      },
      V7: {
        symbol: "E7",
        openShape: "0–2–0–1–0–0 (открытый E7) или x–7–6–7–5–x (7-й лад)",
        notes: "E – G♯ – B – D",
      },
    },
    bars: [
      "A7",
      "A7",
      "A7",
      "A7",
      "D7",
      "D7",
      "A7",
      "A7",
      "E7",
      "D7",
      "A7",
      "E7",
    ],
    riffTip:
      "Классический блюзовый шаффл в A: на 5-й открытой струне A чередуй на 4-й струне 2-й лад (E, квинта) и 4-й лад (F♯, секста)!",
  },
  E: {
    key: "E",
    title: "12-тактовый блюз в Ми (E7 – A7 – B7)",
    chords: {
      I7: {
        symbol: "E7",
        openShape: "0–2–0–1–0–0 (открытый густой E7 на всех 6 струнах)",
        notes: "E – G♯ – B – D",
      },
      IV7: {
        symbol: "A7",
        openShape: "x–0–2–0–2–0 (открытый A7 от 5-й струны)",
        notes: "A – C♯ – E – G",
      },
      V7: {
        symbol: "B7",
        openShape: "x–2–1–2–0–2 (классический открытый B7 в I позиции!)",
        notes: "B – D♯ – F♯ – A",
      },
    },
    bars: [
      "E7",
      "E7",
      "E7",
      "E7",
      "A7",
      "A7",
      "E7",
      "E7",
      "B7",
      "A7",
      "E7",
      "B7",
    ],
    riffTip:
      "Техасский и чикагский блюз любят E за открытые басовые струны: держи пульс на 6-й открытой E и отвечай фразами в открытом Боксе 1 (лады 0–3) или на 12-м ладу!",
  },
};

/* Данные для модуля 13 «Ритм и грув». */
export const NOTE_DURATIONS = [
  {
    id: "whole",
    symbol: "𝅝",
    name: "Целая",
    fraction: "1/1",
    beatsIn44: 4,
    counting: "Раз-и-два-и-три-и-четыре-и",
    guitarFeel:
      "Один удар медиатором вниз на весь такт 4/4 — дай струнам дозвучать до конца.",
  },
  {
    id: "half",
    symbol: "𝅗𝅥",
    name: "Половинная",
    fraction: "1/2",
    beatsIn44: 2,
    counting: "Раз-и-два-и | Три-и-четыре-и",
    guitarFeel: "Два спокойных удара в такте (на 1-ю и 3-ю доли).",
  },
  {
    id: "quarter",
    symbol: "♩",
    name: "Четверть",
    fraction: "1/4",
    beatsIn44: 1,
    counting: "Раз · Два · Три · Четыре",
    guitarFeel: "Шаг метронома — ровно по одному удару вниз на каждую долю.",
  },
  {
    id: "eighth",
    symbol: "♪",
    name: "Восьмая",
    fraction: "1/8",
    beatsIn44: 0.5,
    counting: "Раз-и · Два-и · Три-и · Четыре-и",
    guitarFeel:
      "Маятник правой руки: на число — удар вниз (П), на «и» — возвратный удар вверх (V).",
  },
  {
    id: "sixteenth",
    symbol: " sixteenth / ♬ ",
    displaySymbol: "♬",
    name: "Шестнадцатая",
    fraction: "1/16",
    beatsIn44: 0.25,
    counting: "Раз-та-и-та (по 4 звука на удар метронома)",
    guitarFeel: "Фанковый «чёс» кистью (16 ударов вниз-вверх в такте 4/4).",
  },
];

export const METERS = [
  {
    id: "4/4",
    name: "4/4 — Четыре четверти",
    steps: 8, // сетка восьмых длительностей (8 шагов в такте)
    beats: 4,
    subdivision: 2,
    accents: [3, 0, 1, 0, 2, 0, 1, 0], // 3 = сильная доля (1), 2 = относительно сильная (3), 1 = слабые доли (2,4), 0 = «и»
    drumDefault: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hihat: [1, 1, 1, 1, 1, 1, 1, 1],
    },
    description:
      "Рок, поп, фанк, блюз: сильная 1-я доля, относительно сильная 3-я, а малый барабан (snare) бьёт бэкбит на 2 и 4!",
  },
  {
    id: "3/4",
    name: "3/4 — Три четверти (вальс)",
    steps: 6, // 6 восьмых (3 доли по 2)
    beats: 3,
    subdivision: 2,
    accents: [3, 0, 1, 0, 1, 0],
    drumDefault: {
      kick: [1, 0, 0, 0, 0, 0],
      snare: [0, 0, 1, 0, 1, 0],
      hihat: [1, 1, 1, 1, 1, 1],
    },
    description:
      "Вальсовое кружение «РАЗ – два – три»: бас на первой сильной доле и два лёгких щипка аккорда на 2-й и 3-й.",
  },
  {
    id: "6/8",
    name: "6/8 — Шесть восьмых (пульсация триолями/кач)",
    steps: 6, // 6 восьмых, но сгруппированных по ТРИ (1-2-3 | 4-5-6)!
    beats: 2,
    subdivision: 3,
    accents: [3, 0, 0, 2, 0, 0],
    drumDefault: {
      kick: [1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0],
      hihat: [1, 1, 1, 1, 1, 1],
    },
    description:
      "Двудольный покачивающийся грув «РАЗ-два-три, ЧЕТЫРЕ-пять-шесть» («Nothing Else Matters», «House of the Rising Sun», медленный блюз)!",
  },
];

// Паттерны для упражнения «Хлопни ритм» (позиции ударов указаны в четвертных долях внутри одного такта 4/4, от 0 до <4).
export const RHYTHM_PATTERNS = [
  {
    id: "quarters",
    name: "Ровные четверти (пульс 1 – 2 – 3 – 4)",
    meter: "4/4",
    beatsTotal: 4,
    hits: [0, 1, 2, 3],
    labels: ["1", "2", "3", "4"],
    hint: "Нажимай ровно в каждый удар метронома: Раз · Два · Три · Четыре.",
  },
  {
    id: "eighthsMix",
    name: "Четверти и восьмые («Та · Та · Ти-ти · Та»)",
    meter: "4/4",
    beatsTotal: 4,
    hits: [0, 1, 2, 2.5, 3],
    labels: ["1", "2", "3", "и", "4"],
    hint: "На третьей доле сыграй две ровные восьмые («три-и»), остальные доли — четверти.",
  },
  {
    id: "dotted",
    name: "Пунктирный ритм (четверть с точкой + восьмая)",
    meter: "4/4",
    beatsTotal: 4,
    hits: [0, 1.5, 2, 3.5],
    labels: ["1", "(2)-и", "3", "(4)-и"],
    hint: "Точка удлиняет четверть наполовину (1.5 доли): удар на «Раз», пропусти «два», ударь на «и»!",
  },
  {
    id: "syncopation",
    name: "Гитарная синкопа («Бой шестёрка»: Раз · Два-и · -и-Четыре-и)",
    meter: "4/4",
    beatsTotal: 4,
    hits: [0, 1, 1.5, 2.5, 3, 3.5],
    labels: ["1 (П)", "2 (П)", "и (V)", "и (V)", "4 (П)", "и (V)"],
    hint: "Легендарный гитарный бой с пропуском сильного удара на 3-й доле — рука идёт вхолостую вниз, а играет вверх на «и»!",
  },
];
