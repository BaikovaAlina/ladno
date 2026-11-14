/*
 * ui/exercises.js — единая система практических упражнений и тренажёров для разделов 01–10, 13 и 14.
 * Включает упражнения по нотам, интервалам, трезвучиям, септаккордам, гаммам, квинтовому кругу,
 * гармонии, композиционную лабораторию (сохранение + JSON-экспорт), 3 режима пентатоники,
 * 3 режима блюза, ритм-машину с упражнением «Хлопни ритм» (Пробел) и 30-секундный спринт чтения с листа.
 */

import {
  STRINGS,
  CHROMATIC,
  ROOTS,
  SIGHT_READING_POOL,
  mod,
  randomItem,
  shuffle,
  unique,
  parseNote,
  prettyNote,
  rootMidi,
  spellInterval,
  writtenNote,
  positionsForMidi,
  bestPosition,
  describePosition,
  nameMap,
  escapeHTML,
} from "../data/notes.js";
import { INTERVALS, semiText } from "../data/intervals.js";
import {
  TRIADS,
  SEVENTHS,
  SEVENTH_INVERSIONS,
  makeChord,
  findVoicings,
  voicedNotes,
} from "../data/chords.js";
import {
  SCALES,
  getScale,
  scaleNames,
  scalePcs,
  scaleNotes,
  getPentatonicBoxes,
} from "../data/scales.js";
import {
  CIRCLE,
  ENHARMONIC_KEYS,
  FUNCTIONS,
  keyCountText,
  keySignText,
  chordOfDegree,
  getProgression,
  progressionChords,
  METERS,
  RHYTHM_PATTERNS,
} from "../data/progressions.js";
import {
  getState,
  subscribeState,
  recordExerciseResult,
  recordSightReadingAttempt,
  updateSightReadingBest,
  saveCompositionMotif,
  deleteCompositionMotif,
  buildShareSummary,
  copyTextToClipboard,
} from "./state.js";
import { renderFretboard } from "./fretboard.js";
import { renderStaff } from "./staff.js";
import {
  playEvents,
  playNote,
  playIntervalInMode,
  playChordInMode,
  playDrumSound,
  ensureToneReady,
  scheduleToneDrum,
  triggerFeedbackWave,
  showToast,
} from "./earTrainer.js";

const byId = (id) => document.getElementById(id);

export function setFeedback(id, text, state = "") {
  const el = byId(id);
  if (!el) return;
  el.textContent = text;
  el.className = "feedback" + (state ? " " + state : "");
}

export function setSwitchGroup(selector, attr, value) {
  document.querySelectorAll(selector).forEach((button) => {
    const active = button.getAttribute(attr) === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

export function makeOptions(correct, pool, count = 4) {
  return shuffle([
    correct,
    ...shuffle(
      pool.filter((item) => String(item.value) !== String(correct.value)),
    ).slice(0, count - 1),
  ]);
}

export function renderAnswerButtons(
  containerId,
  options,
  correctValue,
  callback,
) {
  const container = byId(containerId);
  if (!container) return;
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

export function selectedDescription(selection, names = {}) {
  if (!selection.size) return "пока ничего";
  return [...selection]
    .map((key) => {
      const [s, fret] = key.split(":").map(Number);
      const midi = STRINGS[s].midi + fret;
      return writtenNote(names[mod(midi)] || CHROMATIC[mod(midi)], midi);
    })
    .join(" · ");
}

/* =========================================================================
 * 01. НОТЫ: УПРАЖНЕНИЕ «ЧТО ЭТО ЗА НОТА?»
 * ========================================================================= */
export function initNotesExercise() {
  let notesQuiz = null;
  const card = byId("notes-exercise");

  function renderQuizBoard() {
    renderFretboard({
      container: "notes-quiz-board",
      highlighted: [notesQuiz.key],
      root: [notesQuiz.key],
      questionKey: notesQuiz.answered ? null : notesQuiz.key,
      statusId: "notes-quiz-status",
    });
  }

  function newQuiz() {
    const string = Math.floor(Math.random() * 6);
    const fret = Math.floor(Math.random() * 13);
    const midi = STRINGS[string].midi + fret;
    notesQuiz = {
      string,
      fret,
      midi,
      pc: mod(midi),
      key: `${string}:${fret}`,
      answered: false,
    };
    setFeedback("notes-feedback", "Выбери один из вариантов ниже.");
    byId("notes-quiz-status").textContent =
      "Нажми на точку на грифе, чтобы услышать ♫";
    renderQuizBoard();

    const pool = CHROMATIC.map((name, pc) => ({
      value: pc,
      label: prettyNote(name),
    }));
    renderAnswerButtons(
      "notes-answers",
      makeOptions(pool[notesQuiz.pc], pool),
      notesQuiz.pc,
      (correct) => {
        notesQuiz.answered = true;
        recordExerciseResult("notes", correct);
        triggerFeedbackWave(card, correct);
        const answer = prettyNote(CHROMATIC[notesQuiz.pc]);
        setFeedback(
          "notes-feedback",
          correct
            ? `Верно! Это нота ${answer} (${describePosition(notesQuiz)}).`
            : `Не совсем. На ${describePosition(notesQuiz)} звучит ${answer}.`,
          correct ? "success" : "error",
        );
        renderQuizBoard();
      },
    );
  }

  byId("notes-next")?.addEventListener("click", newQuiz);
  newQuiz();
}

/* =========================================================================
 * 02. ИНТЕРВАЛЫ: ПОСТРОЕНИЕ НА ГРИФЕ И БЫСТРЫЙ СЛУХОВОЙ ТЕСТ
 * ========================================================================= */
export function initIntervalsExercise(onTaskModeChange) {
  let taskMode = "build";
  let buildQuiz = null;
  let earQuiz = null;
  const card = byId("intervals-exercise-card");

  function renderBuildBoard() {
    const q = buildQuiz;
    const correctPos = bestPosition(q.target, 12);
    renderFretboard({
      container: "interval-quiz-board",
      showAll: true,
      highlighted: q.answered ? [q.base.key, correctPos.key] : [q.base.key],
      root: [q.base.key],
      names: nameMap([q.root, q.answerName]),
      statusId: "interval-quiz-status",
      onNoteClick: (position) => {
        if (q.answered) return;
        q.answered = true;
        const correct = position.midi === q.target;
        recordExerciseResult("intervalBuild", correct);
        triggerFeedbackWave(card, correct);
        const answer = `${writtenNote(q.answerName, q.target)} (${semiText(q.interval.semitones)}; удобно на ${describePosition(correctPos)})`;
        setFeedback(
          "interval-build-feedback",
          correct
            ? `Верно! Вторая нота — ${answer}.`
            : `Не совсем. Точная высота выше исходной: ${answer}.`,
          correct ? "success" : "error",
        );
        renderBuildBoard();
      },
    });
  }

  function newBuild() {
    const interval = randomItem(INTERVALS);
    const possible = [];
    for (let s = 2; s < 6; s++) {
      for (let fret = 0; fret <= 7; fret++) {
        const midi = STRINGS[s].midi + fret;
        if (positionsForMidi(midi + interval.semitones, 12).length) {
          possible.push({ string: s, fret, midi, key: `${s}:${fret}` });
        }
      }
    }
    const base = randomItem(possible);
    const root = CHROMATIC[mod(base.midi)];
    const answerName = spellInterval(root, interval.semitones, interval.steps);
    buildQuiz = {
      interval,
      base,
      root,
      answerName,
      target: base.midi + interval.semitones,
      answered: false,
    };
    byId("interval-build-prompt").textContent =
      `Построй «${interval.name} (${interval.short})» вверх от ${writtenNote(root, base.midi)}.`;
    setFeedback("interval-build-feedback", "Нажми на вторую ноту на грифе.");
    renderBuildBoard();
  }

  function newEar() {
    const interval = randomItem(INTERVALS.slice(1));
    const midi = 48 + Math.floor(Math.random() * 12);
    earQuiz = { interval, midi };
    const pool = INTERVALS.slice(1).map((item) => ({
      value: item.id,
      label: `${item.short} · ${item.name}`,
    }));
    const correctOption = pool.find((item) => item.value === interval.id);
    renderAnswerButtons(
      "ear-answers",
      makeOptions(correctOption, pool),
      interval.id,
      (correct) => {
        recordExerciseResult("intervalEar", correct);
        triggerFeedbackWave(card, correct);
        setFeedback(
          "ear-feedback",
          correct
            ? `Верно! ${interval.name} (${interval.short}) — ${semiText(interval.semitones)}.`
            : `Не совсем. Звучал ${interval.name} (${interval.short}), ${semiText(interval.semitones)}.`,
          correct ? "success" : "error",
        );
      },
    );
    setFeedback("ear-feedback", "Сначала послушай, затем выбери ответ.");
  }

  function setMode(mode) {
    taskMode = mode;
    byId("interval-build-area").hidden = mode !== "build";
    byId("interval-ear-area").hidden = mode !== "ear";
    setSwitchGroup("[data-interval-task]", "data-interval-task", mode);
    if (onTaskModeChange) onTaskModeChange(mode);
  }

  document
    .querySelectorAll("[data-interval-task]")
    .forEach((btn) =>
      btn.addEventListener("click", () => setMode(btn.dataset.intervalTask)),
    );
  byId("interval-build-next")?.addEventListener("click", newBuild);
  byId("ear-next")?.addEventListener("click", newEar);
  byId("ear-play")?.addEventListener("click", () => {
    const mode = byId("ear-play-mode").value === "together" ? "harm" : "asc";
    playIntervalInMode(
      earQuiz.midi,
      earQuiz.midi + earQuiz.interval.semitones,
      mode,
    );
  });

  newBuild();
  newEar();
  setMode("build");
  return () => taskMode;
}

/* =========================================================================
 * 03. ТРЕЗВУЧИЯ: УПРАЖНЕНИЕ «СОБЕРИ АККОРД»
 * ========================================================================= */
export function initTriadsExercise() {
  let quiz = null;
  const card = byId("triads-exercise-card");

  function renderQuiz() {
    const rootPc = parseNote(quiz.chord.root).pc;
    renderFretboard({
      container: "triad-quiz-board",
      showAll: true,
      highlighted: (p) => p.pc === rootPc,
      root: rootPc,
      selected: quiz.selected,
      statusId: "triad-quiz-status",
      onNoteClick: (pos) => {
        if (quiz.answered) return;
        if (quiz.selected.has(pos.key)) quiz.selected.delete(pos.key);
        else quiz.selected.add(pos.key);
        renderQuiz();
      },
    });
    byId("triad-picked").textContent = selectedDescription(quiz.selected);
  }

  function newQuiz() {
    const root = randomItem(ROOTS);
    const type = randomItem(TRIADS);
    quiz = {
      chord: makeChord(root, type),
      selected: new Set(),
      answered: false,
    };
    byId("triad-quiz-prompt").textContent =
      `Собери ${type.name.toLowerCase()} трезвучие от ${prettyNote(root)} (${quiz.chord.symbol}).`;
    byId("triad-check").disabled = false;
    setFeedback(
      "triad-feedback",
      "Выбери ровно три разных звука аккорда на грифе.",
    );
    renderQuiz();
  }

  function checkQuiz() {
    if (quiz.answered) return;
    if (!quiz.selected.size) {
      setFeedback("triad-feedback", "Сначала отметь три ноты на грифе.");
      return;
    }
    const chosen = [...quiz.selected].map((key) => {
      const [s, f] = key.split(":").map(Number);
      return mod(STRINGS[s].midi + f);
    });
    const correct =
      chosen.length === 3 &&
      unique(chosen).length === 3 &&
      quiz.chord.pcs.every((pc) => chosen.includes(pc));
    quiz.answered = true;
    byId("triad-check").disabled = true;
    recordExerciseResult("triad", correct);
    triggerFeedbackWave(card, correct);
    const answer = quiz.chord.names.map(prettyNote).join(" – ");
    setFeedback(
      "triad-feedback",
      correct
        ? `Верно! ${quiz.chord.symbol}: ${answer}.`
        : `Не совсем. Состав ${quiz.chord.symbol}: ${answer} (${quiz.chord.type.formula}).`,
      correct ? "success" : "error",
    );
  }

  byId("triad-check")?.addEventListener("click", checkQuiz);
  byId("triad-next")?.addEventListener("click", newQuiz);
  newQuiz();
}

/* =========================================================================
 * 04. СЕПТАККОРДЫ: УПРАЖНЕНИЕ «УЗНАЙ СЕПТАККОРД»
 * ========================================================================= */
export function initSeventhsExercise() {
  let quiz = null;
  const card = byId("sevenths-exercise-card");

  function newQuiz() {
    const root = randomItem(ROOTS);
    const type = randomItem(SEVENTHS);
    const inv = Math.floor(Math.random() * 2); // Основной вид или 1-е обращение
    const chord = makeChord(root, type, inv);
    const positions =
      findVoicings(chord.notes, { maxFret: 12 })[0] ||
      chord.notes.map((n) => bestPosition(n.midi, 12)).filter(Boolean);
    const voiced = voicedNotes(positions, chord.names);
    quiz = { chord, type, inv, positions, voiced };

    byId("seventh-quiz-prompt").textContent =
      `Какой септаккорд построен от корня ${prettyNote(root)}? (${SEVENTH_INVERSIONS[inv].name})`;
    renderFretboard({
      container: "seventh-quiz-board",
      highlighted: positions.map((p) => p.key),
      root: parseNote(root).pc,
      names: nameMap(chord.names),
      statusId: "seventh-quiz-status",
    });

    const pool = SEVENTHS.map((item) => ({ value: item.id, label: item.name }));
    const correctOpt = pool.find((item) => item.value === type.id);
    renderAnswerButtons(
      "seventh-answers",
      makeOptions(correctOpt, pool),
      type.id,
      (correct) => {
        recordExerciseResult("seventh", correct);
        triggerFeedbackWave(card, correct);
        const answer = `${chord.fullSymbol} (${type.name}): ${chord.names.map(prettyNote).join(" – ")}.`;
        setFeedback(
          "seventh-feedback",
          correct
            ? `Верно! ${answer}`
            : `Не совсем. Правильный ответ: ${answer}`,
          correct ? "success" : "error",
        );
      },
    );
    setFeedback(
      "seventh-feedback",
      "Нажми «Слушать аккорд» или проверь ноты на грифе.",
    );
  }

  byId("seventh-quiz-play")?.addEventListener("click", () => {
    if (quiz) playChordInMode(quiz.voiced, "arpChord");
  });
  byId("seventh-next")?.addEventListener("click", newQuiz);
  newQuiz();
}

/* =========================================================================
 * 05. ГАММЫ И ЛАДЫ: УПРАЖНЕНИЕ «НАЙДИ НОТЫ ГАММЫ»
 * ========================================================================= */
export function initScalesExercise(getSelectedScaleParams) {
  let quiz = null;
  const card = byId("scales-exercise-card");

  function renderQuiz() {
    const rootPc = parseNote(quiz.root).pc;
    const names = nameMap(quiz.names);
    renderFretboard({
      container: "scale-quiz-board",
      showAll: true,
      highlighted: (p) => p.pc === rootPc,
      root: rootPc,
      names,
      selected: quiz.selected,
      statusId: "scale-quiz-status",
      onNoteClick: (position) => {
        if (quiz.answered) return;
        const existing = [...quiz.selected].find((key) => {
          const [s, fret] = key.split(":").map(Number);
          return mod(STRINGS[s].midi + fret) === position.pc;
        });
        if (existing) quiz.selected.delete(existing);
        if (existing !== position.key) quiz.selected.add(position.key);
        renderQuiz();
      },
    });
    byId("scale-picked").textContent =
      `${selectedDescription(quiz.selected, names)} · ${quiz.selected.size} из ${quiz.pcs.length}`;
  }

  function newQuiz() {
    const { root, scale } = getSelectedScaleParams();
    quiz = {
      root,
      scale,
      pcs: scalePcs(root, scale),
      names: scaleNames(root, scale),
      selected: new Set(),
      answered: false,
    };
    byId("scale-quiz-prompt").textContent =
      `Найди все ${quiz.pcs.length} звуков: ${prettyNote(root)} · ${scale.name.toLowerCase()}.`;
    byId("scale-check").disabled = false;
    setFeedback("scale-feedback", "Выбери каждый звук гаммы по одному разу.");
    renderQuiz();
  }

  function checkQuiz() {
    if (quiz.answered) return;
    if (!quiz.selected.size) {
      setFeedback("scale-feedback", "Сначала выбери ноты гаммы на грифе.");
      return;
    }
    const chosen = [...quiz.selected].map((key) => {
      const [s, f] = key.split(":").map(Number);
      return mod(STRINGS[s].midi + f);
    });
    const correct =
      chosen.length === quiz.pcs.length &&
      quiz.pcs.every((pc) => chosen.includes(pc));
    quiz.answered = true;
    byId("scale-check").disabled = true;
    recordExerciseResult("scale", correct);
    triggerFeedbackWave(card, correct);
    const answer = quiz.names.map(prettyNote).join(" – ");
    setFeedback(
      "scale-feedback",
      correct
        ? `Отлично! Все ступени найдены: ${answer}.`
        : `Не совсем. Звуки этой гаммы: ${answer}.`,
      correct ? "success" : "error",
    );
  }

  byId("scale-check")?.addEventListener("click", checkQuiz);
  byId("scale-reset")?.addEventListener("click", newQuiz);
  newQuiz();
  return { refreshScaleQuiz: newQuiz };
}

/* =========================================================================
 * 06. КВИНТОВЫЙ КРУГ: ЗНАКИ, МОДУЛЯЦИЯ И ФУНКЦИИ АККОРДОВ ТОНАЛЬНОСТИ
 * ========================================================================= */
export function initKeysExercise(onModeChange) {
  let taskMode = "signs";
  const card = byId("keys-exercise-card");

  function newQuiz() {
    if (taskMode === "signs") {
      const key = randomItem([...CIRCLE, ...ENHARMONIC_KEYS]);
      const correctOpt = { value: key.count, label: String(key.count) };
      const pool = Array.from({ length: 8 }, (_, i) => ({
        value: i,
        label: String(i),
      }));
      byId("key-quiz-prompt").textContent =
        `Сколько ключевых знаков в тональности ${prettyNote(key.major)} мажор (и параллельном ${prettyNote(key.minor.slice(0, -1))} миноре)?`;
      renderAnswerButtons(
        "key-answers",
        makeOptions(correctOpt, pool),
        key.count,
        (correct) => {
          recordExerciseResult("keySigns", correct);
          triggerFeedbackWave(card, correct);
          const expl = `${prettyNote(key.major)} мажор: ${keyCountText(key)}${key.count ? " (" + keySignText(key) + ")" : ""}.`;
          setFeedback(
            "key-feedback",
            correct ? `Верно! ${expl}` : `Не совсем. ${expl}`,
            correct ? "success" : "error",
          );
        },
      );
    } else if (taskMode === "modulation") {
      const index = randomItem([0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11]);
      const next = (index + 1) % 12;
      const key = CIRCLE[index];
      const target = CIRCLE[next];
      const pool = CIRCLE.map((item, i) => ({
        value: i,
        label: `${prettyNote(item.major)} мажор`,
      })).filter((item) => item.value !== index);
      const correctOpt = pool.find((item) => item.value === next);
      byId("key-quiz-prompt").textContent =
        `В какую мажорную тональность ведёт модуляция на квинту вверх (+1 шаг по часовой) из ${prettyNote(key.major)} мажора?`;
      renderAnswerButtons(
        "key-answers",
        makeOptions(correctOpt, pool),
        next,
        (correct) => {
          recordExerciseResult("keyMod", correct);
          triggerFeedbackWave(card, correct);
          const expl = `${prettyNote(target.major)} мажор — соседняя тональность доминанты по часовой стрелке.`;
          setFeedback(
            "key-feedback",
            correct ? `Верно! ${expl}` : `Не совсем. ${expl}`,
            correct ? "success" : "error",
          );
        },
      );
    } else {
      const key = randomItem(CIRCLE.slice(0, 6));
      const degree = randomItem([1, 3, 4, 5]);
      const ch = chordOfDegree(key.major, degree, "major");
      const pool = [
        { value: "T", label: "T — Тоническая группа" },
        { value: "S", label: "S — Субдоминантовая группа" },
        { value: "D", label: "D — Доминантовая группа" },
      ];
      const correctOpt = pool.find((p) => p.value === ch.fn);
      byId("key-quiz-prompt").textContent =
        `Какую функцию выполняет аккорд ${ch.symbol} (${ch.roman} ступень) в тональности ${prettyNote(key.major)} мажор?`;
      renderAnswerButtons("key-answers", pool, correctOpt.value, (correct) => {
        recordExerciseResult("keyChords", correct);
        triggerFeedbackWave(card, correct);
        setFeedback(
          "key-feedback",
          correct
            ? `Верно! ${ch.roman} (${ch.symbol}) относится к функции ${ch.fn}.`
            : `Не совсем. ${ch.roman} (${ch.symbol}) в ${prettyNote(key.major)} мажоре выполняет функцию ${ch.fn}.`,
          correct ? "success" : "error",
        );
      });
    }
    setFeedback("key-feedback", "Выбери верный вариант.");
  }

  document.querySelectorAll("[data-key-task]").forEach((btn) =>
    btn.addEventListener("click", () => {
      taskMode = btn.dataset.keyTask;
      setSwitchGroup("[data-key-task]", "data-key-task", taskMode);
      newQuiz();
      if (onModeChange) onModeChange(taskMode);
    }),
  );
  byId("key-next")?.addEventListener("click", newQuiz);
  newQuiz();
  return () => taskMode;
}

/* =========================================================================
 * 07. ГАРМОНИЯ: УПРАЖНЕНИЕ «СОБЕРИ ПРОГРЕССИЮ ПО ФУНКЦИЯМ»
 * ========================================================================= */
export function initHarmonyExercise(getCurrentRoot) {
  let answered = false;
  const card = byId("harmony-exercise-card");

  function newQuiz() {
    answered = false;
    const root = getCurrentRoot();
    const chords = Array.from({ length: 7 }, (_, i) =>
      chordOfDegree(root, i, "major"),
    );
    byId("harmony-quiz-prompt").textContent =
      `В ${prettyNote(root)} мажоре расставь аккорды по классической формуле T – S – D – T.`;
    byId("harmony-slots").innerHTML = ["T", "S", "D", "T"]
      .map(
        (fn, i) =>
          `<div class="function-slot"><label for="function-${i}">${i + 1} · ${fn}</label><select id="function-${i}"><option value="">Выбери аккорд</option>${chords
            .map(
              (c) =>
                `<option value="${c.degree}">${escapeHTML(c.roman + " · " + c.symbol)}</option>`,
            )
            .join("")}</select></div>`,
      )
      .join("");
    byId("harmony-check").disabled = false;
    setFeedback(
      "harmony-feedback",
      "Подбери подходящий аккорд для каждого шага.",
    );
  }

  function checkQuiz() {
    if (answered) return;
    const selects = [...byId("harmony-slots").querySelectorAll("select")];
    if (selects.some((s) => s.value === "")) {
      setFeedback(
        "harmony-feedback",
        "Заполни все четыре такта перед проверкой.",
      );
      return;
    }
    const req = ["T", "S", "D", "T"];
    const correct = selects.every(
      (s, i) => FUNCTIONS[Number(s.value)] === req[i],
    );
    answered = true;
    byId("harmony-check").disabled = true;
    selects.forEach((s) => (s.disabled = true));
    recordExerciseResult("harmony", correct);
    triggerFeedbackWave(card, correct);

    const root = getCurrentRoot();
    const chords = Array.from({ length: 7 }, (_, i) =>
      chordOfDegree(root, i, "major"),
    );
    const example = [0, 3, 4, 0].map((i) => chords[i].symbol).join(" – ");
    setFeedback(
      "harmony-feedback",
      correct
        ? `Верно! Отличная функциональная связка (эталон: ${example}).`
        : `Не совсем. В мажоре T = I, iii, vi; S = ii, IV; D = V, vii°. Пример: ${example}.`,
      correct ? "success" : "error",
    );
  }

  byId("harmony-check")?.addEventListener("click", checkQuiz);
  byId("harmony-reset")?.addEventListener("click", newQuiz);
  newQuiz();
  return { refreshHarmonyQuiz: newQuiz };
}

/* =========================================================================
 * 08. КОМПОЗИЦИЯ: ВЫБОР РИТМА МОТИВА, СОХРАНЕНИЕ В LOCALSTORAGE И JSON-ЭКСПОРТ
 * ========================================================================= */
export function initCompositionLab() {
  let seed = 0;
  let rhythmMode = "quarters"; // 'quarters' | 'eighths' | 'mixed'
  let compositionData = null;

  function buildMotif(root, scale, chords, currentSeed, rMode) {
    const pool = scaleNotes(root, scale, true);
    const sliceChords = chords.slice(0, 4); // Набросок на 4 такта
    return sliceChords.map((chord, barIdx) => {
      const chordToneIdxs = pool
        .map((n, idx) => (chord.pcs.includes(mod(n.midi)) ? idx : -1))
        .filter((idx) => idx >= 0);
      const anchors = chordToneIdxs.length ? chordToneIdxs : [0];
      const step = (i, delta) =>
        Math.min(pool.length - 1, Math.max(0, i + delta));
      const a1 = anchors[mod(barIdx + currentSeed, anchors.length)];
      const a2 = anchors[mod(barIdx + currentSeed + 1, anchors.length)];
      const dir = (barIdx + currentSeed) % 2 === 0 ? 1 : -1;

      let noteEvents = [];
      if (rMode === "eighths") {
        const idxs = [
          a1,
          step(a1, dir),
          step(a1, dir * 2),
          step(a1, dir),
          a2,
          step(a2, -dir),
          step(a2, dir),
          barIdx === 3 ? 0 : step(a1, 0),
        ];
        noteEvents = idxs.map((idx, k) => ({
          ...pool[idx],
          beatOffset: k * 0.5,
          beatLength: 0.42,
          durationTag: "♪",
        }));
      } else if (rMode === "mixed") {
        // Четверть + две восьмые + четверть + две восьмые (или четверть на финал)
        const idxs =
          barIdx === 3
            ? [a1, step(a1, dir), a2, 0]
            : [a1, step(a1, dir), step(a1, dir * 2), a2, step(a2, -dir), a1];
        const offsets = barIdx === 3 ? [0, 1, 2, 3] : [0, 1, 1.5, 2, 3, 3.5];
        const lengths =
          barIdx === 3
            ? [0.85, 0.85, 0.85, 0.95]
            : [0.85, 0.42, 0.42, 0.85, 0.42, 0.42];
        noteEvents = idxs.map((idx, k) => ({
          ...pool[idx],
          beatOffset: offsets[k],
          beatLength: lengths[k],
          durationTag: lengths[k] < 0.6 ? "♪" : "♩",
        }));
      } else {
        const idxs = [a1, step(a1, dir), a2, barIdx === 3 ? 0 : step(a2, -dir)];
        noteEvents = idxs.map((idx, k) => ({
          ...pool[idx],
          beatOffset: k,
          beatLength: 0.82,
          durationTag: "♩",
        }));
      }

      return {
        chord,
        notes: noteEvents,
        hasChordTone: chordToneIdxs.length > 0,
      };
    });
  }

  function renderLab() {
    const root = byId("composition-root").value;
    const progression = getProgression(byId("composition-progression").value);
    const scale = getScale(byId("composition-scale").value);
    rhythmMode = byId("composition-rhythm").value;

    const chords = progressionChords(root, progression);
    const bars = buildMotif(root, scale, chords, seed, rhythmMode);
    compositionData = {
      root,
      progressionId: progression.id,
      progressionName: progression.name,
      scaleId: scale.id,
      scaleName: scale.name,
      rhythmMode,
      seed,
      bars,
    };

    const rhythmDesc =
      rhythmMode === "eighths"
        ? "8 восьмых ♪"
        : rhythmMode === "mixed"
          ? "четверти + восьмые ♩♪"
          : "4 четверти ♩";

    byId("composition-hint").textContent = bars.every((b) => b.hasChordTone)
      ? `Ритм: ${rhythmDesc}. На сильных долях звучат опорные тона аккордов, между ними — связующие шаги гаммы.`
      : `Ритм: ${rhythmDesc}. В выбранной гамме есть острое расхождение с аккордом — прислушайся к краске!`;

    byId("composition-motif").innerHTML = bars
      .map(
        (bar, i) =>
          `<div class="motif-bar">
            <small>ТАКТ 0${i + 1} · ${escapeHTML(bar.chord.roman)}</small>
            <strong>${escapeHTML(bar.chord.symbol)}</strong>
            <span>${escapeHTML(rhythmDesc)}</span>
            <span class="motif-notes">${escapeHTML(
              bar.notes
                .map((n) => `${prettyNote(n.name)}${n.durationTag}`)
                .join(" "),
            )}</span>
          </div>`,
      )
      .join("");

    renderFretboard({
      container: "composition-board",
      highlighted: scalePcs(root, scale),
      root: parseNote(root).pc,
      names: nameMap(scaleNames(root, scale)),
      statusId: "composition-status",
    });
  }

  function playCurrentComposition(dataObj = compositionData) {
    if (!dataObj) return;
    const beatSec = 0.52;
    const events = [];
    dataObj.bars.forEach((bar, i) => {
      const barStart = i * 4 * beatSec;
      events.push({
        notes: bar.chord.notes.map((n) => n.midi),
        time: barStart,
        duration: beatSec * 3.75,
        velocity: 0.46,
      });
      bar.notes.forEach((n) => {
        events.push({
          notes: [n.midi],
          time: barStart + n.beatOffset * beatSec,
          duration: n.beatLength * beatSec,
          velocity: 0.82,
        });
      });
    });
    playEvents(events, "guitar");
  }

  function renderSavedList() {
    const listEl = byId("composition-saved-list");
    if (!listEl) return;
    const saved = getState().savedMotifs || [];
    if (!saved.length) {
      listEl.innerHTML =
        '<p class="muted-note">У тебя пока нет сохранённых набросков. Нажми «Сохранить мотив», чтобы запомнить идею в браузере.</p>';
      return;
    }
    listEl.innerHTML = saved
      .map((item) => {
        const title = `${prettyNote(item.root)} · ${item.scaleName} (${item.progressionName})`;
        return `<div class="saved-motif-item">
          <div>
            <strong>${escapeHTML(title)}</strong>
            <small>Ритм: ${escapeHTML(item.rhythmMode)} · ${new Date(item.createdAt).toLocaleDateString("ru-RU")}</small>
          </div>
          <div class="button-row">
            <button type="button" class="button button-ghost btn-sm" data-motif-load="${escapeHTML(item.id)}">Открыть</button>
            <button type="button" class="button button-ghost btn-sm" data-motif-del="${escapeHTML(item.id)}">Удалить</button>
          </div>
        </div>`;
      })
      .join("");

    listEl.querySelectorAll("[data-motif-load]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const found = (getState().savedMotifs || []).find(
          (m) => m.id === btn.dataset.motifLoad,
        );
        if (!found) return;
        byId("composition-root").value = found.root;
        byId("composition-progression").value = found.progressionId;
        byId("composition-scale").value = found.scaleId;
        byId("composition-rhythm").value = found.rhythmMode || "quarters";
        seed = found.seed || 0;
        renderLab();
        playCurrentComposition();
        showToast("Мотив загружен!");
      });
    });

    listEl.querySelectorAll("[data-motif-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        deleteCompositionMotif(btn.dataset.motifDel);
        showToast("Набросок удалён.");
      });
    });
  }

  function exportMotifJson() {
    if (!compositionData) return;
    const payload = {
      app: "ladno-solfeggio",
      exportedAt: new Date().toISOString(),
      root: compositionData.root,
      progression: compositionData.progressionName,
      scale: compositionData.scaleName,
      rhythmMode: compositionData.rhythmMode,
      bars: compositionData.bars.map((b, idx) => ({
        bar: idx + 1,
        chord: b.chord.symbol,
        roman: b.chord.roman,
        notes: b.notes.map((n) => ({
          name: n.name,
          midi: n.midi,
          beatOffset: n.beatOffset,
          duration: n.durationTag,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ladno-motif-${compositionData.root}-${compositionData.rhythmMode}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("JSON-файл мотива скачан!");
  }

  [
    "composition-root",
    "composition-progression",
    "composition-scale",
    "composition-rhythm",
  ].forEach((id) => byId(id)?.addEventListener("change", renderLab));

  byId("composition-regenerate")?.addEventListener("click", () => {
    seed++;
    renderLab();
  });
  byId("composition-play")?.addEventListener("click", () =>
    playCurrentComposition(),
  );
  byId("composition-save")?.addEventListener("click", () => {
    if (!compositionData) return;
    saveCompositionMotif({
      root: compositionData.root,
      progressionId: compositionData.progressionId,
      progressionName: compositionData.progressionName,
      scaleId: compositionData.scaleId,
      scaleName: compositionData.scaleName,
      rhythmMode: compositionData.rhythmMode,
      seed: compositionData.seed,
    });
    showToast("Мотив сохранён в этом браузере!");
  });
  byId("composition-export")?.addEventListener("click", exportMotifJson);

  subscribeState(renderSavedList);
  renderLab();
  renderSavedList();
}

/* =========================================================================
 * 09. ПЕНТАТОНИКА: 3 УПРАЖНЕНИЯ (НАЙТИ НОТЫ / НА СЛУХ / СЫГРАТЬ В БОКСЕ N)
 * ========================================================================= */
export function initPentatonicExercises() {
  let mode = "find"; // 'find' | 'ear' | 'box'
  let findQuiz = null;
  let earQuiz = null;
  let boxQuiz = null;
  const card = byId("pentatonic-exercise-card");

  // 1) Найди все 5 нот пентатоники от X
  function newFindQuiz() {
    const root = randomItem(ROOTS);
    const scale = getScale(Math.random() < 0.5 ? "minorPent" : "majorPent");
    findQuiz = {
      root,
      scale,
      pcs: scalePcs(root, scale),
      names: scaleNames(root, scale),
      selected: new Set(),
      answered: false,
    };
    byId("pent-find-prompt").textContent =
      `Найди все 5 звуков: ${prettyNote(root)} · ${scale.name.toLowerCase()}.`;
    byId("pent-find-check").disabled = false;
    setFeedback(
      "pent-find-feedback",
      "Отметь по одному экземпляру каждой из 5 ступеней.",
    );
    renderFindBoard();
  }

  function renderFindBoard() {
    const rootPc = parseNote(findQuiz.root).pc;
    const names = nameMap(findQuiz.names);
    renderFretboard({
      container: "pent-find-board",
      showAll: true,
      highlighted: (p) => p.pc === rootPc,
      root: rootPc,
      names,
      selected: findQuiz.selected,
      maxFret: 12,
      onNoteClick: (pos) => {
        if (findQuiz.answered) return;
        const dup = [...findQuiz.selected].find((k) => {
          const [s, f] = k.split(":").map(Number);
          return mod(STRINGS[s].midi + f) === pos.pc;
        });
        if (dup) findQuiz.selected.delete(dup);
        if (dup !== pos.key) findQuiz.selected.add(pos.key);
        renderFindBoard();
      },
    });
    byId("pent-find-picked").textContent =
      `${selectedDescription(findQuiz.selected, names)} (${findQuiz.selected.size} / 5)`;
  }

  function checkFindQuiz() {
    if (findQuiz.answered) return;
    const chosen = [...findQuiz.selected].map((k) => {
      const [s, f] = k.split(":").map(Number);
      return mod(STRINGS[s].midi + f);
    });
    const correct =
      chosen.length === 5 && findQuiz.pcs.every((pc) => chosen.includes(pc));
    findQuiz.answered = true;
    byId("pent-find-check").disabled = true;
    recordExerciseResult("pentFind", correct);
    triggerFeedbackWave(card, correct);
    const ans = findQuiz.names.map(prettyNote).join(" – ");
    setFeedback(
      "pent-find-feedback",
      correct
        ? `Верно! Пять нот ${prettyNote(findQuiz.root)} (${findQuiz.scale.name.toLowerCase()}): ${ans}.`
        : `Не совсем. Правильная пятёрка нот: ${ans}.`,
      correct ? "success" : "error",
    );
  }

  // 2) Определи пентатонику на слух (минорная vs мажорная)
  function newEarQuiz() {
    const root = randomItem(ROOTS);
    const typeId = Math.random() < 0.5 ? "minorPent" : "majorPent";
    const scale = getScale(typeId);
    const notes = scaleNotes(root, scale, true);
    earQuiz = { root, typeId, scale, notes };
    const opts = [
      { value: "minorPent", label: "Минорная пентатоника (1–♭3–4–5–♭7)" },
      { value: "majorPent", label: "Мажорная пентатоника (1–2–3–5–6)" },
    ];
    renderAnswerButtons("pent-ear-answers", opts, typeId, (correct) => {
      recordExerciseResult("pentEar", correct);
      triggerFeedbackWave(card, correct);
      setFeedback(
        "pent-ear-feedback",
        correct
          ? `Точно! Прозвучала ${scale.name.toLowerCase()} от ${prettyNote(root)}: ${scaleNames(root, scale).map(prettyNote).join(" – ")}.`
          : `Это была ${scale.name.toLowerCase()} от ${prettyNote(root)}. Обрати внимание на первую ступеньку после тоники: 1½ тона в миноре против 1 тона в мажоре!`,
        correct ? "success" : "error",
      );
    });
    setFeedback(
      "pent-ear-feedback",
      "Нажми «Слушать фразу» и угадай лад пентатоники.",
    );
  }

  function playPentEar() {
    if (!earQuiz) return;
    const seq = [...earQuiz.notes, ...[...earQuiz.notes].reverse().slice(1)];
    playEvents(
      seq.map((n, i) => ({
        notes: [n.midi],
        time: i * 0.26,
        duration: 0.24,
        velocity: i === 0 || i === seq.length - 1 ? 0.85 : 0.68,
      })),
    );
  }

  // 3) Сыграй пентатонику в позиции (боксе) N
  function newBoxQuiz() {
    const root = randomItem(["A", "E", "G", "C", "D"]);
    const typeId = Math.random() < 0.65 ? "minorPent" : "majorPent";
    const boxes = getPentatonicBoxes(root, typeId, false);
    const box = randomItem(boxes);
    const targetKeys = new Set(box.positions.map((p) => p.key));
    boxQuiz = {
      root,
      typeId,
      scale: getScale(typeId),
      box,
      targetKeys,
      picked: new Set(),
      wrongKeys: new Set(),
      done: false,
    };
    byId("pent-box-prompt").textContent =
      `Сыграй все ${targetKeys.size} точек: ${prettyNote(root)} (${boxQuiz.scale.name.toLowerCase()}) строго в «${box.name}» (лады ${box.minFret}–${box.maxFret})!`;
    setFeedback(
      "pent-box-feedback",
      "Кликай по ладам внутри подсвеченной области бокса.",
    );
    renderBoxQuizBoard();
  }

  function renderBoxQuizBoard() {
    const q = boxQuiz;
    const rootPc = parseNote(q.root).pc;
    renderFretboard({
      container: "pent-box-board",
      maxFret: 15,
      showAll: true,
      highlighted: (p) =>
        p.pc === rootPc && p.fret >= q.box.minFret && p.fret <= q.box.maxFret,
      root: rootPc,
      names: nameMap(scaleNames(q.root, q.scale)),
      boxes: [
        {
          label: `${q.box.name} (лады ${q.box.minFret}–${q.box.maxFret})`,
          minFret: q.box.minFret,
          maxFret: q.box.maxFret,
          color: q.box.color,
          active: true,
        },
      ],
      correctKeys: q.picked,
      wrongKeys: q.wrongKeys,
      onNoteClick: (pos) => {
        if (q.done) return;
        if (q.targetKeys.has(pos.key)) {
          q.picked.add(pos.key);
          if (q.picked.size === q.targetKeys.size) {
            q.done = true;
            const cleanRun = q.wrongKeys.size === 0;
            recordExerciseResult("pentBox", cleanRun);
            triggerFeedbackWave(card, true);
            setFeedback(
              "pent-box-feedback",
              cleanRun
                ? `Блестяще! Весь ${q.box.name} пройден без единого промаха! Пальцовка: ${q.box.fingersSummary}.`
                : `Бокс собран! Промахов по дороге: ${q.wrongKeys.size}. Попробуй пройти его ещё раз начисто!`,
              "success",
            );
          } else {
            setFeedback(
              "pent-box-feedback",
              `Отлично: открыто ${q.picked.size} из ${q.targetKeys.size} нот бокса.`,
            );
          }
        } else {
          q.wrongKeys.add(pos.key);
          triggerFeedbackWave(card, false);
          setFeedback(
            "pent-box-feedback",
            `Нота ${writtenNote(pos.name, pos.midi)} не входит в этот бокс — держись в пределах ладов ${q.box.minFret}–${q.box.maxFret}!`,
            "error",
          );
        }
        renderBoxQuizBoard();
      },
    });
  }

  function switchPentMode(nextMode) {
    mode = nextMode;
    byId("pent-area-find").hidden = mode !== "find";
    byId("pent-area-ear").hidden = mode !== "ear";
    byId("pent-area-box").hidden = mode !== "box";
    setSwitchGroup("[data-pent-task]", "data-pent-task", mode);
  }

  document
    .querySelectorAll("[data-pent-task]")
    .forEach((btn) =>
      btn.addEventListener("click", () => switchPentMode(btn.dataset.pentTask)),
    );
  byId("pent-find-check")?.addEventListener("click", checkFindQuiz);
  byId("pent-find-next")?.addEventListener("click", newFindQuiz);
  byId("pent-ear-play")?.addEventListener("click", playPentEar);
  byId("pent-ear-next")?.addEventListener("click", newEarQuiz);
  byId("pent-box-next")?.addEventListener("click", newBoxQuiz);

  newFindQuiz();
  newEarQuiz();
  newBoxQuiz();
  switchPentMode("find");
}

/* =========================================================================
 * 10. БЛЮЗОВЫЕ ГАММЫ И 12-ТАКТОВЫЙ БЛЮЗ: 3 УПРАЖНЕНИЯ
 * ========================================================================= */
export function initBluesExercises() {
  let mode = "blueNote"; // 'blueNote' | 'buildBlues' | 'blues12'
  let blueNoteQuiz = null;
  let buildBluesQuiz = null;
  let blues12Quiz = null;
  const card = byId("blues-exercise-card");

  // 1) Найди блюзовую ноту (♭5 или ♭3) в заданном боксе
  function newBlueNoteQuiz() {
    const root = randomItem(["A", "E", "G", "C", "D"]);
    const isMajor = Math.random() < 0.35;
    const typeId = isMajor ? "majorBlues" : "minorBlues";
    const boxes = getPentatonicBoxes(root, typeId, true).filter(
      (b) => b.bluePositions.length > 0,
    );
    const box = randomItem(boxes);
    const scale = getScale(typeId);
    const blueName = spellInterval(root, isMajor ? 3 : 6, isMajor ? 2 : 4);
    blueNoteQuiz = {
      root,
      isMajor,
      scale,
      box,
      blueName,
      targetKeys: new Set(box.bluePositions.map((p) => p.key)),
      answered: false,
      pickedKey: null,
    };
    byId("blues-note-prompt").textContent =
      `Найди «блюзовую ноту» (${isMajor ? "♭3" : "♭5"}) для ${prettyNote(root)} (${scale.name.toLowerCase()}) внутри «${box.name}» (лады ${box.minFret}–${box.maxFret})!`;
    setFeedback(
      "blues-note-feedback",
      "Ноты обычной пентатоники уже подсвечены зелёным — кликни на недостающую блюзовую ступень!",
    );
    renderBlueNoteBoard();
  }

  function renderBlueNoteBoard() {
    const q = blueNoteQuiz;
    const rootPc = parseNote(q.root).pc;
    const pentKeys = q.box.positions.map((p) => p.key);
    renderFretboard({
      container: "blues-note-board",
      maxFret: 15,
      showAll: true,
      highlighted: pentKeys,
      root: rootPc,
      blueNotes: q.answered ? [...q.targetKeys] : [],
      wrongKeys:
        q.answered && !q.targetKeys.has(q.pickedKey) ? [q.pickedKey] : [],
      names: nameMap(scaleNames(q.root, q.scale)),
      boxes: [
        {
          label: q.box.title,
          minFret: q.box.minFret,
          maxFret: q.box.maxFret,
          color: "#c84b31",
          active: true,
        },
      ],
      onNoteClick: (pos) => {
        if (q.answered) return;
        q.answered = true;
        q.pickedKey = pos.key;
        const ok = q.targetKeys.has(pos.key);
        recordExerciseResult("bluesNote", ok);
        triggerFeedbackWave(card, ok);
        setFeedback(
          "blues-note-feedback",
          ok
            ? `Точно в яблочко! Блюзовая нота ${prettyNote(q.blueName)} (${q.isMajor ? "♭3" : "♭5"}) зажглась красным!`
            : `Мимо: это ${prettyNote(pos.name)}. Красным отмечена настоящая блюзовая нота ${prettyNote(q.blueName)} в этом боксе.`,
          ok ? "success" : "error",
        );
        renderBlueNoteBoard();
      },
    });
  }

  // 2) Собери все 6 нот блюзовой гаммы
  function newBuildBluesQuiz() {
    const root = randomItem(["A", "E", "G", "C", "D", "B"]);
    const scale = getScale(Math.random() < 0.65 ? "minorBlues" : "majorBlues");
    buildBluesQuiz = {
      root,
      scale,
      pcs: scalePcs(root, scale),
      names: scaleNames(root, scale),
      selected: new Set(),
      answered: false,
    };
    byId("blues-scale-prompt").textContent =
      `Собери все 6 звуков: ${prettyNote(root)} · ${scale.name.toLowerCase()}.`;
    byId("blues-scale-check").disabled = false;
    setFeedback(
      "blues-scale-feedback",
      "Выбери 5 нот пентатоники + 1 блюзовую ноту.",
    );
    renderBuildBluesBoard();
  }

  function renderBuildBluesBoard() {
    const q = buildBluesQuiz;
    const rootPc = parseNote(q.root).pc;
    const names = nameMap(q.names);
    renderFretboard({
      container: "blues-scale-board",
      showAll: true,
      highlighted: (p) => p.pc === rootPc,
      root: rootPc,
      names,
      selected: q.selected,
      onNoteClick: (pos) => {
        if (q.answered) return;
        const dup = [...q.selected].find((k) => {
          const [s, f] = k.split(":").map(Number);
          return mod(STRINGS[s].midi + f) === pos.pc;
        });
        if (dup) q.selected.delete(dup);
        if (dup !== pos.key) q.selected.add(pos.key);
        renderBuildBluesBoard();
      },
    });
    byId("blues-scale-picked").textContent =
      `${selectedDescription(q.selected, names)} (${q.selected.size} / 6)`;
  }

  function checkBuildBluesQuiz() {
    const q = buildBluesQuiz;
    if (q.answered) return;
    const chosen = [...q.selected].map((k) => {
      const [s, f] = k.split(":").map(Number);
      return mod(STRINGS[s].midi + f);
    });
    const ok = chosen.length === 6 && q.pcs.every((pc) => chosen.includes(pc));
    q.answered = true;
    byId("blues-scale-check").disabled = true;
    recordExerciseResult("bluesScale", ok);
    triggerFeedbackWave(card, ok);
    const ans = q.names.map(prettyNote).join(" – ");
    setFeedback(
      "blues-scale-feedback",
      ok
        ? `Шикарно! Вся шестёрка блюзовой гаммы на месте: ${ans}.`
        : `Не совсем. Состав ${prettyNote(q.root)} (${q.scale.name.toLowerCase()}): ${ans}.`,
      ok ? "success" : "error",
    );
  }

  // 3) Собери 12-тактовый блюз (I7–IV7–V7)
  function newBlues12Quiz() {
    const root = byId("blues-12-key")?.value || "A";
    const i7 = `${prettyNote(root)}7`;
    const iv7 = `${prettyNote(spellInterval(root, 5, 3))}7`;
    const v7 = `${prettyNote(spellInterval(root, 7, 4))}7`;
    const expected = [i7, i7, i7, i7, iv7, iv7, i7, i7, v7, iv7, i7, v7];
    blues12Quiz = { root, i7, iv7, v7, expected, answered: false };

    byId("blues-12-prompt").textContent =
      `Расставь доминантсептаккорды (${i7}, ${iv7}, ${v7}) в классическую 12-тактовую сетку с тёрнэраундом V7 в 12-м такте:`;

    const grid = byId("blues-12-grid");
    grid.innerHTML = expected
      .map(
        (_, idx) =>
          `<div class="blues-bar-slot">
            <label for="b12-slot-${idx}">Такт ${idx + 1}</label>
            <select id="b12-slot-${idx}">
              <option value="">—</option>
              <option value="${escapeHTML(i7)}">${escapeHTML(i7)} (I7)</option>
              <option value="${escapeHTML(iv7)}">${escapeHTML(iv7)} (IV7)</option>
              <option value="${escapeHTML(v7)}">${escapeHTML(v7)} (V7)</option>
            </select>
          </div>`,
      )
      .join("");
    byId("blues-12-check").disabled = false;
    setFeedback(
      "blues-12-feedback",
      "Заполни все 12 тактов (3 строчки по 4 такта).",
    );
  }

  function checkBlues12Quiz() {
    if (blues12Quiz.answered) return;
    const selects = [...byId("blues-12-grid").querySelectorAll("select")];
    if (selects.some((s) => !s.value)) {
      setFeedback("blues-12-feedback", "Заполни каждый из 12 тактов!");
      return;
    }
    const ok = selects.every((s, idx) => s.value === blues12Quiz.expected[idx]);
    blues12Quiz.answered = true;
    byId("blues-12-check").disabled = true;
    recordExerciseResult("blues12", ok);
    triggerFeedbackWave(card, ok);
    setFeedback(
      "blues-12-feedback",
      ok
        ? `Безупречно! Классический 12-тактовый квадрат в ${prettyNote(blues12Quiz.root)}: 4 такта ${blues12Quiz.i7} → 2 такта ${blues12Quiz.iv7} + 2 такта ${blues12Quiz.i7} → ${blues12Quiz.v7} – ${blues12Quiz.iv7} – ${blues12Quiz.i7} – ${blues12Quiz.v7}!`
        : `Проверь формулу: [1–4] ${blues12Quiz.i7} · [5–6] ${blues12Quiz.iv7} · [7–8] ${blues12Quiz.i7} · [9] ${blues12Quiz.v7} · [10] ${blues12Quiz.iv7} · [11] ${blues12Quiz.i7} · [12] ${blues12Quiz.v7}.`,
      ok ? "success" : "error",
    );
  }

  function playBlues12() {
    const root = byId("blues-12-key")?.value || "A";
    const chords = progressionChords(root, getProgression("blues12"));
    playEvents(
      chords.map((c, idx) => ({
        notes: c.notes.map((n) => n.midi),
        time: idx * 0.72,
        duration: 0.62,
        velocity: idx % 4 === 0 ? 0.78 : 0.6,
      })),
    );
  }

  function switchBluesMode(nextMode) {
    mode = nextMode;
    byId("blues-area-note").hidden = mode !== "blueNote";
    byId("blues-area-scale").hidden = mode !== "buildBlues";
    byId("blues-area-12").hidden = mode !== "blues12";
    setSwitchGroup("[data-blues-task]", "data-blues-task", mode);
  }

  document
    .querySelectorAll("[data-blues-task]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        switchBluesMode(btn.dataset.bluesTask),
      ),
    );
  byId("blues-note-next")?.addEventListener("click", newBlueNoteQuiz);
  byId("blues-scale-check")?.addEventListener("click", checkBuildBluesQuiz);
  byId("blues-scale-next")?.addEventListener("click", newBuildBluesQuiz);
  byId("blues-12-key")?.addEventListener("change", newBlues12Quiz);
  byId("blues-12-check")?.addEventListener("click", checkBlues12Quiz);
  byId("blues-12-reset")?.addEventListener("click", newBlues12Quiz);
  byId("blues-12-play")?.addEventListener("click", playBlues12);

  newBlueNoteQuiz();
  newBuildBluesQuiz();
  newBlues12Quiz();
  switchBluesMode("blueNote");
}

/* =========================================================================
 * 13. РИТМ И ГРУВ: ЛИНЕЙКА ДОЛЕЙ, МЕТРОНОМ + УДАРНЫЕ, «ХЛОПНИ РИТМ» И РАЗМЕР НА СЛУХ
 * ========================================================================= */
export function initRhythmModule() {
  const rootEl = byId("view-rhythm");
  if (!rootEl) return { stopRhythm: () => {} };

  let currentMeter = METERS[0];
  let bpm = 92;
  let isPlaying = false;
  let stepIndex = 0;
  let loopTimer = null;
  let transportEvent = null;
  let drumGrid = JSON.parse(JSON.stringify(currentMeter.drumDefault));

  // Состояние упражнения «Хлопни ритм»
  let tapState = {
    active: false,
    phase: "idle", // 'countin' | 'recording' | 'done'
    pattern: RHYTHM_PATTERNS[0],
    barStartTimeMs: 0,
    beatDurationMs: 650,
    userTapsBeats: [],
    timers: [],
  };

  let meterQuiz = null;
  const exerciseCard = byId("rhythm-exercise-card");

  function renderBeatRuler() {
    const ruler = byId("rhythm-ruler");
    if (!ruler) return;
    const total = currentMeter.steps;
    const sub = currentMeter.subdivision;

    ruler.innerHTML = Array.from({ length: total }, (_, idx) => {
      const isMainBeat = idx % sub === 0;
      const beatNum = Math.floor(idx / sub) + 1;
      const label =
        currentMeter.id === "6/8"
          ? String(idx + 1)
          : isMainBeat
            ? String(beatNum)
            : "и";
      const accentLevel = currentMeter.accents[idx] || 0;
      return `<div class="beat-cell accent-${accentLevel} ${idx === stepIndex && isPlaying ? "playing" : ""}" data-step-cell="${idx}">
        <span class="beat-num">${escapeHTML(label)}</span>
        <span class="beat-role">${accentLevel === 3 ? "сильная" : accentLevel === 2 ? "отн. сильн." : isMainBeat ? "слабая" : "субдоля"}</span>
      </div>`;
    }).join("");

    // Рендер сетки драм-машины (Kick, Snare, Hi-Hat)
    const tracksEl = byId("rhythm-drum-grid");
    if (tracksEl) {
      const rows = [
        { key: "kick", label: "Бочка (Kick)" },
        { key: "snare", label: "Малый (Snare)" },
        { key: "hihat", label: "Хай-хэт (Hat)" },
      ];
      tracksEl.innerHTML = rows
        .map(
          (r) =>
            `<div class="drum-row">
              <span class="drum-label">${r.label}</span>
              <div class="drum-steps" style="grid-template-columns: repeat(${total}, minmax(0, 1fr))">
                ${drumGrid[r.key]
                  .map(
                    (on, sIdx) =>
                      `<button type="button" class="drum-pad ${on ? "active" : ""}" data-drum-track="${r.key}" data-drum-step="${sIdx}" aria-pressed="${Boolean(on)}" aria-label="${r.label}, шаг ${sIdx + 1}">${on ? "●" : "·"}</button>`,
                  )
                  .join("")}
              </div>
            </div>`,
        )
        .join("");

      tracksEl.querySelectorAll("[data-drum-track]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tr = btn.dataset.drumTrack;
          const st = Number(btn.dataset.drumStep);
          drumGrid[tr][st] = drumGrid[tr][st] ? 0 : 1;
          renderBeatRuler();
        });
      });
    }
  }

  function stepDurationMs() {
    // Каждый шаг сетки = восьмая нота (0.5 четверти)
    return (60000 / bpm) * 0.5;
  }

  function tickMetronome() {
    if (!isPlaying) return;
    const useDrums = byId("rhythm-use-drums")?.checked;
    const isStrong = stepIndex === 0;
    const isBeat = stepIndex % currentMeter.subdivision === 0;

    if (useDrums) {
      if (drumGrid.kick[stepIndex]) playDrumSound("kick");
      if (drumGrid.snare[stepIndex]) playDrumSound("snare");
      if (drumGrid.hihat[stepIndex]) playDrumSound("hihat");
    } else if (isBeat || currentMeter.id === "6/8") {
      playDrumSound("click", isStrong);
    }

    document.querySelectorAll("[data-step-cell]").forEach((el) => {
      el.classList.toggle("playing", Number(el.dataset.stepCell) === stepIndex);
    });

    stepIndex = (stepIndex + 1) % currentMeter.steps;
    loopTimer = setTimeout(tickMetronome, stepDurationMs());
  }

  function stopMetronome() {
    isPlaying = false;
    clearTimeout(loopTimer);
    if (transportEvent !== null && window.Tone) {
      window.Tone.Transport.clear(transportEvent);
      window.Tone.Transport.stop();
      transportEvent = null;
    }
    const btn = byId("rhythm-toggle");
    if (btn) btn.innerHTML = "<span>▶</span> Запустить метроном";
    document.querySelectorAll("[data-step-cell]").forEach((el) => {
      el.classList.remove("playing");
    });
  }

  async function toggleMetronome() {
    if (isPlaying) {
      stopMetronome();
      return;
    }
    isPlaying = true;
    stepIndex = 0;
    byId("rhythm-toggle").innerHTML = "<span>■</span> Остановить";
    const toneReady = await ensureToneReady();
    if (!isPlaying) return;
    if (!toneReady || !window.Tone?.Transport) {
      tickMetronome();
      return;
    }
    const transport = window.Tone.Transport;
    transport.bpm.value = bpm;
    transportEvent = transport.scheduleRepeat((time) => {
      const step = stepIndex;
      if (byId("rhythm-use-drums")?.checked) {
        for (const type of ["kick", "snare", "hihat"]) {
          if (drumGrid[type][step]) scheduleToneDrum(type, false, time);
        }
      } else if (
        step % currentMeter.subdivision === 0 ||
        currentMeter.id === "6/8"
      ) {
        scheduleToneDrum("click", step === 0, time);
      }
      window.Tone.Draw.schedule(() => {
        document
          .querySelectorAll("[data-step-cell]")
          .forEach((el) =>
            el.classList.toggle(
              "playing",
              Number(el.dataset.stepCell) === step,
            ),
          );
      }, time);
      stepIndex = (step + 1) % currentMeter.steps;
    }, "8n");
    transport.start();
  }

  // Отрисовка паттерна для упражнения «Хлопни ритм»
  function renderTapPattern() {
    const pat =
      RHYTHM_PATTERNS.find(
        (p) => p.id === byId("rhythm-pattern-select")?.value,
      ) || RHYTHM_PATTERNS[0];
    tapState.pattern = pat;
    byId("rhythm-tap-hint").textContent = pat.hint;

    const slots = Array.from({ length: 8 }, (_, idx) => {
      const beatPos = idx * 0.5;
      const hitIdx = pat.hits.indexOf(beatPos);
      const hasHit = hitIdx >= 0;
      const lbl = idx % 2 === 0 ? String(idx / 2 + 1) : "и";
      return `<div class="tap-slot ${hasHit ? "expected" : ""}" data-tap-slot="${beatPos}">
        <small>${lbl}</small>
        <strong>${hasHit ? "👏" : "·"}</strong>
      </div>`;
    }).join("");
    byId("rhythm-tap-visual").innerHTML = slots;
  }

  function clearTapTimers() {
    tapState.timers.forEach(clearTimeout);
    tapState.timers = [];
    tapState.active = false;
    tapState.phase = "idle";
  }

  function startTapChallenge() {
    ensureToneReady();
    stopMetronome();
    clearTapTimers();
    renderTapPattern();

    const beatMs = 60000 / bpm;
    tapState.active = true;
    tapState.phase = "countin";
    tapState.beatDurationMs = beatMs;
    tapState.userTapsBeats = [];

    setFeedback(
      "rhythm-tap-feedback",
      "Приготовься! Идёт отсчёт 4 удара: 1 · 2 · 3 · 4 — на следующем «РАЗ» жми ПРОБЕЛ или кнопку!",
    );

    // 4 удара count-in + 4 удара рабочего такта
    for (let b = 0; b < 8; b++) {
      const t = setTimeout(() => {
        playDrumSound("click", b % 4 === 0);
        if (b < 4) {
          byId("rhythm-tap-status").textContent = `Отсчёт: ${b + 1} из 4...`;
        } else {
          if (b === 4) {
            tapState.phase = "recording";
            tapState.barStartTimeMs = performance.now();
          }
          byId("rhythm-tap-status").textContent =
            `Такт идёт: доля ${b - 3}! Жми ПРОБЕЛ!`;
        }
      }, b * beatMs);
      tapState.timers.push(t);
    }

    const finishTimer = setTimeout(() => {
      evaluateTapChallenge();
    }, 8.35 * beatMs);
    tapState.timers.push(finishTimer);
  }

  function registerUserTap() {
    if (!tapState.active) {
      playDrumSound("snare");
      return;
    }
    playDrumSound("snare");
    const now = performance.now();
    // Разрешаем небольшое опережение первой доли (до 160 мс до начала такта 4)
    if (tapState.phase === "countin") {
      const approxBarStart = tapState.barStartTimeMs || 0;
      if (approxBarStart === 0) {
        // Если нажали за мгновение до b===4, сохраним как 0.0
        tapState.pendingEarlyTap = now;
      }
      return;
    }
    if (tapState.phase === "recording") {
      const deltaBeats =
        (now - tapState.barStartTimeMs) / tapState.beatDurationMs;
      tapState.userTapsBeats.push(deltaBeats);
    }
  }

  function evaluateTapChallenge() {
    if (tapState.pendingEarlyTap && tapState.barStartTimeMs) {
      const earlyDiffMs = tapState.barStartTimeMs - tapState.pendingEarlyTap;
      if (earlyDiffMs >= 0 && earlyDiffMs <= 165) {
        tapState.userTapsBeats.unshift(-earlyDiffMs / tapState.beatDurationMs);
      }
      tapState.pendingEarlyTap = null;
    }
    const expected = tapState.pattern.hits;
    const taps = [...tapState.userTapsBeats];
    clearTapTimers();
    byId("rhythm-tap-status").textContent = "Сессия завершена";

    if (!taps.length) {
      setFeedback(
        "rhythm-tap-feedback",
        "Не зафиксировано ни одного нажатия во время рабочего такта. Нажми «Старт» и после 4 щелчков отбивай ритм!",
        "error",
      );
      return;
    }

    const toleranceBeats = Math.max(0.24, 155 / tapState.beatDurationMs);
    let matched = 0;
    const usedTapIdx = new Set();
    const details = expected.map((expBeat, idx) => {
      let bestIdx = -1;
      let bestDist = Infinity;
      taps.forEach((tb, tIdx) => {
        if (usedTapIdx.has(tIdx)) return;
        const d = Math.abs(tb - expBeat);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = tIdx;
        }
      });
      if (bestIdx >= 0 && bestDist <= toleranceBeats) {
        usedTapIdx.add(bestIdx);
        matched++;
        const diffMs = Math.round(
          (taps[bestIdx] - expBeat) * tapState.beatDurationMs,
        );
        return `${tapState.pattern.labels[idx]}: ✓ (${diffMs >= 0 ? "+" : ""}${diffMs} мс)`;
      }
      return `${tapState.pattern.labels[idx]}: пропуск`;
    });

    const extraTaps = Math.max(0, taps.length - matched);
    const success = matched === expected.length && extraTaps <= 1;
    recordExerciseResult("rhythmTap", success);
    triggerFeedbackWave(exerciseCard, success);

    setFeedback(
      "rhythm-tap-feedback",
      success
        ? `Отличный грув! Попаданий: ${matched} из ${expected.length}. Разбор: ${details.join(" · ")}.`
        : `Попаданий: ${matched} из ${expected.length}${extraTaps ? `, лишних ударов: ${extraTaps}` : ""}. Разбор: ${details.join(" · ")}.`,
      success ? "success" : "error",
    );
  }

  // Упражнение 2: «Определи размер на слух» (4/4, 3/4, 6/8)
  function newMeterEarQuiz() {
    const target = randomItem(METERS);
    meterQuiz = { target };
    const opts = METERS.map((m) => ({ value: m.id, label: m.name }));
    renderAnswerButtons("rhythm-meter-answers", opts, target.id, (correct) => {
      recordExerciseResult("rhythmMeter", correct);
      triggerFeedbackWave(exerciseCard, correct);
      setFeedback(
        "rhythm-meter-feedback",
        correct
          ? `Верно! Прозвучал размер ${target.name}. ${target.description}`
          : `Это был размер ${target.name}. Подсказка: ${target.description}`,
        correct ? "success" : "error",
      );
    });
    setFeedback(
      "rhythm-meter-feedback",
      "Послушай 2 такта пульсации с акцентом на сильной доле и угадай размер.",
    );
  }

  function playMeterSample() {
    if (!meterQuiz) return;
    ensureToneReady();
    stopMetronome();
    const m = meterQuiz.target;
    const stepMs = 240;
    const totalSteps = m.steps * 2; // 2 полных такта
    for (let i = 0; i < totalSteps; i++) {
      setTimeout(() => {
        const idx = i % m.steps;
        if (m.drumDefault.kick[idx]) playDrumSound("kick");
        if (m.drumDefault.snare[idx]) playDrumSound("snare");
        if (m.drumDefault.hihat[idx]) playDrumSound("hihat");
        if (idx === 0 || m.accents[idx] >= 2) {
          playDrumSound("click", idx === 0);
        }
      }, i * stepMs);
    }
  }

  // Привязка событий ритм-модуля
  byId("rhythm-bpm")?.addEventListener("input", (e) => {
    bpm = Number(e.target.value) || 92;
    if (transportEvent !== null && window.Tone)
      window.Tone.Transport.bpm.value = bpm;
    byId("rhythm-bpm-val").textContent = `${bpm} BPM`;
  });

  byId("rhythm-meter")?.addEventListener("change", (e) => {
    currentMeter = METERS.find((m) => m.id === e.target.value) || METERS[0];
    drumGrid = JSON.parse(JSON.stringify(currentMeter.drumDefault));
    stepIndex = 0;
    byId("rhythm-meter-desc").textContent = currentMeter.description;
    renderBeatRuler();
  });

  byId("rhythm-toggle")?.addEventListener("click", toggleMetronome);
  byId("rhythm-pattern-select")?.addEventListener("change", renderTapPattern);
  byId("rhythm-tap-start")?.addEventListener("click", startTapChallenge);
  byId("rhythm-tap-hit")?.addEventListener("click", registerUserTap);
  byId("rhythm-meter-play")?.addEventListener("click", playMeterSample);
  byId("rhythm-meter-next")?.addEventListener("click", newMeterEarQuiz);

  document.querySelectorAll("[data-rhythm-task]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const m = btn.dataset.rhythmTask;
      byId("rhythm-area-tap").hidden = m !== "tap";
      byId("rhythm-area-meter").hidden = m !== "meter";
      setSwitchGroup("[data-rhythm-task]", "data-rhythm-task", m);
    }),
  );

  // Обработка клавиши Пробел, когда открыт раздел «Ритм и грув»
  window.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" &&
      !rootEl.hidden &&
      tapState.active &&
      !["SELECT", "INPUT", "TEXTAREA"].includes(
        document.activeElement?.tagName,
      ) &&
      !document.activeElement?.isContentEditable
    ) {
      e.preventDefault();
      registerUserTap();
    }
  });

  byId("rhythm-meter-desc").textContent = currentMeter.description;
  renderBeatRuler();
  renderTapPattern();
  newMeterEarQuiz();

  return {
    stopRhythm: () => {
      stopMetronome();
      clearTapTimers();
    },
  };
}

/* =========================================================================
 * 14. ЧТЕНИЕ С ЛИСТА И НОТАЦИЯ: VEXFLOW → ГРИФ И СПРИНТ 30 СЕКУНД
 * ========================================================================= */
export function initSightReadingModule() {
  const rootEl = byId("view-sight-reading");
  if (!rootEl) return { stopSprint: () => {} };

  let guitarTransposition = false; // false = реальная высота, true = гитарная запись октавой выше
  let sprintActive = false;
  let sprintSeconds = 30;
  let sprintScore = 0;
  let sprintInterval = null;
  let currentNote = null;
  const card = byId("sr-trainer-card");

  function updateRecordLabel() {
    const sr = getState().sightReading;
    const recEl = byId("sr-best-score");
    if (recEl) recEl.textContent = String(sr.bestScore30s);
  }

  function pickNextNote() {
    const next = randomItem(SIGHT_READING_POOL);
    currentNote = {
      ...next,
      answered: false,
    };

    renderStaff("sr-staff", [currentNote], false, {
      width: 380,
      height: 190,
      guitarTransposition,
    });

    byId("sr-clef-caption").textContent = guitarTransposition
      ? "Запись для гитары (+1 октава выше реального звучания, ключ 𝄞₈)"
      : "Реальная звучащая высота (концертный строй)";

    renderSrBoard();
  }

  function renderSrBoard(feedbackPosKey = null, wasCorrect = false) {
    const matchingPositions = positionsForMidi(currentNote.midi, 12);
    renderFretboard({
      container: "sr-board",
      maxFret: 12,
      showAll: false,
      correctKeys:
        feedbackPosKey && wasCorrect
          ? [feedbackPosKey]
          : feedbackPosKey && !wasCorrect
            ? matchingPositions.map((p) => p.key)
            : [],
      wrongKeys: feedbackPosKey && !wasCorrect ? [feedbackPosKey] : [],
      statusId: "sr-board-status",
      onNoteClick: (pos) => handleBoardPick(pos),
    });
  }

  function handleBoardPick(pos) {
    if (!currentNote) return;
    const isCorrect = pos.midi === currentNote.midi;

    if (sprintActive) {
      if (isCorrect) {
        sprintScore++;
        byId("sr-sprint-score").textContent = String(sprintScore);
        recordSightReadingAttempt(true, null);
        triggerFeedbackWave(card, true);
        setFeedback(
          "sr-feedback",
          `Верно (${writtenNote(currentNote.name, currentNote.midi)})! Следующая нота!`,
          "success",
        );
        pickNextNote();
      } else {
        recordSightReadingAttempt(false, null);
        triggerFeedbackWave(card, false);
        const hintPos = bestPosition(currentNote.midi, 12);
        setFeedback(
          "sr-feedback",
          `Мимо! На стане ${writtenNote(currentNote.name, currentNote.midi)} (например, ${describePosition(hintPos)}), а ты нажала ${writtenNote(pos.name, pos.midi)}.`,
          "error",
        );
      }
      return;
    }

    // Спокойный режим тренировки без таймера
    recordSightReadingAttempt(isCorrect, null);
    triggerFeedbackWave(card, isCorrect);
    const hintPos = bestPosition(currentNote.midi, 12);
    setFeedback(
      "sr-feedback",
      isCorrect
        ? `Точно! Это ${writtenNote(currentNote.name, currentNote.midi)} (${describePosition(pos)}).`
        : `Не совсем: ты нажала ${writtenNote(pos.name, pos.midi)}, а на стане записана ${writtenNote(currentNote.name, currentNote.midi)} (зелёным подсвечены все лады этой высоты, например ${describePosition(hintPos)}).`,
      isCorrect ? "success" : "error",
    );
    renderSrBoard(pos.key, isCorrect);
  }

  function stopSprint(finishedNaturally = false) {
    if (!sprintActive && !sprintInterval) return;
    clearInterval(sprintInterval);
    sprintInterval = null;
    sprintActive = false;

    const btn = byId("sr-sprint-btn");
    if (btn) btn.innerHTML = "<span>⏱</span> Спринт 30 секунд";
    byId("sr-timer").textContent = "30 с";

    if (finishedNaturally) {
      const isNewRecord = updateSightReadingBest(sprintScore);
      updateRecordLabel();
      setFeedback(
        "sr-feedback",
        `Время вышло! Твой результат за 30 секунд: ${sprintScore} правильных нот${isNewRecord ? " — НОВЫЙ РЕКОРД!" : "!"}`,
        "success",
      );
      showToast(`Спринт окончен: ${sprintScore} нот за 30 сек!`);
    }
  }

  function startSprint() {
    if (sprintActive) {
      stopSprint(false);
      return;
    }
    sprintActive = true;
    sprintSeconds = 30;
    sprintScore = 0;
    byId("sr-sprint-score").textContent = "0";
    byId("sr-timer").textContent = "30 с";
    byId("sr-sprint-btn").innerHTML = "<span>■</span> Стоп спринт";
    setFeedback(
      "sr-feedback",
      "Спринт начался! Находи ноту со стана на грифе (важна и нота, и октава)!",
    );
    pickNextNote();

    sprintInterval = setInterval(() => {
      sprintSeconds--;
      byId("sr-timer").textContent = `${sprintSeconds} с`;
      if (sprintSeconds <= 0) {
        stopSprint(true);
      }
    }, 1000);
  }

  byId("sr-transposition-toggle")?.addEventListener("click", (e) => {
    guitarTransposition = !guitarTransposition;
    e.currentTarget.classList.toggle("active", guitarTransposition);
    e.currentTarget.setAttribute("aria-pressed", String(guitarTransposition));
    e.currentTarget.textContent = guitarTransposition
      ? "Режим: гитарная нотация (+1 октава 𝄞₈)"
      : "Режим: реальная высота звучания";
    pickNextNote();
  });

  byId("sr-play-note")?.addEventListener("click", () => {
    if (currentNote) playNote(currentNote.midi);
  });
  byId("sr-next-note")?.addEventListener("click", () => pickNextNote());
  byId("sr-sprint-btn")?.addEventListener("click", startSprint);
  byId("sr-share-btn")?.addEventListener("click", async () => {
    const text = buildShareSummary("sight-reading");
    const ok = await copyTextToClipboard(text);
    showToast(ok ? "Рекорд скопирован в буфер обмена!" : text);
  });

  subscribeState(updateRecordLabel);
  updateRecordLabel();
  pickNextNote();

  return { stopSprint: () => stopSprint(false) };
}
