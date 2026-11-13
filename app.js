"use strict";

/*
 * ЛАДНО — приложение без сборщика и сервера.
 * Высота хранится в MIDI: C4 = 60. Остаток от деления на 12 — класс ноты.
 * Название ноты хранится отдельно: C# и Db звучат одинаково, но пишутся по-разному.
 */
const $ = (selector) => document.querySelector(selector);
const byId = (id) => document.getElementById(id);
const mod = (number, base = 12) => ((number % base) + base) % base;
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const unique = (items) => [...new Set(items)];
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// Строки идут сверху вниз: тонкая первая струна — сверху, толстая шестая — снизу.
const STRINGS = [
  { name: "e", midi: 64 },
  { name: "B", midi: 59 },
  { name: "G", midi: 55 },
  { name: "D", midi: 50 },
  { name: "A", midi: 45 },
  { name: "E", midi: 40 },
];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHROMATIC = [
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
const SHARP_NAMES = [
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
const ROOTS = [...CHROMATIC];

// В названии также поддержаны двойные знаки: они необходимы, например, для C°7.
function parseNote(name) {
  const match = /^([A-G])(#{1,2}|b{1,2})?$/.exec(name);
  if (!match) throw new Error("Неизвестная нота: " + name);
  const accidental = match[2] || "";
  const alteration = accidental.startsWith("#")
    ? accidental.length
    : -accidental.length;
  return {
    letter: match[1],
    accidental,
    alteration,
    pc: mod(NATURAL_PC[match[1]] + alteration),
  };
}
function prettyNote(name) {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}
function midiOctave(midi) {
  return Math.floor(midi / 12) - 1;
}
function writtenOctave(name, midi) {
  const note = parseNote(name);
  return (
    Math.floor((midi - NATURAL_PC[note.letter] - note.alteration) / 12) - 1
  );
}
function writtenNote(name, midi) {
  return prettyNote(name) + writtenOctave(name, midi);
}
function rootMidi(root) {
  return 48 + parseNote(root).pc;
} // от C3 до B3

// Сохраняем правильное имя ступени, а не только её звучание.
// Например, терция C# — это E#, а не F; септима C°7 — Bbb, а не A.
function spellInterval(root, semitones, letterSteps) {
  const parsed = parseNote(root);
  const letter = LETTERS[mod(LETTERS.indexOf(parsed.letter) + letterSteps, 7)];
  const wanted = mod(parsed.pc + semitones);
  let difference = mod(wanted - NATURAL_PC[letter]);
  if (difference > 6) difference -= 12;
  return (
    letter + (difference > 0 ? "#".repeat(difference) : "b".repeat(-difference))
  );
}

const INTERVALS = [
  {
    id: "p1",
    name: "Чистая прима",
    semitones: 0,
    steps: 0,
    character: "совершенный консонанс",
  },
  {
    id: "m2",
    name: "Малая секунда",
    semitones: 1,
    steps: 1,
    character: "диссонанс",
  },
  {
    id: "M2",
    name: "Большая секунда",
    semitones: 2,
    steps: 1,
    character: "диссонанс",
  },
  {
    id: "m3",
    name: "Малая терция",
    semitones: 3,
    steps: 2,
    character: "несовершенный консонанс",
  },
  {
    id: "M3",
    name: "Большая терция",
    semitones: 4,
    steps: 2,
    character: "несовершенный консонанс",
  },
  {
    id: "p4",
    name: "Чистая кварта",
    semitones: 5,
    steps: 3,
    character: "консонанс; над басом может требовать разрешения",
  },
  {
    id: "a4",
    name: "Тритон (увеличенная кварта)",
    semitones: 6,
    steps: 3,
    character: "диссонанс; звучит как уменьшённая квинта",
  },
  {
    id: "p5",
    name: "Чистая квинта",
    semitones: 7,
    steps: 4,
    character: "совершенный консонанс",
  },
  {
    id: "m6",
    name: "Малая секста",
    semitones: 8,
    steps: 5,
    character: "несовершенный консонанс",
  },
  {
    id: "M6",
    name: "Большая секста",
    semitones: 9,
    steps: 5,
    character: "несовершенный консонанс",
  },
  {
    id: "m7",
    name: "Малая септима",
    semitones: 10,
    steps: 6,
    character: "диссонанс",
  },
  {
    id: "M7",
    name: "Большая септима",
    semitones: 11,
    steps: 6,
    character: "диссонанс",
  },
  {
    id: "p8",
    name: "Чистая октава",
    semitones: 12,
    steps: 7,
    character: "совершенный консонанс",
  },
];

// offsets — полутона от корня; steps — сколько букв нужно пройти по алфавиту нот.
const TRIADS = [
  {
    id: "major",
    name: "Мажорное",
    symbol: "",
    offsets: [0, 4, 7],
    steps: [0, 2, 4],
    description:
      "Большая терция + малая терция: 4 + 3 полутона. Обычно звучит светло и устойчиво.",
  },
  {
    id: "minor",
    name: "Минорное",
    symbol: "m",
    offsets: [0, 3, 7],
    steps: [0, 2, 4],
    description:
      "Малая терция + большая терция: 3 + 4 полутона. Обычно звучит мягче и темнее.",
  },
  {
    id: "dim",
    name: "Уменьшённое",
    symbol: "°",
    offsets: [0, 3, 6],
    steps: [0, 2, 4],
    description: "Две малые терции: 3 + 3 полутона. Звучит неустойчиво.",
  },
  {
    id: "aug",
    name: "Увеличенное",
    symbol: "+",
    offsets: [0, 4, 8],
    steps: [0, 2, 4],
    description:
      "Две большие терции: 4 + 4 полутона. Звучит напряжённо и необычно.",
  },
];
const SEVENTHS = [
  {
    id: "maj7",
    name: "Большой мажорный (maj7)",
    symbol: "maj7",
    offsets: [0, 4, 7, 11],
    steps: [0, 2, 4, 6],
    description: "Мажорное трезвучие и большая септима: 4 + 3 + 4 полутона.",
  },
  {
    id: "m7",
    name: "Малый минорный (m7)",
    symbol: "m7",
    offsets: [0, 3, 7, 10],
    steps: [0, 2, 4, 6],
    description: "Минорное трезвучие и малая септима: 3 + 4 + 3 полутона.",
  },
  {
    id: "dom7",
    name: "Доминантсептаккорд (7)",
    symbol: "7",
    offsets: [0, 4, 7, 10],
    steps: [0, 2, 4, 6],
    description: "Мажорное трезвучие и малая септима: 4 + 3 + 3 полутона.",
  },
  {
    id: "dim7",
    name: "Уменьшённый (°7)",
    symbol: "°7",
    offsets: [0, 3, 6, 9],
    steps: [0, 2, 4, 6],
    description:
      "Уменьшённое трезвучие и уменьшённая септима: три малые терции, 3 + 3 + 3.",
  },
  {
    id: "half",
    name: "Полууменьшённый (m7♭5)",
    symbol: "m7♭5",
    offsets: [0, 3, 6, 10],
    steps: [0, 2, 4, 6],
    description: "Уменьшённое трезвучие и малая септима: 3 + 3 + 4 полутона.",
  },
  {
    id: "mMaj7",
    name: "Большой минорный (m maj7)",
    symbol: "m(maj7)",
    offsets: [0, 3, 7, 11],
    steps: [0, 2, 4, 6],
    description: "Минорное трезвучие и большая септима: 3 + 4 + 4 полутона.",
  },
];
const SCALES = [
  {
    id: "major",
    name: "Мажорная",
    offsets: [0, 2, 4, 5, 7, 9, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – П – Т – Т – Т – П",
    description:
      "Светлая опорная палитра; тот же набор ступеней называют ионийским ладом. В C: C D E F G A B.",
  },
  {
    id: "naturalMinor",
    name: "Минорная натуральная",
    offsets: [0, 2, 3, 5, 7, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – П – Т – Т",
    description:
      "Более мягкая и часто грустная окраска; это эолийский лад. В A: A B C D E F G.",
  },
  {
    id: "harmonicMinor",
    name: "Минорная гармоническая",
    offsets: [0, 2, 3, 5, 7, 8, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – П – 1½Т – П",
    description:
      "Натуральный минор с повышенной VII ступенью. В A: G становится G♯; на 3-й струне это 1-й лад вместо открытой.",
  },
  {
    id: "melodicMinor",
    name: "Минорная мелодическая ↑",
    offsets: [0, 2, 3, 5, 7, 9, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – Т – Т – П",
    description:
      "В классической практике вверх повышаются VI и VII ступени; вниз играют натуральный минор. На грифе и стане показан подъём.",
  },
  {
    id: "majorPent",
    name: "Мажорная пентатоника",
    offsets: [0, 2, 4, 7, 9],
    steps: [0, 1, 2, 4, 5],
    formula: "Т – Т – 1½Т – Т – 1½Т",
    description:
      "Пять звуков без IV и VII ступеней мажора. В C это C D E G A — удобно начинать импровизацию.",
  },
  {
    id: "minorPent",
    name: "Минорная пентатоника",
    offsets: [0, 3, 5, 7, 10],
    steps: [0, 2, 3, 4, 6],
    formula: "1½Т – Т – Т – 1½Т – Т",
    description:
      "Пять звуков без II и VI ступеней натурального минора. В A это A C D E G.",
  },
  {
    id: "dorian",
    name: "Дорийский лад",
    offsets: [0, 2, 3, 5, 7, 9, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – П – Т – Т – Т – П – Т",
    description:
      "Минорная окраска с повышенной VI ступенью. В A вместо F натурального минора звучит F♯.",
  },
  {
    id: "phrygian",
    name: "Фригийский лад",
    offsets: [0, 1, 3, 5, 7, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "П – Т – Т – Т – П – Т – Т",
    description:
      "Минорная окраска с пониженной II ступенью. В A полутон сразу от A к B♭ создаёт характерное напряжение.",
  },
  {
    id: "lydian",
    name: "Лидийский лад",
    offsets: [0, 2, 4, 6, 7, 9, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – Т – П – Т – Т – П",
    description:
      "Мажорная окраска с повышенной IV ступенью. В C вместо F звучит F♯ — это придаёт ощущение простора.",
  },
  {
    id: "mixolydian",
    name: "Миксолидийский лад",
    offsets: [0, 2, 4, 5, 7, 9, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "Т – Т – П – Т – Т – П – Т",
    description:
      "Мажорная окраска с пониженной VII ступенью. В C вместо B звучит B♭; лад подходит к C7.",
  },
  {
    id: "locrian",
    name: "Локрийский лад",
    offsets: [0, 1, 3, 5, 6, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    formula: "П – Т – Т – П – Т – Т – Т",
    description:
      "Неустойчивый минорный лад с пониженной II и V ступенями. В C это D♭ и G♭.",
  },
];
const PROGRESSIONS = [
  { id: "1451", name: "I – IV – V – I", degrees: [0, 3, 4, 0] },
  { id: "1564", name: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
  { id: "1645", name: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
  { id: "2511", name: "ii – V – I – I", degrees: [1, 4, 0, 0] },
];
const ROMANS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const FUNCTIONS = ["T", "S", "T", "S", "D", "T", "D"];
const CIRCLE = [
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
// Три дополнительные записи тех же высот завершают круг до 15 мажорных тональностей.
const ENHARMONIC_KEYS = [
  { major: "Cb", minor: "Abm", count: 7, kind: "b", circleIndex: 5 },
  { major: "Gb", minor: "Ebm", count: 6, kind: "b", circleIndex: 6 },
  { major: "C#", minor: "A#m", count: 7, kind: "#", circleIndex: 7 },
];
const KEY_ORDER = {
  "#": ["F#", "C#", "G#", "D#", "A#", "E#", "B#"],
  b: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"],
};

function getScale(id) {
  return SCALES.find((item) => item.id === id) || SCALES[0];
}
function getTriad(id) {
  return TRIADS.find((item) => item.id === id) || TRIADS[0];
}
function getSeventh(id) {
  return SEVENTHS.find((item) => item.id === id) || SEVENTHS[0];
}
function getInterval(id) {
  return INTERVALS.find((item) => item.id === id) || INTERVALS[4];
}
function getProgression(id) {
  return PROGRESSIONS.find((item) => item.id === id) || PROGRESSIONS[0];
}
function scaleNames(root, scale) {
  return scale.offsets.map((n, i) => spellInterval(root, n, scale.steps[i]));
}
function scalePcs(root, scale) {
  return scale.offsets.map((n) => mod(parseNote(root).pc + n));
}
function nameMap(names) {
  return Object.fromEntries(names.map((name) => [parseNote(name).pc, name]));
}
function scaleNotes(root, scale, withOctave = true) {
  const midi = rootMidi(root);
  const names = scaleNames(root, scale);
  const result = scale.offsets.map((offset, i) => ({
    midi: midi + offset,
    name: names[i],
  }));
  if (withOctave) result.push({ midi: midi + 12, name: root });
  return result;
}
function makeChord(root, type, inversion = 0) {
  const names = type.offsets.map((offset, i) =>
    spellInterval(root, offset, type.steps[i]),
  );
  const midi = rootMidi(root);
  const notes = type.offsets.map((offset, i) => ({
    midi: midi + offset + (i < inversion ? 12 : 0),
    name: names[i],
  }));
  notes.sort((a, b) => a.midi - b.midi);
  return {
    root,
    type,
    names,
    notes,
    pcs: names.map((n) => parseNote(n).pc),
    symbol: prettyNote(root) + type.symbol,
  };
}
function chordOfDegree(root, degree) {
  const major = getScale("major");
  const name = scaleNames(root, major)[degree];
  const type = getTriad(
    ["major", "minor", "minor", "major", "major", "minor", "dim"][degree],
  );
  return {
    ...makeChord(name, type),
    degree,
    roman: ROMANS[degree],
    fn: FUNCTIONS[degree],
  };
}
function progressionChords(root, progression) {
  return progression.degrees.map((degree) => chordOfDegree(root, degree));
}

// Все позиции конкретной высоты на первых 12 ладах, включая открытые струны.
function positionsForMidi(midi) {
  return STRINGS.flatMap((string, index) => {
    const fret = midi - string.midi;
    return fret >= 0 && fret <= 12
      ? [{ string: index, fret, midi, key: index + ":" + fret }]
      : [];
  });
}
function describePosition(position) {
  return `${position.string + 1}-я струна, ${position.fret === 0 ? "открытая" : position.fret + "-й лад"}`;
}
function bestPosition(midi) {
  return positionsForMidi(midi).sort(
    (a, b) => a.fret - b.fret || b.string - a.string,
  )[0];
}
// Подбираем реальные позиции для одновременного взятия: одна нота на струну,
// нижний звук находится на более толстой струне. Сначала выдаём компактные варианты.
function findVoicings(notes) {
  // Бас оставляем тем же, остальные голоса можно переставить и поднять на октаву.
  // Поэтому варианты не ограничены тесным расположением и удобнее для руки.
  const upper = notes.slice(1);
  function permutations(items) {
    if (!items.length) return [[]];
    return items.flatMap((item, i) =>
      permutations(items.filter((_, j) => j !== i)).map((rest) => [
        item,
        ...rest,
      ]),
    );
  }
  const combinations = [],
    seen = new Set();
  [-12, 0, 12].forEach((shift) =>
    permutations(upper).forEach((order) => {
      const voices = [notes[0], ...order];
      const lists = voices.map((note, index) => {
        const midis =
          index === 0
            ? [note.midi + shift]
            : [note.midi + shift, note.midi + shift + 12];
        return midis.flatMap(positionsForMidi);
      });
      function walk(index, current) {
        if (index === lists.length) {
          const key = current.map((p) => p.key).join("|");
          if (seen.has(key)) return;
          seen.add(key);
          const fretted = current.map((p) => p.fret).filter((f) => f > 0);
          const span = fretted.length
            ? Math.max(...fretted) - Math.min(...fretted)
            : 0;
          const stringsSpan =
            current[0].string - current[current.length - 1].string;
          const average =
            current.reduce((sum, p) => sum + p.fret, 0) / current.length;
          const score =
            span * 3 +
            Math.max(0, span - 4) * 12 +
            stringsSpan * 1.5 +
            average * 0.3;
          combinations.push({ positions: [...current], span, score });
          return;
        }
        lists[index].forEach((p) => {
          const previous = current[current.length - 1];
          if (
            previous &&
            (previous.string <= p.string || previous.midi >= p.midi)
          )
            return;
          walk(index + 1, [...current, p]);
        });
      }
      walk(0, []);
    }),
  );
  const comfortable = combinations.filter((item) => item.span <= 4);
  const candidates = comfortable.length ? comfortable : combinations;
  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((item) => item.positions);
}
function voicedNotes(positions, names) {
  const map = nameMap(names);
  return positions.map((position) => ({
    midi: position.midi,
    name: map[mod(position.midi)],
  }));
}

/* Общий прогресс и прогресс по каждому упражнению сохраняются только в браузере. */
const STORAGE_KEY = "ladno-progress-v1";
const emptyProgress = () => ({
  streak: 0,
  mistakes: 0,
  correct: 0,
  exercises: {},
});
let storageAvailable = true;
let progress = emptyProgress();
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved && typeof saved === "object")
      progress = {
        ...emptyProgress(),
        ...saved,
        exercises: saved.exercises || {},
      };
  }
} catch (error) {
  storageAvailable = false;
}
let intervalTaskMode = "build";
let keyTaskMode = "signs";
function statsFor(key) {
  return progress.exercises[key] || { streak: 0, mistakes: 0, correct: 0 };
}
function formatStats(key) {
  const stats = statsFor(key);
  return `✓ ${stats.streak} подряд  ·  × ${stats.mistakes} ошибок`;
}
function showStats() {
  byId("top-streak").textContent = progress.streak;
  document.querySelectorAll("[data-stats]").forEach((el) => {
    el.textContent = formatStats(el.dataset.stats);
  });
  byId("interval-exercise-stats").textContent = formatStats(
    intervalTaskMode === "build" ? "intervalBuild" : "intervalEar",
  );
  byId("key-exercise-stats").textContent = formatStats(
    keyTaskMode === "signs" ? "keySigns" : "keyMod",
  );
  byId("storage-status").textContent = storageAvailable
    ? "Прогресс хранится в этом браузере"
    : "Сохранение недоступно: прогресс только до закрытия страницы";
}
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    storageAvailable = false;
  }
  showStats();
}
function recordResult(key, isCorrect) {
  const stats = statsFor(key);
  if (isCorrect) {
    progress.streak++;
    progress.correct++;
    stats.streak++;
    stats.correct++;
  } else {
    progress.streak = 0;
    progress.mistakes++;
    stats.streak = 0;
    stats.mistakes++;
  }
  progress.exercises[key] = stats;
  saveProgress();
}
function setFeedback(id, text, state = "") {
  const el = byId(id);
  el.textContent = text;
  el.className = "feedback" + (state ? " " + state : "");
}
function plural(number, forms) {
  const n = Math.abs(number) % 100,
    last = n % 10;
  if (n >= 11 && n <= 14) return forms[2];
  return last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
}
function semiText(n) {
  return `${n} ${plural(n, ["полутон", "полутона", "полутонов"])}`;
}
function fillSelect(id, entries, selected) {
  const el = byId(id);
  el.innerHTML = entries
    .map(
      (item) =>
        `<option value="${escapeHTML(item.value)}">${escapeHTML(item.label)}</option>`,
    )
    .join("");
  if (selected != null) el.value = selected;
}
function setSwitch(selector, attr, value) {
  document.querySelectorAll(selector).forEach((button) => {
    const active = button.getAttribute(attr) === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function answerButtons(containerId, options, correctValue, callback) {
  const container = byId(containerId);
  container.innerHTML = "";
  options.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.textContent = item.label;
    button.dataset.value = String(item.value);
    button.addEventListener("click", () => {
      const correct = String(item.value) === String(correctValue);
      container.querySelectorAll("button").forEach((b) => {
        b.disabled = true;
        if (b.dataset.value === String(correctValue))
          b.classList.add("correct");
      });
      if (!correct) button.classList.add("wrong");
      callback(correct, item);
    });
    container.appendChild(button);
  });
}
function makeOptions(correct, pool, count = 4) {
  return shuffle([
    correct,
    ...shuffle(
      pool.filter((item) => String(item.value) !== String(correct.value)),
    ).slice(0, count - 1),
  ]);
}

/* Звук: Tone.js загружается с CDN. Если CDN недоступен, используем Web Audio. */
let toneSynth = null;
let nativeAudio = null;
async function playEvents(events) {
  if (window.Tone) {
    try {
      await window.Tone.start(); // Браузер разрешает звук только после действия пользователя.
      if (!toneSynth) {
        toneSynth = new window.Tone.PolySynth(window.Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: {
            attack: 0.015,
            decay: 0.18,
            sustain: 0.32,
            release: 0.65,
          },
        }).toDestination();
        toneSynth.volume.value = -10;
      }
      const start = window.Tone.now() + 0.04;
      events.forEach((event) => {
        const notes = unique(event.notes).map((midi) =>
          window.Tone.Frequency(midi, "midi").toNote(),
        );
        toneSynth.triggerAttackRelease(
          notes,
          event.duration,
          start + (event.time || 0),
          event.velocity || 0.7,
        );
      });
      return;
    } catch (error) {
      console.warn("Tone.js недоступен, используем Web Audio.", error);
    }
  }
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error("Web Audio не поддерживается");
    nativeAudio = nativeAudio || new Audio();
    await nativeAudio.resume();
    const start = nativeAudio.currentTime + 0.04;
    events.forEach((event) => {
      const notes = unique(event.notes);
      notes.forEach((midi) => {
        const oscillator = nativeAudio.createOscillator();
        const gain = nativeAudio.createGain();
        const at = start + (event.time || 0);
        const end = at + event.duration;
        oscillator.type = "triangle";
        oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        const volume =
          (0.16 * (event.velocity || 0.7)) / Math.sqrt(notes.length);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0002, volume * 0.45),
          Math.max(at + 0.03, end),
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.25);
        oscillator.connect(gain);
        gain.connect(nativeAudio.destination);
        oscillator.start(at);
        oscillator.stop(end + 0.26);
      });
    });
    byId("audio-status").textContent = "Звук браузера";
  } catch (error) {
    byId("audio-status").textContent = "Звук недоступен";
    console.warn("Не удалось воспроизвести звук.", error);
  }
}
function playNote(midi) {
  playEvents([{ notes: [midi], duration: 0.55, velocity: 0.7 }]);
}
function playChord(notes) {
  playEvents([
    { notes: notes.map((note) => note.midi), duration: 1.5, velocity: 0.7 },
  ]);
}
function playInterval(a, b, mode) {
  playEvents(
    mode === "together"
      ? [{ notes: [a, b], duration: 1.25, velocity: 0.7 }]
      : [
          { notes: [a], duration: 0.7, time: 0 },
          { notes: [b], duration: 0.9, time: 0.8 },
        ],
  );
}

/* SVG-гриф: каждый лад — клавиатурно доступная кнопка, 0 обозначает открытую струну. */
function renderBoard(id, options = {}) {
  const el = byId(id);
  const previousFocus = el.contains(document.activeElement)
    ? document.activeElement.getAttribute("data-pos")
    : null;
  const activePcs = new Set(options.activePcs || []);
  const activePositions = new Set(options.activePositions || []);
  const selected = options.selected || new Set();
  const rootPositions = options.rootPositions
    ? new Set(options.rootPositions)
    : null;
  const nameLookup = options.names || {};
  const x0 = 145,
    fretWidth = 69,
    top = 57,
    gap = 36,
    right = x0 + 12 * fretWidth;
  const parts = [
    `<svg viewBox="0 0 1010 282" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Гитарный гриф: первая струна сверху, открытые струны слева">
    <rect x="${x0}" y="38" width="${12 * fretWidth}" height="218" rx="7" fill="#efe9d9" stroke="#e3ddcb"/>
    <rect x="${x0 - 3}" y="38" width="7" height="218" rx="2" fill="#b6bba7"/>`,
  ];
  [3, 5, 7, 9].forEach((fret) =>
    parts.push(
      `<circle cx="${x0 + (fret - 0.5) * fretWidth}" cy="147" r="5" fill="#dedac8"/>`,
    ),
  );
  [111, 183].forEach((y) =>
    parts.push(
      `<circle cx="${x0 + 11.5 * fretWidth}" cy="${y}" r="5" fill="#dedac8"/>`,
    ),
  );
  for (let fret = 1; fret <= 12; fret++) {
    const x = x0 + fret * fretWidth;
    parts.push(
      `<line x1="${x}" y1="38" x2="${x}" y2="256" stroke="#c2bfaf" stroke-width="2"/>`,
    );
  }
  for (let fret = 0; fret <= 12; fret++) {
    const x = fret === 0 ? x0 - 36 : x0 + (fret - 0.5) * fretWidth;
    parts.push(
      `<text x="${x}" y="25" text-anchor="middle" fill="#9aa99b" font-family="Arial, sans-serif" font-size="10" font-weight="700">${fret}</text>`,
    );
  }
  STRINGS.forEach((string, s) => {
    const y = top + s * gap;
    parts.push(
      `<text x="31" y="${y + 4}" text-anchor="middle" fill="#69806c" font-family="Arial, sans-serif" font-size="12" font-weight="700">${string.name}</text>`,
    );
    parts.push(
      `<text x="53" y="${y + 3}" text-anchor="middle" fill="#b0bbae" font-family="Arial, sans-serif" font-size="9">${s + 1}</text>`,
    );
    parts.push(
      `<line x1="69" y1="${y}" x2="${right}" y2="${y}" stroke="#b9baaa" stroke-width="${1 + s * 0.22}"/>`,
    );
    for (let fret = 0; fret <= 12; fret++) {
      const x = fret === 0 ? x0 - 36 : x0 + (fret - 0.5) * fretWidth;
      const midi = string.midi + fret,
        pc = mod(midi),
        key = s + ":" + fret;
      const pitchName = nameLookup[pc] || CHROMATIC[pc];
      const position = { string: s, fret, midi, key, pc };
      const active =
        activePcs.has(pc) ||
        activePositions.has(key) ||
        (options.activeFilter && options.activeFilter(position));
      const chosen = selected.has(key);
      const visible = !!options.showAll || active || chosen;
      const isRoot =
        active &&
        (rootPositions
          ? rootPositions.has(key)
          : options.rootPc != null && pc === options.rootPc);
      const isQuestion = options.questionKey === key;
      let fill = "#fbfaf4",
        stroke = "#deddd1",
        text = "#8d998a";
      if (active) {
        fill = "#c9ddb5";
        stroke = "#bbd3a8";
        text = "#365e43";
      }
      if (isRoot || isQuestion) {
        fill = "#3d6e52";
        stroke = "#3d6e52";
        text = "#ffffff";
      }
      if (chosen) {
        fill = "#eebf8e";
        stroke = "#dda977";
        text = "#5c4433";
      }
      if (!visible) {
        fill = "transparent";
        stroke = "transparent";
        text = "transparent";
      }
      const label = isQuestion ? "?" : prettyNote(pitchName);
      const aria = isQuestion
        ? `Загаданная нота: ${describePosition(position)}`
        : `${describePosition(position)}, ${writtenNote(pitchName, midi)}`;
      parts.push(
        `<g class="fret-click" role="button" tabindex="0" data-pos="${key}" aria-label="${escapeHTML(aria)}"><circle class="note-disc" cx="${x}" cy="${y}" r="14" fill="${fill}" stroke="${stroke}"/><text x="${x}" y="${y + 3.8}" text-anchor="middle" fill="${text}" font-family="Arial, sans-serif" font-weight="700" font-size="${label.length > 2 ? 9 : 10.5}">${escapeHTML(label)}</text></g>`,
      );
    }
  });
  parts.push(
    `<text x="31" y="276" text-anchor="middle" fill="#aab5a7" font-family="Arial, sans-serif" font-size="8" font-weight="700">СТРУНЫ</text><text x="${right}" y="276" text-anchor="end" fill="#aab5a7" font-family="Arial, sans-serif" font-size="8" font-weight="700">ЛАДЫ 0–12</text></svg>`,
  );
  el.innerHTML = parts.join("");
  function activate(target) {
    const group = target.closest("[data-pos]");
    if (!group || !el.contains(group)) return;
    const [string, fret] = group.dataset.pos.split(":").map(Number);
    const midi = STRINGS[string].midi + fret,
      pc = mod(midi);
    const position = { string, fret, midi, pc, key: group.dataset.pos };
    const name = nameLookup[pc] || CHROMATIC[pc];
    if (options.status && byId(options.status))
      byId(options.status).textContent =
        `${writtenNote(name, midi)} · ${describePosition(position)}`;
    playNote(midi);
    if (options.onPick) options.onPick(position);
  }
  el.onclick = (event) => activate(event.target);
  el.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(event.target);
    }
  };
  if (previousFocus) {
    const replacement = el.querySelector(`[data-pos="${previousFocus}"]`);
    if (replacement) replacement.focus({ preventScroll: true });
  }
}

/* Нотный стан: основной рендерер VexFlow; запасной SVG нужен для работы без сети. */
function renderStaff(id, notes, chord = false) {
  const target = byId(id);
  target.innerHTML = "";
  const V = window.Vex && (window.Vex.Flow || window.Vex);
  if (V && V.Renderer && V.StaveNote) {
    try {
      const width = 700,
        height = 205;
      const renderer = new V.Renderer(target, V.Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();
      const stave = new V.Stave(5, 20, width - 10);
      stave.addClef("treble");
      stave.setContext(context).draw();
      function vexNote(group) {
        const tickable = new V.StaveNote({
          clef: "treble",
          keys: group.map(
            (note) =>
              `${note.name.toLowerCase()}/${writtenOctave(note.name, note.midi)}`,
          ),
          duration: chord ? "w" : "q",
        });
        group.forEach((note, index) => {
          const acc = parseNote(note.name).accidental;
          if (acc) tickable.addModifier(new V.Accidental(acc), index);
        });
        return tickable;
      }
      const tickables = chord
        ? [vexNote(notes)]
        : notes.map((note) => vexNote([note]));
      V.Formatter.FormatAndDraw(context, stave, tickables);
      const svg = target.querySelector("svg");
      if (svg) {
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("aria-hidden", "true");
        svg.style.width = "100%";
        svg.style.height = "auto";
      }
      return;
    } catch (error) {
      console.warn(
        "Не удалось отрисовать VexFlow, используем запасной SVG.",
        error,
      );
      target.innerHTML = "";
    }
  }
  renderFallbackStaff(target, notes, chord);
}
function renderFallbackStaff(target, notes, chord) {
  const width = 700,
    height = 175,
    bottom = 95;
  const parts = [
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`,
  ];
  for (let i = 0; i < 5; i++)
    parts.push(
      `<line x1="10" x2="690" y1="${55 + i * 10}" y2="${55 + i * 10}" stroke="#a2aa9e" stroke-width="1"/>`,
    );
  parts.push(
    '<text x="24" y="99" fill="#344e3d" font-family="serif" font-size="56">𝄞</text>',
  );
  notes.forEach((note, i) => {
    const parsed = parseNote(note.name),
      octave = writtenOctave(note.name, note.midi);
    const index = octave * 7 + LETTERS.indexOf(parsed.letter);
    const y = bottom - (index - (4 * 7 + 2)) * 5;
    const x = chord
      ? 230 + (i % 2) * 2
      : 104 + i * (565 / Math.max(1, notes.length - 1));
    for (let ledger = 105; ledger <= y; ledger += 10)
      parts.push(
        `<line x1="${x - 12}" x2="${x + 12}" y1="${ledger}" y2="${ledger}" stroke="#526455"/>`,
      );
    for (let ledger = 45; ledger >= y; ledger -= 10)
      parts.push(
        `<line x1="${x - 12}" x2="${x + 12}" y1="${ledger}" y2="${ledger}" stroke="#526455"/>`,
      );
    if (parsed.accidental)
      parts.push(
        `<text x="${x - 15}" y="${y + 5}" text-anchor="end" fill="#344e3d" font-family="serif" font-size="16">${escapeHTML(prettyNote(parsed.accidental))}</text>`,
      );
    parts.push(
      `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="4.5" transform="rotate(-15 ${x} ${y})" fill="${chord ? "#fafbf7" : "#304c39"}" stroke="#304c39" stroke-width="1.5"/>`,
    );
    if (!chord)
      parts.push(
        `<line x1="${x + 6}" y1="${y}" x2="${x + 6}" y2="${y - 31}" stroke="#304c39" stroke-width="1.4"/>`,
      );
  });
  parts.push("</svg>");
  target.innerHTML = parts.join("");
}

/* 01. Все ноты, фильтр октавы и задание на название. */
let notesMode = "all";
let notesQuiz = null;
function renderNotes() {
  const octave = byId("notes-octave").value;
  const root = byId("notes-root").value;
  const scale = getScale(byId("notes-scale").value);
  const pcs = new Set(scalePcs(root, scale));
  const names = notesMode === "scale" ? nameMap(scaleNames(root, scale)) : {};
  renderBoard("notes-board", {
    showAll: notesMode === "all",
    names,
    rootPc: notesMode === "scale" ? parseNote(root).pc : null,
    activeFilter: (p) =>
      (octave === "all" || midiOctave(p.midi) === Number(octave)) &&
      (notesMode === "all" || pcs.has(p.pc)),
    status: "notes-status",
  });
}
function newNotesQuiz() {
  const string = Math.floor(Math.random() * 6),
    fret = Math.floor(Math.random() * 13);
  const midi = STRINGS[string].midi + fret;
  notesQuiz = {
    string,
    fret,
    midi,
    pc: mod(midi),
    key: string + ":" + fret,
    answered: false,
  };
  setFeedback("notes-feedback", "Выбери один из вариантов.");
  byId("notes-quiz-status").textContent = "Нажми на ноту ♫";
  renderNotesQuiz();
  const pool = CHROMATIC.map((name, pc) => ({
    value: pc,
    label: prettyNote(name),
  }));
  answerButtons(
    "notes-answers",
    makeOptions(pool[notesQuiz.pc], pool),
    notesQuiz.pc,
    (correct) => {
      notesQuiz.answered = true;
      recordResult("notes", correct);
      const answer = prettyNote(CHROMATIC[notesQuiz.pc]);
      setFeedback(
        "notes-feedback",
        correct
          ? `Верно! Это ${answer}.`
          : `Не совсем. Правильный ответ: ${answer}.`,
        correct ? "success" : "error",
      );
      renderNotesQuiz();
    },
  );
}
function renderNotesQuiz() {
  renderBoard("notes-quiz-board", {
    activePositions: [notesQuiz.key],
    rootPositions: [notesQuiz.key],
    questionKey: notesQuiz.answered ? null : notesQuiz.key,
    status: "notes-quiz-status",
  });
}

/* 02. Интервалы: наглядный пример, построение точной высоты и слуховой тест. */
let intervalBuildQuiz = null;
let intervalEarQuiz = null;
function renderInterval() {
  const root = byId("interval-root").value,
    interval = getInterval(byId("interval-type").value);
  const first = rootMidi(root),
    second = first + interval.semitones;
  const other = spellInterval(root, interval.semitones, interval.steps);
  const a = bestPosition(first),
    b = bestPosition(second);
  const names = nameMap([root, other]);
  renderBoard("interval-board", {
    activePositions: [a.key, b.key],
    rootPositions: [a.key],
    names,
    status: "interval-status",
  });
  byId("interval-summary").textContent =
    `${writtenNote(root, first)} → ${writtenNote(other, second)} · ${semiText(interval.semitones)}`;
  byId("interval-description").textContent =
    `${interval.name}: ${interval.character}. Знаки у нот показаны явно, без ключевых знаков.`;
  renderStaff("interval-staff", [
    { midi: first, name: root },
    { midi: second, name: other },
  ]);
}
function newIntervalBuild() {
  const interval = randomItem(INTERVALS);
  const possible = [];
  for (let s = 2; s < 6; s++)
    for (let fret = 0; fret <= 7; fret++) {
      const midi = STRINGS[s].midi + fret;
      if (positionsForMidi(midi + interval.semitones).length)
        possible.push({ string: s, fret, midi, key: s + ":" + fret });
    }
  const base = randomItem(possible),
    root = CHROMATIC[mod(base.midi)];
  const answerName = spellInterval(root, interval.semitones, interval.steps);
  intervalBuildQuiz = {
    interval,
    base,
    root,
    answerName,
    target: base.midi + interval.semitones,
    answered: false,
  };
  byId("interval-build-prompt").textContent =
    `Построй «${interval.name}» вверх от ${writtenNote(root, base.midi)}.`;
  setFeedback("interval-build-feedback", "Нажми на вторую ноту.");
  byId("interval-quiz-status").textContent = "Нажми на ноту ♫";
  renderIntervalBuild();
}
function renderIntervalBuild() {
  const q = intervalBuildQuiz;
  const correctPosition = bestPosition(q.target);
  renderBoard("interval-quiz-board", {
    showAll: true,
    activePositions: q.answered
      ? [q.base.key, correctPosition.key]
      : [q.base.key],
    rootPositions: [q.base.key],
    names: nameMap([q.root, q.answerName]),
    status: "interval-quiz-status",
    onPick: (position) => {
      if (q.answered) return;
      q.answered = true;
      const correct = position.midi === q.target;
      recordResult("intervalBuild", correct);
      const answer = `${writtenNote(q.answerName, q.target)} (${semiText(q.interval.semitones)}; например, ${describePosition(correctPosition)})`;
      setFeedback(
        "interval-build-feedback",
        correct
          ? `Верно! ${answer}.`
          : `Не совсем. Правильный ответ: ${answer}.`,
        correct ? "success" : "error",
      );
      renderIntervalBuild();
    },
  });
}
function newIntervalEar() {
  const interval = randomItem(INTERVALS),
    midi = 48 + Math.floor(Math.random() * 12);
  intervalEarQuiz = { interval, midi };
  const pool = INTERVALS.map((item) => ({ value: item.id, label: item.name }));
  const correctOption = pool.find((item) => item.value === interval.id);
  answerButtons(
    "ear-answers",
    makeOptions(correctOption, pool),
    interval.id,
    (correct) => {
      recordResult("intervalEar", correct);
      setFeedback(
        "ear-feedback",
        correct
          ? `Верно! ${interval.name} — ${semiText(interval.semitones)}.`
          : `Не совсем. Правильный ответ: ${interval.name}, ${semiText(interval.semitones)}.`,
        correct ? "success" : "error",
      );
    },
  );
  setFeedback("ear-feedback", "Сначала послушай, затем выбери ответ.");
}
function setIntervalTask(mode) {
  intervalTaskMode = mode;
  byId("interval-build-area").hidden = mode !== "build";
  byId("interval-ear-area").hidden = mode !== "ear";
  setSwitch("[data-interval-task]", "data-interval-task", mode);
  showStats();
}

/* 03. Трезвучия и выбор трёх различных звуков. */
let currentTriad = null;
let triadQuiz = null;
function renderTriad(resetShape = false) {
  const root = byId("triad-root").value,
    type = getTriad(byId("triad-type").value);
  currentTriad = makeChord(root, type, Number(byId("triad-inversion").value));
  const voicings = findVoicings(currentTriad.notes);
  if (resetShape)
    fillSelect(
      "triad-shape",
      voicings.map((_, i) => ({ value: String(i), label: `Вариант ${i + 1}` })),
      "0",
    );
  const positionSet =
    voicings[Number(byId("triad-shape").value)] || voicings[0] || [];
  currentTriad.voicedNotes = positionSet.length
    ? voicedNotes(positionSet, currentTriad.names)
    : currentTriad.notes;
  renderBoard("triad-board", {
    activePositions: positionSet.map((p) => p.key),
    rootPc: parseNote(root).pc,
    names: nameMap(currentTriad.names),
    status: "triad-status",
  });
  byId("triad-summary").textContent =
    `${currentTriad.symbol} · ${currentTriad.voicedNotes.map((n) => prettyNote(n.name)).join(" – ")}`;
  byId("triad-description").textContent =
    type.description + " Нижняя нота определяет обращение.";
  byId("triad-position").textContent = positionSet.length
    ? positionSet.map(describePosition).join(" · ")
    : "Для этого регистра не нашлось аппликатуры на разных струнах.";
  renderStaff("triad-staff", currentTriad.voicedNotes, true);
}
function newTriadQuiz() {
  const root = randomItem(ROOTS),
    type = randomItem(TRIADS);
  triadQuiz = {
    chord: makeChord(root, type),
    selected: new Set(),
    answered: false,
  };
  byId("triad-quiz-prompt").textContent =
    `Собери ${type.name.toLowerCase()} трезвучие от ${prettyNote(root)}.`;
  byId("triad-check").disabled = false;
  byId("triad-quiz-status").textContent = "Нажми на ноту ♫";
  setFeedback(
    "triad-feedback",
    "Нажимай на ноты, чтобы выбрать или отменить их.",
  );
  renderTriadQuiz();
}
function selectedDescription(selection, names = {}) {
  if (!selection.size) return "пока ничего";
  return [...selection]
    .map((key) => {
      const [s, fret] = key.split(":").map(Number),
        midi = STRINGS[s].midi + fret;
      return writtenNote(names[mod(midi)] || CHROMATIC[mod(midi)], midi);
    })
    .join(" · ");
}
function renderTriadQuiz() {
  const q = triadQuiz,
    rootPc = parseNote(q.chord.root).pc;
  renderBoard("triad-quiz-board", {
    showAll: true,
    activeFilter: (p) => p.pc === rootPc,
    rootPc,
    selected: q.selected,
    status: "triad-quiz-status",
    onPick: (position) => {
      if (q.answered) return;
      if (q.selected.has(position.key)) q.selected.delete(position.key);
      else q.selected.add(position.key);
      renderTriadQuiz();
    },
  });
  byId("triad-picked").textContent = selectedDescription(q.selected);
}
function checkTriadQuiz() {
  const q = triadQuiz;
  if (q.answered) return;
  if (!q.selected.size) {
    setFeedback("triad-feedback", "Сначала выбери три ноты на грифе.");
    return;
  }
  const chosen = [...q.selected].map((key) => {
    const [s, f] = key.split(":").map(Number);
    return mod(STRINGS[s].midi + f);
  });
  const correct =
    chosen.length === 3 &&
    unique(chosen).length === 3 &&
    q.chord.pcs.every((pc) => chosen.includes(pc));
  q.answered = true;
  byId("triad-check").disabled = true;
  recordResult("triad", correct);
  const answer = q.chord.names.map(prettyNote).join(" – ");
  setFeedback(
    "triad-feedback",
    correct
      ? `Верно! ${q.chord.symbol}: ${answer}.`
      : `Не совсем. Правильные звуки ${q.chord.symbol}: ${answer}. Энгармонические ноты, например E♯ и F, звучат одинаково.`,
    correct ? "success" : "error",
  );
}

/* 04. Септаккорды: аппликатуры и определение по грифу или звучанию. */
let currentSeventh = null;
let seventhQuiz = null;
function renderSeventh(resetShape = false) {
  const root = byId("seventh-root").value,
    type = getSeventh(byId("seventh-type").value);
  currentSeventh = makeChord(root, type);
  const voicings = findVoicings(currentSeventh.notes);
  if (resetShape)
    fillSelect(
      "seventh-shape",
      voicings.map((_, i) => ({ value: String(i), label: `Вариант ${i + 1}` })),
      "0",
    );
  const positionSet =
    voicings[Number(byId("seventh-shape").value)] || voicings[0] || [];
  currentSeventh.voicedNotes = positionSet.length
    ? voicedNotes(positionSet, currentSeventh.names)
    : currentSeventh.notes;
  renderBoard("seventh-board", {
    activePositions: positionSet.map((p) => p.key),
    rootPc: parseNote(root).pc,
    names: nameMap(currentSeventh.names),
    status: "seventh-status",
  });
  byId("seventh-summary").textContent =
    `${currentSeventh.symbol} · ${currentSeventh.names.map(prettyNote).join(" – ")}`;
  byId("seventh-description").textContent = type.description;
  byId("seventh-position").textContent = positionSet.length
    ? positionSet.map(describePosition).join(" · ")
    : "Для этого регистра не нашлось аппликатуры на разных струнах.";
  renderStaff("seventh-staff", currentSeventh.voicedNotes, true);
}
function newSeventhQuiz() {
  const root = randomItem(ROOTS),
    type = randomItem(SEVENTHS),
    chord = makeChord(root, type);
  const positions =
    findVoicings(chord.notes)[0] ||
    chord.notes.map((note) => bestPosition(note.midi));
  seventhQuiz = {
    chord,
    positions,
    voicedNotes: voicedNotes(positions, chord.names),
  };
  byId("seventh-quiz-prompt").textContent =
    `Какой септаккорд построен от ${prettyNote(root)}?`;
  byId("seventh-quiz-status").textContent = "Нажми на ноту ♫";
  renderBoard("seventh-quiz-board", {
    activePositions: positions.map((p) => p.key),
    rootPc: parseNote(root).pc,
    names: nameMap(chord.names),
    status: "seventh-quiz-status",
  });
  const pool = SEVENTHS.map((item) => ({ value: item.id, label: item.name }));
  const correctOption = pool.find((item) => item.value === type.id);
  answerButtons(
    "seventh-answers",
    makeOptions(correctOption, pool),
    type.id,
    (correct) => {
      recordResult("seventh", correct);
      const answer = `${type.name}: ${chord.names.map(prettyNote).join(" – ")}. ${type.description}`;
      setFeedback(
        "seventh-feedback",
        correct ? `Верно! ${answer}` : `Не совсем. Правильный ответ: ${answer}`,
        correct ? "success" : "error",
      );
    },
  );
  setFeedback("seventh-feedback", "Выбери тип аккорда.");
}

/* 05. Гаммы: правильные написания ступеней и один выбранный экземпляр каждой ноты. */
let scaleMode = "scale";
let scaleQuiz = null;
function renderScale() {
  const root = byId("scale-root").value,
    scale = getScale(byId("scale-type").value);
  const names = scaleNames(root, scale),
    notes = scaleNotes(root, scale);
  renderBoard("scale-board", {
    showAll: scaleMode === "all",
    activePcs: scalePcs(root, scale),
    rootPc: parseNote(root).pc,
    names: nameMap(names),
    status: "scale-status",
  });
  byId("scale-formula").textContent = scale.formula;
  byId("scale-name").textContent =
    `${prettyNote(root)} · ${scale.name.toLowerCase()}`;
  byId("scale-description").textContent = scale.description;
  byId("scale-summary").textContent = notes
    .map((n) => prettyNote(n.name))
    .join(" – ");
  renderStaff("scale-staff", notes);
}
function playScale() {
  const root = byId("scale-root").value,
    scale = getScale(byId("scale-type").value);
  const up = scaleNotes(root, scale),
    downScale = scale.id === "melodicMinor" ? getScale("naturalMinor") : scale;
  const down = scaleNotes(root, downScale).reverse().slice(1);
  const notes = [...up, ...down];
  playEvents(
    notes.map((note, i) => ({
      notes: [note.midi],
      time: i * 0.32,
      duration: 0.27,
      velocity: 0.7,
    })),
  );
}
function newScaleQuiz() {
  const root = byId("scale-root").value,
    scale = getScale(byId("scale-type").value);
  scaleQuiz = {
    root,
    scale,
    pcs: scalePcs(root, scale),
    names: scaleNames(root, scale),
    selected: new Set(),
    answered: false,
  };
  byId("scale-quiz-prompt").textContent =
    `Найди все звуки: ${prettyNote(root)} · ${scale.name.toLowerCase()}.`;
  byId("scale-check").disabled = false;
  byId("scale-quiz-status").textContent = "Нажми на ноту ♫";
  setFeedback("scale-feedback", "Выбирай ноты на грифе.");
  renderScaleQuiz();
}
function renderScaleQuiz() {
  const q = scaleQuiz,
    rootPc = parseNote(q.root).pc,
    names = nameMap(q.names);
  renderBoard("scale-quiz-board", {
    showAll: true,
    activeFilter: (p) => p.pc === rootPc,
    rootPc,
    names,
    selected: q.selected,
    status: "scale-quiz-status",
    onPick: (position) => {
      if (q.answered) return;
      const existing = [...q.selected].find((key) => {
        const [s, fret] = key.split(":").map(Number);
        return mod(STRINGS[s].midi + fret) === position.pc;
      });
      if (existing) q.selected.delete(existing);
      if (existing !== position.key) q.selected.add(position.key);
      renderScaleQuiz();
    },
  });
  byId("scale-picked").textContent =
    selectedDescription(q.selected, names) +
    ` · ${q.selected.size} из ${q.pcs.length}`;
}
function checkScaleQuiz() {
  const q = scaleQuiz;
  if (q.answered) return;
  if (!q.selected.size) {
    setFeedback("scale-feedback", "Сначала выбери ноты гаммы на грифе.");
    return;
  }
  const chosen = [...q.selected].map((key) => {
    const [s, f] = key.split(":").map(Number);
    return mod(STRINGS[s].midi + f);
  });
  const correct =
    chosen.length === q.pcs.length && q.pcs.every((pc) => chosen.includes(pc));
  q.answered = true;
  byId("scale-check").disabled = true;
  recordResult("scale", correct);
  const answer = q.names.map(prettyNote).join(" – ");
  setFeedback(
    "scale-feedback",
    correct
      ? `Верно! Все звуки найдены: ${answer}.`
      : `Не совсем. Правильные ноты гаммы: ${answer}. Лишние ноты не входят в ответ.`,
    correct ? "success" : "error",
  );
}

/* 06. Квинтовый круг, ключевые знаки и модуляция к доминанте. */
let selectedKey = 0;
let selectedKeyVariant = null;
let keyDisplayMode = "major";
function keyTonic(key) {
  return keyDisplayMode === "major" ? key.major : key.minor.slice(0, -1);
}
function activeKey() {
  return selectedKeyVariant || CIRCLE[selectedKey];
}
function keySignText(key) {
  if (!key.count) return "Нет знаков";
  return KEY_ORDER[key.kind].slice(0, key.count).map(prettyNote).join(" · ");
}
function keyCountText(key) {
  if (!key.count) return "0 знаков";
  const sign =
    key.kind === "#"
      ? plural(key.count, ["диез", "диеза", "диезов"])
      : plural(key.count, ["бемоль", "бемоля", "бемолей"]);
  return `${key.count} ${sign}`;
}
function renderCircle() {
  const key = activeKey(),
    parts = [
      '<svg viewBox="0 0 380 380" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Квинтовый круг">',
    ];
  parts.push(
    '<circle cx="190" cy="190" r="140" fill="none" stroke="#dce6d7" stroke-width="2"/><circle cx="190" cy="190" r="98" fill="#f4f8ec" stroke="#e3ebdb"/>',
  );
  parts.push(
    `<text x="190" y="169" text-anchor="middle" fill="#9aac99" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1.1">ТОНАЛЬНОСТЬ</text><text x="190" y="203" text-anchor="middle" fill="#436d4d" font-family="Georgia, serif" font-size="30">${escapeHTML(prettyNote(keyTonic(key)) + (keyDisplayMode === "minor" ? "m" : ""))}</text><text x="190" y="225" text-anchor="middle" fill="#91a78c" font-family="Arial, sans-serif" font-size="10">${escapeHTML(keyCountText(key))}</text>`,
  );
  CIRCLE.forEach((item, i) => {
    const angle = (i * Math.PI) / 6;
    const x = 190 + 140 * Math.sin(angle),
      y = 190 - 140 * Math.cos(angle),
      active = i === selectedKey;
    const shown = active && selectedKeyVariant ? selectedKeyVariant : item;
    const alternative = ENHARMONIC_KEYS.find((k) => k.circleIndex === i);
    const majorLabel = alternative
      ? prettyNote(item.major) + "/" + prettyNote(alternative.major)
      : prettyNote(item.major);
    const minor = prettyNote(shown.minor.slice(0, -1)) + "m";
    parts.push(
      `<g class="key-node" data-key-index="${i}" role="button" tabindex="0" aria-label="${escapeHTML(majorLabel)} мажор, параллельный ${escapeHTML(minor)}" aria-pressed="${active}"><circle cx="${x}" cy="${y}" r="25" fill="${active ? "#3d6e52" : "#fffefa"}" stroke="${active ? "#3d6e52" : "#d8e4d3"}"/><text x="${x}" y="${y - 1}" text-anchor="middle" fill="${active ? "#fff" : "#476a50"}" font-family="Arial, sans-serif" font-size="${alternative ? 9 : 12}" font-weight="700">${escapeHTML(majorLabel)}</text><text x="${x}" y="${y + 12}" text-anchor="middle" fill="${active ? "#d3e7c2" : "#9aab97"}" font-family="Arial, sans-serif" font-size="9">${escapeHTML(minor)}</text></g>`,
    );
  });
  parts.push("</svg>");
  const circle = byId("key-circle");
  const focused = circle.contains(document.activeElement)
    ? document.activeElement.getAttribute("data-key-index")
    : null;
  circle.innerHTML = parts.join("");
  function activate(target) {
    const node = target.closest("[data-key-index]");
    if (!node) return;
    selectedKey = Number(node.dataset.keyIndex);
    selectedKeyVariant = null;
    renderKey();
  }
  circle.onclick = (event) => activate(event.target);
  circle.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(event.target);
    }
  };
  if (focused !== null)
    circle
      .querySelector(`[data-key-index="${selectedKey}"]`)
      ?.focus({ preventScroll: true });
}
function renderKey() {
  const key = activeKey(),
    tonic = keyTonic(key),
    scale = getScale(keyDisplayMode === "major" ? "major" : "naturalMinor"),
    names = scaleNames(tonic, scale);
  renderCircle();
  byId("key-title").textContent =
    prettyNote(tonic) + (keyDisplayMode === "major" ? " мажор" : " минор");
  byId("key-relative").textContent =
    keyDisplayMode === "major"
      ? `Параллельная тональность: ${prettyNote(key.minor.slice(0, -1))} минор`
      : `Параллельная тональность: ${prettyNote(key.major)} мажор`;
  byId("key-notes-label").textContent =
    keyDisplayMode === "major" ? "НОТЫ МАЖОРА" : "НОТЫ МИНОРА";
  const alternate = ENHARMONIC_KEYS.find(
    (item) => item.circleIndex === selectedKey,
  );
  const variants = alternate ? [CIRCLE[selectedKey], alternate] : [];
  const variantContainer = byId("key-enharmonic");
  variantContainer.innerHTML = variants
    .map(
      (item) =>
        `<button type="button" data-major="${escapeHTML(item.major)}" class="${item.major === key.major ? "active" : ""}" aria-pressed="${item.major === key.major}">${escapeHTML(prettyNote(keyDisplayMode === "major" ? item.major : item.minor.slice(0, -1)))} ${keyDisplayMode === "major" ? "мажор" : "минор"}</button>`,
    )
    .join("");
  variantContainer.querySelectorAll("button").forEach((button) =>
    button.addEventListener("click", () => {
      selectedKeyVariant =
        variants.find((item) => item.major === button.dataset.major) || null;
      renderKey();
    }),
  );
  byId("key-sign-count").textContent = keyCountText(key);
  byId("key-signs").textContent = keySignText(key);
  byId("key-notes").textContent = names.map(prettyNote).join(" · ");
  renderBoard("key-board", {
    activePcs: scalePcs(tonic, scale),
    rootPc: parseNote(tonic).pc,
    names: nameMap(names),
    status: "key-status",
  });
}
function newKeyQuiz() {
  if (keyTaskMode === "signs") {
    const key = randomItem([...CIRCLE, ...ENHARMONIC_KEYS]),
      correctOption = { value: key.count, label: String(key.count) };
    const pool = Array.from({ length: 8 }, (_, i) => ({
      value: i,
      label: String(i),
    }));
    byId("key-quiz-prompt").textContent =
      `Сколько ключевых знаков в ${prettyNote(key.major)} мажоре?`;
    answerButtons(
      "key-answers",
      makeOptions(correctOption, pool),
      key.count,
      (correct) => {
        recordResult("keySigns", correct);
        const explanation = `${prettyNote(key.major)} мажор: ${keyCountText(key)}${key.count ? " — " + keySignText(key) : ""}.`;
        setFeedback(
          "key-feedback",
          correct
            ? `Верно! ${explanation}`
            : `Не совсем. Правильный ответ: ${explanation}`,
          correct ? "success" : "error",
        );
      },
    );
  } else {
    // Исключаем F# → Db: звучащая квинта есть, но запись меняется энгармонически.
    const index = randomItem([0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11]),
      next = (index + 1) % 12;
    const key = CIRCLE[index],
      target = CIRCLE[next];
    const pool = CIRCLE.map((item, i) => ({
      value: i,
      label: prettyNote(item.major) + " мажор",
    })).filter((item) => item.value !== index);
    const correctOption = pool.find((item) => item.value === next);
    byId("key-quiz-prompt").textContent =
      `К какой мажорной тональности ведёт квинта вверх от ${prettyNote(key.major)} (модуляция к доминанте)?`;
    answerButtons(
      "key-answers",
      makeOptions(correctOption, pool),
      next,
      (correct) => {
        recordResult("keyMod", correct);
        const explanation = `${prettyNote(target.major)} мажор: следующая тональность по часовой стрелке. ${prettyNote(key.major)} → ${prettyNote(target.major)} — чистая квинта; у них много общих звуков.`;
        setFeedback(
          "key-feedback",
          correct
            ? `Верно! ${explanation}`
            : `Не совсем. Правильный ответ: ${explanation}`,
          correct ? "success" : "error",
        );
      },
    );
  }
  setFeedback("key-feedback", "Выбери ответ.");
}
function setKeyTask(mode) {
  keyTaskMode = mode;
  setSwitch("[data-key-task]", "data-key-task", mode);
  newKeyQuiz();
  showStats();
}

/* 07. Диатонические аккорды мажора и их учебные гармонические функции. */
let harmonyIndex = 0;
let harmonyChords = [];
let harmonyQuizAnswered = false;
function renderHarmony() {
  const root = byId("harmony-root").value,
    progression = getProgression(byId("harmony-progression").value);
  harmonyChords = progressionChords(root, progression).map((chord) => {
    const positions = findVoicings(chord.notes)[0] || [];
    return {
      ...chord,
      positions,
      voicedNotes: positions.length
        ? voicedNotes(positions, chord.names)
        : chord.notes,
    };
  });
  const row = byId("harmony-chords");
  row.innerHTML = harmonyChords
    .map(
      (chord, i) =>
        `<button type="button" class="chord-pill ${i === harmonyIndex ? "active" : ""}" data-chord-index="${i}" aria-pressed="${i === harmonyIndex}"><small>${chord.roman} · ${chord.fn}</small><strong>${escapeHTML(chord.symbol)}</strong><span>${escapeHTML(chord.names.map(prettyNote).join(" · "))}</span></button>`,
    )
    .join("");
  row.querySelectorAll("[data-chord-index]").forEach((button) =>
    button.addEventListener("click", () => {
      harmonyIndex = Number(button.dataset.chordIndex);
      renderHarmony();
    }),
  );
  const chord = harmonyChords[harmonyIndex],
    positions = chord.positions;
  renderBoard("harmony-board", {
    activePositions: positions.map((p) => p.key),
    rootPc: parseNote(chord.root).pc,
    names: nameMap(chord.names),
    status: "harmony-status",
  });
  byId("harmony-detail").textContent =
    `${chord.roman} · ${chord.symbol} (${chord.fn}): ${chord.names.map(prettyNote).join(" – ")}. ${positions.map(describePosition).join(" · ")}.`;
}
function playProgression(chords) {
  playEvents(
    chords.map((chord, i) => ({
      notes: (chord.voicedNotes || chord.notes).map((n) => n.midi),
      time: i * 1.35,
      duration: 1.15,
      velocity: 0.65,
    })),
  );
}
function newHarmonyQuiz() {
  harmonyQuizAnswered = false;
  const root = byId("harmony-root").value;
  const chords = Array.from({ length: 7 }, (_, i) => chordOfDegree(root, i));
  byId("harmony-quiz-prompt").textContent =
    `В ${prettyNote(root)} мажоре расставь аккорды по функциям T – S – D – T.`;
  byId("harmony-slots").innerHTML = ["T", "S", "D", "T"]
    .map(
      (fn, i) =>
        `<div class="function-slot"><label for="function-${i}">${i + 1} · ${fn}</label><select id="function-${i}" aria-label="Аккорд для функции ${fn}, позиция ${i + 1}"><option value="">Выбери аккорд</option>${chords.map((chord) => `<option value="${chord.degree}">${escapeHTML(chord.roman + " · " + chord.symbol)}</option>`).join("")}</select></div>`,
    )
    .join("");
  byId("harmony-check").disabled = false;
  setFeedback("harmony-feedback", "Выбери аккорд в каждом поле.");
}
function checkHarmonyQuiz() {
  if (harmonyQuizAnswered) return;
  const selects = [...byId("harmony-slots").querySelectorAll("select")];
  if (selects.some((select) => select.value === "")) {
    setFeedback(
      "harmony-feedback",
      "Сначала выбери аккорд для каждой функции.",
    );
    return;
  }
  const required = ["T", "S", "D", "T"];
  const correct = selects.every(
    (select, i) => FUNCTIONS[Number(select.value)] === required[i],
  );
  harmonyQuizAnswered = true;
  byId("harmony-check").disabled = true;
  selects.forEach((select) => {
    select.disabled = true;
  });
  recordResult("harmony", correct);
  const root = byId("harmony-root").value,
    chords = Array.from({ length: 7 }, (_, i) => chordOfDegree(root, i));
  const example = [0, 3, 4, 0].map((i) => chords[i].symbol).join(" – ");
  const groups = `T: ${[0, 2, 5].map((i) => chords[i].symbol).join(", ")}; S: ${[1, 3].map((i) => chords[i].symbol).join(", ")}; D: ${[4, 6].map((i) => chords[i].symbol).join(", ")}.`;
  setFeedback(
    "harmony-feedback",
    correct
      ? `Верно! Все функции на месте. Один из вариантов: ${example}.`
      : `Не совсем. Например: ${example}. В этой модели ${groups}`,
    correct ? "success" : "error",
  );
}

/* 08. Конструктор: четыре аккорда и 16 четвертей мелодии. */
let compositionSeed = 0;
let compositionData = null;
function createMotif(root, scale, chords, seed) {
  const pool = scaleNotes(root, scale); // Включаем верхнюю тонику.
  return chords.map((chord, bar) => {
    const candidates = pool
      .map((note, i) => (chord.pcs.includes(mod(note.midi)) ? i : -1))
      .filter((i) => i >= 0);
    const matching = candidates.length ? candidates : [0];
    const first = matching[mod(bar + seed, matching.length)];
    const third = matching[mod(bar + seed + 1, matching.length)];
    const direction = (bar + seed) % 2 ? -1 : 1;
    const neighbor = (i, d) => Math.min(pool.length - 1, Math.max(0, i + d));
    const indexes = [
      first,
      neighbor(first, direction),
      third,
      neighbor(third, -direction),
    ];
    if (bar === 3) indexes[3] = 0; // Последний звук — тоника выбранной мелодии.
    return {
      chord,
      notes: indexes.map((i) => pool[i]),
      hasChordTone: !!candidates.length,
    };
  });
}
function renderComposition() {
  const root = byId("composition-root").value,
    progression = getProgression(byId("composition-progression").value),
    scale = getScale(byId("composition-scale").value);
  const chords = progressionChords(root, progression),
    bars = createMotif(root, scale, chords, compositionSeed);
  compositionData = { root, scale, chords, bars };
  byId("composition-hint").textContent = bars.every((bar) => bar.hasChordTone)
    ? "На 1-й и 3-й долях — звуки текущего аккорда; остальные соединяют их шагами гаммы."
    : "В выбранной гамме не для каждого аккорда есть общий звук: местами возникнет напряжение. Попробуй мажорную гамму.";
  byId("composition-motif").innerHTML = bars
    .map(
      (bar, i) =>
        `<div class="motif-bar"><small>ТАКТ ${String(i + 1).padStart(2, "0")} · ${bar.chord.roman}</small><strong>${escapeHTML(bar.chord.symbol)}</strong><span>4 четверти</span><span class="motif-notes">${escapeHTML(bar.notes.map((n) => prettyNote(n.name)).join(" · "))}</span></div>`,
    )
    .join("");
  renderBoard("composition-board", {
    activePcs: scalePcs(root, scale),
    rootPc: parseNote(root).pc,
    names: nameMap(scaleNames(root, scale)),
    status: "composition-status",
  });
}
function playComposition() {
  const beat = 0.55,
    events = [];
  compositionData.bars.forEach((bar, i) => {
    const start = i * 4 * beat;
    events.push({
      notes: bar.chord.notes.map((n) => n.midi),
      time: start,
      duration: beat * 3.75,
      velocity: 0.48,
    });
    bar.notes.forEach((note, j) =>
      events.push({
        notes: [note.midi],
        time: start + j * beat,
        duration: beat * 0.75,
        velocity: 0.82,
      }),
    );
  });
  playEvents(events);
}

/* Маршруты — обычные якоря: сайт работает при прямом открытии index.html. */
const VIEW_META = {
  notes: {
    label: "Ноты и октавы",
    eyebrow: "01 / САМОЕ НАЧАЛО",
    line1: "Музыка начинается",
    line2: "с одной ноты.",
    text: "Разберёмся в нотах, найдём их на грифе и услышим, как они звучат. Всё по порядку, без сложных слов.",
  },
  intervals: {
    label: "Интервалы",
    eyebrow: "02 / МЕЖДУ НОТАМИ",
    line1: "Расстояние, которое",
    line2: "можно услышать.",
    text: "Две ноты могут быть рядом или далеко друг от друга. Научимся измерять и узнавать это расстояние.",
  },
  triads: {
    label: "Трезвучия",
    eyebrow: "03 / ПЕРВЫЕ АККОРДЫ",
    line1: "Три ноты.",
    line2: "Много чувств.",
    text: "Построим трезвучия по терциям, найдём их обращения и соберём свои первые аккорды на грифе.",
  },
  sevenths: {
    label: "Септаккорды",
    eyebrow: "04 / НОВАЯ КРАСКА",
    line1: "Добавь ноту —",
    line2: "измени настроение.",
    text: "Знакомимся с септаккордами: от мягкого maj7 до напряжённого G7, который хочет вернуться домой.",
  },
  scales: {
    label: "Гаммы и лады",
    eyebrow: "05 / КАРТА ЗВУКОВ",
    line1: "Найди свой",
    line2: "музыкальный цвет.",
    text: "Гаммы, пентатоника и лады на одном грифе. Слушай их характер и исследуй ноты в своём темпе.",
  },
  keys: {
    label: "Квинтовый круг",
    eyebrow: "06 / ВСЁ СВЯЗАНО",
    line1: "У тональностей",
    line2: "тоже есть соседи.",
    text: "Разберём ключевые знаки и увидим, как квинтовый круг помогает переходить между тональностями.",
  },
  harmony: {
    label: "Гармония",
    eyebrow: "07 / АККОРДЫ ВМЕСТЕ",
    line1: "Пусть аккорды",
    line2: "расскажут историю.",
    text: "Узнаем, зачем музыке опора, движение и напряжение, а затем сложим из них свою последовательность.",
  },
  composition: {
    label: "Композиция",
    eyebrow: "08 / ВРЕМЯ СОЗДАВАТЬ",
    line1: "Из нескольких нот",
    line2: "рождается музыка.",
    text: "Соедини прогрессию и гамму, послушай небольшой мотив и придумай на его основе свою мелодию.",
  },
};
function showView(requestedName = null) {
  const requested = requestedName || location.hash.slice(1),
    name = VIEW_META[requested] ? requested : "notes",
    meta = VIEW_META[name];
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.id !== "view-" + name;
  });
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === name;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  byId("breadcrumb").textContent = meta.label;
  byId("intro-eyebrow").textContent = meta.eyebrow;
  byId("intro-title").innerHTML =
    `${escapeHTML(meta.line1)}<br><em>${escapeHTML(meta.line2)}</em>`;
  byId("intro-text").textContent = meta.text;
  byId("intro-number").textContent = String(
    Object.keys(VIEW_META).indexOf(name) + 1,
  ).padStart(2, "0");
  document.title = meta.label + " — Ладно";
}
function fillReference() {
  byId("interval-reference").innerHTML = INTERVALS.map(
    (item) =>
      `<div class="reference-item"><span>${escapeHTML(item.name)}</span><strong>${escapeHTML(semiText(item.semitones))}</strong></div>`,
  ).join("");
  byId("scale-reference").innerHTML = SCALES.map(
    (item) =>
      `<article><h3>${escapeHTML(item.name)}</h3><p class="formula">${escapeHTML(item.formula)}</p><p>${escapeHTML(item.description)}</p></article>`,
  ).join("");
}
function initialiseSelects() {
  const roots = ROOTS.map((root) => ({ value: root, label: prettyNote(root) }));
  [
    "notes-root",
    "interval-root",
    "triad-root",
    "seventh-root",
    "scale-root",
    "harmony-root",
    "composition-root",
  ].forEach((id) => fillSelect(id, roots, id === "seventh-root" ? "G" : "C"));
  const scales = SCALES.map((item) => ({ value: item.id, label: item.name }));
  ["notes-scale", "scale-type", "composition-scale"].forEach((id) =>
    fillSelect(id, scales, "major"),
  );
  fillSelect(
    "interval-type",
    INTERVALS.map((item) => ({
      value: item.id,
      label: `${item.name} · ${semiText(item.semitones)}`,
    })),
    "M3",
  );
  fillSelect(
    "triad-type",
    TRIADS.map((item) => ({ value: item.id, label: item.name })),
    "major",
  );
  fillSelect(
    "seventh-type",
    SEVENTHS.map((item) => ({ value: item.id, label: item.name })),
    "dom7",
  );
  const progressions = PROGRESSIONS.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  fillSelect("harmony-progression", progressions, "1451");
  fillSelect("composition-progression", progressions, "1451");
}
function bindEvents() {
  // Перехватываем обычный клик: это также работает в песочнице предпросмотра,
  // где браузер может запретить переход по якорю или запись в историю.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = link.getAttribute("href").slice(1);
      if (!VIEW_META[target]) return;
      event.preventDefault();
      try {
        if (location.hash !== "#" + target)
          history.pushState(null, "", "#" + target);
      } catch (error) {
        /* В изолированном iframe переключаем раздел без истории. */
      }
      showView(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  const restoreView = () => {
    showView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  window.addEventListener("hashchange", restoreView);
  window.addEventListener("popstate", restoreView);
  byId("reset-progress").addEventListener("click", () => {
    if (
      window.confirm("Сбросить сохранённые серии и ошибки во всех упражнениях?")
    ) {
      progress = emptyProgress();
      saveProgress();
    }
  });
  ["notes-octave", "notes-root", "notes-scale"].forEach((id) =>
    byId(id).addEventListener("change", renderNotes),
  );
  document.querySelectorAll("[data-notes-mode]").forEach((button) =>
    button.addEventListener("click", () => {
      notesMode = button.dataset.notesMode;
      setSwitch("[data-notes-mode]", "data-notes-mode", notesMode);
      renderNotes();
    }),
  );
  byId("notes-next").addEventListener("click", newNotesQuiz);
  ["interval-root", "interval-type"].forEach((id) =>
    byId(id).addEventListener("change", renderInterval),
  );
  byId("interval-play").addEventListener("click", () => {
    const first = rootMidi(byId("interval-root").value),
      interval = getInterval(byId("interval-type").value);
    playInterval(
      first,
      first + interval.semitones,
      byId("interval-play-mode").value,
    );
  });
  document
    .querySelectorAll("[data-interval-task]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        setIntervalTask(button.dataset.intervalTask),
      ),
    );
  byId("interval-build-next").addEventListener("click", newIntervalBuild);
  byId("ear-next").addEventListener("click", newIntervalEar);
  byId("ear-play").addEventListener("click", () =>
    playInterval(
      intervalEarQuiz.midi,
      intervalEarQuiz.midi + intervalEarQuiz.interval.semitones,
      byId("ear-play-mode").value,
    ),
  );
  ["triad-root", "triad-type", "triad-inversion"].forEach((id) =>
    byId(id).addEventListener("change", () => renderTriad(true)),
  );
  byId("triad-shape").addEventListener("change", () => renderTriad(false));
  byId("triad-play").addEventListener("click", () =>
    playChord(currentTriad.voicedNotes),
  );
  byId("triad-check").addEventListener("click", checkTriadQuiz);
  byId("triad-next").addEventListener("click", newTriadQuiz);
  ["seventh-root", "seventh-type"].forEach((id) =>
    byId(id).addEventListener("change", () => renderSeventh(true)),
  );
  byId("seventh-shape").addEventListener("change", () => renderSeventh(false));
  byId("seventh-play").addEventListener("click", () =>
    playChord(currentSeventh.voicedNotes),
  );
  byId("seventh-quiz-play").addEventListener("click", () =>
    playChord(seventhQuiz.voicedNotes),
  );
  byId("seventh-next").addEventListener("click", newSeventhQuiz);
  ["scale-root", "scale-type"].forEach((id) =>
    byId(id).addEventListener("change", () => {
      renderScale();
      newScaleQuiz();
    }),
  );
  document.querySelectorAll("[data-scale-mode]").forEach((button) =>
    button.addEventListener("click", () => {
      scaleMode = button.dataset.scaleMode;
      setSwitch("[data-scale-mode]", "data-scale-mode", scaleMode);
      renderScale();
    }),
  );
  byId("scale-play").addEventListener("click", playScale);
  byId("scale-check").addEventListener("click", checkScaleQuiz);
  byId("scale-reset").addEventListener("click", newScaleQuiz);
  byId("scale-random").addEventListener("click", () => {
    byId("scale-root").value = randomItem(ROOTS);
    byId("scale-type").value = randomItem(SCALES).id;
    renderScale();
    newScaleQuiz();
  });
  document.querySelectorAll("[data-key-mode]").forEach((button) =>
    button.addEventListener("click", () => {
      keyDisplayMode = button.dataset.keyMode;
      setSwitch("[data-key-mode]", "data-key-mode", keyDisplayMode);
      renderKey();
    }),
  );
  document
    .querySelectorAll("[data-key-task]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        setKeyTask(button.dataset.keyTask),
      ),
    );
  byId("key-next").addEventListener("click", newKeyQuiz);
  byId("harmony-root").addEventListener("change", () => {
    harmonyIndex = 0;
    renderHarmony();
    newHarmonyQuiz();
  });
  byId("harmony-progression").addEventListener("change", () => {
    harmonyIndex = 0;
    renderHarmony();
  });
  byId("harmony-play").addEventListener("click", () =>
    playProgression(harmonyChords),
  );
  byId("harmony-check").addEventListener("click", checkHarmonyQuiz);
  byId("harmony-reset").addEventListener("click", newHarmonyQuiz);
  ["composition-root", "composition-progression", "composition-scale"].forEach(
    (id) => byId(id).addEventListener("change", renderComposition),
  );
  byId("composition-regenerate").addEventListener("click", () => {
    compositionSeed++;
    renderComposition();
  });
  byId("composition-play").addEventListener("click", playComposition);
}

// Инициализируем все разделы один раз, чтобы переходы не сбрасывали задания.
function initialise() {
  initialiseSelects();
  fillReference();
  bindEvents();
  renderNotes();
  newNotesQuiz();
  renderInterval();
  newIntervalBuild();
  newIntervalEar();
  setIntervalTask("build");
  renderTriad(true);
  newTriadQuiz();
  renderSeventh(true);
  newSeventhQuiz();
  renderScale();
  newScaleQuiz();
  renderKey();
  newKeyQuiz();
  renderHarmony();
  newHarmonyQuiz();
  renderComposition();
  if (!window.Tone) byId("audio-status").textContent = "Звук браузера";
  showStats();
  showView();
}
initialise();
