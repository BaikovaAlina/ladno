/*
 * data/notes.js — базовая звуковысотная математика, ноты, энгармонизм и строй гитары.
 * Все звучащие высоты хранятся в MIDI-полутонах (C4 = 60).
 * Имя ноты хранится отдельно от класса высоты (pc = midi % 12), чтобы различать C# и Db, E# и F, Bbb и A.
 */

export const mod = (number, base = 12) => ((number % base) + base) % base;

export const randomItem = (items) =>
  items[Math.floor(Math.random() * items.length)];

export const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const unique = (items) => [...new Set(items)];

export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

export function plural(number, forms) {
  const n = Math.abs(number) % 100;
  const last = n % 10;
  if (n >= 11 && n <= 14) return forms[2];
  return last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
}

// Стандартный строй шестиструнной гитары (сверху вниз: от 1-й тонкой к 6-й басовой).
export const STRINGS = [
  {
    index: 0,
    number: 1,
    name: "e",
    openNote: "E",
    midi: 64,
    label: "1-я (ми¹)",
  },
  {
    index: 1,
    number: 2,
    name: "B",
    openNote: "B",
    midi: 59,
    label: "2-я (си)",
  },
  {
    index: 2,
    number: 3,
    name: "G",
    openNote: "G",
    midi: 55,
    label: "3-я (соль)",
  },
  {
    index: 3,
    number: 4,
    name: "D",
    openNote: "D",
    midi: 50,
    label: "4-я (ре)",
  },
  {
    index: 4,
    number: 5,
    name: "A",
    openNote: "A",
    midi: 45,
    label: "5-я (ля)",
  },
  {
    index: 5,
    number: 6,
    name: "E",
    openNote: "E",
    midi: 40,
    label: "6-я (ми)",
  },
];

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

export const NATURAL_PC = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const SOLFEGGIO_RU = {
  C: "До",
  D: "Ре",
  E: "Ми",
  F: "Фа",
  G: "Соль",
  A: "Ля",
  B: "Си",
};

export const CHROMATIC = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export const ROOTS = [...CHROMATIC];

// Разбор буквенного имени ноты с поддержкой одинарных и двойных знаков альтерации (#, ##, b, bb).
export function parseNote(name) {
  const match = /^([A-G])(#{1,2}|b{1,2})?$/.exec(String(name).trim());
  if (!match) {
    throw new Error("Неизвестная нота: " + name);
  }
  const letter = match[1];
  const accidental = match[2] || "";
  const alteration = accidental.startsWith("#")
    ? accidental.length
    : -accidental.length;
  return {
    letter,
    accidental,
    alteration,
    pc: mod(NATURAL_PC[letter] + alteration),
  };
}

// Красивое отображение знаков альтерации для интерфейса.
export function prettyNote(name) {
  return String(name).replace(/#/g, "♯").replace(/b/g, "♭");
}

// Русское слоговое название ноты («До♯», «Ми♭») для подсказок новичку.
export function russianNoteName(name) {
  const parsed = parseNote(name);
  const sign = parsed.accidental.replace(/#/g, "♯").replace(/b/g, "♭");
  return (SOLFEGGIO_RU[parsed.letter] || parsed.letter) + sign;
}

export function midiOctave(midi) {
  return Math.floor(midi / 12) - 1;
}

// Вычисление записываемой октавы с учётом энгармонизма (например, Cb4 = MIDI 59, B#3 = MIDI 60).
export function writtenOctave(name, midi) {
  const note = parseNote(name);
  return (
    Math.floor((midi - NATURAL_PC[note.letter] - note.alteration) / 12) - 1
  );
}

export function writtenNote(name, midi) {
  return `${prettyNote(name)}${writtenOctave(name, midi)}`;
}

// Опорная MIDI-высота тоники в малой/первой октаве (от C3 = 48 до B3 = 59).
export function rootMidi(root, baseMidi = 48) {
  return baseMidi + parseNote(root).pc;
}

// Грамотная запись ступени по числу полутонов и шагов по названиям нот.
export function spellInterval(root, semitones, letterSteps) {
  const parsed = parseNote(root);
  const letter = LETTERS[mod(LETTERS.indexOf(parsed.letter) + letterSteps, 7)];
  const wanted = mod(parsed.pc + semitones);
  let difference = mod(wanted - NATURAL_PC[letter]);
  if (difference > 6) difference -= 12;
  return (
    letter + (difference > 0 ? "#".repeat(difference) : "b".repeat(-difference))
  );
}

export function nameMap(names) {
  return Object.fromEntries(names.map((name) => [parseNote(name).pc, name]));
}

// Поиск всех позиций конкретной высоты MIDI на грифе в пределах maxFret.
export function positionsForMidi(midi, maxFret = 12) {
  return STRINGS.flatMap((string, index) => {
    const fret = midi - string.midi;
    return fret >= 0 && fret <= maxFret
      ? [
          {
            string: index,
            fret,
            midi,
            pc: mod(midi),
            key: `${index}:${fret}`,
          },
        ]
      : [];
  });
}

export function describePosition(position) {
  return `${position.string + 1}-я струна, ${
    position.fret === 0 ? "открытая (0 лад)" : `${position.fret}-й лад`
  }`;
}

export function bestPosition(midi, maxFret = 12) {
  return positionsForMidi(midi, maxFret).sort(
    (a, b) => a.fret - b.fret || b.string - a.string,
  )[0];
}

// Набор нот в I–V позициях гитары для модуля 14 «Чтение с листа и нотация».
// Включает натуральные ноты и базовые случайные знаки в рабочем диапазоне гитары (E2..A4 по реальному звучанию).
export const SIGHT_READING_POOL = [
  { midi: 40, name: "E" },
  { midi: 41, name: "F" },
  { midi: 43, name: "G" },
  { midi: 45, name: "A" },
  { midi: 47, name: "B" },
  { midi: 48, name: "C" },
  { midi: 50, name: "D" },
  { midi: 52, name: "E" },
  { midi: 53, name: "F" },
  { midi: 54, name: "F#" },
  { midi: 55, name: "G" },
  { midi: 57, name: "A" },
  { midi: 58, name: "Bb" },
  { midi: 59, name: "B" },
  { midi: 60, name: "C" },
  { midi: 61, name: "C#" },
  { midi: 62, name: "D" },
  { midi: 64, name: "E" },
  { midi: 65, name: "F" },
  { midi: 66, name: "F#" },
  { midi: 67, name: "G" },
  { midi: 69, name: "A" },
];
