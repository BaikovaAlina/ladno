/*
 * 03. ТРЕЗВУЧИЯ
 * Типы трезвучий, обращения, аппликатуры на грифе, сборка аккорда кликами.
 */
import {
  ROOTS, STRINGS, mod, parseNote, prettyNote, writtenNote,
} from "../../core/notes.js";
import {
  TRIADS, getTriad, makeChord, inversionName, findVoicings, chordInversionsVoicings,
  voicingsOnString,
} from "../../core/chords.js";
import { playChord, strum } from "../../core/audio.js";
import { byId, fillSelect, setFeedback } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderChordStaff } from "../staff.js";
import { record } from "../state.js";

const state = {
  selected: new Set(),
  quiz: null,
  inversion: 0,
  shape: 0,
  listenerBound: false,
};

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> СТРОИМ ПО ТЕРЦИЯМ</div>
          <h2>Трезвучие на грифе</h2>
          <p>Три ноты, из которых получается аккорд. Корень — тёмный круг.</p>
        </div>
        <button class="button button-dark" id="triad-play" type="button"><span>▶</span> Слушать аккорд</button>
      </div>

      <div class="controls">
        <label>Корень <select id="triad-root"></select></label>
        <label>Тип <select id="triad-type"></select></label>
        <label>Обращение <select id="triad-inversion">
          <option value="0">Основной вид</option>
          <option value="1">1-е обращение</option>
          <option value="2">2-е обращение</option>
        </select></label>
        <label>Аппликатура <select id="triad-shape"></select></label>
        <button class="button button-ghost" id="triad-show-inversions" type="button">Все обращения по грифу <span>↗</span></button>
      </div>

      <div class="fret-scroll">
        <div id="triad-board" class="fretboard" aria-label="Трезвучие на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> корень</span>
          <span><i class="legend-note"></i> остальные ноты</span>
        </div>
        <span id="triad-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="score-block">
        <div>
          <div class="overline">СОСТАВ И ЗАПИСЬ</div>
          <strong id="triad-summary"></strong>
          <p id="triad-inversion-text"></p>
        </div>
        <div id="triad-staff" class="staff" aria-label="Трезвучие на стане"></div>
      </div>

      <div class="voicing-grid" id="triad-voicings"></div>
      <p class="notation-note">Аппликатуры подобраны автоматически: ноты звучат одновременно, по одной на струну, с удобным охватом ладов.</p>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ЧЕТЫРЕ ТИПА</div>
        <h2>Мажор, минор, <em>ум и ув.</em></h2>
      </div>
      <span class="reading-time">≈ 4 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid two" id="triad-cards"></div>

    <div class="exercise" id="triad-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 03</div>
          <h2>Собери аккорд на грифе</h2>
          <p id="triad-quiz-prompt">Выбери три ноты нужного аккорда — по одной на каждую ступень.</p>
        </div>
        <span class="exercise-stats" data-stats="triad"></span>
      </div>
      <p class="task-hint">Можно брать любые октавы: важно, чтобы все три звука были разными и точно из аккорда. Повторный клик снимает выбор.</p>
      <div class="fret-scroll exercise-board">
        <div id="triad-quiz-board" class="fretboard" aria-label="Собери трезвучие"></div>
      </div>
      <div class="quiz-status" id="triad-quiz-status" aria-live="polite">Нажми на ноты ♫</div>
      <div class="selected-line">Выбрано: <strong id="triad-picked">пока ничего</strong></div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="triad-check" type="button">Проверить <span>↗</span></button>
          <p class="feedback" id="triad-feedback" aria-live="polite">Выбери три ноты на грифе.</p>
        </div>
        <div class="button-row">
          <button class="button button-ghost" id="triad-reset" type="button">Сбросить выбор</button>
          <button class="button button-ghost" id="triad-next" type="button">Новый аккорд <span>↗</span></button>
        </div>
      </div>
    </div>
  `;

  fillSelect("triad-root", ROOTS.map((r) => ({ value: r, label: prettyNote(r) })), "C");
  fillSelect("triad-type", TRIADS.map((item) => ({ value: item.id, label: `${item.name} (${item.symbol || "без знака"})` })), "major");
  renderCards();

  ["triad-root", "triad-type", "triad-inversion"].forEach((id) => {
    byId(id).addEventListener("change", () => {
      state.inversion = Number(byId("triad-inversion").value);
      renderTriad(true);
    });
  });
  byId("triad-shape").addEventListener("change", () => {
    state.shape = Number(byId("triad-shape").value) || 0;
    renderTriad(false);
  });
  byId("triad-play").addEventListener("click", playCurrent);
  byId("triad-show-inversions").addEventListener("click", showAllInversions);

  byId("triad-check").addEventListener("click", checkQuiz);
  byId("triad-reset").addEventListener("click", () => {
    state.selected.clear();
    drawQuiz();
    setFeedback("triad-feedback", "Выбери три ноты на грифе.");
  });
  byId("triad-next").addEventListener("click", newQuiz);

  renderTriad(true);
  newQuiz();
}

function renderCards() {
  byId("triad-cards").innerHTML = TRIADS.map((type, index) => `
    <article class="lesson-card">
      <span class="card-no">${String(index + 1).padStart(2, "0")} <span>↗</span></span>
      <h3>${type.name} трезвучие ${type.symbol ? `(${type.symbol})` : ""}</h3>
      <p>${type.description}</p>
      <div class="card-example">${type.offsets.join(" + ")} полутонов <span>${type.offsets[2]} от корня</span></div>
      <div class="plain-block"><b>На пальцах:</b> ${type.tip}</div>
      <div class="mistake-block"><b>Типичная ошибка:</b> ${type.mistake}</div>
    </article>`).join("");
}

let current = null;

function renderTriad(resetShape = true) {
  const root = byId("triad-root").value;
  const type = getTriad(byId("triad-type").value);
  const inversion = state.inversion;
  const chord = makeChord(root, type, inversion);
  const inversions = chordInversionsVoicings(root, type);
  const chosen = inversions[inversion]?.voicing || findVoicings(chord.notes)[0] || null;

  current = { root, type, inversion, chord, voicing: chosen };

  // Заполняем список аппликатур: основной вид + 4-я/5-я струны + альтернативы.
  const variants = [];
  const seen = new Set();
  const pushVariant = (voicing, label) => {
    if (!voicing) return;
    const key = voicing.positions.map((p) => p.key).join("|");
    if (seen.has(key)) return;
    seen.add(key);
    variants.push({ voicing, label });
  };
  chordInversionsVoicings(root, type).forEach((item) => {
    pushVariant(item.voicing, item.inversion === 0 ? "Основной вид" : `${item.inversion + 1}-е обращение`);
  });
  voicingsOnString(root, type, 4, 2).forEach((voicing, index) => pushVariant(voicing, `На 5-й струне${index ? " (вариант " + (index + 1) + ")" : ""}`));
  voicingsOnString(root, type, 3, 2).forEach((voicing, index) => pushVariant(voicing, `На 4-й струне${index ? " (вариант " + (index + 1) + ")" : ""}`));
  findVoicings(chord.notes).forEach((voicing, index) => pushVariant(voicing, `Вариант ${index + 1}`));

  const shapeSelect = byId("triad-shape");
  shapeSelect.innerHTML = variants.map((variant, index) =>
    `<option value="${index}">${variant.label}: ${variant.voicing.label}</option>`).join("");
  // Сохраняем выбранную аппликатуру, если она ещё существует.
  // При смене корня или типа сбрасываемся на первый (самый удобный) вариант.
  const index = resetShape ? 0 : Math.min(state.shape, variants.length - 1);
  state.shape = index;
  shapeSelect.value = String(index);

  const voicing = variants[index]?.voicing || chosen;
  if (voicing) current.voicing = voicing;

  const names = {};
  chord.names.forEach((name) => { names[parseNote(name).pc] = name; });
  const highlighted = voicing
    ? voicing.positions.map((position) => ({
        string: position.string,
        fret: position.fret,
        kind: mod(position.midi) === parseNote(root).pc ? "root" : "note",
        label: names[mod(position.midi)] ? prettyNote(names[mod(position.midi)]) : undefined,
      }))
    : [];

  renderFretboard({
    container: "triad-board",
    highlighted,
    showAll: false,
    names,
    status: "triad-status",
    clickable: true,
  });

  byId("triad-summary").textContent =
    `${chord.symbol}: ${chord.notes.map((note) => writtenNote(note.name, note.midi)).join(" – ")}`;
  byId("triad-inversion-text").textContent = `${inversionName(chord, inversion)}. Аппликатура: ${voicing ? voicing.positions.map((p) => p.fret === 0 ? "0" : p.fret).join("-") : "не найдена"}.`;
  renderChordStaff("triad-staff", chord.notes, { ariaLabel: `${chord.symbol} на стане` });

  byId("triad-voicings").innerHTML = variants.slice(0, 6).map((variant, index) => `
    <div class="voicing-card">
      <div class="voicing-title">${variant.label}</div>
      <div class="fingering">${variant.voicing.positions.map((p) => p.fret === 0 ? "0" : p.fret).join(" — ")}<small>лады</small></div>
      <p>${variant.voicing.positions.map((p) => `${p.string + 1}-я: ${prettyNote(names[mod(p.midi)] || "?")}`).join(" · ")}</p>
    </div>`).join("");
}

function playCurrent() {
  if (!current?.voicing) return;
  const midis = current.voicing.positions.map((p) => p.midi);
  strum(midis, 1.6);
}

function showAllInversions() {
  const root = byId("triad-root").value;
  const type = getTriad(byId("triad-type").value);
  const all = chordInversionsVoicings(root, type);
  const names = {};
  all.forEach(({ chord }) => chord.names.forEach((name) => { names[parseNote(name).pc] = name; }));
  const highlighted = all.flatMap(({ voicing }) =>
    voicing ? voicing.positions.map((p) => ({
      string: p.string, fret: p.fret, kind: "note",
    })) : []);
  renderFretboard({
    container: "triad-board",
    highlighted,
    names,
    showAll: false,
    status: "triad-status",
  });
  setFeedback("triad-feedback", `Показаны все обращения ${prettyNote(root)}${type.symbol}: ${all.map((item) => item.inversion === 0 ? "основной" : `${item.inversion + 1}-е`).join(", ")}.`);
}

/* ------------------------------------------------------------------ */
/*  Упражнение                                                         */
/* ------------------------------------------------------------------ */

function newQuiz() {
  const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
  const type = TRIADS[Math.floor(Math.random() * TRIADS.length)];
  const chord = makeChord(root, type);
  state.selected.clear();
  state.quiz = { root, type, chord, answered: false };
  byId("triad-quiz-prompt").textContent =
    `Собери ${type.name.toLowerCase()} трезвучие от ${prettyNote(root)}${type.symbol ? ` (${type.symbol})` : ""}: нужны ${chord.names.map(prettyNote).join(", ")}.`;
  setFeedback("triad-feedback", "Выбери три ноты на грифе.");
  drawQuiz();
}

function drawQuiz() {
  const quiz = state.quiz;
  if (!quiz) return;
  const names = {};
  quiz.chord.names.forEach((name) => { names[parseNote(name).pc] = name; });
  renderFretboard({
    container: "triad-quiz-board",
    highlighted: [],
    selected: [...state.selected],
    showAll: true,
    names,
    clickable: true,
    status: "triad-quiz-status",
    onNoteClick: (position) => {
      if (quiz.answered) return;
      if (state.selected.has(position.key)) state.selected.delete(position.key);
      else state.selected.add(position.key);
      drawQuiz();
    },
  });
  byId("triad-picked").textContent = state.selected.size
    ? `${state.selected.size} из 3`
    : "пока ничего";
}

function checkQuiz() {
  const quiz = state.quiz;
  if (!quiz || quiz.answered) return;
  if (state.selected.size !== 3) {
    setFeedback("triad-feedback", `Нужно ровно три ноты, а выбрано ${state.selected.size}.`, "error");
    return;
  }
  const pcs = [...state.selected].map((key) => {
    const [string, fret] = key.split(":").map(Number);
    return mod(fret + STRINGS[string].midi);
  });
  const wanted = quiz.chord.pcs;
  const correct =
    [...new Set(pcs)].length === 3 &&
    [...new Set(pcs)].every((pc) => wanted.includes(pc)) &&
    wanted.every((pc) => pcs.includes(pc));
  quiz.answered = true;
  record("triad", correct);
  const played = pcs.map((pc) => 60 + pc);
  if (correct) playChord(played, 1.4);
  setFeedback(
    "triad-feedback",
    correct
      ? `Верно! ${quiz.chord.symbol} = ${quiz.chord.names.map(prettyNote).join(" – ")}.`
      : `Не совсем. Нужны ${quiz.chord.names.map(prettyNote).join(" – ")}. Сыграй ещё раз и послушай, как звучит аккорд в сборе.`,
    correct ? "success" : "error",
  );
  // Показываем правильную аппликатуру — так ученик видит ответ.
  const inversion = chordInversionsVoicings(quiz.root, quiz.type)[0];
  const names = {};
  quiz.chord.names.forEach((name) => { names[parseNote(name).pc] = name; });
  renderFretboard({
    container: "triad-quiz-board",
    highlighted: inversion?.voicing
      ? inversion.voicing.positions.map((p) => ({ string: p.string, fret: p.fret, kind: "note" }))
      : [],
    selected: [...state.selected],
    showAll: true,
    names,
    clickable: false,
    status: "triad-quiz-status",
  });
}
