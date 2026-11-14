/*
 * ЯДРО: ноты, октавы, MIDI, строение грифа.
 *
 * Здесь нет ни одной зависимости от DOM. Модуль можно использовать
 * и в браузере, и в Node (проверка данных в tools/check.mjs).
 *
 * Договорённости:
 *  - высота звука — целое число MIDI (C4 = 60, A4 = 69);
 *  - класс высоты (pitch class) — MIDI % 12, от 0 (C) до 11 (B);
 *  - имя ноты (C, C#, Db, E#) хранится отдельно от высоты: C# и Db
 *    звучат одинаково, но обозначают разные ступени.
 */

// Полутоны натуральных нот от C.
export const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Буквы по порядку — нужны, чтобы правильно писать интервалы (шаги по буквам).
export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

// Удобные варианты записи для тестов: по умолчанию — смешанная (как в учебниках).
export const CHROMATIC = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Русские названия — пригодятся в подсказках и в статистике.
export const SOLFEGE_RU = {
  C: "до", D: "ре", E: "ми", F: "фа", G: "соль", A: "ля", B: "си",
};

/** Остаток по модулю, всегда неотрицательный. */
export const mod = (n, base = 12) => ((n % base) + base) % base;

/**
 * Гриф: от тонкой (1-й) струны сверху к толстой (6-й) снизу.
 * `midi` — высота открытой струны.
 */
export const STRINGS = [
  { name: "e", midi: 64, number: 1 },
  { name: "B", midi: 59, number: 2 },
  { name: "G", midi: 55, number: 3 },
  { name: "D", midi: 50, number: 4 },
  { name: "A", midi: 45, number: 5 },
  { name: "E", midi: 40, number: 6 },
];
export const STRING_COUNT = STRINGS.length;

/** Список тоник для выпадающих списков (смешанная запись, как в учебниках). */
export const ROOTS = [...CHROMATIC];
export const LAST_FRET = 15; // на схеме рисуем 0–15 лады

/** Разбор названия ноты, в том числе двойных знаков (Bbb, F##). */
export function parseNote(name) {
  const match = /^([A-G])(#{1,2}|b{1,3})?$/.exec(String(name).trim());
  if (!match) throw new Error("Неизвестная нота: " + name);
  const accidental = match[2] || "";
  const alteration = accidental.startsWith("#") ? accidental.length : -accidental.length;
  return {
    letter: match[1],
    accidental,
    alteration,
    pc: mod(NATURAL_PC[match[1]] + alteration),
  };
}

/** Красивая запись: ♯ и ♭ вместо # и b. */
export function prettyNote(name) {
  return String(name).replace(/#/g, "♯").replace(/b/g, "♭");
}

/** Октава по MIDI: 60 → 4. */
export function midiOctave(midi) {
  return Math.floor(midi / 12) - 1;
}

// Смещение буквы внутри октавы для записи на стане (C=0, D=1, ... B=6).
const LETTER_STEP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/**
 * Октава, в которой нота записывается на стане.
 * Например, B#3 звучит как C4, но записывается в 3-й октаве.
 */
export function writtenOctave(name, midi) {
  const note = parseNote(name);
  return Math.floor((midi - LETTER_STEP[note.letter] - note.alteration) / 12) - 1;
}

/** Имя с октавой для подписи: C4, F♯3. */
export function writtenNote(name, midi) {
  return prettyNote(name) + writtenOctave(name, midi);
}

/**
 * Правильное имя верхней ноты интервала.
 * Учитывает и полутоны, и количество пройденных букв:
 * б.3 от C — это E, а не F; ум.7 от C — это Bbb, а не A.
 */
export function spellInterval(root, semitones, letterSteps) {
  const parsed = parseNote(root);
  const letter = LETTERS[mod(LETTERS.indexOf(parsed.letter) + letterSteps, 7)];
  const wanted = mod(parsed.pc + semitones);
  let difference = mod(wanted - NATURAL_PC[letter]);
  if (difference > 6) difference -= 12;
  return letter + (difference > 0 ? "#".repeat(difference) : "b".repeat(-difference));
}

/** Средняя высота для раздела «Ноты»: тоника в 3-й октаве (C3…B3). */
export function rootMidi(root) {
  return 48 + parseNote(root).pc;
}

/** Ноты гаммы с правильными именами: [{ midi, name }]. */
export function scaleNotes(root, scale, withOctave = true) {
  const base = rootMidi(root);
  const names = scale.offsets.map((offset, i) => spellInterval(root, offset, scale.steps[i]));
  const result = scale.offsets.map((offset, i) => ({ midi: base + offset, name: names[i] }));
  if (withOctave) result.push({ midi: base + 12, name: root });
  return result;
}

/** Только классы высот гаммы — удобно для подсветки грифа. */
export function scalePcs(root, scale) {
  const pc = parseNote(root).pc;
  return scale.offsets.map((offset) => mod(pc + offset));
}

/** Карта «класс высоты → правильное имя» для подписей на грифе. */
export function nameMap(names) {
  return Object.fromEntries(names.map((name) => [parseNote(name).pc, name]));
}

/**
 * Все места на грифе, где звучит данная высота (0–15 лад).
 * Возвращает [{ string, fret, midi, key }], где key — "струна:лад".
 */
export function positionsForMidi(midi, maxFret = LAST_FRET) {
  return STRINGS.flatMap((string, index) => {
    const fret = midi - string.midi;
    return fret >= 0 && fret <= maxFret
      ? [{ string: index, fret, midi, key: index + ":" + fret }]
      : [];
  });
}

/** Самая удобная позиция: сначала низкий лад, затем толстая струна. */
export function bestPosition(midi) {
  return positionsForMidi(midi).sort((a, b) => a.fret - b.fret || b.string - a.string)[0];
}

/** Сколько разных мест на грифе у ноты. */
export function positionCount(midi) {
  return positionsForMidi(midi).length;
}

/** Человеческая подпись позиции: «5-я струна, 3-й лад». */
export function describePosition(position) {
  return `${position.string + 1}-я струна, ${position.fret === 0 ? "открытая" : position.fret + "-й лад"}`;
}

/** Обратное преобразование: струна + лад → MIDI. */
export function midiAt(stringIndex, fret) {
  return STRINGS[stringIndex].midi + fret;
}

/* ------------------------------------------------------------------ */
/*  Пентатоника и её пять боксов                                       */
/* ------------------------------------------------------------------ */

/*
 * Бокс (позиция) — окно в четыре лада, в котором удобно сыграть всю
 * пентатонику пятью пальцами. Окна отсчитываем от лада тоники
 * на 6-й (толстой) струне: для A это 5-й лад, поэтому бокс 1 — лады 5–8.
 *
 *   минорная (1 ♭3 4 5 ♭7): +0, +3, +5, +7, +10 ладов
 *   мажорная (1 2 3 5 6):   +0, +2, +4, +7, +9  ладов
 *
 * Каждое следующее окно шире предыдущего на 2–3 лада. Пятое окно для A
 * попадает на 15-й лад, поэтому «заворачиваем» его назад — на 3-й:
 * это тот же рисунок, просто ниже по грифу.
 */
const PENT_BOX_STARTS = {
  minor: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 7, 9],
};

/** Ляд тоники на 6-й струне: для A (9) это 5, для C (0) — 8. */
export function rootFretOnLowE(tonicPc) {
  return mod(tonicPc - mod(STRINGS[5].midi), 12);
}

/**
 * Пять боксов для конкретной тоники.
 * type: "minor" (1 ♭3 4 5 ♭7) или "major" (1 2 3 5 6).
 * Возвращает [{ id, title, start, end, hint }] — start/end в ладах.
 */
export function pentatonicBoxes(tonicPc, type = "minor") {
  const anchor = rootFretOnLowE(tonicPc);
  const starts = PENT_BOX_STARTS[type === "major" ? "major" : "minor"];
  return starts.map((offset, index) => {
    let start = anchor + offset;
    if (start > 12) start -= 12; // заворачиваем последний бокс вниз по грифу
    // Окно не должно вылезать за 0-й лад: сдвигаем на октаву вверх.
    if (start < 0) start += 12;
    const end = Math.min(LAST_FRET, start + 3);
    // Подсказку не храним списком: какая струна даёт тонику, зависит от
    // тоники и типа. Считаем по факту — так подпись никогда не врёт.
    const rootStrings = [];
    for (let string = 0; string < STRINGS.length; string++) {
      for (let fret = start; fret <= end; fret++) {
        if (mod(STRINGS[string].midi + fret) === mod(tonicPc)) {
          rootStrings.push(string + 1);
          break;
        }
      }
    }
    const hint = rootStrings.length === 1
      ? `тоника на ${rootStrings[0]}-й струне`
      : `тоника на ${rootStrings.slice(0, -1).join(", ")}-й и ${rootStrings.at(-1)}-й струнах`;

    return {
      id: index + 1,
      title: `Бокс ${index + 1}`,
      start,
      end,
      rootStrings,
      hint,
    };
  });
}

/**
 * Зона бокса на грифе. Окно задаётся ладами, поэтому одинаково
 * для всех струн. Возвращает { from, to } или null.
 */
export function boxWindow(box) {
  const from = Math.max(0, box.start);
  const to = Math.min(LAST_FRET, box.end);
  if (to < from) return null;
  return { from, to };
}

/* ------------------------------------------------------------------ */
/*  Служебные помощники                                                */
/* ------------------------------------------------------------------ */

export const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const unique = (items) => [...new Set(items)];

/** Русское склонение: plural(3, ["нота", "ноты", "нот"]) → "ноты". */
export function plural(number, forms) {
  const n = Math.abs(number) % 100;
  const last = n % 10;
  if (n >= 11 && n <= 14) return forms[2];
  return last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
}

/** «4 полутона» — с правильным окончанием. */
export function semiText(n) {
  return `${n} ${plural(n, ["полутон", "полутона", "полутонов"])}`;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** Сравнение высот по модулю 12 (энгармоническая эквивалентность). */
export const samePc = (midiA, midiB) => mod(midiA) === mod(midiB);
