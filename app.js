/*
 * app.js — главный модуль учебника «Ладно · Сольфеджио на гитаре».
 * Связывает 14 глав курса, единый гриф, нотный стан, тему оформления,
 * прогресс-бар прохождения курса, визуализаторы теории и практические тренажёры.
 */

import {
  ROOTS,
  mod,
  randomItem,
  parseNote,
  prettyNote,
  rootMidi,
  spellInterval,
  writtenNote,
  midiOctave,
  bestPosition,
  describePosition,
  nameMap,
  escapeHTML,
} from "./data/notes.js";
import {
  INTERVALS,
  COMPOUND_INTERVALS,
  getInterval,
  getIntervalInversion,
  semiText,
} from "./data/intervals.js";
import {
  TRIADS,
  SEVENTHS,
  TRIAD_INVERSIONS,
  SEVENTH_INVERSIONS,
  getTriad,
  getSeventh,
  makeChord,
  findVoicings,
  voicedNotes,
  getAllInversionsAcrossNeck,
} from "./data/chords.js";
import {
  SCALES,
  getScale,
  scaleNames,
  scalePcs,
  scaleNotes,
  getScaleThreePositions,
  getPentatonicBoxes,
  explainPentatonicDerivation,
} from "./data/scales.js";
import {
  CIRCLE,
  ENHARMONIC_KEYS,
  PROGRESSIONS,
  BLUES_12BAR_GUIDES,
  NOTE_DURATIONS,
  METERS,
  RHYTHM_PATTERNS,
  keyCountText,
  keySignText,
  diatonicChordsOfKey,
  getModulationPaths,
  getProgression,
  progressionChords,
} from "./data/progressions.js";
import {
  ALL_SECTION_IDS,
  getState,
  subscribeState,
  setTheme,
  toggleTheme,
  markSectionVisited,
  formatExerciseStats,
  isStorageAvailable,
  resetAllProgress,
  buildShareSummary,
  copyTextToClipboard,
} from "./ui/state.js";
import { renderFretboard } from "./ui/fretboard.js";
import { renderStaff } from "./ui/staff.js";
import {
  playEvents,
  playIntervalInMode,
  playChordInMode,
  showToast,
  initIntervalEarTrainer,
  initChordEarTrainer,
} from "./ui/earTrainer.js";
import {
  setSwitchGroup,
  initNotesExercise,
  initIntervalsExercise,
  initTriadsExercise,
  initSeventhsExercise,
  initScalesExercise,
  initKeysExercise,
  initHarmonyExercise,
  initCompositionLab,
  initPentatonicExercises,
  initBluesExercises,
  initRhythmModule,
  initSightReadingModule,
} from "./ui/exercises.js";

const byId = (id) => document.getElementById(id);

function fillSelect(id, entries, selected) {
  const el = byId(id);
  if (!el) return;
  el.innerHTML = entries
    .map(
      (item) =>
        `<option value="${escapeHTML(item.value)}">${escapeHTML(item.label)}</option>`,
    )
    .join("");
  if (selected != null) el.value = selected;
}

/* Описание всех 14 разделов учебника */
export const VIEW_META = {
  notes: {
    no: "01",
    label: "Ноты и октавы",
    eyebrow: "01 / САМОЕ НАЧАЛО",
    line1: "Музыка начинается",
    line2: "с одной ноты.",
    text: "Разберёмся в 12 звуках, тонах и полутонах, найдём октавы на грифе и услышим каждую струну без пугающих терминов.",
  },
  intervals: {
    no: "02",
    label: "Интервалы",
    eyebrow: "02 / МЕЖДУ НОТАМИ",
    line1: "Расстояние, которое",
    line2: "можно услышать.",
    text: "Простые и составные интервалы, их обращения и живой характер звучания — от мягкой терции до острого тритона.",
  },
  triads: {
    no: "03",
    label: "Трезвучия",
    eyebrow: "03 / ПЕРВЫЕ АККОРДЫ",
    line1: "Три ноты.",
    line2: "Четыре характера.",
    text: "Строим мажор, минор, уменьшённые и увеличенные трезвучия, изучаем аппликатуры на 4-й и 5-й струнах и все обращения вдоль грифа.",
  },
  sevenths: {
    no: "04",
    label: "Септаккорды",
    eyebrow: "04 / БОЛЬШЕ ЦВЕТА",
    line1: "Добавь септиму —",
    line2: "измени глубину.",
    text: "Шесть видов септаккордов, все четыре классических обращения (7, 6/5, 4/3, 2) и компактные гитарные формы Drop-2.",
  },
  scales: {
    no: "05",
    label: "Гаммы и лады",
    eyebrow: "05 / КАРТА ЗВУКОВ",
    line1: "Найди свой",
    line2: "музыкальный лад.",
    text: "Мажор, гармонический мажор, три вида минора (включая мелодический ↑/↓), семь ладов и 3 удобные позиции на грифе для каждого.",
  },
  keys: {
    no: "06",
    label: "Квинтовый круг",
    eyebrow: "06 / НАВИГАЦИЯ ПО ТОНАЛЬНОСТЯМ",
    line1: "У тональностей",
    line2: "тоже есть соседи.",
    text: "Ключевые знаки, все семь диатонических аккордов выбранной тональности с функциями и маршруты плавной модуляции.",
  },
  harmony: {
    no: "07",
    label: "Гармония",
    eyebrow: "07 / АККОРДЫ В ДВИЖЕНИИ",
    line1: "Пусть аккорды",
    line2: "расскажут историю.",
    text: "Популярные, джазовые, минорные и блюзовые прогрессии с готовыми подсказками по мелодическому голосоведению.",
  },
  composition: {
    no: "08",
    label: "Композиция",
    eyebrow: "08 / СВОЯ МЕЛОДИЯ",
    line1: "Из короткого мотива —",
    line2: "в маленькую пьесу.",
    text: "Выбирай гармонию, лад и ритм мотива (четверти или восьмые), сохраняй эскизы в браузере и скачивай их в JSON.",
  },
  pentatonic: {
    no: "09",
    label: "Пентатоника",
    eyebrow: "09 / ГЛАВНОЕ ОРУЖИЕ ГИТАРИСТА",
    line1: "Пять нот.",
    line2: "Пять боксов по грифу.",
    text: "Минорная и мажорная пентатоника, наглядная карта всех 5 боксов с пальцовкой, секреты легато и певучих бендов.",
  },
  blues: {
    no: "10",
    label: "Блюзовые гаммы",
    eyebrow: "10 / БЛЮЗОВЫЙ ОТТЕНОК",
    line1: "Одна «синяя» нота",
    line2: "меняет всё.",
    text: "Минорная (♭5) и мажорная (♭3) блюзовые гаммы, как вкусно обыгрывать блюзовую ноту и как устроен 12-тактовый блюз в A и E.",
  },
  "ear-intervals": {
    no: "11",
    label: "Тренировщик слуха",
    eyebrow: "11 / СОЛЬФЕДЖИО ДЛЯ УШЕЙ",
    line1: "Услышь каждый",
    line2: "интервал с полуслова.",
    text: "Все 12 интервалов в четырёх режимах звучания, настройка тембра и подробная матрица твоей точности с поиском слабых мест.",
  },
  "ear-chords": {
    no: "12",
    label: "Аккорды на слух",
    eyebrow: "12 / ГАРМОНИЧЕСКИЙ СЛУХ",
    line1: "Узнавай краску",
    line2: "аккорда вслепую.",
    text: "Девять типов трезвучий и септаккордов в арпеджио и гармоническом звучании с мгновенной нотной расшифровкой.",
  },
  rhythm: {
    no: "13",
    label: "Ритм и грув",
    eyebrow: "13 / ПУЛЬС И ДОЛИ",
    line1: "Почувствуй время",
    line2: "кончиками пальцев.",
    text: "Длительности, сильные и слабые доли, размеры 4/4, 3/4 и 6/8, метроном с драм-машиной и тренажёр ритма по клавише Пробел.",
  },
  "sight-reading": {
    no: "14",
    label: "Чтение с листа",
    eyebrow: "14 / НОТНЫЙ СТАН И ГРИФ",
    line1: "От ноты на бумаге —",
    line2: "сразу к ладу.",
    text: "Скрипичный ключ, секрет гитарной октавной транспозиции и азартный 30-секундный спринт по чтению нот на грифе.",
  },
};

/* Состояние визуализаторов разделов */
let notesMode = "all";
let triadShowAllInversions = false;
let currentTriad = null;
let seventhShowAllInversions = false;
let currentSeventh = null;
let scaleDisplayMode = "scale";
let scaleDirection = "up";
let scalePosFilter = "all"; // 'all' | '1' | '2' | '3' | 'zones'
let selectedKeyIndex = 0;
let selectedKeyVariant = null;
let keyDisplayMode = "major";
let showKeyChordsPanel = true;
let harmonyChordIndex = 0;
let harmonyChordsList = [];
let pentShowAllBoxes = false;
let pentActiveBox = 0; // 0 = весь гриф, 1..5 = конкретный бокс
let bluesActiveBox = 0;
let bluesGuideKey = "A";

let getIntervalTaskMode = () => "build";
let getKeyTaskMode = () => "signs";
let rhythmControl = { stopRhythm: () => {} };
let sightControl = { stopSprint: () => {} };

/* 01. Визуализация грифа с нотами */
function renderNotesSection() {
  const octave = byId("notes-octave").value;
  const root = byId("notes-root").value;
  const scale = getScale(byId("notes-scale").value);
  const pcs = new Set(scalePcs(root, scale));
  const names = notesMode === "scale" ? nameMap(scaleNames(root, scale)) : {};

  renderFretboard({
    container: "notes-board",
    showAll: notesMode === "all",
    names,
    root: notesMode === "scale" ? parseNote(root).pc : null,
    highlighted: (p) =>
      (octave === "all" || midiOctave(p.midi) === Number(octave)) &&
      (notesMode === "all" || pcs.has(p.pc)),
    statusId: "notes-status",
  });
}

/* 02. Визуализация интервалов + обращения + составные интервалы */
function renderIntervalsSection() {
  const root = byId("interval-root").value;
  const interval = getInterval(byId("interval-type").value);
  const first = rootMidi(root);
  const second = first + interval.semitones;
  const other = spellInterval(root, interval.semitones, interval.steps);
  const a = bestPosition(first, 12);
  const b = bestPosition(second, 12);
  const invInfo = getIntervalInversion(interval.id);
  const invTargetName = spellInterval(
    other,
    invInfo.inverted.semitones,
    invInfo.inverted.steps,
  );

  renderFretboard({
    container: "interval-board",
    highlighted: [a?.key, b?.key].filter(Boolean),
    root: a ? [a.key] : [],
    names: nameMap([root, other]),
    statusId: "interval-status",
  });

  byId("interval-summary").textContent =
    `${writtenNote(root, first)} → ${writtenNote(other, second)} · ${interval.short} (${semiText(interval.semitones)})`;
  byId("interval-description").textContent =
    `${interval.name} (${interval.character}). Как звучит: ${interval.howItSounds}`;
  byId("interval-inversion-box").innerHTML =
    `<strong>Обращение:</strong> если перенести ${prettyNote(root)} на октаву вверх (${prettyNote(other)} → ${prettyNote(invTargetName)}), получится <strong>${escapeHTML(invInfo.inverted.name)} (${escapeHTML(invInfo.inverted.short)}, ${semiText(invInfo.inverted.semitones)})</strong>. Правило: сумма полутонов = 12, сумма ступеней = 9.`;
  byId("interval-fingers-tip").textContent = interval.onFingers;
  byId("interval-mistake-tip").textContent = interval.commonMistake;

  renderStaff("interval-staff", [
    { midi: first, name: root },
    { midi: second, name: other },
  ]);
}

/* 03. Конструктор трезвучий (4-я / 5-я струны + все обращения по грифу) */
function renderTriadsSection(resetShape = false) {
  const root = byId("triad-root").value;
  const type = getTriad(byId("triad-type").value);
  const inv = Number(byId("triad-inversion").value);
  const bassFilter = byId("triad-string-set").value;
  currentTriad = makeChord(root, type, inv);

  const voicings = findVoicings(currentTriad.notes, {
    bassString: bassFilter,
    maxFret: 15,
    limit: 6,
  });

  if (resetShape) {
    const opts = voicings.length
      ? voicings.map((posArr, i) => ({
          value: String(i),
          label: `Форма ${i + 1} (лады ${Math.min(...posArr.map((p) => p.fret))}–${Math.max(...posArr.map((p) => p.fret))})`,
        }))
      : [{ value: "0", label: "Стандартное расположение" }];
    fillSelect("triad-shape", opts, "0");
  }

  const shapeIdx = Number(byId("triad-shape").value) || 0;
  const positionSet = voicings[shapeIdx] || voicings[0] || [];
  currentTriad.voicedNotes = positionSet.length
    ? voicedNotes(positionSet, currentTriad.names)
    : currentTriad.notes;

  if (triadShowAllInversions) {
    const allShapes = getAllInversionsAcrossNeck(
      root,
      type,
      bassFilter === "all" ? "4" : bassFilter,
    );
    const allPosKeys = allShapes.flatMap((s) => s.positions.map((p) => p.key));
    renderFretboard({
      container: "triad-board",
      maxFret: 15,
      highlighted: allPosKeys.length ? allPosKeys : currentTriad.pcs,
      root: parseNote(root).pc,
      names: nameMap(currentTriad.names),
      boxes: allShapes.map((s) => ({
        label: s.label,
        minFret: s.minFret,
        maxFret: s.maxFret,
        color: s.color,
        active: s.inversion === inv,
      })),
      statusId: "triad-status",
    });
  } else {
    renderFretboard({
      container: "triad-board",
      maxFret: 15,
      highlighted: positionSet.map((p) => p.key),
      root: parseNote(root).pc,
      names: nameMap(currentTriad.names),
      statusId: "triad-status",
    });
  }

  const invMeta = TRIAD_INVERSIONS[inv];
  byId("triad-summary").textContent =
    `${currentTriad.fullSymbol} · ${invMeta.name} · звуки: ${currentTriad.voicedNotes.map((n) => prettyNote(n.name)).join(" – ")}`;
  byId("triad-description").textContent =
    `${type.description} (${invMeta.bassRole}).`;
  byId("triad-position").textContent = triadShowAllInversions
    ? "Показаны все 3 обращения вдоль грифа (подсвечены полупрозрачными зонами)."
    : positionSet.length
      ? positionSet.map(describePosition).join(" · ")
      : "Выбери «Все струны» для поиска аппликатуры в этом регистре.";
  byId("triad-fingers-tip").textContent = type.onFingers;
  byId("triad-mistake-tip").textContent = type.commonMistake;

  renderStaff("triad-staff", currentTriad.voicedNotes, true);
}

/* 04. Конструктор септаккордов (все 4 обращения + 4-я и 5-я струны + весь гриф) */
function renderSeventhsSection(resetShape = false) {
  const root = byId("seventh-root").value;
  const type = getSeventh(byId("seventh-type").value);
  const inv = Number(byId("seventh-inversion").value);
  const bassFilter = byId("seventh-string-set").value;
  currentSeventh = makeChord(root, type, inv);

  const voicings = findVoicings(currentSeventh.notes, {
    bassString: bassFilter,
    maxFret: 15,
    limit: 6,
  });

  if (resetShape) {
    const opts = voicings.length
      ? voicings.map((posArr, i) => ({
          value: String(i),
          label: `Форма ${i + 1} (лады ${Math.min(...posArr.map((p) => p.fret))}–${Math.max(...posArr.map((p) => p.fret))})`,
        }))
      : [{ value: "0", label: "Базовое расположение" }];
    fillSelect("seventh-shape", opts, "0");
  }

  const shapeIdx = Number(byId("seventh-shape").value) || 0;
  const positionSet = voicings[shapeIdx] || voicings[0] || [];
  currentSeventh.voicedNotes = positionSet.length
    ? voicedNotes(positionSet, currentSeventh.names)
    : currentSeventh.notes;

  if (seventhShowAllInversions) {
    const allShapes = getAllInversionsAcrossNeck(
      root,
      type,
      bassFilter === "all" ? "4" : bassFilter,
    );
    const allKeys = allShapes.flatMap((s) => s.positions.map((p) => p.key));
    renderFretboard({
      container: "seventh-board",
      maxFret: 15,
      highlighted: allKeys.length ? allKeys : currentSeventh.pcs,
      root: parseNote(root).pc,
      names: nameMap(currentSeventh.names),
      boxes: allShapes.map((s) => ({
        label: s.label,
        minFret: s.minFret,
        maxFret: s.maxFret,
        color: s.color,
        active: s.inversion === inv,
      })),
      statusId: "seventh-status",
    });
  } else {
    renderFretboard({
      container: "seventh-board",
      maxFret: 15,
      highlighted: positionSet.map((p) => p.key),
      root: parseNote(root).pc,
      names: nameMap(currentSeventh.names),
      statusId: "seventh-status",
    });
  }

  const invMeta = SEVENTH_INVERSIONS[inv];
  byId("seventh-summary").textContent =
    `${currentSeventh.fullSymbol} · ${invMeta.name} · состав: ${currentSeventh.names.map(prettyNote).join(" – ")}`;
  byId("seventh-description").textContent =
    `${type.description} (${invMeta.bassRole}).`;
  byId("seventh-position").textContent = seventhShowAllInversions
    ? "На грифе выделены все 4 обращения (7, 6/5, 4/3, 2) вдоль выбранного набора струн!"
    : positionSet.length
      ? positionSet.map(describePosition).join(" · ")
      : "Переключи басовую струну на «Все удобные» для этого обращения.";
  byId("seventh-fingers-tip").textContent = type.onFingers;
  byId("seventh-mistake-tip").textContent = type.commonMistake;

  renderStaff("seventh-staff", currentSeventh.voicedNotes, true);
}

/* 05. Гаммы и лады (с направлением мелодического минора и 3 позициями на грифе) */
function renderScalesSection() {
  const root = byId("scale-root").value;
  const scale = getScale(byId("scale-type").value);
  const dirRow = byId("scale-melodic-dir-wrap");
  if (dirRow) dirRow.hidden = scale.id !== "melodicMinor";
  const effectiveDir = scale.id === "melodicMinor" ? scaleDirection : "up";

  const names = scaleNames(root, scale, effectiveDir);
  const notes = scaleNotes(root, scale, true, effectiveDir);
  const positions3 = getScaleThreePositions(root, scale, effectiveDir);
  const bluePc =
    scale.blueNoteOffset != null
      ? mod(parseNote(root).pc + scale.blueNoteOffset)
      : null;

  let highlighted = scalePcs(root, scale, effectiveDir);
  let boxes = [];

  if (
    scalePosFilter === "1" ||
    scalePosFilter === "2" ||
    scalePosFilter === "3"
  ) {
    const idx = Number(scalePosFilter) - 1;
    const chosenBox = positions3[idx];
    highlighted = chosenBox.positions.map((p) => p.key);
    boxes = [
      {
        label: chosenBox.title,
        minFret: chosenBox.minFret,
        maxFret: chosenBox.maxFret,
        color: chosenBox.color,
        active: true,
      },
    ];
  } else if (scalePosFilter === "zones") {
    boxes = positions3.map((b) => ({
      label: `${b.name} (${b.minFret}–${b.maxFret})`,
      minFret: b.minFret,
      maxFret: b.maxFret,
      color: b.color,
      active: false,
    }));
  }

  renderFretboard({
    container: "scale-board",
    maxFret: 15,
    showAll: scaleDisplayMode === "all",
    highlighted,
    root: parseNote(root).pc,
    blueNotes: bluePc,
    boxes,
    names: nameMap(names),
    statusId: "scale-status",
  });

  byId("scale-formula").textContent = scale.formula;
  byId("scale-name").textContent =
    `${prettyNote(root)} · ${scale.name}${scale.id === "melodicMinor" ? (effectiveDir === "down" ? " (нисходящий натуральный ↓)" : " (восходящий ↑)") : ""}`;
  byId("scale-description").textContent = scale.description;
  byId("scale-fingers-tip").textContent = scale.onFingers;
  byId("scale-mistake-tip").textContent = scale.commonMistake;

  const displayNotes = effectiveDir === "down" ? [...notes].reverse() : notes;
  byId("scale-summary").textContent = displayNotes
    .map((n) => prettyNote(n.name))
    .join(" – ");
  renderStaff("scale-staff", displayNotes, false);
}

function playSelectedScale() {
  const root = byId("scale-root").value;
  const scale = getScale(byId("scale-type").value);
  const up = scaleNotes(root, scale, true, "up");
  const down = scaleNotes(
    root,
    scale,
    true,
    scale.id === "melodicMinor" ? "down" : "up",
  )
    .reverse()
    .slice(1);
  const seq = [...up, ...down];
  playEvents(
    seq.map((n, i) => ({
      notes: [n.midi],
      time: i * 0.28,
      duration: 0.25,
      velocity: i === 0 || i === up.length - 1 ? 0.82 : 0.68,
    })),
  );
}

/* 06. Квинтовый круг + аккорды тональности (I–vii°) + переходы для модуляции */
function activeCircleKey() {
  return selectedKeyVariant || CIRCLE[selectedKeyIndex];
}

function renderCircleSvg() {
  const key = activeCircleKey();
  const tonic = keyDisplayMode === "major" ? key.major : key.minor.slice(0, -1);
  const parts = [
    '<svg viewBox="0 0 380 380" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Квинтовый круг">',
    '<circle cx="190" cy="190" r="142" fill="none" stroke="var(--line, #dce6d7)" stroke-width="2"/>',
    '<circle cx="190" cy="190" r="98" fill="var(--soft, #f4f8ec)" stroke="var(--line, #e3ebdb)"/>',
    `<text x="190" y="168" text-anchor="middle" fill="var(--muted, #8c9d8c)" font-family="Inter, Arial, sans-serif" font-size="9" font-weight="800" letter-spacing="1.1">ТОНАЛЬНОСТЬ</text>`,
    `<text x="190" y="203" text-anchor="middle" fill="var(--green, #376b53)" font-family="Georgia, serif" font-size="30">${escapeHTML(prettyNote(tonic) + (keyDisplayMode === "minor" ? "m" : ""))}</text>`,
    `<text x="190" y="225" text-anchor="middle" fill="var(--muted, #8c9d8c)" font-family="Inter, Arial, sans-serif" font-size="10">${escapeHTML(keyCountText(key))}</text>`,
  ];

  CIRCLE.forEach((item, i) => {
    const angle = (i * Math.PI) / 6;
    const x = 190 + 142 * Math.sin(angle);
    const y = 190 - 142 * Math.cos(angle);
    const active = i === selectedKeyIndex;
    const shown = active && selectedKeyVariant ? selectedKeyVariant : item;
    const alt = ENHARMONIC_KEYS.find((k) => k.circleIndex === i);
    const majLbl = alt
      ? `${prettyNote(item.major)}/${prettyNote(alt.major)}`
      : prettyNote(item.major);
    const minLbl = `${prettyNote(shown.minor.slice(0, -1))}m`;

    parts.push(
      `<g class="key-node" data-key-index="${i}" role="button" tabindex="0" aria-label="${escapeHTML(majLbl)} мажор, параллельный ${escapeHTML(minLbl)}" aria-pressed="${active}">`,
      `<circle cx="${x}" cy="${y}" r="25" fill="${active ? "var(--green, #376b53)" : "var(--white, #fffefa)"}" stroke="${active ? "var(--green, #376b53)" : "var(--line, #d8e4d3)"}"/>`,
      `<text x="${x}" y="${y - 1}" text-anchor="middle" fill="${active ? "#ffffff" : "var(--ink, #314b3a)"}" font-family="Inter, Arial, sans-serif" font-size="${alt ? 9 : 12}" font-weight="700">${escapeHTML(majLbl)}</text>`,
      `<text x="${x}" y="${y + 12}" text-anchor="middle" fill="${active ? "#d7eac4" : "var(--muted, #8b9c8b)"}" font-family="Inter, Arial, sans-serif" font-size="9">${escapeHTML(minLbl)}</text>`,
      `</g>`,
    );
  });

  parts.push("</svg>");
  const circleEl = byId("key-circle");
  circleEl.innerHTML = parts.join("");

  const activate = (target) => {
    const node = target.closest("[data-key-index]");
    if (!node) return;
    selectedKeyIndex = Number(node.dataset.keyIndex);
    selectedKeyVariant = null;
    renderKeysSection();
  };
  circleEl.onclick = (e) => activate(e.target);
  circleEl.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(e.target);
    }
  };
}

function renderKeysSection() {
  const key = activeCircleKey();
  const tonic = keyDisplayMode === "major" ? key.major : key.minor.slice(0, -1);
  const scale = getScale(keyDisplayMode === "major" ? "major" : "naturalMinor");
  const names = scaleNames(tonic, scale);

  renderCircleSvg();

  byId("key-title").textContent =
    `${prettyNote(tonic)} ${keyDisplayMode === "major" ? "мажор" : "минор"}`;
  byId("key-relative").textContent =
    keyDisplayMode === "major"
      ? `Параллельный минор: ${prettyNote(key.minor.slice(0, -1))} минор`
      : `Параллельный мажор: ${prettyNote(key.major)} мажор`;
  byId("key-notes-label").textContent =
    keyDisplayMode === "major" ? "СТУПЕНИ МАЖОРА" : "СТУПЕНИ МИНОРА";

  const alt = ENHARMONIC_KEYS.find((k) => k.circleIndex === selectedKeyIndex);
  const variants = alt ? [CIRCLE[selectedKeyIndex], alt] : [];
  const varWrap = byId("key-enharmonic");
  varWrap.innerHTML = variants
    .map(
      (v) =>
        `<button type="button" data-major="${escapeHTML(v.major)}" class="${v.major === key.major ? "active" : ""}">${escapeHTML(prettyNote(keyDisplayMode === "major" ? v.major : v.minor.slice(0, -1)))} ${keyDisplayMode === "major" ? "мажор" : "минор"}</button>`,
    )
    .join("");
  varWrap.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedKeyVariant =
        variants.find((v) => v.major === btn.dataset.major) || null;
      renderKeysSection();
    }),
  );

  byId("key-sign-count").textContent = keyCountText(key);
  byId("key-signs").textContent = keySignText(key);
  byId("key-notes").textContent = names.map(prettyNote).join(" · ");

  // Аккорды тональности (I–vii°) с функциями
  const chordsPanel = byId("key-diatonic-panel");
  chordsPanel.hidden = !showKeyChordsPanel;
  if (showKeyChordsPanel) {
    const chords = diatonicChordsOfKey(tonic, keyDisplayMode);
    byId("key-diatonic-chords").innerHTML = chords
      .map(
        (ch, idx) =>
          `<button type="button" class="chord-pill" data-key-chord="${idx}">
            <small>${escapeHTML(ch.roman)} · функция ${escapeHTML(ch.fn)}</small>
            <strong>${escapeHTML(ch.symbol)}</strong>
            <span>${escapeHTML(ch.names.map(prettyNote).join("–"))}</span>
          </button>`,
      )
      .join("");
    byId("key-diatonic-chords")
      .querySelectorAll("[data-key-chord]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const c = chords[Number(btn.dataset.keyChord)];
          playChordInMode(c.notes, "arpChord");
        });
      });

    const paths = getModulationPaths(selectedKeyIndex, key);
    byId("key-modulations-list").innerHTML = paths
      .map(
        (m) =>
          `<div class="mod-card">
            <small>${escapeHTML(m.relation)}</small>
            <strong>→ ${escapeHTML(m.target)}</strong>
            <p>${escapeHTML(m.pivotHint)}</p>
          </div>`,
      )
      .join("");
  }

  renderFretboard({
    container: "key-board",
    highlighted: scalePcs(tonic, scale),
    root: parseNote(tonic).pc,
    names: nameMap(names),
    statusId: "key-status",
  });
}

/* 07. Гармония (расширенные прогрессии + мелодические ходы) */
function renderHarmonySection() {
  const root = byId("harmony-root").value;
  const progression = getProgression(byId("harmony-progression").value);
  harmonyChordsList = progressionChords(root, progression).map((chord) => {
    const positions = findVoicings(chord.notes, { maxFret: 12 })[0] || [];
    return {
      ...chord,
      positions,
      voicedNotes: positions.length
        ? voicedNotes(positions, chord.names)
        : chord.notes,
    };
  });

  if (harmonyChordIndex >= harmonyChordsList.length) harmonyChordIndex = 0;

  const row = byId("harmony-chords");
  row.classList.toggle("twelve-bars", harmonyChordsList.length > 4);
  row.innerHTML = harmonyChordsList
    .map(
      (ch, i) =>
        `<button type="button" class="chord-pill ${i === harmonyChordIndex ? "active" : ""}" data-h-idx="${i}">
          <small>Такт ${i + 1} · ${escapeHTML(ch.roman)} (${escapeHTML(ch.fn)})</small>
          <strong>${escapeHTML(ch.symbol)}</strong>
          <span>${escapeHTML(ch.names.map(prettyNote).join(" · "))}</span>
        </button>`,
    )
    .join("");

  row.querySelectorAll("[data-h-idx]").forEach((btn) =>
    btn.addEventListener("click", () => {
      harmonyChordIndex = Number(btn.dataset.hIdx);
      const picked = harmonyChordsList[harmonyChordIndex];
      playChordInMode(picked.voicedNotes, "harm");
      renderHarmonySection();
    }),
  );

  const cur = harmonyChordsList[harmonyChordIndex];
  renderFretboard({
    container: "harmony-board",
    highlighted: cur.positions.map((p) => p.key),
    root: parseNote(cur.root).pc,
    names: nameMap(cur.names),
    statusId: "harmony-status",
  });

  byId("harmony-detail").textContent =
    `${cur.roman} · ${cur.symbol} (${cur.fn}): ${cur.names.map(prettyNote).join(" – ")}. ${cur.positions.map(describePosition).join(" · ")}.`;
  byId("harmony-melodic-moves").textContent = progression.melodicMoves;
  byId("harmony-prog-desc").textContent = progression.description;
}

/* 09. Пентатоника: визуализатор и 5 боксов CAGED с аппликатурами */
function renderPentatonicSection() {
  const root = byId("pent-root").value;
  const typeId = byId("pent-type").value; // 'minorPent' | 'majorPent'
  const isMajor = typeId === "majorPent";
  const scale = getScale(typeId);
  const boxes = getPentatonicBoxes(root, typeId, false);
  const deriv = explainPentatonicDerivation(root, isMajor);

  let highlighted = scalePcs(root, scale);
  let overlayBoxes = [];
  let fingerMap = null;

  if (pentActiveBox >= 1 && pentActiveBox <= 5) {
    const b = boxes[pentActiveBox - 1];
    highlighted = b.positions.map((p) => p.key);
    fingerMap = Object.fromEntries(b.positions.map((p) => [p.key, p.finger]));
    overlayBoxes = [
      {
        label: `${b.title} (${b.cagedForm})`,
        minFret: b.minFret,
        maxFret: b.maxFret,
        color: b.color,
        active: true,
      },
    ];
    byId("pent-box-detail").innerHTML =
      `<strong>${escapeHTML(b.title)}:</strong> ${escapeHTML(b.cagedForm)}. Пальцовка левой руки: <b>${escapeHTML(b.fingersSummary)}</b>. Бенды: ${escapeHTML(b.bendHint)}`;
  } else if (pentShowAllBoxes) {
    overlayBoxes = boxes.map((b) => ({
      label: `${b.name} (${b.minFret}–${b.maxFret})`,
      minFret: b.minFret,
      maxFret: b.maxFret,
      color: b.color,
      active: false,
    }));
    byId("pent-box-detail").innerHTML =
      `<strong>Все 5 боксов на грифе:</strong> соседние боксы делят общие ноты. Если форма пересекает край диапазона 0–15 ладов, показана только её доступная часть.`;
  } else {
    byId("pent-box-detail").innerHTML =
      `<strong>Из 7 ступеней в 5:</strong> берём ${isMajor ? "натуральный мажор" : "натуральный минор"} (${escapeHTML(deriv.full)}), убираем «полутоновые» ступени <b>${escapeHTML(deriv.removed)}</b> — остаются 5 безотказных нот: <strong>${escapeHTML(deriv.pent)}</strong>.`;
  }

  renderFretboard({
    container: "pent-board",
    maxFret: 15,
    highlighted,
    root: parseNote(root).pc,
    boxes: overlayBoxes,
    fingerMap,
    names: nameMap(scaleNames(root, scale)),
    statusId: "pent-status",
  });
}

function playPentatonicPreview() {
  const root = byId("pent-root").value;
  const typeId = byId("pent-type").value;
  const scale = getScale(typeId);
  if (pentActiveBox >= 1 && pentActiveBox <= 5) {
    const b = getPentatonicBoxes(root, typeId, false)[pentActiveBox - 1];
    const sorted = [...b.positions].sort((x, y) => x.midi - y.midi);
    playEvents(
      sorted.map((p, idx) => ({
        notes: [p.midi],
        time: idx * 0.22,
        duration: 0.2,
        velocity: p.isRoot ? 0.85 : 0.68,
      })),
    );
  } else {
    const notes = scaleNotes(root, scale, true);
    playEvents(
      notes.map((n, idx) => ({
        notes: [n.midi],
        time: idx * 0.26,
        duration: 0.24,
        velocity: 0.74,
      })),
    );
  }
}

/* 10. Блюзовые гаммы + подсветка ♭5 / ♭3 красным + 12-тактовый блюз в A и E */
function renderBluesSection() {
  const root = byId("blues-root").value;
  const typeId = byId("blues-type").value; // 'minorBlues' | 'majorBlues'
  const isMajor = typeId === "majorBlues";
  const scale = getScale(typeId);
  const pentBase = getScale(isMajor ? "majorPent" : "minorPent");
  const bluePc = mod(parseNote(root).pc + (isMajor ? 3 : 6));
  const blueSpelled = spellInterval(root, isMajor ? 3 : 6, isMajor ? 2 : 4);
  const boxes = getPentatonicBoxes(root, typeId, true);

  let highlighted = scalePcs(root, pentBase);
  let blueHighlight = bluePc;
  let overlayBoxes = [];

  if (bluesActiveBox >= 1 && bluesActiveBox <= 5) {
    const b = boxes[bluesActiveBox - 1];
    highlighted = b.positions.map((p) => p.key);
    blueHighlight = b.bluePositions.map((p) => p.key);
    overlayBoxes = [
      {
        label: b.title,
        minFret: b.minFret,
        maxFret: b.maxFret,
        color: "#c84b31",
        active: true,
      },
    ];
  }

  renderFretboard({
    container: "blues-board",
    maxFret: 15,
    highlighted,
    root: parseNote(root).pc,
    blueNotes: blueHighlight,
    boxes: overlayBoxes,
    names: nameMap(scaleNames(root, scale)),
    statusId: "blues-status",
  });

  byId("blues-summary").innerHTML =
    `<strong>${escapeHTML(prettyNote(root))} · ${escapeHTML(scale.name.toLowerCase())}:</strong> ${escapeHTML(scaleNames(root, scale).map(prettyNote).join(" – "))}. Выделенная красным блюзовая ступень — <strong>${escapeHTML(prettyNote(blueSpelled))} (${isMajor ? "♭3" : "♭5"})</strong>.`;

  // Справочник 12-тактового блюза в A или E
  const guide = BLUES_12BAR_GUIDES[bluesGuideKey] || BLUES_12BAR_GUIDES.A;
  byId("blues-guide-title").textContent = guide.title;
  byId("blues-guide-tip").textContent = guide.riffTip;
  byId("blues-guide-chords").innerHTML = Object.entries(guide.chords)
    .map(
      ([deg, info]) =>
        `<div class="lesson-mini-card">
          <small>${escapeHTML(deg)}</small>
          <strong>${escapeHTML(info.symbol)} (${escapeHTML(info.notes)})</strong>
          <p>${escapeHTML(info.openShape)}</p>
        </div>`,
    )
    .join("");
  byId("blues-guide-bars").innerHTML = guide.bars
    .map(
      (sym, i) =>
        `<span class="bar-badge"><small>${i + 1}</small><b>${escapeHTML(sym)}</b></span>`,
    )
    .join("");
}

function playBluesScalePreview() {
  const root = byId("blues-root").value;
  const scale = getScale(byId("blues-type").value);
  const up = scaleNotes(root, scale, true);
  const down = [...up].reverse().slice(1);
  const seq = [...up, ...down];
  playEvents(
    seq.map((n, i) => ({
      notes: [n.midi],
      time: i * 0.25,
      duration: 0.23,
      velocity: n.isBlue ? 0.9 : 0.7,
    })),
  );
}

/* Заполнение справочных таблиц учебника */
function populateReferences() {
  // Таблица всех простых интервалов, обращений и окраски «Как звучит»
  const ivTable = byId("interval-reference-body");
  if (ivTable) {
    ivTable.innerHTML = INTERVALS.map((iv) => {
      const inv = getInterval(iv.inversionId);
      return `<tr>
        <td><strong>${escapeHTML(iv.short)}</strong> · ${escapeHTML(iv.name)}</td>
        <td>${iv.semitones}</td>
        <td><span class="mood-pill">${escapeHTML(iv.moodTag)}</span></td>
        <td>${escapeHTML(iv.howItSounds)}</td>
        <td><strong>${escapeHTML(inv.short)}</strong> (${escapeHTML(inv.name)})</td>
      </tr>`;
    }).join("");
  }

  // Составные интервалы
  const compGrid = byId("compound-interval-grid");
  if (compGrid) {
    compGrid.innerHTML = COMPOUND_INTERVALS.map(
      (ci) =>
        `<article class="compound-card">
          <div class="compound-top"><strong>${escapeHTML(ci.short)} · ${escapeHTML(ci.name)}</strong><span>${ci.semitones} пт (${escapeHTML(ci.base)})</span></div>
          <p>${escapeHTML(ci.sound)}</p>
          <small>На гитаре: ${escapeHTML(ci.guitarExample)}</small>
        </article>`,
    ).join("");
  }

  // Полный каталог гамм и ладов
  const scaleRef = byId("scale-reference");
  if (scaleRef) {
    scaleRef.innerHTML = SCALES.map(
      (item) =>
        `<article>
          <h3>${escapeHTML(item.name)}</h3>
          <p class="formula">${escapeHTML(item.formula)} · ступени: ${escapeHTML(item.degrees.join("–"))}</p>
          <p>${escapeHTML(item.description)}</p>
        </article>`,
    ).join("");
  }

  // Карточки длительностей в разделе 13 «Ритм и грув»
  const durGrid = byId("rhythm-durations-grid");
  if (durGrid) {
    durGrid.innerHTML = NOTE_DURATIONS.map(
      (d) =>
        `<article class="duration-card">
          <div class="dur-head"><span class="dur-symbol">${escapeHTML(d.displaySymbol || d.symbol)}</span><strong>${escapeHTML(d.name)} (${escapeHTML(d.fraction)})</strong></div>
          <p><b>Счёт:</b> ${escapeHTML(d.counting)}</p>
          <p>${escapeHTML(d.guitarFeel)}</p>
        </article>`,
    ).join("");
  }
}

/* Заполнение всех выпадающих списков (<select>) */
function initAllSelects() {
  const roots = ROOTS.map((r) => ({ value: r, label: prettyNote(r) }));
  [
    "notes-root",
    "interval-root",
    "triad-root",
    "seventh-root",
    "scale-root",
    "harmony-root",
    "composition-root",
    "pent-root",
    "blues-root",
  ].forEach((id) => {
    const def =
      id === "seventh-root"
        ? "G"
        : id === "pent-root" || id === "blues-root"
          ? "A"
          : "C";
    fillSelect(id, roots, def);
  });

  fillSelect(
    "blues-12-key",
    ["A", "E", "G", "C", "D"].map((r) => ({
      value: r,
      label: `${prettyNote(r)} блюз (${prettyNote(r)}7–${prettyNote(spellInterval(r, 5, 3))}7–${prettyNote(spellInterval(r, 7, 4))}7)`,
    })),
    "A",
  );

  const scaleOpts = SCALES.map((s) => ({ value: s.id, label: s.name }));
  ["notes-scale", "scale-type", "composition-scale"].forEach((id) =>
    fillSelect(id, scaleOpts, "major"),
  );

  fillSelect(
    "interval-type",
    INTERVALS.map((iv) => ({
      value: iv.id,
      label: `${iv.short} · ${iv.name} (${semiText(iv.semitones)})`,
    })),
    "M3",
  );

  fillSelect(
    "triad-type",
    TRIADS.map((t) => ({ value: t.id, label: t.name })),
    "major",
  );
  fillSelect(
    "triad-inversion",
    TRIAD_INVERSIONS.map((i) => ({ value: String(i.value), label: i.name })),
    "0",
  );

  fillSelect(
    "seventh-type",
    SEVENTHS.map((s) => ({ value: s.id, label: s.name })),
    "dom7",
  );
  fillSelect(
    "seventh-inversion",
    SEVENTH_INVERSIONS.map((i) => ({ value: String(i.value), label: i.name })),
    "0",
  );

  const progOpts = PROGRESSIONS.map((p) => ({ value: p.id, label: p.name }));
  fillSelect("harmony-progression", progOpts, "1451");
  fillSelect("composition-progression", progOpts, "1451");

  fillSelect(
    "rhythm-meter",
    METERS.map((m) => ({ value: m.id, label: m.name })),
    "4/4",
  );
  fillSelect(
    "rhythm-pattern-select",
    RHYTHM_PATTERNS.map((p) => ({ value: p.id, label: p.name })),
    "quarters",
  );
}

/* Отрисовка шапки, серии, прогресс-бара курса и счётчиков упражнений */
function refreshGlobalChrome() {
  const st = getState();
  document.documentElement.setAttribute("data-theme", st.theme);

  const themeBtn = byId("theme-toggle");
  if (themeBtn) {
    themeBtn.textContent = st.theme === "dark" ? "☀ Светлая" : "☾ Тёмная";
    themeBtn.setAttribute(
      "aria-label",
      st.theme === "dark"
        ? "Переключить на светлую тему"
        : "Переключить на тёмную тему",
    );
  }

  byId("top-streak").textContent = String(st.streak);

  // Прогресс-бар прохождения курса (открытые разделы из 14)
  const visitedCount = st.visitedSections.length;
  const totalCount = ALL_SECTION_IDS.length;
  const pct = Math.round((visitedCount / totalCount) * 100);
  const fillEl = byId("course-progress-fill");
  const textEl = byId("course-progress-label");
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (textEl)
    textEl.textContent = `${visitedCount} из ${totalCount} глав (${pct}%)`;

  // Отмечаем прочитанные разделы точкой в сайдбаре
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle(
      "visited",
      st.visitedSections.includes(link.dataset.nav),
    );
  });

  // Обновляем плашки статистики упражнений
  document.querySelectorAll("[data-stats]").forEach((el) => {
    el.textContent = formatExerciseStats(el.dataset.stats);
  });
  const ivStat = byId("interval-exercise-stats");
  if (ivStat) {
    ivStat.textContent = formatExerciseStats(
      getIntervalTaskMode() === "build" ? "intervalBuild" : "intervalEar",
    );
  }
  const keyStat = byId("key-exercise-stats");
  if (keyStat) {
    const km = getKeyTaskMode();
    keyStat.textContent = formatExerciseStats(
      km === "signs"
        ? "keySigns"
        : km === "modulation"
          ? "keyMod"
          : "keyChords",
    );
  }

  const storageEl = byId("storage-status");
  if (storageEl) {
    storageEl.textContent = isStorageAvailable()
      ? "Прогресс сохранён в браузере (ladno.progress.v2)"
      : "Хранилище недоступно: прогресс только на текущий сеанс";
  }
}

/* Переключение между 14 главами */
function showView(requestedName = null) {
  const requested = requestedName || location.hash.slice(1);
  const name = VIEW_META[requested] ? requested : "notes";
  const meta = VIEW_META[name];

  if (name !== "rhythm") rhythmControl.stopRhythm();
  if (name !== "sight-reading") sightControl.stopSprint();

  markSectionVisited(name);

  document.querySelectorAll(".view").forEach((view) => {
    const isTarget = view.id === `view-${name}`;
    view.hidden = !isTarget;
    if (isTarget) {
      view.classList.remove("view-enter");
      void view.offsetWidth;
      view.classList.add("view-enter");
    }
  });

  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === name;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  byId("breadcrumb-no").textContent = `ГЛАВА ${meta.no}`;
  byId("breadcrumb").textContent = meta.label;
  byId("intro-eyebrow").textContent = meta.eyebrow;
  byId("intro-title").innerHTML =
    `${escapeHTML(meta.line1)}<br><em>${escapeHTML(meta.line2)}</em>`;
  byId("intro-text").textContent = meta.text;
  byId("intro-number").textContent = meta.no;
  document.title = `${meta.no}. ${meta.label} — Ладно · Сольфеджио на гитаре`;
  refreshGlobalChrome();
}

/* Привязка всех интерактивных элементов управления */
function bindAllEvents(scaleExerciseApi, harmonyExerciseApi) {
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
        if (location.hash !== "#" + target) {
          history.pushState(null, "", "#" + target);
        }
      } catch (_) {
        // Игнорируем ограничения истории во встроенном предпросмотре
      }
      showView(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const onHashChange = () => {
    showView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  window.addEventListener("hashchange", onHashChange);
  window.addEventListener("popstate", onHashChange);

  byId("theme-toggle")?.addEventListener("click", () => {
    const next = toggleTheme();
    showToast(
      next === "dark" ? "Тёмная тема включена" : "Светлая тема включена",
    );
  });

  byId("share-global")?.addEventListener("click", async () => {
    const text = buildShareSummary();
    const ok = await copyTextToClipboard(text);
    showToast(ok ? "Твой результат скопирован в буфер обмена!" : text);
  });

  byId("reset-progress")?.addEventListener("click", () => {
    if (
      window.confirm(
        "Сбросить весь прогресс курса, серии и статистику всех тренажёров?",
      )
    ) {
      resetAllProgress();
      showToast("Весь прогресс сброшен.");
    }
  });

  // 01. Ноты
  ["notes-octave", "notes-root", "notes-scale"].forEach((id) =>
    byId(id)?.addEventListener("change", renderNotesSection),
  );
  document.querySelectorAll("[data-notes-mode]").forEach((btn) =>
    btn.addEventListener("click", () => {
      notesMode = btn.dataset.notesMode;
      setSwitchGroup("[data-notes-mode]", "data-notes-mode", notesMode);
      renderNotesSection();
    }),
  );

  // 02. Интервалы + «услышать интервал от случайной ноты»
  ["interval-root", "interval-type"].forEach((id) =>
    byId(id)?.addEventListener("change", renderIntervalsSection),
  );
  byId("interval-play")?.addEventListener("click", () => {
    const first = rootMidi(byId("interval-root").value);
    const iv = getInterval(byId("interval-type").value);
    const mode = byId("interval-play-mode").value;
    playIntervalInMode(first, first + iv.semitones, mode);
  });
  byId("interval-random-play")?.addEventListener("click", () => {
    const randRoot = randomItem(ROOTS);
    byId("interval-root").value = randRoot;
    renderIntervalsSection();
    const first = rootMidi(randRoot);
    const iv = getInterval(byId("interval-type").value);
    const mode = byId("interval-play-mode").value;
    playIntervalInMode(first, first + iv.semitones, mode);
    showToast(`Звучит ${iv.short} от случайной ноты ${prettyNote(randRoot)}!`);
  });

  // 03. Трезвучия
  ["triad-root", "triad-type", "triad-inversion", "triad-string-set"].forEach(
    (id) =>
      byId(id)?.addEventListener("change", () => renderTriadsSection(true)),
  );
  byId("triad-shape")?.addEventListener("change", () =>
    renderTriadsSection(false),
  );
  byId("triad-play")?.addEventListener("click", () => {
    if (currentTriad) playChordInMode(currentTriad.voicedNotes, "arpChord");
  });
  byId("triad-all-inversions")?.addEventListener("click", (e) => {
    triadShowAllInversions = !triadShowAllInversions;
    e.currentTarget.classList.toggle("active", triadShowAllInversions);
    e.currentTarget.setAttribute(
      "aria-pressed",
      String(triadShowAllInversions),
    );
    renderTriadsSection(false);
  });

  // 04. Септаккорды
  [
    "seventh-root",
    "seventh-type",
    "seventh-inversion",
    "seventh-string-set",
  ].forEach((id) =>
    byId(id)?.addEventListener("change", () => renderSeventhsSection(true)),
  );
  byId("seventh-shape")?.addEventListener("change", () =>
    renderSeventhsSection(false),
  );
  byId("seventh-play")?.addEventListener("click", () => {
    if (currentSeventh) playChordInMode(currentSeventh.voicedNotes, "arpChord");
  });
  byId("seventh-all-inversions")?.addEventListener("click", (e) => {
    seventhShowAllInversions = !seventhShowAllInversions;
    e.currentTarget.classList.toggle("active", seventhShowAllInversions);
    e.currentTarget.setAttribute(
      "aria-pressed",
      String(seventhShowAllInversions),
    );
    renderSeventhsSection(false);
  });

  // 05. Гаммы и лады
  ["scale-root", "scale-type"].forEach((id) =>
    byId(id)?.addEventListener("change", () => {
      renderScalesSection();
      scaleExerciseApi.refreshScaleQuiz();
    }),
  );
  document.querySelectorAll("[data-scale-mode]").forEach((btn) =>
    btn.addEventListener("click", () => {
      scaleDisplayMode = btn.dataset.scaleMode;
      setSwitchGroup("[data-scale-mode]", "data-scale-mode", scaleDisplayMode);
      renderScalesSection();
    }),
  );
  document.querySelectorAll("[data-scale-dir]").forEach((btn) =>
    btn.addEventListener("click", () => {
      scaleDirection = btn.dataset.scaleDir;
      setSwitchGroup("[data-scale-dir]", "data-scale-dir", scaleDirection);
      renderScalesSection();
    }),
  );
  document.querySelectorAll("[data-scale-pos]").forEach((btn) =>
    btn.addEventListener("click", () => {
      scalePosFilter = btn.dataset.scalePos;
      setSwitchGroup("[data-scale-pos]", "data-scale-pos", scalePosFilter);
      renderScalesSection();
    }),
  );
  byId("scale-play")?.addEventListener("click", playSelectedScale);
  byId("scale-random")?.addEventListener("click", () => {
    byId("scale-root").value = randomItem(ROOTS);
    byId("scale-type").value = randomItem(SCALES).id;
    renderScalesSection();
    scaleExerciseApi.refreshScaleQuiz();
  });

  // 06. Квинтовый круг
  document.querySelectorAll("[data-key-mode]").forEach((btn) =>
    btn.addEventListener("click", () => {
      keyDisplayMode = btn.dataset.keyMode;
      setSwitchGroup("[data-key-mode]", "data-key-mode", keyDisplayMode);
      renderKeysSection();
    }),
  );
  byId("key-toggle-chords")?.addEventListener("click", (e) => {
    showKeyChordsPanel = !showKeyChordsPanel;
    e.currentTarget.classList.toggle("active", showKeyChordsPanel);
    e.currentTarget.setAttribute("aria-pressed", String(showKeyChordsPanel));
    renderKeysSection();
  });

  // 07. Гармония
  byId("harmony-root")?.addEventListener("change", () => {
    harmonyChordIndex = 0;
    renderHarmonySection();
    harmonyExerciseApi.refreshHarmonyQuiz();
  });
  byId("harmony-progression")?.addEventListener("change", () => {
    harmonyChordIndex = 0;
    renderHarmonySection();
  });
  byId("harmony-play")?.addEventListener("click", () => {
    const stepDur = harmonyChordsList.length > 4 ? 0.8 : 1.25;
    playEvents(
      harmonyChordsList.map((ch, i) => ({
        notes: ch.voicedNotes.map((n) => n.midi),
        time: i * stepDur,
        duration: stepDur * 0.88,
        velocity: 0.66,
      })),
    );
  });

  // 09. Пентатоника
  ["pent-root", "pent-type"].forEach((id) =>
    byId(id)?.addEventListener("change", renderPentatonicSection),
  );
  byId("pent-toggle-boxes")?.addEventListener("click", (e) => {
    pentShowAllBoxes = !pentShowAllBoxes;
    if (pentShowAllBoxes) {
      pentActiveBox = 0;
      setSwitchGroup("[data-pent-box]", "data-pent-box", "0");
    }
    e.currentTarget.classList.toggle("active", pentShowAllBoxes);
    e.currentTarget.setAttribute("aria-pressed", String(pentShowAllBoxes));
    renderPentatonicSection();
  });
  document.querySelectorAll("[data-pent-box]").forEach((btn) =>
    btn.addEventListener("click", () => {
      pentActiveBox = Number(btn.dataset.pentBox);
      if (pentActiveBox > 0) {
        pentShowAllBoxes = false;
        byId("pent-toggle-boxes")?.classList.remove("active");
      }
      setSwitchGroup("[data-pent-box]", "data-pent-box", String(pentActiveBox));
      renderPentatonicSection();
    }),
  );
  byId("pent-play")?.addEventListener("click", playPentatonicPreview);

  // 10. Блюзовые гаммы
  ["blues-root", "blues-type"].forEach((id) =>
    byId(id)?.addEventListener("change", renderBluesSection),
  );
  document.querySelectorAll("[data-blues-box]").forEach((btn) =>
    btn.addEventListener("click", () => {
      bluesActiveBox = Number(btn.dataset.bluesBox);
      setSwitchGroup(
        "[data-blues-box]",
        "data-blues-box",
        String(bluesActiveBox),
      );
      renderBluesSection();
    }),
  );
  document.querySelectorAll("[data-blues-guide]").forEach((btn) =>
    btn.addEventListener("click", () => {
      bluesGuideKey = btn.dataset.bluesGuide;
      setSwitchGroup("[data-blues-guide]", "data-blues-guide", bluesGuideKey);
      renderBluesSection();
    }),
  );
  byId("blues-play")?.addEventListener("click", playBluesScalePreview);
  byId("blues-guide-play")?.addEventListener("click", () => {
    const chords = progressionChords(bluesGuideKey, getProgression("blues12"));
    playEvents(
      chords.map((c, idx) => ({
        notes: c.notes.map((n) => n.midi),
        time: idx * 0.72,
        duration: 0.62,
        velocity: idx % 4 === 0 ? 0.8 : 0.62,
      })),
    );
  });
}

function initialiseApp() {
  setTheme(getState().theme);
  initAllSelects();
  populateReferences();

  // Инициализация визуализаторов
  renderNotesSection();
  renderIntervalsSection();
  renderTriadsSection(true);
  renderSeventhsSection(true);
  renderScalesSection();
  renderKeysSection();
  renderHarmonySection();
  renderPentatonicSection();
  renderBluesSection();

  // Инициализация всех тренажёров и упражнений
  initNotesExercise();
  getIntervalTaskMode = initIntervalsExercise(() => refreshGlobalChrome());
  initTriadsExercise();
  initSeventhsExercise();
  const scaleExerciseApi = initScalesExercise(() => ({
    root: byId("scale-root").value,
    scale: getScale(byId("scale-type").value),
  }));
  getKeyTaskMode = initKeysExercise(() => refreshGlobalChrome());
  const harmonyExerciseApi = initHarmonyExercise(
    () => byId("harmony-root").value,
  );
  initCompositionLab();
  initPentatonicExercises();
  initBluesExercises();
  initIntervalEarTrainer();
  initChordEarTrainer();
  rhythmControl = initRhythmModule();
  sightControl = initSightReadingModule();

  bindAllEvents(scaleExerciseApi, harmonyExerciseApi);
  subscribeState(refreshGlobalChrome);

  if (!window.Tone) {
    const audioEl = byId("audio-status");
    if (audioEl) audioEl.textContent = "Звук по нажатию (Web Audio)";
  }

  window.__LADNO_READY__ = true;
  showView();
}

initialiseApp();
