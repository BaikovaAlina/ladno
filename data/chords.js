/*
 * data/chords.js — трезвучия, септаккорды, их обращения, гитарные аппликатуры
 * (включая наборы на 4-й и 5-й струнах по системе Drop-2 / Троицкого — Молоткова)
 * и типы аккордов для модуля «Аккорды на слух».
 */

import {
  STRINGS,
  mod,
  parseNote,
  prettyNote,
  rootMidi,
  spellInterval,
  nameMap,
  positionsForMidi,
} from "./notes.js";

export const TRIAD_INVERSIONS = [
  {
    value: 0,
    name: "Основной вид (5/3)",
    short: "5/3",
    bassRole: "прима (корень) в басу",
  },
  {
    value: 1,
    name: "Первое обращение — секстаккорд (6)",
    short: "6",
    bassRole: "терция в басу",
  },
  {
    value: 2,
    name: "Второе обращение — квартсекстаккорд (6/4)",
    short: "6/4",
    bassRole: "квинта в басу",
  },
];

export const SEVENTH_INVERSIONS = [
  {
    value: 0,
    name: "Основной вид — септаккорд (7)",
    short: "7",
    bassRole: "прима (корень) в басу",
  },
  {
    value: 1,
    name: "1-е обращение — квинтсекстаккорд (6/5)",
    short: "6/5",
    bassRole: "терция в басу",
  },
  {
    value: 2,
    name: "2-е обращение — терцквартаккорд (4/3)",
    short: "4/3",
    bassRole: "квинта в басу",
  },
  {
    value: 3,
    name: "3-е обращение — секундаккорд (2)",
    short: "2",
    bassRole: "септима в басу",
  },
];

export const TRIADS = [
  {
    id: "major",
    name: "Мажорное",
    fullName: "Мажорное трезвучие",
    symbol: "",
    offsets: [0, 4, 7],
    steps: [0, 2, 4],
    formula: "б3 + м3 (4 + 3 пт)",
    description:
      "Большая терция снизу и малая сверху (4 + 3 полутона). Звучит светло, открыто и устойчиво.",
    onFingers:
      "От 5-й струны (форма C): C на 5-й (3 лад), E на 4-й (2 лад), G на 3-й (0 лад). На струнах 4–3–2 в ля-форме все три ноты жмутся на одном ладу (например, A = 2–2–2).",
    commonMistake:
      "При взятии открытых C или D случайно задевают 6-ю струну E: в C-мажоре в басу оказывается терция (это уже секстаккорд C/E), а в D-мажоре звучит чужая нота E!",
  },
  {
    id: "minor",
    name: "Минорное",
    fullName: "Минорное трезвучие",
    symbol: "m",
    offsets: [0, 3, 7],
    steps: [0, 2, 4],
    formula: "м3 + б3 (3 + 4 пт)",
    description:
      "Малая терция снизу и большая сверху (3 + 4 полутона). Квинта та же, что в мажоре, но пониженная на полтона терция меняет весь характер на задумчивый.",
    onFingers:
      "Сыграй E-мажор (0–2–2–1–0–0) и убери указательный палец с 1-го лада 3-й струны: G♯ опустится в G, и получится чистый Em.",
    commonMistake:
      "Думают, что минор отличается от мажора «всеми нотами». На самом деле меняется ровно ОДНА нота — терция (на 1 лад ниже)!",
  },
  {
    id: "dim",
    name: "Уменьшённое",
    fullName: "Уменьшённое трезвучие",
    symbol: "°",
    offsets: [0, 3, 6],
    steps: [0, 2, 4],
    formula: "м3 + м3 (3 + 3 пт)",
    description:
      "Две малые терции подряд (3 + 3 полутона). Между крайними звуками возникает тритон — аккорд звучит сжато, тревожно и просит разрешения.",
    onFingers:
      "На струнах 4–3–2 от B (VII ступень до мажора): 4-я струна 9-й лад (B), 3-я — 7-й лад (D), 2-я — 6-й лад (F).",
    commonMistake:
      "Боятся уменьшённого трезвучия и обходят VII ступень стороной, хотя B° — это просто кусочек привычного G7 без баса G!",
  },
  {
    id: "aug",
    name: "Увеличенное",
    fullName: "Увеличенное трезвучие",
    symbol: "+",
    offsets: [0, 4, 8],
    steps: [0, 2, 4],
    formula: "б3 + б3 (4 + 4 пт)",
    description:
      "Две большие терции подряд (4 + 4 полутона). Симметричный аккорд со сказочным, «парящим» напряжением.",
    onFingers:
      "Возьми C на струнах 5–4–3–2 и сдвинь квинту G (3-я струна, 0 лад) на 1-й лад (G♯): C–E–G♯.",
    commonMistake:
      "Теряют ощущение тоники: увеличенное трезвучие делит октаву на 3 равные части, поэтому каждые 4 лада по грифу дают те же самые ноты!",
  },
];

export const SEVENTHS = [
  {
    id: "maj7",
    name: "Большой мажорный (maj7)",
    fullName: "Большой мажорный септаккорд",
    symbol: "maj7",
    offsets: [0, 4, 7, 11],
    steps: [0, 2, 4, 6],
    formula: "б3 + м3 + б3 (0–4–7–11)",
    description:
      "Мажорное трезвучие + большая септима. Бархатный, тёплый, мечтательный аккорд босса-новы, джаза и нео-соула.",
    onFingers:
      "От 5-й струны (Cmaj7): 5-я (3 лад C), 4-я (5 лад G), 3-я (4 лад B), 2-я (5 лад E). Или от 4-й струны (Fmaj7): 3–2–1–0!",
    commonMistake:
      "Путают запись C7 и Cmaj7: в C7 септима малая (B♭, блюзовая тяга), а в Cmaj7 — большая (B, на полтона ниже октавы).",
  },
  {
    id: "m7",
    name: "Малый минорный (m7)",
    fullName: "Малый минорный септаккорд",
    symbol: "m7",
    offsets: [0, 3, 7, 10],
    steps: [0, 2, 4, 6],
    formula: "м3 + б3 + м3 (0–3–7–10)",
    description:
      "Минорное трезвучие + малая септима. Звучит мягче и воздушнее обычного минора — опора фанка, соула и оборота ii–V–I.",
    onFingers:
      "Возьми обычный открытый Am (x–0–2–2–1–0) и убери безымянный палец с 3-й струны: A–E–G–C–E = Am7!",
    commonMistake:
      "Стараются зажать все 6 струн с тяжёлым баррэ, хотя компактные 4-звучные формы Drop-2 на 5-й и 4-й струнах звучат чище и прозрачнее.",
  },
  {
    id: "dom7",
    name: "Доминантсептаккорд (7)",
    fullName: "Малый мажорный (доминантсептаккорд)",
    symbol: "7",
    offsets: [0, 4, 7, 10],
    steps: [0, 2, 4, 6],
    formula: "б3 + м3 + м3 (0–4–7–10)",
    description:
      "Мажорное трезвучие + малая септима. Между терцией и септимой звенит тритон (в G7 это B и F) — в классике он тянет в тонику, а в блюзе сам становится домом!",
    onFingers:
      "На 5-й струне (C7): 5-я (3 лад C), 4-я (2 лад E), 3-я (3 лад B♭), 2-я (1 лад C) или джазовый Drop-2: 3–5–3–5.",
    commonMistake:
      "При разрешении G7 → C бросают руку скачком, не замечая, что B хочет шагнуть на 1 лад вверх в C, а F — на 1 лад вниз в E!",
  },
  {
    id: "half",
    name: "Полууменьшённый (m7♭5)",
    fullName: "Малый уменьшённый септаккорд (m7♭5 / ø)",
    symbol: "m7♭5",
    offsets: [0, 3, 6, 10],
    steps: [0, 2, 4, 6],
    formula: "м3 + м3 + б3 (0–3–6–10)",
    description:
      "Уменьшённое трезвучие + малая септима. Кинематографичный, терпкий аккорд II ступени минора (Bm7♭5 → E7 → Am).",
    onFingers:
      "От 5-й струны (Bm7♭5): 5-я (2 лад B), 4-я (3 лад F), 3-я (2 лад A), 2-я (3 лад D) — удобная «шахматная» форма 2–3–2–3!",
    commonMistake:
      "Путают полууменьшённый m7♭5 с полностью уменьшённым °7: у m7♭5 верхняя нота на 1 лад выше, и он звучит лиричнее, а не зловеще.",
  },
  {
    id: "dim7",
    name: "Уменьшённый (°7)",
    fullName: "Уменьшённый септаккорд (dim7)",
    symbol: "°7",
    offsets: [0, 3, 6, 9],
    steps: [0, 2, 4, 6],
    formula: "м3 + м3 + м3 (0–3–6–9)",
    description:
      "Три малые терции подряд (внутри два тритона!). Драматичный классический и джазовый аккорд; абсолютно симметричен каждые 3 лада.",
    onFingers:
      "Та же «шахматка», но сдвинутая: от 4-й струны (D♯°7) — 4-я (1 лад), 3-я (2 лад), 2-я (1 лад), 1-я (2 лад). Двигай эту же форму через каждые 3 лада — получишь все её обращения!",
    commonMistake:
      "Пугаются двойного бемоля (в C°7 септима пишется B♭♭, хотя звучит как A): так сохраняется терцовая структура C–E♭–G♭–B♭♭.",
  },
  {
    id: "mMaj7",
    name: "Большой минорный m(maj7)",
    fullName: "Большой минорный септаккорд",
    symbol: "m(maj7)",
    offsets: [0, 3, 7, 11],
    steps: [0, 2, 4, 6],
    formula: "м3 + б3 + б3 (0–3–7–11)",
    description:
      "Минорное трезвучие + большая септима. Таинственный «детективный» аккорд (финальный аккорд темы Джеймса Бонда и линия клише Am → Am(maj7) → Am7 → Am6).",
    onFingers:
      "Возьми открытый Am (x–0–2–2–1–0) и сдвинь ноту на 3-й струне с 2-го лада на 1-й (G♯): x–0–2–1–1–0!",
    commonMistake:
      "Думают, что в нём ошибка из-за острого сочетания малой терции и большой септимы — дай аккорду прозвучать целиком, в арпеджио он великолепен.",
  },
];

// Полный список из 9 типов аккордов для модуля 12 «Аккорды на слух».
export const EAR_CHORD_TYPES = [
  { ...TRIADS[0], category: "triad", earLabel: "Мажорное трезвучие" },
  { ...TRIADS[1], category: "triad", earLabel: "Минорное трезвучие" },
  { ...TRIADS[3], category: "triad", earLabel: "Увеличенное (+)" },
  { ...TRIADS[2], category: "triad", earLabel: "Уменьшённое (°)" },
  { ...SEVENTHS[0], category: "seventh", earLabel: "maj7 (большой маж.)" },
  { ...SEVENTHS[1], category: "seventh", earLabel: "m7 (малый мин.)" },
  { ...SEVENTHS[2], category: "seventh", earLabel: "7 (доминантсепт)" },
  { ...SEVENTHS[3], category: "seventh", earLabel: "m7♭5 (полуум.)" },
  { ...SEVENTHS[4], category: "seventh", earLabel: "dim7 (уменьшённый °7)" },
];

export function getTriad(id) {
  return TRIADS.find((item) => item.id === id) || TRIADS[0];
}

export function getSeventh(id) {
  return SEVENTHS.find((item) => item.id === id) || SEVENTHS[0];
}

export function getEarChordType(id) {
  return EAR_CHORD_TYPES.find((item) => item.id === id) || EAR_CHORD_TYPES[0];
}

export function makeChord(root, type, inversion = 0) {
  const names = type.offsets.map((offset, i) =>
    spellInterval(root, offset, type.steps[i]),
  );
  const midi = rootMidi(root);
  const inv = Math.max(0, Math.min(inversion, type.offsets.length - 1));
  const notes = type.offsets.map((offset, i) => ({
    midi: midi + offset + (i < inv ? 12 : 0),
    name: names[i],
    degreeIndex: i,
  }));
  notes.sort((a, b) => a.midi - b.midi);
  const bassNote = notes[0]?.name || root;
  const slash = inv > 0 ? `/${prettyNote(bassNote)}` : "";
  return {
    root,
    type,
    inversion: inv,
    names,
    notes,
    pcs: names.map((n) => parseNote(n).pc),
    bassName: bassNote,
    symbol: prettyNote(root) + type.symbol,
    fullSymbol: prettyNote(root) + type.symbol + slash,
  };
}

function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((item, i) =>
    permutations(items.filter((_, j) => j !== i)).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

/*
 * Универсальный генератор гитарных аппликатур.
 * Поддерживает фильтрацию по басовой струне:
 * - 'all' — лучшие компактные аппликатуры на любых струнах;
 * - '5'   — бас строго на 5-й струне (индекс 4 в STRINGS: струны 5–4–3–2 / 5–4–3);
 * - '4'   — бас строго на 4-й струне (индекс 3 в STRINGS: струны 4–3–2–1 / 4–3–2);
 * - '6'   — бас строго на 6-й струне (индекс 5 в STRINGS).
 */
export function findVoicings(notes, options = {}) {
  const maxFret = options.maxFret || 15;
  const bassFilter = options.bassString || "all";
  const targetBassIdx =
    bassFilter === "5"
      ? 4
      : bassFilter === "4"
        ? 3
        : bassFilter === "6"
          ? 5
          : null;

  const upper = notes.slice(1);
  const combinations = [];
  const seen = new Set();

  [-12, 0, 12].forEach((shift) => {
    permutations(upper).forEach((order) => {
      const voices = [notes[0], ...order];
      const lists = voices.map((note, index) => {
        const midis =
          index === 0
            ? [note.midi + shift]
            : [
                note.midi + shift - 12,
                note.midi + shift,
                note.midi + shift + 12,
              ];
        const raw = midis.flatMap((m) => positionsForMidi(m, maxFret));
        if (index === 0 && targetBassIdx !== null) {
          return raw.filter((p) => p.string === targetBassIdx);
        }
        return raw;
      });

      if (lists.some((l) => !l.length)) return;

      function walk(index, current) {
        if (index === lists.length) {
          const key = current.map((p) => p.key).join("|");
          if (seen.has(key)) return;
          seen.add(key);

          const fretted = current.map((p) => p.fret).filter((f) => f > 0);
          const span = fretted.length
            ? Math.max(...fretted) - Math.min(...fretted)
            : 0;
          if (span > 5) return;

          const stringsSpan =
            current[0].string - current[current.length - 1].string;
          const adjacentBonus =
            stringsSpan === current.length - 1 ? -2.5 : stringsSpan * 1.6;
          const average =
            current.reduce((sum, p) => sum + p.fret, 0) / current.length;
          const score =
            span * 3.2 +
            Math.max(0, span - 4) * 14 +
            adjacentBonus +
            average * 0.25;

          combinations.push({
            positions: [...current],
            span,
            bassString: current[0].string + 1,
            minFret: Math.min(...current.map((p) => p.fret)),
            maxFret: Math.max(...current.map((p) => p.fret)),
            score,
          });
          return;
        }

        lists[index].forEach((p) => {
          const prev = current[current.length - 1];
          if (prev && (prev.string <= p.string || prev.midi >= p.midi)) return;
          walk(index + 1, [...current, p]);
        });
      }

      walk(0, []);
    });
  });

  const comfortable = combinations.filter((item) => item.span <= 4);
  const candidates = comfortable.length ? comfortable : combinations;
  const limit = options.limit || 6;

  return candidates
    .sort((a, b) => a.score - b.score || a.minFret - b.minFret)
    .slice(0, limit)
    .map((item) => item.positions);
}

export function voicedNotes(positions, names) {
  const map = nameMap(names);
  return positions.map((position) => ({
    midi: position.midi,
    name: map[mod(position.midi)] || "C",
  }));
}

/*
 * Собирает все обращения аккорда вдоль выбранного набора струн (по умолчанию 4-я или 5-я басовая струна)
 * по всему грифу (лады 0..15) для режима «Показать все обращения по грифу».
 */
export function getAllInversionsAcrossNeck(root, type, bassString = "4") {
  const count = type.offsets.length;
  const invMeta = count === 4 ? SEVENTH_INVERSIONS : TRIAD_INVERSIONS;
  const palette = ["#376b53", "#4e7a96", "#9a6b32", "#8b4b62"];
  const shapes = [];

  for (let inv = 0; inv < count; inv++) {
    const chord = makeChord(root, type, inv);
    const voicings = findVoicings(chord.notes, {
      bassString: bassString === "all" ? "4" : bassString,
      maxFret: 15,
      limit: 3,
    });
    const chosen =
      voicings[0] || findVoicings(chord.notes, { maxFret: 15, limit: 1 })[0];
    if (chosen && chosen.length) {
      const frets = chosen.map((p) => p.fret);
      shapes.push({
        inversion: inv,
        label: `${invMeta[inv].short} (${prettyNote(chord.bassName)} в басу)`,
        minFret: Math.min(...frets),
        maxFret: Math.max(...frets),
        color: palette[inv % palette.length],
        positions: chosen,
      });
    }
  }

  return shapes.sort((a, b) => a.minFret - b.minFret);
}
