/*
 * ЯДРО: интервалы, трезвучия, септаккорды, их обращения и аппликатуры.
 *
 * Все аккорды описаны одинаково:
 *   offsets — полутоны от корня,
 *   steps   — сколько букв пройти, чтобы правильно записать ноту,
 *   quality — характер звучания для подсказок.
 */
import {
  bestPosition, nameMap, parseNote, positionsForMidi, prettyNote,
  rootMidi, spellInterval, writtenNote, mod,
} from "./notes.js";

/* ------------------------------------------------------------------ */
/*  Интервалы                                                          */
/* ------------------------------------------------------------------ */

export const INTERVALS = [
  {
    id: "m2", short: "м.2", name: "Малая секунда", semitones: 1, steps: 1,
    character: "Очень резко и тесно — как два соседних лада.", feel: "резко",
    quality: "dissonance", consonant: false, pair: "m2",
    tip: "Полутон. Сыграй E на 2-й струне, 5-й лад, и F на 1-й струне, 1-й лад — это м.2.",
    mistake: "Считать м.2 и б.2 одним и тем же: разница в целый лад слышна сразу.",
  },
  {
    id: "M2", short: "б.2", name: "Большая секунда", semitones: 2, steps: 1,
    character: "Немного трения, но мягче малой секунды.", feel: "терпко",
    quality: "dissonance", consonant: false, pair: "m2",
    tip: "Целый тон, два лада на одной струне: C–D на 5-й струне, лады 3 и 5.",
    mistake: "Забывать, что между E–F и B–C целого тона нет — только полутон.",
  },
  {
    id: "m3", short: "м.3", name: "Малая терция", semitones: 3, steps: 2,
    character: "Мягко и грустно — основа минорного аккорда.", feel: "мягко",
    quality: "consonance", consonant: true, pair: "third",
    tip: "A на 3-й струне, 2-й лад → C на 2-й струне, 1-й лад.",
    mistake: "Спутать м.3 и б.3 на слух: минор звучит темнее, но разница всего 1 полутон.",
  },
  {
    id: "M3", short: "б.3", name: "Большая терция", semitones: 4, steps: 2,
    character: "Светло и устойчиво — основа мажорного аккорда.", feel: "светло",
    quality: "consonance", consonant: true, pair: "third",
    tip: "C на 5-й струне, 3-й лад → E на 4-й струне, 2-й лад.",
    mistake: "Путать б.3 с ч.4: обе «широкие», но кварта звучит пусто, а терция — тепло.",
  },
  {
    id: "P4", short: "ч.4", name: "Чистая кварта", semitones: 5, steps: 3,
    character: "Пусто и устойчиво, чуть «военно».", feel: "пусто",
    quality: "consonance", consonant: true, pair: "fourth",
    tip: "Открытые струны E–A: 5 полутонов. Или C–F на одной струне: лады 3 и 8.",
    mistake: "Считать кварту всегда консонансом: над басом она требует разрешения в терцию.",
  },
  {
    id: "TT", short: "тритон", name: "Тритон (ув.4 / ум.5)", semitones: 6, steps: 3,
    character: "Напряжённо и неустойчиво, «вопрос без ответа».", feel: "напряжённо",
    quality: "dissonance", consonant: false, pair: "tritone",
    tip: "C–F♯: 5-я струна, 3-й лад → 4-я струна, 4-й лад. Шесть полутонов.",
    mistake: "Думать, что тритон — это только ув.4. Ум.5 звучит так же, а записывается иначе.",
  },
  {
    id: "P5", short: "ч.5", name: "Чистая квинта", semitones: 7, steps: 4,
    character: "Полно и пусто одновременно — «пауэр-аккорд».", feel: "пусто",
    quality: "consonance", consonant: true, pair: "fifth",
    tip: "E–B: 6-я струна, 0-й лад → 5-я струна, 2-й лад. Основа рок-аккордов.",
    mistake: "Путать ч.5 с ч.4: у кварты «дно» ниже, у квинты — опора шире.",
  },
  {
    id: "m6", short: "м.6", name: "Малая секста", semitones: 8, steps: 5,
    character: "Мягко, с лёгкой печалью.", feel: "мягко",
    quality: "consonance", consonant: true, pair: "sixth",
    tip: "A–F на 3-й струне, 2-й лад → 1-й струне, 1-й лад.",
    mistake: "Считать сексту «широкой и страшной»: м.6 — один из самых мягких интервалов.",
  },
  {
    id: "M6", short: "б.6", name: "Большая секста", semitones: 9, steps: 5,
    character: "Открыто и светло, как начало мелодии.", feel: "светло",
    quality: "consonance", consonant: true, pair: "sixth",
    tip: "C–A: 5-я струна, 3-й лад → 3-я струна, 2-й лад.",
    mistake: "Путать б.6 с м.7: септима «тянет» вниз, секста — нет.",
  },
  {
    id: "m7", short: "м.7", name: "Малая септима", semitones: 10, steps: 6,
    character: "Блюзово и слегка «грязно».", feel: "напряжённо",
    quality: "dissonance", consonant: false, pair: "seventh",
    tip: "A–G: 3-я струна, 2-й лад → открытая 3-я струна. Душа блюза.",
    mistake: "Считать м.7 ошибкой: в доминантсептаккорде она обязательна.",
  },
  {
    id: "M7", short: "б.7", name: "Большая септима", semitones: 11, steps: 6,
    character: "Остро и «киношно», сильное тяготение вверх.", feel: "напряжённо",
    quality: "dissonance", consonant: false, pair: "seventh",
    tip: "C–B: 5-я струна, 3-й лад → открытая 2-я струна (B).",
    mistake: "Путать б.7 с октавой: до октавы не хватает полутона, и это слышно.",
  },
  {
    id: "P8", short: "ч.8", name: "Чистая октава", semitones: 12, steps: 7,
    character: "Тот же звук выше — полное слияние.", feel: "пусто",
    quality: "consonance", consonant: true, pair: "octave",
    tip: "Открытая 6-я струна E и 12-й лад на ней же. 12 ладов = октава.",
    mistake: "Играть октаву на соседних струнах без учёта строя: между 3-й и 2-й струной сдвиг.",
  },
];

// Тритоны для тренировщика: ув.4 и ум.5 звучат одинаково, но пишутся по-разному.
export const TRITONE_FORMS = [
  { id: "TT", short: "тритон", name: "Тритон (ув.4/ум.5)" },
];

export const getInterval = (id) => INTERVALS.find((item) => item.id === id) || INTERVALS[3];

export const getIntervalBySemitones = (semitones) =>
  INTERVALS.find((item) => item.semitones === semitones) || null;

/** Названия для кнопок-ответов в тренажёре. */
export const intervalOptions = () =>
  INTERVALS.map((item) => ({ value: item.id, label: `${item.short} — ${item.name}` }));

/** Обращение интервала: сумма — октава. */
export function invertInterval(interval) {
  const inverted = getIntervalBySemitones(12 - interval.semitones);
  const stepsInverted = 7 - interval.steps;
  return {
    source: interval,
    interval: inverted,
    steps: stepsInverted,
    text: `${interval.short} → ${inverted ? inverted.short : "?"} (${12 - interval.semitones} полутонов)`,
  };
}

/** Краткая шпаргалка для таблицы «как звучит». */
export const INTERVAL_FEEL = [
  { feel: "мягко", items: ["м.3", "б.3", "м.6"] },
  { feel: "резко", items: ["м.2", "б.2", "б.7"] },
  { feel: "пусто", items: ["ч.4", "ч.5", "ч.8"] },
  { feel: "напряжённо", items: ["тритон", "м.7", "б.7"] },
];

/* ------------------------------------------------------------------ */
/*  Трезвучия                                                          */
/* ------------------------------------------------------------------ */

export const TRIADS = [
  {
    id: "major", name: "Мажорное", short: "Б", symbol: "", offsets: [0, 4, 7], steps: [0, 2, 4],
    tags: ["major", "triad"],
    description: "Большая терция + малая: 4 + 3 полутона. Светло и устойчиво.",
    tip: "C–E–G. E на 4-й струне, 2-й лад — «светлая» терция от C.",
    mistake: "Играть три ноты подряд на одной струне — аккорд не прозвучит слитно.",
  },
  {
    id: "minor", name: "Минорное", short: "М", symbol: "m", offsets: [0, 3, 7], steps: [0, 2, 4],
    tags: ["minor", "triad"],
    description: "Малая терция + большая: 3 + 4 полутона. Мягче и темнее.",
    tip: "A–C–E. C на 2-й струне, 1-й лад — «тёмная» терция от A.",
    mistake: "Забывать поднять среднюю ноту на 1 лад при переходе из минора в мажор.",
  },
  {
    id: "dim", name: "Уменьшённое", short: "Ум", symbol: "°", offsets: [0, 3, 6], steps: [0, 2, 4],
    tags: ["dim", "triad"],
    description: "Две малые терции: 3 + 3. Неустойчиво, просит разрешения.",
    tip: "B–D–F: 5-я струна, 2-й лад → 4-я струна, 0 лад → 4-я струна, 3-й лад.",
    mistake: "Путать ум. трезвучие с ум. септаккордом: там ещё одна нота.",
  },
  {
    id: "aug", name: "Увеличенное", short: "Ув", symbol: "+", offsets: [0, 4, 8], steps: [0, 2, 4],
    tags: ["aug", "triad"],
    description: "Две большие терции: 4 + 4. Напряжённо и «странно».",
    tip: "C–E–G♯. G♯ на 3-й струне, 1-й лад — выше обычной квинты.",
    mistake: "Считать увеличенное трезвучие «ошибкой»: оно часто ведёт в новую тональность.",
  },
];

export const getTriad = (id) => TRIADS.find((item) => item.id === id) || TRIADS[0];

/* ------------------------------------------------------------------ */
/*  Септаккорды                                                        */
/* ------------------------------------------------------------------ */

export const SEVENTHS = [
  {
    id: "maj7", name: "Большой мажорный", short: "maj7", symbol: "maj7",
    offsets: [0, 4, 7, 11], steps: [0, 2, 4, 6], tags: ["maj7", "seventh"],
    description: "Мажорное трезвучие + большая септима. Мягко и «дорого».",
    tip: "Cmaj7: C–E–G–B. B — открытая 2-я струна, самая «светлая» нота аккорда.",
    mistake: "Играть B вместо B♭: получится доминантсептаккорд, другое настроение.",
  },
  {
    id: "m7", name: "Малый минорный", short: "m7", symbol: "m7",
    offsets: [0, 3, 7, 10], steps: [0, 2, 4, 6], tags: ["m7", "seventh"],
    description: "Минорное трезвучие + малая септима. Спокойно, «джазово».",
    tip: "Am7: A–C–E–G. Все ноты есть в открытых струнах A, G, e.",
    mistake: "Тянуть септиму вверх — в m7 она уже «на месте».",
  },
  {
    id: "dom7", name: "Доминантсептаккорд", short: "7", symbol: "7",
    offsets: [0, 4, 7, 10], steps: [0, 2, 4, 6], tags: ["7", "seventh"],
    description: "Мажорное трезвучие + малая септима. Напряжение, тяга в тонику.",
    tip: "G7: G–B–D–F. F на 1-й струне, 1-й лад — та самая «тянущая» нота.",
    mistake: "Не разрешать G7 в C — аккорд остаётся «висеть».",
  },
  {
    id: "half", name: "Полууменьшённый", short: "m7♭5", symbol: "m7♭5",
    offsets: [0, 3, 6, 10], steps: [0, 2, 4, 6], tags: ["m7b5", "seventh"],
    description: "Уменьшённое трезвучие + малая септима. Вторая ступень в миноре.",
    tip: "Bm7♭5: B–D–F–A. Часто ведёт в Em7.",
    mistake: "Считать его уменьшённым (°7): в °7 септима на полутон ниже.",
  },
  {
    id: "dim7", name: "Уменьшённый септаккорд", short: "°7", symbol: "°7",
    offsets: [0, 3, 6, 9], steps: [0, 2, 4, 6], tags: ["dim7", "seventh"],
    description: "Три малые терции: 3 + 3 + 3. Симметричный и «злой».",
    tip: "B°7: B–D–F–A♭. Повторяется через каждые 3 лада — удобно запоминать.",
    mistake: "Искать в нём «корень»: любой из четырёх звуков может быть корнем.",
  },
  {
    id: "mMaj7", name: "Большой минорный", short: "m(maj7)", symbol: "m(maj7)",
    offsets: [0, 3, 7, 11], steps: [0, 2, 4, 6], tags: ["mMaj7", "seventh"],
    description: "Минорное трезвучие + большая септима. Загадочно, кинематографично.",
    tip: "Am(maj7): A–C–E–G♯. G♯ на 3-й струне, 1-й лад.",
    mistake: "Играть его в блюзе вместо m7 — слишком «остро» для блюзовой опоры.",
  },
];

export const getSeventh = (id) => SEVENTHS.find((item) => item.id === id) || SEVENTHS[0];

/** Все типы аккордов одним списком: удобно для тренажёра аккордов. */
export const ALL_CHORD_TYPES = [...TRIADS, ...SEVENTHS];

export const getChordType = (id) =>
  ALL_CHORD_TYPES.find((item) => item.id === id) || ALL_CHORD_TYPES[0];

/* ------------------------------------------------------------------ */
/*  Построение аккорда                                                 */
/* ------------------------------------------------------------------ */

/**
 * Аккорд с правильными именами и, при желании, обращением.
 * inversion = 0 — основной вид, 1 — первое обращение (терция в басу) и т. д.
 * `voicing`: 1 — бас остаётся, остальные ноты поднимаются на октаву.
 */
export function makeChord(root, type, inversion = 0) {
  const names = type.offsets.map((offset, i) => spellInterval(root, offset, type.steps[i]));
  const base = rootMidi(root);
  const notes = type.offsets.map((offset, i) => ({
    midi: base + offset + (i < inversion ? 12 : 0),
    name: names[i],
    degree: i,
  }));
  notes.sort((a, b) => a.midi - b.midi);
  return {
    root,
    type,
    names,
    notes,
    pcs: names.map((name) => parseNote(name).pc),
    symbol: prettyNote(root) + type.symbol,
    inversion,
  };
}

/** Подпись обращения: «основной вид», «1-е обращение (терция в басу)». */
export function inversionName(chord, inversion) {
  const sizes = chord.type.offsets.length;
  if (inversion === 0) return "основной вид: " + prettyNote(chord.names[0]) + " в басу";
  const degreeNames = chord.notes.map((note) => prettyNote(note.name));
  const bass = degreeNames[inversion] || degreeNames[0];
  const labels = sizes === 3
    ? ["", "1-е обращение: терция в басу", "2-е обращение: квинта в басу"]
    : ["", "1-е обращение: терция в басу", "2-е обращение: квинта в басу", "3-е обращение: септима в басу"];
  return `${labels[inversion] || labels[0]} (${bass})`;
}

/**
 * Аппликатура: ищем реальные позиции на грифе, где все ноты аккорда
 * звучат одновременно — по одной ноте на струну, нижний голос на толстой.
 * Возвращает массив вариантов: [{ positions, span, strings }].
 */
export function findVoicings(notes) {
  const ordered = [...notes].sort((a, b) => a.midi - b.midi);
  const bass = ordered[0];
  const upper = ordered.slice(1);

  function permutations(items) {
    if (!items.length) return [[]];
    return items.flatMap((item, i) =>
      permutations(items.filter((_, j) => j !== i)).map((rest) => [item, ...rest]),
    );
  }

  const combinations = [];
  const seen = new Set();

  // Бас держим на месте, верхние голоса можем переставлять и поднимать на октаву.
  [-12, 0, 12].forEach((shift) => {
    permutations(upper).forEach((order) => {
      const voices = [bass, ...order];
      const lists = voices.map((note, index) => {
        const midis = index === 0
          ? [note.midi + shift]
          : [note.midi + shift, note.midi + shift + 12];
        return midis.flatMap((midi) => positionsForMidi(midi));
      });
      if (lists.some((list) => !list.length)) return;

      function walk(index, current) {
        if (index === lists.length) {
          const key = current.map((p) => p.key).join("|");
          if (seen.has(key)) return;
          seen.add(key);
          const fretted = current.map((p) => p.fret).filter((f) => f > 0);
          const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
          const stringsSpan = current[0].string - current[current.length - 1].string;
          const openInside = fretted.length !== current.length;
          const average = current.reduce((sum, p) => sum + p.fret, 0) / current.length;
          // Дешёвые (удобные) варианты идут первыми; открытые струны поощряем.
          const score =
            span * 3 +
            Math.max(0, span - 4) * 12 +
            stringsSpan * 1.5 +
            average * 0.3 -
            (openInside ? 2 : 0);
          combinations.push({ positions: [...current], span, score });
          return;
        }
        lists[index].forEach((p) => {
          const previous = current[current.length - 1];
          if (previous && (previous.string <= p.string || previous.midi >= p.midi)) return;
          walk(index + 1, [...current, p]);
        });
      }
      walk(0, []);
    });
  });

  const comfortable = combinations.filter((item) => item.span <= 4);
  const candidates = comfortable.length ? comfortable : combinations;
  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((item) => ({
      positions: item.positions,
      span: item.span,
      strings: item.positions.map((p) => p.string),
      label: item.positions
        .map((p) => (p.fret === 0 ? "0" : p.fret))
        .join("-"),
    }));
}

/** Имена нот для позиций аппликатуры. */
export function voicedNotes(positions, names) {
  const map = nameMap(names);
  return positions.map((position) => ({
    midi: position.midi,
    name: map[mod(position.midi)] || "",
  }));
}

/**
 * Все обращения аккорда для показа на грифе: для каждого обращения —
 * лучшая аппликатура (если нашлась).
 */
export function chordInversionsVoicings(root, type) {
  const sizes = type.offsets.length;
  const result = [];
  for (let inversion = 0; inversion < sizes; inversion++) {
    const chord = makeChord(root, type, inversion);
    const voicings = findVoicings(chord.notes);
    result.push({
      inversion,
      chord,
      title: inversionName(chord, inversion),
      voicing: voicings[0] || null,
    });
  }
  return result;
}

/**
 * Аппликатуры на конкретной струне: ищем вариант, где бас лежит
 * на 4-й (index 3) или 5-й (index 4) струне — так чаще всего играют.
 */
export function voicingsOnString(root, type, stringIndex, limit = 3) {
  const chord = makeChord(root, type);
  const voicings = findVoicings(chord.notes);
  return voicings
    .filter((voicing) => voicing.positions[0].string === stringIndex)
    .slice(0, limit);
}

/** Аппликатура по умолчанию для аккорда: самый удобный вариант. */
export function bestVoicing(root, type) {
  const chord = makeChord(root, type);
  return { chord, voicing: findVoicings(chord.notes)[0] || null };
}

/* ------------------------------------------------------------------ */
/*  Ступени и аккорды тональности                                      */
/* ------------------------------------------------------------------ */

export const ROMANS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

// Учебные функции: T — тоника (покой), S — субдоминанта (движение),
// D — доминанта (напряжение). Это упрощение, но оно помогает слышать.
export const FUNCTIONS = ["T", "S", "T", "S", "D", "T", "D"];

const DEGREE_TRIADS = ["major", "minor", "minor", "major", "major", "minor", "dim"];

/** Диатоническое трезвучие на ступени мажора (0..6). */
export function chordOfDegree(root, degree) {
  const major = { offsets: [0, 2, 4, 5, 7, 9, 11], steps: [0, 1, 2, 3, 4, 5, 6] };
  const name = spellInterval(root, major.offsets[degree], major.steps[degree]);
  return {
    ...makeChord(name, getTriad(DEGREE_TRIADS[degree])),
    degree,
    roman: ROMANS[degree],
    fn: FUNCTIONS[degree],
  };
}

/** Красивая подпись с пояснением: «C (T)» → «до мажор, тоника». */
export function functionName(fn) {
  return { T: "тоника — покой", S: "субдоминанта — движение", D: "доминанта — напряжение" }[fn] || fn;
}

export { bestPosition, rootMidi, writtenNote };
