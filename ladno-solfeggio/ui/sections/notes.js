/*
 * 01. НОТЫ И ОКТАВЫ
 * Интерактивный гриф + два упражнения: «что за нота» и «найди ноту».
 */
import {
  CHROMATIC, ROOTS, STRINGS, bestPosition, midiOctave, mod, parseNote,
  prettyNote, SOLFEGE_RU, writtenNote,
} from "../../core/notes.js";
import { SCALES, getScale, scaleNames, scalePcs, scaleNoteList } from "../../core/scales.js";
import { playNote, playSequence } from "../../core/audio.js";
import { byId, fillSelect, makeOptions, setFeedback, answerButtons, unlockAnswers, setSwitch } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderStaff } from "../staff.js";
import { record, getStats } from "../state.js";
import { buildNotePool, pickPosition } from "../exercises.js";

const state = {
  mode: "scale",
  octave: "3",
  notation: "letters",
  quiz: null,
  find: null,
  findPrevious: null,
};

const pool = buildNotePool({ minFret: 0, maxFret: 12 });

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ИНТЕРАКТИВНЫЙ ГРИФ <span class="overline-muted">/ СТАНДАРТНЫЙ СТРОЙ</span></div>
          <h2>Знакомство с грифом</h2>
          <p>Нажми на любую ноту, чтобы услышать её. Корень гаммы отмечен тёмным кругом.</p>
        </div>
        <div class="switch" role="group" aria-label="Отображение нот">
          <button type="button" class="active" data-notes-mode="scale" aria-pressed="true">Только гамма</button>
          <button type="button" data-notes-mode="all" aria-pressed="false">Все ноты</button>
        </div>
      </div>

      <div class="controls">
        <label>Тоника <select id="notes-root"></select></label>
        <label>Гамма <select id="notes-scale"></select></label>
        <label>Октава <select id="notes-octave">
          <option value="all">Все октавы</option>
          <option value="2">2-я октава</option>
          <option value="3" selected>3-я октава</option>
          <option value="4">4-я октава</option>
          <option value="5">5-я октава</option>
        </select></label>
        <label>Подписи <select id="notes-notation">
          <option value="letters">Буквы: C D E</option>
          <option value="solfege">Сольфеджио: до ре ми</option>
        </select></label>
        <button class="button button-dark" id="notes-play-scale" type="button"><span>▶</span> Слушать гамму</button>
      </div>

      <div class="fret-scroll">
        <div id="notes-board" class="fretboard" aria-label="Гриф с нотами"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> тоника</span>
          <span><i class="legend-note"></i> ноты гаммы</span>
          <span><i class="legend-muted"></i> остальные</span>
        </div>
        <span id="notes-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="score-block">
        <div>
          <div class="overline">НОТЫ ГАММЫ НА СТАНЕ</div>
          <strong id="notes-summary"></strong>
          <p>Записана реальная высота звучания — та же, что на грифе.</p>
        </div>
        <div id="notes-staff" class="staff" aria-label="Гамма на нотном стане"></div>
      </div>
      <p class="notation-note">Гитарные партии часто записывают октавой выше звучания; здесь показана настоящая высота, чтобы нота совпадала с ладом.</p>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">СНАЧАЛА РАЗБЕРЁМСЯ</div>
        <h2>Немного теории <em>без паники.</em></h2>
      </div>
      <span class="reading-time">≈ 3 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">01 <span>↗</span></span>
        <h3>Всего 12 звуков</h3>
        <p>Основные ноты: <strong>C D E F G A B</strong> — до, ре, ми, фа, соль, ля, си. Между некоторыми есть диез ♯ или бемоль ♭. C♯ и D♭ звучат одинаково, но записываются по-разному.</p>
        <div class="card-example">C → C♯ → D <span>один лад за шаг</span></div>
        <div class="plain-block"><b>На пальцах:</b> на 5-й струне, 3-й лад — C. Четвёртый лад — C♯, пятый — D.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> искать C♯ на другом конце грифа. Все полутоны рядом: +1 лад = +1 полутон.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">02 <span>↗</span></span>
        <h3>Тон и полутон</h3>
        <p><strong>Полутон</strong> — расстояние в один лад на одной струне. <strong>Тон</strong> — два лада. Между E и F, а также B и C всего полутон: отдельной ноты между ними нет.</p>
        <div class="card-example">1 лад = полутон <span>2 лада = тон</span></div>
        <div class="plain-block"><b>На пальцах:</b> 2-я струна, 1-й лад — C, 3-й лад — D. Это тон: два лада.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> считать, что между всеми буквами тон. E–F и B–C — исключения.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">03 <span>↗</span></span>
        <h3>Октавы и струны</h3>
        <p>Через 12 полутонов имя ноты повторяется, а частота удваивается: это <strong>октава</strong>. На 12-м ладу звучит та же нота, что на открытой струне, но выше.</p>
        <div class="card-example">E₂ A₂ D₃ G₃ B₃ E₄ <span>от толстой к тонкой</span></div>
        <div class="plain-block"><b>На пальцах:</b> 6-я струна открытая — E2, 12-й лад — E3, 24-й — E4.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> путать номер струны и номер лада. Считаем от тонкой струны: 1-я — самая тонкая.</div>
      </article>
    </div>

    <div class="exercise" id="notes-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 01</div>
          <h2>Что это за нота?</h2>
          <p>Определи название выделенной точки. Октаву учитывать не нужно.</p>
        </div>
        <span class="exercise-stats" data-stats="notes"></span>
      </div>
      <div class="fret-scroll exercise-board">
        <div id="notes-quiz-board" class="fretboard" aria-label="Гриф с нотой для задания"></div>
      </div>
      <div class="quiz-status" id="notes-quiz-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="exercise-bottom">
        <div style="flex:1;min-width:260px">
          <div class="field-caption">ВЫБЕРИ ОТВЕТ</div>
          <div class="answer-row" id="notes-answers"></div>
          <p class="feedback" id="notes-feedback" aria-live="polite">Выбери один из вариантов.</p>
        </div>
        <button class="button button-ghost" id="notes-next" type="button">Другая нота <span>↗</span></button>
      </div>
    </div>

    <div class="exercise" id="notes-find-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 01-b</div>
          <h2>Найди ноту на грифе</h2>
          <p id="notes-find-prompt">Нажми на любой лад, где звучит нужная нота.</p>
        </div>
        <span class="exercise-stats" data-stats="notes-find"></span>
      </div>
      <div class="fret-scroll exercise-board">
        <div id="notes-find-board" class="fretboard" aria-label="Найди ноту на грифе"></div>
      </div>
      <div class="quiz-status" id="notes-find-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="notes-find-next" type="button">Следующая нота <span>↗</span></button>
          <p class="feedback" id="notes-find-feedback" aria-live="polite">Найди ноту на любом ладу.</p>
        </div>
        <span class="chip muted">Подсказка: смотри на открытые струны</span>
      </div>
    </div>
  `;

  fillSelect(byId("notes-root"), ROOTS.map((r) => ({ value: r, label: prettyNote(r) })), "C");
  fillSelect(byId("notes-scale"), SCALES.map((scale) => ({ value: scale.id, label: scale.name })), "major");

  byId("notes-root").addEventListener("change", renderBoard);
  byId("notes-scale").addEventListener("change", renderBoard);
  byId("notes-octave").addEventListener("change", () => {
    state.octave = byId("notes-octave").value;
    renderBoard();
  });
  byId("notes-notation").addEventListener("change", () => {
    state.notation = byId("notes-notation").value;
    renderBoard();
  });
  byId("notes-play-scale").addEventListener("click", () => {
    const root = byId("notes-root").value;
    const scale = getScale(byId("notes-scale").value);
    playSequence(scaleNoteList(root, scale).map((note) => note.midi), 0.3, 0.55);
  });
  document.querySelectorAll("[data-notes-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.notesMode;
      setSwitch("[data-notes-mode]", "data-notes-mode", state.mode);
      renderBoard();
    });
  });

  byId("notes-next").addEventListener("click", newQuiz);
  byId("notes-find-next").addEventListener("click", newFind);

  renderBoard();
  newQuiz();
  newFind();
}

function labelFor(name) {
  return state.notation === "solfege" ? SOLFEGE_RU[parseNote(name).letter] : prettyNote(name);
}

function renderBoard() {
  const root = byId("notes-root").value;
  const scale = getScale(byId("notes-scale").value);
  const octave = state.octave;
  const names = scaleNames(root, scale);
  const pcs = new Set(scalePcs(root, scale));
  const rootPc = parseNote(root).pc;

  const highlighted = [];
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = 0; fret <= 15; fret++) {
      const midi = STRINGS[string].midi + fret;
      if (octave !== "all" && midiOctave(midi) !== Number(octave)) continue;
      if (state.mode === "all" || pcs.has(mod(midi))) {
        highlighted.push({
          string, fret,
          kind: mod(midi) === rootPc ? "root" : "note",
        });
      }
    }
  }

  const nameLookup = Object.fromEntries(names.map((name) => [parseNote(name).pc, name]));
  const displayNames = {};
  Object.entries(nameLookup).forEach(([pc, name]) => { displayNames[pc] = labelFor(name); });
  if (state.notation === "solfege") {
    CHROMATIC.forEach((name, pc) => {
      if (!(pc in displayNames)) displayNames[pc] = SOLFEGE_RU[parseNote(name).letter];
    });
  }

  renderFretboard({
    container: "notes-board",
    highlighted,
    boxes: [],
    names: displayNames,
    status: "notes-status",
    clickable: true,
    showAll: state.mode === "all",
  });

  const notes = scaleNoteList(root, scale);
  byId("notes-summary").textContent = notes.map((note) => writtenNote(note.name, note.midi)).join(" · ");
  renderStaff("notes-staff", notes.slice(0, 8), { durations: notes.slice(0, 8).map(() => "q") });
}

function newQuiz() {
  const position = pickPosition(pool, state.quiz?.key);
  state.quiz = { ...position, answered: false };
  setFeedback("notes-feedback", "Выбери один из вариантов.");
  byId("notes-quiz-status").textContent = "Нажми на ноту ♫";

  renderFretboard({
    container: "notes-quiz-board",
    highlighted: [],
    questionKey: state.quiz.key,
    showAll: true,
    clickable: true,
    status: "notes-quiz-status",
  });

  const pcOptions = CHROMATIC.map((name, pc) => ({ value: pc, label: prettyNote(name) }));
  const correct = pcOptions[state.quiz.pc];
  unlockAnswers(byId("notes-answers"));
  answerButtons("notes-answers", makeOptions(correct, pcOptions), correct.value, (isCorrect) => {
    state.quiz.answered = true;
    record("notes", isCorrect);
    const answer = prettyNote(CHROMATIC[state.quiz.pc]);
    setFeedback(
      "notes-feedback",
      isCorrect ? `Верно! Это ${answer}.` : `Не совсем. Правильный ответ: ${answer}.`,
      isCorrect ? "success" : "error",
    );
    renderFretboard({
      container: "notes-quiz-board",
      highlighted: [{ string: state.quiz.string, fret: state.quiz.fret, kind: "root" }],
      showAll: true,
      clickable: true,
      status: "notes-quiz-status",
      onNoteClick: (position) => playNote(position.midi),
    });
  });
}

function newFind() {
  const pool2 = buildNotePool({ minFret: 0, maxFret: 12 });
  const target = pickPosition(pool2, state.find?.key);
  state.find = { ...target, answered: false };
  const name = CHROMATIC[state.find.pc];
  byId("notes-find-prompt").textContent = `Найди любую ноту ${prettyNote(name)} на грифе (лады 0–12).`;
  setFeedback("notes-find-feedback", `Нажми на лад, где звучит ${prettyNote(name)}.`);
  byId("notes-find-status").textContent = "Нажми на ноту ♫";

  const draw = (reveal = false) => renderFretboard({
    container: "notes-find-board",
    highlighted: reveal ? [{ string: state.find.string, fret: state.find.fret, kind: "root" }] : [],
    showAll: true,
    hideLabels: true,
    clickable: true,
    status: "notes-find-status",
    onNoteClick: (position) => {
      if (state.find.answered) return;
      const correct = position.pc === state.find.pc;
      state.find.answered = true;
      record("notes-find", correct);
      const right = bestPosition(state.find.midi);
      setFeedback(
        "notes-find-feedback",
        correct
          ? `Верно! ${prettyNote(name)} звучит и здесь, и на ${right.string + 1}-й струне, ${right.fret}-м ладу.`
          : `Не совсем: на ${position.string + 1}-й струне, ${position.fret}-м ладу — ${prettyNote(CHROMATIC[position.pc])}. Правильно, например: ${right.string + 1}-я струна, ${right.fret}-й лад.`,
        correct ? "success" : "error",
      );
      draw(true);
    },
  });

  draw(false);
}

export function onShow() {
  // При открытии раздела обновляем статистику (общая плашка уже обновляется).
  const stats = getStats("notes");
  const el = document.querySelector('#view-notes [data-stats="notes"]');
  if (el) el.textContent = `${stats.correct} верно · ${stats.mistakes} ошибок`;
}
