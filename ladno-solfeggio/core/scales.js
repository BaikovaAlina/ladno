/*
 * ЯДРО: гаммы, пентатоники, блюзовые гаммы и позиции на грифе.
 *
 * Поля каждой гаммы:
 *   id         — короткий идентификатор (используется в localStorage),
 *   name       — название для интерфейса,
 *   family     — "scale" | "mode" | "pentatonic" | "blues",
 *   offsets    — полутоны от тоники (по ступеням вверх),
 *   steps      — сколько букв пройти для правильной записи ноты,
 *   formula    — формула шагов для человека,
 *   degrees    — ступени в учебной записи: 1, ♭3, 4, 5, ♭7…,
 *   description— короткое пояснение,
 *   plain      — блок «На пальцах»: конкретные струны и лады,
 *   mistake    — блок «Типичная ошибка новичка»,
 *   sound      — как звучит и где пригодится.
 */
import {
  LAST_FRET, STRINGS, boxWindow, mod, parseNote, pentatonicBoxes,
  prettyNote, scalePcs, spellInterval, rootMidi,
} from "./notes.js";

export const SCALES = [
  {
    id: "major", name: "Мажор (ионийский лад)", family: "scale",
    offsets: [0, 2, 4, 5, 7, 9, 11], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – П – Т – Т – Т – П",
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
    description: "Семь ступеней, между 3–4 и 7–1 полутон. Светлая основа всей классической гармонии.",
    plain: "C-мажор: начни C на 5-й струне, 3-й лад, и поднимайся по схеме. Ноты C D E F G A B — все они есть в открытых струнах и первых трёх ладах.",
    mistake: "Играть гамму только в одной позиции и думать, что выучил её. Гамма — это звуки по всему грифу, а не один бокс.",
    sound: "Светло, устойчиво. Основа поп-музыки, маршей и детских песен.",
  },
  {
    id: "naturalMinor", name: "Натуральный минор (эолийский лад)", family: "scale",
    offsets: [0, 2, 3, 5, 7, 8, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – П – Т – Т",
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
    description: "Тот же набор звуков, что у мажора, но опора на VI ступень. В A: A B C D E F G.",
    plain: "A-минор: A на 5-й струне, открытая. Дальше B (2-й лад), C (3-й), D (5-й), E (7-й). Всё рядом с открытыми позициями.",
    mistake: "Считать, что минор — это просто «грустный мажор». Это другой центр тяжести: аккорды строятся от A, а не от C.",
    sound: "Мягко и печально; идеальная база для песенной лирики.",
  },
  {
    id: "harmonicMinor", name: "Гармонический минор", family: "scale",
    offsets: [0, 2, 3, 5, 7, 8, 11], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – П – 1½Т – П",
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "7"],
    description: "Натуральный минор с повышенной VII ступенью: она создаёт тяготение в тонику.",
    plain: "A-гармонический: играй натуральный A-минор, но G (3-я струна, открытая) замени на G♯ (3-я струна, 1-й лад).",
    mistake: "Играть гармонический минор в обе стороны в мелодии — вниз обычно возвращаются к натуральному.",
    sound: "Напряжённо-восточно, «испанская» краска. Любимый минор классики.",
  },
  {
    id: "melodicMinorUp", name: "Мелодический минор ↑", family: "scale",
    offsets: [0, 2, 3, 5, 7, 9, 11], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – Т – Т – П",
    degrees: ["1", "2", "♭3", "4", "5", "6", "7"],
    description: "Вверх повышаются и VI, и VII ступени. Получается почти мажор с малой терцией.",
    plain: "A-мелодический вверх: A B C D E F♯ G♯. F♯ — 2-я струна, 2-й лад; G♯ — 1-я струна, 4-й лад.",
    mistake: "Забывать про нисходящее движение. В классике вниз играют натуральный минор — это два разных набора нот.",
    sound: "Мягко и «плавно»: мелодия сама ведёт вверх к тонике.",
  },
  {
    id: "melodicMinorDown", name: "Мелодический минор ↓", family: "scale",
    offsets: [0, 2, 3, 5, 7, 8, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – П – Т – Т",
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
    description: "Нисходящий вид мелодического минора совпадает с натуральным: VI и VII понижаются обратно.",
    plain: "Сыграй мелодический вверх до E на 1-й струне, 0-й лад, а вниз возвращайся уже с F и G — это и есть нисходящий вид.",
    mistake: "Думать, что это отдельная гамма. Это тот же мелодический минор, но при движении вниз.",
    sound: "Темнее на спуске, светлее на подъёме — так работает мелодия.",
  },
  {
    id: "harmonicMajor", name: "Гармонический мажор", family: "scale",
    offsets: [0, 2, 4, 5, 7, 8, 11], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – П – Т – П – 1½Т – П",
    degrees: ["1", "2", "3", "4", "5", "♭6", "7"],
    description: "Мажор с пониженной VI ступенью: появляется тяготение ♭6 → 5.",
    plain: "C-гармонический мажор: играй C-мажор, но A (3-я струна, 2-й лад) замени на A♭ (3-я струна, 1-й лад).",
    mistake: "Путать с мелодическим минором: здесь мажорная терция, а понижена шестая.",
    sound: "Свет с внезапной тенью; часто в кино и джазе.",
  },
  {
    id: "majorPent", name: "Мажорная пентатоника", family: "pentatonic",
    offsets: [0, 2, 4, 7, 9], steps: [0, 1, 2, 4, 5],
    formula: "Т – Т – 1½Т – Т – 1½Т",
    degrees: ["1", "2", "3", "5", "6"],
    description: "Пять нот мажора без IV и VII ступеней — без полутонов, поэтому «всё звучит».",
    plain: "C-мажорная пентатоника: C D E G A. Это открытые 5-я, 4-я, 2-я, 3-я, 1-я струны — весь «открытый» аккорд гитары.",
    mistake: "Начинать соло только с тоники. Начни с 3-й или 5-й ступени — мелодия оживёт.",
    sound: "Светло и просторно. Кантри, поп, мажорный рок.",
  },
  {
    id: "minorPent", name: "Минорная пентатоника", family: "pentatonic",
    offsets: [0, 3, 5, 7, 10], steps: [0, 2, 3, 4, 6],
    formula: "1½Т – Т – Т – 1½Т – Т",
    degrees: ["1", "♭3", "4", "5", "♭7"],
    description: "Пять нот натурального минора без II и VI ступеней. Самая популярная гамма для соло.",
    plain: "A-минорная: A C D E G. Начни A на 5-й струне, открытая, затем C (3-й лад), D (5-й), E (7-й), G (10-й).",
    mistake: "Играть только бокс 1. Пять боксов покрывают весь гриф, и переходы между ними — главный навык.",
    sound: "Тёмно и уверенно. Рок, блюз, металл.",
  },
  {
    id: "majorBlues", name: "Мажорная блюзовая", family: "blues",
    offsets: [0, 2, 3, 4, 7, 9], steps: [0, 1, 2, 2, 4, 5],
    formula: "Т – Т – П – П – 1½Т – Т",
    degrees: ["1", "2", "♭3", "3", "5", "6"],
    description: "Мажорная пентатоника + пониженная терция. ♭3 «трётся» о 3 — это и есть блюзовый вкус.",
    plain: "A-мажорная блюзовая: A B C C♯ E F♯. C — 2-я струна, 1-й лад; C♯ — 2-я струна, 2-й лад. Соседние ноты — играй их подряд!",
    mistake: "Держать ♭3 слишком долго. Это проходящая нота: сыграл — вернулся на 3 или ушёл на 2.",
    sound: "Блюз, кантри, рокабилли. Светло, но с «грязной» нотой.",
  },
  {
    id: "minorBlues", name: "Минорная блюзовая", family: "blues",
    offsets: [0, 3, 5, 6, 7, 10], steps: [0, 2, 3, 3, 4, 6],
    formula: "1½Т – Т – П – П – 1½Т – Т",
    degrees: ["1", "♭3", "4", "♭5", "5", "♭7"],
    description: "Минорная пентатоника + пониженная квинта. ♭5 — «блюзовая нота», самая характерная.",
    plain: "A-минорная блюзовая: A C D E♭ E G. E♭ — 4-я струна, 1-й лад; E — 4-я струна, 2-й лад. Бенд из E♭ в E — классика.",
    mistake: "Останавливаться на ♭5. Она должна разрешиться в 5 (или в 4), как вопрос в ответ.",
    sound: "Тёмный блюз, рок-баллады. «Грязный» оттенок — не ошибка, а краска.",
  },
  {
    id: "dorian", name: "Дорийский лад", family: "mode",
    offsets: [0, 2, 3, 5, 7, 9, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – Т – П – Т",
    degrees: ["1", "2", "♭3", "4", "5", "6", "♭7"],
    description: "Минор с повышенной VI ступенью. В A вместо F звучит F♯.",
    plain: "A-дорийский: A B C D E F♯ G. F♯ — 1-я струна, 2-й лад. Сыграй Am–D — лад «сядет» идеально.",
    mistake: "Играть дорийский над обычным минорным аккордом, который в этой тональности тяготеет к ♭6.",
    sound: "Минор с «просветом». Фанк, соул, джаз, гитарные баллады.",
  },
  {
    id: "phrygian", name: "Фригийский лад", family: "mode",
    offsets: [0, 1, 3, 5, 7, 8, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "П – Т – Т – Т – П – Т – Т",
    degrees: ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"],
    description: "Минор с пониженной II ступенью: полутон сразу от тоники.",
    plain: "A-фригийский: A B♭ C D E F G. B♭ — 5-я струна, 1-й лад. Сыграй A–B♭ — сразу слышно «испанский» характер.",
    mistake: "Путать с фригийским доминантовым (там мажорная терция).",
    sound: "Мрачно, по-испански. Фламенко, металл.",
  },
  {
    id: "lydian", name: "Лидийский лад", family: "mode",
    offsets: [0, 2, 4, 6, 7, 9, 11], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – Т – П – Т – Т – П",
    degrees: ["1", "2", "3", "♯4", "5", "6", "7"],
    description: "Мажор с повышенной IV ступенью. В C вместо F звучит F♯.",
    plain: "C-лидийский: C D E F♯ G A B. F♯ — 4-я струна, 4-й лад. Попробуй Cmaj7 — F♯ звучит как «простор».",
    mistake: "Играть лидийский над аккордом, где IV ступень натуральная: получится конфликт.",
    sound: "Мечтательно и «паряще». Кинематограф, прогрессив.",
  },
  {
    id: "mixolydian", name: "Миксолидийский лад", family: "mode",
    offsets: [0, 2, 4, 5, 7, 9, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – П – Т – Т – П – Т",
    degrees: ["1", "2", "3", "4", "5", "6", "♭7"],
    description: "Мажор с пониженной VII ступенью. В C вместо B звучит B♭.",
    plain: "G-миксолидийский: G A B C D E F. F — 1-я струна, 1-й лад. Идеально ложится на G7.",
    mistake: "Играть миксолидийский над обычным мажорным аккордом без септимы — теряется весь смысл.",
    sound: "Рок-н-ролл, блюз, фанк. «Тёплый» мажор.",
  },
  {
    id: "locrian", name: "Локрийский лад", family: "mode",
    offsets: [0, 1, 3, 5, 6, 8, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "П – Т – Т – П – Т – Т – Т",
    degrees: ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"],
    description: "Самый неустойчивый лад: понижены и II, и V ступени.",
    plain: "B-локрийский: B C D E F G A. F — 1-я струна, 1-й лад, G — 3-я струна, открытая. Опора почти «проваливается».",
    mistake: "Пытаться закончить фразу на тонике — в локрийском это звучит незавершённо, и это нормально.",
    sound: "Напряжённо, «подвешенно». Используется над m7♭5.",
  },
  {
    id: "phrygianDominant", name: "Фригийский доминантовый", family: "mode",
    offsets: [0, 1, 4, 5, 7, 8, 10], steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "П – 1½Т – П – Т – П – Т – Т",
    degrees: ["1", "♭2", "3", "4", "5", "♭6", "♭7"],
    description: "Мажорная терция + пониженная II: восточная, «фламенко»-краска.",
    plain: "E-фригийский доминантовый: E F G♯ A B C D. G♯ — 3-я струна, 1-й лад. Сыграй E–F — самый узнаваемый ход.",
    mistake: "Играть его слишком быстро и «ровно»: характер лада — в полутоне между 1 и ♭2.",
    sound: "Фламенко, восток, металл.",
  },
];

export const getScale = (id) => SCALES.find((item) => item.id === id) || SCALES[0];

export const PENTATONIC_TYPES = [
  { id: "minor", name: "Минорная (1 ♭3 4 5 ♭7)", scaleId: "minorPent" },
  { id: "major", name: "Мажорная (1 2 3 5 6)", scaleId: "majorPent" },
];

export const BLUES_TYPES = [
  { id: "minor", name: "Минорная блюзовая (1 ♭3 4 ♭5 5 ♭7)", scaleId: "minorBlues", blueDegree: 3, blueOffset: 6 },
  { id: "major", name: "Мажорная блюзовая (1 2 ♭3 3 5 6)", scaleId: "majorBlues", blueDegree: 2, blueOffset: 3 },
];

/** Правильные имена ступеней гаммы от конкретной тоники. */
export function scaleNames(root, scale) {
  return scale.offsets.map((offset, i) => spellInterval(root, offset, scale.steps[i]));
}

/** Ноты гаммы от тоники: [{ midi, name, offset, degree }] + октавный повтор. */
export function scaleNoteList(root, scale) {
  const base = rootMidi(root);
  const names = scaleNames(root, scale);
  const list = scale.offsets.map((offset, i) => ({
    midi: base + offset,
    name: names[i],
    offset,
    degree: scale.degrees[i],
  }));
  list.push({ midi: base + 12, name: root, offset: 12, degree: "8" });
  return list;
}

/** Гамма в нотах от тоники на заданной высоте (для игры на грифе). */
export function scaleMidiSet(root, scale, octaves = 2) {
  const base = rootMidi(root);
  return Array.from({ length: octaves }, (_, octave) =>
    scale.offsets.map((offset) => base + offset + octave * 12),
  ).flat();
}

/* ------------------------------------------------------------------ */
/*  Позиции (боксы) на грифе                                           */
/* ------------------------------------------------------------------ */

/**
 * Лад тоники на заданной струне, в пределах 0–12.
 * Если получается 0–2, переносим на октаву выше: так позиция удобнее.
 */
export function rootFretOnString(pc, stringIndex) {
  const openPc = mod(STRINGS[stringIndex].midi);
  let fret = mod(pc - openPc, 12);
  return fret;
}

/**
 * Три позиции для обычной гаммы (не пентатоники).
 * Строим окна по 4–5 ладов, начиная с тоники на 6-й, 5-й и 4-й струнах.
 * Каждая позиция возвращает:
 *   { title, fretFrom, fretTo, anchorString, anchorFret, notes: [{string, fret, degree, isRoot}] }
 */
export function scalePositions(rootPc, scale, count = 3) {
  const raw = [];
  [5, 4, 3, 2].forEach((stringIndex) => {
    const fret = rootFretOnString(rootPc, stringIndex);
    const candidate = fret < 3 ? fret + 12 : fret;
    raw.push({ stringIndex, fret: candidate, raw: fret });
  });
  // Сортируем окна по грифу и убираем слишком близкие (разница меньше 3 ладов).
  const sorted = raw.sort((a, b) => a.fret - b.fret);
  const picked = [];
  sorted.forEach((item) => {
    if (picked.length < count && picked.every((p) => Math.abs(p.fret - item.fret) >= 3)) {
      picked.push(item);
    }
  });
  // Если не хватило — добавляем окна через 12 ладов от найденных.
  while (picked.length < count) {
    const base = sorted[picked.length % sorted.length];
    picked.push({ stringIndex: base.stringIndex, fret: Math.min(LAST_FRET - 2, base.fret + 5) });
  }

  const pcs = scale.offsets.map((offset) => mod(rootPc + offset));
  return picked.map((anchor, index) => {
    const fretFrom = Math.max(0, anchor.fret - 1);
    const fretTo = Math.min(LAST_FRET, anchor.fret + 3);
    const notes = [];
    for (let string = 0; string < STRINGS.length; string++) {
      for (let fret = fretFrom; fret <= fretTo; fret++) {
        const midi = STRINGS[string].midi + fret;
        const pc = mod(midi);
        const offset = mod(pc - rootPc);
        const degreeIndex = scale.offsets.indexOf(offset);
        if (degreeIndex >= 0) {
          notes.push({
            string,
            fret,
            midi,
            degree: scale.degrees[degreeIndex],
            isRoot: offset === 0,
            finger: Math.min(4, Math.max(1, fret - fretFrom + 1)),
          });
        }
      }
    }
    return {
      id: index + 1,
      title: `Позиция ${index + 1}`,
      fretFrom,
      fretTo,
      anchorString: anchor.stringIndex,
      anchorFret: anchor.fret,
      hint: `тоника на ${anchor.stringIndex + 1}-й струне, ${anchor.fret}-й лад`,
      notes,
    };
  });
}

/**
 * Пять боксов пентатоники (или блюзовой гаммы) от тоники.
 * Дополнительно возвращаем ноты внутри окна и подсветку блюзовой ноты.
 */
export function pentatonicPositions(tonicPc, type = "minor", extraOffset = null) {
  const boxes = pentatonicBoxes(tonicPc, type);
  const scale = getScale(type === "major" ? "majorPent" : "minorPent");
  const offsets = [...scale.offsets];
  if (extraOffset != null) offsets.push(extraOffset);
  return boxes.map((box) => {
    const notes = [];
    for (let string = 0; string < STRINGS.length; string++) {
      for (let fret = box.fretFrom; fret <= box.fretTo; fret++) {
        const midi = STRINGS[string].midi + fret;
        const offset = mod(midi - tonicPc);
        const index = offsets.indexOf(offset);
        if (index >= 0) {
          notes.push({
            string, fret, midi,
            isRoot: offset === 0,
            isBlue: extraOffset != null && offset === extraOffset,
            degree: index < scale.degrees.length ? scale.degrees[index] : "♭5",
          });
        }
      }
    }
    return {
      ...box,
      notes,
      window: () => boxWindow(box),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Блюз: 12 тактов                                                    */
/* ------------------------------------------------------------------ */

export const BLUES_DEGREES = [
  ["I7", "I7", "I7", "I7"],
  ["IV7", "IV7", "I7", "I7"],
  ["V7", "IV7", "I7", "V7"],
];

/** Подписи аккордов 12-тактового блюза для тоники. */
export function twelveBarBlues(root) {
  const names = ["I7", "IV7", "V7"];
  const intervals = [0, 5, 7];
  const chords = intervals.map((offset, i) => {
    const name = spellInterval(root, offset, [0, 3, 4][i]);
    return { degree: names[i], name: prettyNote(name), offset };
  });
  const byDegree = Object.fromEntries(chords.map((chord, i) => [names[i], chord]));
  return {
    root,
    chords,
    bars: BLUES_DEGREES.flat().map((degree, index) => ({
      bar: index + 1,
      degree,
      chord: byDegree[degree],
    })),
  };
}

/** Подпись ступени по её полутону от тоники — для подсказок. */
export function degreeName(offset, scale) {
  const index = scale.offsets.indexOf(mod(offset));
  return index >= 0 ? scale.degrees[index] : "?";
}

export { parseNote, prettyNote, scalePcs };
