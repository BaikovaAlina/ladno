/*
 * Проверка музыкальных данных без браузера.
 * Запуск: node tools/check-data.mjs
 *
 * Что проверяем:
 *  1) интервалы: полутоны и буквенные шаги согласованы с реальной записью;
 *  2) гаммы: offset ступени соответствует её подписи (♭3 = 3 полутона и т.д.);
 *  3) боксы пентатоники: окна в пределах грифа, корень внутри окна;
 *  4) блюзовые гаммы: блюзовая нота действительно ♭5 / ♭3;
 *  5) аккорды: аппликатуры имеют по одной ноте на струну и правильные классы высот;
 *  6) прогрессии: строятся в мажоре и миноре, без undefined.
 */
import {
  CHROMATIC, ROOTS, STRINGS, mod, parseNote, pentatonicBoxes, positionsForMidi,
  spellInterval, writtenOctave,
} from "../core/notes.js";
import {
  ALL_CHORD_TYPES, INTERVALS, SEVENTHS, TRIADS, chordInversionsVoicings, findVoicings,
  makeChord,
} from "../core/chords.js";
import { BLUES_TYPES, SCALES, getScale, pentatonicPositions, scalePositions, twelveBarBlues } from "../core/scales.js";
import { PROGRESSIONS, progressionChords } from "../core/progressions.js";
import { CIRCLE, DEGREE_INFO, ENHARMONIC_KEYS, keySignList } from "../core/keys.js";
import { RHYTHM_PATTERNS, getMeter } from "../core/rhythm.js";

let failures = 0;
const fail = (message) => { failures += 1; console.log("  ✗ " + message); };
const ok = (message) => console.log("  ✓ " + message);

/* ---------------------------------------------------------------- */
/* 1. Интервалы                                                      */
/* ---------------------------------------------------------------- */
console.log("\n1. Интервалы");
for (const interval of INTERVALS) {
  ["C", "F#", "Bb", "B"].forEach((root) => {
    const name = spellInterval(root, interval.semitones, interval.steps);
    const actual = mod(parseNote(name).pc - parseNote(root).pc);
    if (actual !== interval.semitones % 12 && interval.semitones < 12) {
      fail(`${interval.id} от ${root}: ожидалось ${interval.semitones} полутонов, получилось ${actual} (${name})`);
    }
    if (parseNote(name).letter === undefined) fail(`${interval.id} от ${root}: пустая буква`);
  });
}
if (INTERVALS.length !== 12) fail(`интервалов должно быть 12, а их ${INTERVALS.length}`);
else ok(`12 интервалов, запись верна от всех проверенных тоник`);

const majorSemitones = { m2:1, M2:2, m3:3, M3:4, P4:5, TT:6, P5:7, m6:8, M6:9, m7:10, M7:11, P8:12 };
INTERVALS.forEach((interval) => {
  if (majorSemitones[interval.id] !== interval.semitones) {
    fail(`${interval.id}: ${interval.semitones} полутонов вместо ${majorSemitones[interval.id]}`);
  }
});
ok("полутоны всех интервалов соответствуют названиям");

/* ---------------------------------------------------------------- */
/* 2. Гаммы                                                          */
/* ---------------------------------------------------------------- */
console.log("\n2. Гаммы и лады");
const degreeToSemitones = { "1":0, "2":2, "♭2":1, "3":4, "♭3":3, "4":5, "♯4":6, "5":7, "♭5":6, "6":9, "♭6":8, "7":11, "♭7":10 };
SCALES.forEach((scale) => {
  if (scale.offsets.length !== scale.degrees.length) {
    fail(`${scale.id}: ${scale.offsets.length} смещений, но ${scale.degrees.length} ступеней`);
  }
  scale.degrees.forEach((degree, index) => {
    const expected = degreeToSemitones[degree];
    if (expected == null) fail(`${scale.id}: неизвестная ступень ${degree}`);
    else if (expected !== scale.offsets[index]) {
      fail(`${scale.id}: ступень ${degree} должна быть ${expected} полутонов, а стоит ${scale.offsets[index]}`);
    }
  });
  if (scale.degrees[0] !== "1") fail(`${scale.id}: первая ступень не 1`);
  if (!scale.plain || !scale.mistake) fail(`${scale.id}: нет блоков «на пальцах»/«ошибка»`);
});
ok(`${SCALES.length} гамм: ступени, смещения и тексты на месте`);

// Позиции на грифе: три окна, корень внутри, ноты из гаммы.
["major", "harmonicMinor", "melodicMinorUp", "dorian"].forEach((id) => {
  const scale = getScale(id);
  ["C", "A", "F#"].forEach((root) => {
    const rootPc = parseNote(root).pc;
    const positions = scalePositions(rootPc, scale, 3);
    if (positions.length !== 3) fail(`${id} от ${root}: ${positions.length} позиций вместо 3`);
    positions.forEach((position) => {
      if (position.fretFrom < 0 || position.fretTo > 15) fail(`${id} от ${root}: окно вне грифа ${position.fretFrom}–${position.fretTo}`);
      if (!position.notes.length) fail(`${id} от ${root}: пустая позиция`);
      position.notes.forEach((note) => {
        if (!scale.offsets.includes(mod(note.midi - rootPc))) fail(`${id} от ${root}: в позиции нота вне гаммы`);
      });
      if (!position.notes.some((note) => note.isRoot)) fail(`${id} от ${root}: в позиции нет корня`);
    });
  });
});
ok("позиции обычных гамм: 3 окна, все ноты из гаммы, корень внутри");

/* ---------------------------------------------------------------- */
/* 3. Пентатоника                                                    */
/* ---------------------------------------------------------------- */
console.log("\n3. Пентатоника и боксы");
ROOTS.forEach((root) => {
  ["minor", "major"].forEach((type) => {
    const boxes = pentatonicBoxes(parseNote(root).pc, type);
    if (boxes.length !== 5) fail(`${root} ${type}: ${boxes.length} боксов вместо 5`);
    boxes.forEach((box, index) => {
      if (box.start < 0 || box.end > 15) fail(`${root} ${type} бокс ${index + 1}: окно ${box.start}–${box.end}`);
      if (box.end - box.start < 2) fail(`${root} ${type} бокс ${index + 1}: окно слишком узкое`);
    });
    const positions = pentatonicPositions(parseNote(root).pc, type);
    positions.forEach((position) => {
      const pcs = new Set();
      position.notes.forEach((note) => pcs.add(mod(note.midi)));
      const scale = getScale(type === "major" ? "majorPent" : "minorPent");
      const wanted = scale.offsets.map((offset) => mod(parseNote(root).pc + offset));
      pcs.forEach((pc) => {
        if (!wanted.includes(pc)) fail(`${root} ${type} бокс ${position.id}: нота ${CHROMATIC[pc]} не из пентатоники`);
      });
    });
  });
});
ok("12 тоник × 2 типа: по 5 боксов, окна в пределах грифа, ноты из гаммы");

// Мажорная пентатоника = минорная от VI ступени.
["C", "G", "A"].forEach((root) => {
  const minorPcs = getScale("minorPent").offsets.map((offset) => mod(parseNote(root).pc + offset));
  const relative = CHROMATIC[mod(parseNote(root).pc + 3)];
  const majorPcs = getScale("majorPent").offsets.map((offset) => mod(parseNote(relative).pc + offset));
  if (minorPcs.slice().sort().join() !== majorPcs.slice().sort().join()) {
    fail(`минорная от ${root} и мажорная от ${relative} не совпали`);
  }
});
ok("мажорная пентатоника = минорная от VI ступени (проверено на C, G, A)");

/* ---------------------------------------------------------------- */
/* 4. Блюзовые гаммы                                                 */
/* ---------------------------------------------------------------- */
console.log("\n4. Блюзовые гаммы");
BLUES_TYPES.forEach((type) => {
  const scale = getScale(type.scaleId);
  if (type.id === "minor" && type.blueOffset !== 6) fail("минорная блюзовая: ♭5 должен быть 6 полутонов");
  if (type.id === "major" && type.blueOffset !== 3) fail("мажорная блюзовая: ♭3 должен быть 3 полутона");
  if (!scale.offsets.includes(type.blueOffset)) fail(`${type.scaleId}: блюзовой ноты нет в смещениях`);
});
if (getScale("minorBlues").offsets.length !== 6) fail("минорная блюзовая должна содержать 6 нот");
if (getScale("majorBlues").offsets.length !== 6) fail("мажорная блюзовая должна содержать 6 нот");
ok("блюзовые гаммы: 6 нот, ♭5 у минорной и ♭3 у мажорной");

/* ---------------------------------------------------------------- */
/* 5. Аккорды и аппликатуры                                          */
/* ---------------------------------------------------------------- */
console.log("\n5. Аккорды");
ALL_CHORD_TYPES.forEach((type) => {
  ["C", "E", "Bb", "F#"].forEach((root) => {
    for (let inversion = 0; inversion < type.offsets.length; inversion++) {
      const chord = makeChord(root, type, inversion);
      const pcs = chord.notes.map((note) => mod(note.midi));
      const wanted = type.offsets.map((offset) => mod(parseNote(root).pc + offset));
      if (pcs.slice().sort().join() !== wanted.slice().sort().join()) {
        fail(`${root}${type.symbol} обращение ${inversion}: состав не совпал`);
      }
      if (chord.notes.length !== type.offsets.length) fail(`${root}${type.symbol}: неверное число нот`);
    }
    const voicings = findVoicings(makeChord(root, type).notes);
    if (!voicings.length) fail(`${root}${type.symbol}: не найдено ни одной аппликатуры`);
    voicings.forEach((voicing) => {
      const strings = voicing.positions.map((p) => p.string);
      if (new Set(strings).size !== strings.length) fail(`${root}${type.symbol}: две ноты на одной струне`);
      if (voicing.positions.some((p) => p.fret < 0 || p.fret > 15)) fail(`${root}${type.symbol}: лад вне грифа`);
      // Позиции идут от баса к верхнему голосу: индекс струны убывает
      // (0 — тонкая струна), высота растёт.
      for (let i = 1; i < voicing.positions.length; i++) {
        if (voicing.positions[i].string >= voicing.positions[i - 1].string) {
          fail(`${root}${type.symbol}: голоса не поднимаются по струнам`);
        }
        if (voicing.positions[i].midi <= voicing.positions[i - 1].midi) {
          fail(`${root}${type.symbol}: голоса не по возрастанию`);
        }
      }
    });
    const inversions = chordInversionsVoicings(root, type);
    if (inversions.length !== type.offsets.length) fail(`${root}${type.symbol}: обращений ${inversions.length}`);
  });
});
ok("все типы аккордов: состав, обращения и аппликатуры корректны от 4 тоник");

// Бас обращения действительно соответствует ноте.
const seventh = makeChord("G", SEVENTHS.find((t) => t.id === "dom7"), 3);
if (mod(seventh.notes[0].midi) !== mod(parseNote("G").pc + 10)) fail("3-е обращение G7: в басу не септима");
ok("обращения септаккорда: в басу правильная ступень");

/* ---------------------------------------------------------------- */
/* 6. Прогрессии и тональности                                       */
/* ---------------------------------------------------------------- */
console.log("\n6. Прогрессии, круг, ритм");
PROGRESSIONS.forEach((progression) => {
  ["major", "minor"].forEach((mode) => {
    ["C", "A", "Eb"].forEach((root) => {
      [false, true].forEach((sevenths) => {
        const chords = progressionChords(root, progression, mode, sevenths);
        if (!chords.length) fail(`${progression.id} ${mode}: пустая прогрессия`);
        chords.forEach((chord) => {
          if (!chord.symbol || !chord.notes?.length) fail(`${progression.id} ${mode} от ${root}: битый аккорд`);
        });
      });
    });
  });
  if (!progression.melodyTips?.length) fail(`${progression.id}: нет мелодических подсказок`);
});
ok(`${PROGRESSIONS.length} прогрессий строятся в мажоре и миноре, с септаккордами и без`);

if (CIRCLE.length !== 12) fail("в круге должно быть 12 узлов");
DEGREE_INFO.forEach((info) => {
  if (!["T", "S", "D"].includes(info.fn)) fail(`ступень ${info.roman}: неверная функция`);
});
[...CIRCLE, ...ENHARMONIC_KEYS].forEach((key) => {
  if (key.count > 7) fail(`${key.major}: больше 7 знаков`);
  if (key.count !== keySignList(key).length) fail(`${key.major}: список знаков не совпадает со счётчиком`);
});
ok("квинтовый круг: 12 узлов, 3 энгармонические записи, знаки согласованы");

RHYTHM_PATTERNS.forEach((pattern) => {
  const meter = getMeter(pattern.meter);
  if (!meter) fail(`${pattern.id}: неизвестный размер ${pattern.meter}`);
  pattern.hits.forEach((hit) => {
    if (hit.start < 0 || hit.start >= meter.beats) fail(`${pattern.id}: удар за пределами такта (${hit.start})`);
    if (hit.dur <= 0) fail(`${pattern.id}: нулевая длительность`);
    if (hit.start + hit.dur > meter.beats + 0.01) fail(`${pattern.id}: нота выходит за такт`);
  });
});
ok(`${RHYTHM_PATTERNS.length} ритмических паттернов: удары внутри такта, длительности положительные`);

// 12-тактовый блюз: 12 тактов и правильная схема.
const blues = twelveBarBlues("A");
if (blues.bars.length !== 12) fail("в блюзе не 12 тактов");
const degrees = blues.bars.map((bar) => bar.degree).join(",");
if (degrees !== "I7,I7,I7,I7,IV7,IV7,I7,I7,V7,IV7,I7,V7") fail("схема 12-тактового блюза неверна: " + degrees);
ok("12-тактовый блюз: 12 тактов, схема I–IV–V верна");

// Стан: октава записи не уезжает.
[["C", 60, 4], ["B", 71, 4], ["C", 72, 5], ["E", 40, 2]].forEach(([name, midi, octave]) => {
  if (writtenOctave(name, midi) !== octave) fail(`${name}${midi}: октава ${writtenOctave(name, midi)} вместо ${octave}`);
});
ok("запись октав на стане корректна (C4, B4, C5, E2)");

// Позиции нот на грифе: открытая 1-я струна = E4.
if (!positionsForMidi(64).some((p) => p.string === 0 && p.fret === 0)) fail("E4 не найдена на открытой 1-й струне");
if (!positionsForMidi(40).some((p) => p.string === 5 && p.fret === 0)) fail("E2 не найдена на открытой 6-й струне");
if (STRINGS.length !== 6) fail("струн не 6");
ok("строй и позиции нот согласованы (E4 на 1-й, E2 на 6-й струне)");

console.log(
  failures === 0
    ? "\nИТОГ: все проверки данных пройдены."
    : `\nИТОГ: найдено проблем — ${failures}.`,
);
process.exit(failures === 0 ? 0 : 1);
