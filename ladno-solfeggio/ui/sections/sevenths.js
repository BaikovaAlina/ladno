/*
 * 04. СЕПТАККОРДЫ
 * Шесть типов, все обращения, аппликатуры на 4-й и 5-й струнах,
 * «покажи все обращения по грифу» и определение аккорда по звучанию.
 */
import { ROOTS, mod, parseNote, prettyNote, writtenNote } from "../../core/notes.js";
import {
  SEVENTHS, getSeventh, makeChord, inversionName, chordInversionsVoicings,
  voicingsOnString, findVoicings,
} from "../../core/chords.js";
import { playChord, strum } from "../../core/audio.js";
import { answerButtons, byId, fillSelect, makeOptions, setFeedback, unlockAnswers } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderChordStaff } from "../staff.js";
import { record } from "../state.js";

const state = { inversion: 0, shape: 0, quiz: null };

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ЧЕТЫРЕ ЗВУКА</div>
          <h2>Септаккорд на грифе</h2>
          <p>Четыре ноты: трезвучие плюс септима. Она и создаёт характер.</p>
        </div>
        <button class="button button-dark" id="seventh-play" type="button"><span>▶</span> Слушать аккорд</button>
      </div>

      <div class="controls">
        <label>Корень <select id="seventh-root"></select></label>
        <label>Тип <select id="seventh-type"></select></label>
        <label>Обращение <select id="seventh-inversion">
          <option value="0">Основной вид</option>
          <option value="1">1-е (терция в басу)</option>
          <option value="2">2-е (квинта в басу)</option>
          <option value="3">3-е (септима в басу)</option>
        </select></label>
        <label>Аппликатура <select id="seventh-shape"></select></label>
      </div>
      <div class="button-row" style="margin:-4px 0 10px">
        <button class="button button-ghost button-small" id="seventh-show-inversions" type="button">Все обращения по грифу <span>↗</span></button>
        <button class="button button-ghost button-small" id="seventh-on-5" type="button">Только 5-я струна</button>
        <button class="button button-ghost button-small" id="seventh-on-4" type="button">Только 4-я струна</button>
      </div>

      <div class="fret-scroll">
        <div id="seventh-board" class="fretboard" aria-label="Септаккорд на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> корень</span>
          <span><i class="legend-note"></i> остальные ноты</span>
        </div>
        <span id="seventh-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="score-block">
        <div>
          <div class="overline">СОСТАВ И ЗАПИСЬ</div>
          <strong id="seventh-summary"></strong>
          <p id="seventh-inversion-text"></p>
        </div>
        <div id="seventh-staff" class="staff" aria-label="Септаккорд на стане"></div>
      </div>

      <div class="voicing-grid" id="seventh-voicings"></div>
      <p class="notation-note">Все обращения строятся автоматически: 1-е — терция в басу, 2-е — квинта, 3-е — септима.</p>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ШЕСТЬ КРАСОК</div>
        <h2>От мягкого maj7 <em>до острого °7.</em></h2>
      </div>
      <span class="reading-time">≈ 5 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three" id="seventh-cards"></div>

    <details class="reference">
      <summary>Аппликатуры на 4-й и 5-й струнах для всех обращений <span>＋</span></summary>
      <p>Одна и та же аппликатура переносится по грифу — меняется только корень. Ниже — готовые варианты для выбранного аккорда.</p>
      <div class="voicing-grid" id="seventh-strings"></div>
    </details>

    <div class="exercise" id="seventh-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 04</div>
          <h2>Определи септаккорд по звучанию</h2>
          <p>Послушай аккорд и выбери его тип. Обрати внимание на септиму: она решает всё.</p>
        </div>
        <span class="exercise-stats" data-stats="seventhEar"></span>
      </div>
      <div class="ear-controls">
        <button class="button button-dark" id="seventh-quiz-play" type="button"><span>▶</span> Слушать</button>
        <button class="button button-ghost" id="seventh-next" type="button">Новый аккорд <span>↻</span></button>
      </div>
      <div class="answer-row" id="seventh-answers" style="margin-top:14px"></div>
      <p class="feedback" id="seventh-feedback" aria-live="polite">Сначала послушай аккорд, затем выбери тип.</p>
    </div>
  `;

  fillSelect("seventh-root", ROOTS.map((r) => ({ value: r, label: prettyNote(r) })), "G");
  fillSelect("seventh-type", SEVENTHS.map((item) => ({ value: item.id, label: `${item.name} · ${item.symbol}` })), "dom7");

  renderCards();

  ["seventh-root", "seventh-type", "seventh-inversion"].forEach((id) => {
    byId(id).addEventListener("change", () => {
      state.inversion = Number(byId("seventh-inversion").value);
      renderSeventh(true);
    });
  });
  byId("seventh-shape").addEventListener("change", () => {
    state.shape = Number(byId("seventh-shape").value) || 0;
    renderSeventh(false);
  });
  byId("seventh-play").addEventListener("click", () => {
    if (current?.voicing) strum(current.voicing.positions.map((p) => p.midi), 1.8);
  });
  byId("seventh-show-inversions").addEventListener("click", () => showInversions(null));
  byId("seventh-on-5").addEventListener("click", () => showInversions(4));
  byId("seventh-on-4").addEventListener("click", () => showInversions(3));

  byId("seventh-next").addEventListener("click", newQuiz);
  byId("seventh-quiz-play").addEventListener("click", () => {
    if (state.quiz) strum(state.quiz.midis, 1.7);
  });

  renderSeventh(true);
  newQuiz();
}

function renderCards() {
  byId("seventh-cards").innerHTML = SEVENTHS.map((type, index) => `
    <article class="lesson-card">
      <span class="card-no">${String(index + 1).padStart(2, "0")} <span>↗</span></span>
      <h3>${type.name}</h3>
      <p>${type.description}</p>
      <div class="card-example">${type.symbol} <span>${type.offsets.map((n) => n).join(" + ")}</span></div>
      <div class="plain-block"><b>На пальцах:</b> ${type.tip}</div>
      <div class="mistake-block"><b>Типичная ошибка:</b> ${type.mistake}</div>
    </article>`).join("");
}

let current = null;

function renderSeventh(resetShape = true) {
  const root = byId("seventh-root").value;
  const type = getSeventh(byId("seventh-type").value);
  const inversion = state.inversion;
  const chord = makeChord(root, type, inversion);
  const inversions = chordInversionsVoicings(root, type);

  const variants = [];
  const seen = new Set();
  const pushVariant = (voicing, label) => {
    if (!voicing) return;
    const key = voicing.positions.map((p) => p.key).join("|");
    if (seen.has(key)) return;
    seen.add(key);
    variants.push({ voicing, label });
  };
  inversions.forEach((item) => {
    pushVariant(item.voicing, item.inversion === 0 ? "Основной вид" : `${item.inversion}-е обращение`);
  });
  voicingsOnString(root, type, 4).forEach((voicing, index) => pushVariant(voicing, `5-я струна${index ? " · " + (index + 1) : ""}`));
  voicingsOnString(root, type, 3).forEach((voicing, index) => pushVariant(voicing, `4-я струна${index ? " · " + (index + 1) : ""}`));
  findVoicings(chord.notes).forEach((voicing, index) => pushVariant(voicing, `Вариант ${index + 1}`));

  const shapeSelect = byId("seventh-shape");
  shapeSelect.innerHTML = variants.map((variant, index) =>
    `<option value="${index}">${variant.label}: ${variant.voicing.label}</option>`).join("");
  const index = resetShape ? 0 : Math.min(state.shape, Math.max(0, variants.length - 1));
  state.shape = index;
  shapeSelect.value = String(index);

  const voicing = variants[index]?.voicing || findVoicings(chord.notes)[0] || null;
  current = { root, type, inversion, chord, voicing, variants, inversions };

  const names = {};
  chord.names.forEach((name) => { names[parseNote(name).pc] = name; });
  const highlighted = voicing
    ? voicing.positions.map((p) => ({
        string: p.string, fret: p.fret,
        kind: mod(p.midi) === parseNote(root).pc ? "root" : "note",
        label: names[mod(p.midi)] ? prettyNote(names[mod(p.midi)]) : undefined,
      }))
    : [];

  renderFretboard({ container: "seventh-board", highlighted, names, showAll: false, status: "seventh-status" });

  byId("seventh-summary").textContent =
    `${chord.symbol}: ${chord.notes.map((note) => writtenNote(note.name, note.midi)).join(" – ")}`;
  byId("seventh-inversion-text").textContent =
    `${inversionName(chord, inversion)}. Аппликатура: ${voicing ? voicing.positions.map((p) => p.fret === 0 ? "0" : p.fret).join("-") : "не найдена"}.`;
  renderChordStaff("seventh-staff", chord.notes, { ariaLabel: `${chord.symbol} на стане` });

  byId("seventh-voicings").innerHTML = variants.slice(0, 8).map((variant) => `
    <div class="voicing-card">
      <div class="voicing-title">${variant.label}</div>
      <div class="fingering">${variant.voicing.positions.map((p) => p.fret === 0 ? "0" : p.fret).join(" — ")}<small>лады</small></div>
      <p>${variant.voicing.positions.map((p) => `${p.string + 1}-я: ${prettyNote(names[mod(p.midi)] || "?")}`).join(" · ")}</p>
    </div>`).join("");

  // Аппликатуры только на 4-й и 5-й струнах — для раскрывающегося блока.
  const stringsBlock = byId("seventh-strings");
  if (stringsBlock) {
    const only = [
      ...voicingsOnString(root, type, 4, 3).map((voicing) => ({ voicing, label: "5-я струна" })),
      ...voicingsOnString(root, type, 3, 3).map((voicing) => ({ voicing, label: "4-я струна" })),
    ];
    stringsBlock.innerHTML = only.length
      ? only.map(({ voicing: v, label }) => `
        <div class="voicing-card">
          <div class="voicing-title">${label} · ${chord.symbol}</div>
          <div class="fingering">${v.positions.map((p) => p.fret === 0 ? "0" : p.fret).join(" — ")}<small>лады</small></div>
          <p>${v.positions.map((p) => `${p.string + 1}-я: ${prettyNote(names[mod(p.midi)] || "?")}`).join(" · ")}</p>
        </div>`).join("")
      : `<p style="color:var(--muted);font-size:11px">Для этого обращения удобной аппликатуры с басом на 4-й или 5-й струне не нашлось. Возьми другой вариант в списке сверху.</p>`;
  }
}

function showInversions(stringIndex) {
  const root = byId("seventh-root").value;
  const type = getSeventh(byId("seventh-type").value);
  const all = chordInversionsVoicings(root, type);
  const names = {};
  all.forEach(({ chord }) => chord.names.forEach((name) => { names[parseNote(name).pc] = name; }));
  const filtered = stringIndex == null
    ? all
    : all.filter((item) => item.voicing && item.voicing.positions[0].string === stringIndex);
  const highlighted = filtered.flatMap((item) =>
    item.voicing ? item.voicing.positions.map((p) => ({ string: p.string, fret: p.fret, kind: "note" })) : []);
  renderFretboard({ container: "seventh-board", highlighted, names, showAll: false, status: "seventh-status" });
  setFeedback(
    "seventh-feedback",
    filtered.length
      ? `Показаны ${stringIndex == null ? "все обращения" : `обращения с басом на ${stringIndex + 1}-й струне`}: ${filtered.map((item) => item.inversion === 0 ? "основной" : `${item.inversion}-е`).join(", ")}.`
      : `С басом на ${stringIndex + 1}-й струне удобных вариантов нет — попробуй другое обращение.`,
    filtered.length ? "" : "error",
  );
}

function newQuiz() {
  const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
  const type = SEVENTHS[Math.floor(Math.random() * SEVENTHS.length)];
  const inversion = Math.floor(Math.random() * 4);
  const chord = makeChord(root, type, inversion);
  const voicing = findVoicings(chord.notes)[0];
  const midis = voicing ? voicing.positions.map((p) => p.midi) : chord.notes.map((n) => n.midi);
  state.quiz = { root, type, chord, midis, inversion };
  const pool = SEVENTHS.map((item) => ({ value: item.id, label: `${item.symbol} — ${item.name}` }));
  unlockAnswers("seventh-answers");
  answerButtons("seventh-answers", makeOptions(pool.find((item) => item.value === type.id), pool), type.id, (correct) => {
    record("seventhEar", correct);
    setFeedback(
      "seventh-feedback",
      correct
        ? `Верно! ${prettyNote(root)}${type.symbol} — ${type.description}`
        : `Это ${prettyNote(root)}${type.symbol} (${type.name}). ${type.description}`,
      correct ? "success" : "error",
    );
  });
  setFeedback("seventh-feedback", "Нажми «Слушать», затем выбери тип.");
}
