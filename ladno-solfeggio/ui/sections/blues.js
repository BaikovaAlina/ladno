/*
 * 10. БЛЮЗОВЫЕ ГАММЫ И БЛЮЗОВЫЙ ЗВУК
 *
 * Минорная блюзовая = минорная пентатоника + ♭5,
 * мажорная блюзовая = мажорная пентатоника + ♭3.
 * Гриф с тремя цветами (корень / пентатоника / блюзовая нота),
 * 12-тактовый блюз в A и E, три упражнения.
 */
import {
  ROOTS, STRINGS, bestPosition, mod, parseNote, prettyNote, pentatonicBoxes,
} from "../../core/notes.js";
import {
  BLUES_TYPES, getScale, scaleNames, scaleNoteList, twelveBarBlues,
} from "../../core/scales.js";
import { makeChord, getSeventh, findVoicings } from "../../core/chords.js";
import { playSequence, playProgressionAudio, strum, playEvents } from "../../core/audio.js";
import { byId, fillSelect, setFeedback } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderStaff } from "../staff.js";
import { record } from "../state.js";

const state = {
  type: "minor",
  showBoxes: false,
  find: null,
  selected: new Set(),
  ear: null,
  chordQuiz: null,
  chordChoices: [],
  bluesPlaying: false,
};

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> БЛЮЗОВЫЙ ЗВУК</div>
          <h2>Блюзовая гамма на грифе</h2>
          <p>Корень — тёмный, пентатоника — зелёная, <span style="color:var(--blue-note);font-weight:800">блюзовая нота — красная</span>.</p>
        </div>
        <button class="button button-dark" id="blues-play-scale" type="button"><span>▶</span> Слушать гамму</button>
      </div>

      <div class="controls">
        <label>Тоника <select id="blues-root"></select></label>
        <label>Тип <select id="blues-type">
          <option value="minor">Минорная блюзовая (1 ♭3 4 ♭5 5 ♭7)</option>
          <option value="major">Мажорная блюзовая (1 2 ♭3 3 5 6)</option>
        </select></label>
        <button class="button button-ghost" id="blues-blue-only" type="button">Услышать блюзовую ноту</button>
        <div class="switch" role="group" aria-label="Позиции">
          <button type="button" id="blues-boxes-toggle" aria-pressed="false">Показать боксы</button>
        </div>
      </div>

      <div class="fret-scroll">
        <div id="blues-board" class="fretboard" aria-label="Блюзовая гамма на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> тоника</span>
          <span><i class="legend-note"></i> пентатоника</span>
          <span><i class="legend-blue"></i> блюзовая нота</span>
        </div>
        <span id="blues-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="info-strip" id="blues-degrees"></div>
      <div class="plain-block" id="blues-tip" style="margin-top:12px"></div>
      <div class="mistake-block" id="blues-mistake"></div>

      <div class="score-block">
        <div>
          <div class="overline">ГАММА НА СТАНЕ</div>
          <strong id="blues-summary"></strong>
          <p>Блюзовая нота выделена: именно она создаёт «грязный» оттенок.</p>
        </div>
        <div id="blues-staff" class="staff" aria-label="Блюзовая гамма на стане"></div>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ТЕОРИЯ</div>
        <h2>Одна нота, <em>которая всё меняет.</em></h2>
      </div>
      <span class="reading-time">≈ 6 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">01 <span>↗</span></span>
        <h3>Минорная блюзовая</h3>
        <p>Это <strong>минорная пентатоника + ♭5</strong>. В A: A C D E♭ E G. Нота E♭ — «блюзовая», она находится между 4 и 5 ступенями.</p>
        <div class="card-example">1 ♭3 4 ♭5 5 ♭7 <span>A C D E♭ E G</span></div>
        <div class="plain-block"><b>На пальцах:</b> 4-я струна: 1-й лад (E♭) и 2-й лад (E). Сыграй их подряд — это и есть блюзовая интонация. 5-я струна: 3-й лад (C), 5-й (D).</div>
        <div class="mistake-block"><b>Типичная ошибка новичка:</b> держать ♭5 как полноценную ступень. Это проходящая нота: сыграл — сразу вернулся на 5 (или 4). Иначе звучит «фальшиво».</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">02 <span>↗</span></span>
        <h3>Мажорная блюзовая</h3>
        <p>Это <strong>мажорная пентатоника + ♭3</strong>. В A: A B C C♯ E F♯. Здесь «грязная» нота — C, она трётся о C♯.</p>
        <div class="card-example">1 2 ♭3 3 5 6 <span>A B C C♯ E F♯</span></div>
        <div class="plain-block"><b>На пальцах:</b> 2-я струна: 1-й лад (C) и 2-й лад (C♯). Играй C как короткий «подъезд» к C♯ — получится рокабилли.</div>
        <div class="mistake-block"><b>Типичная ошибка новичка:</b> играть мажорную блюзовую поверх минорного аккорда. Она создана для мажорных и доминантовых аккордов (A7, E7).</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">03 <span>↗</span></span>
        <h3>Зачем нужна блюзовая нота</h3>
        <p>Она создаёт <strong>напряжение между двумя устойчивыми ступенями</strong>. В миноре это ♭5 между 4 и 5, в мажоре — ♭3 между 2 и 3. Это не «ошибка», а краска.</p>
        <div class="card-example">E♭ между D и E <span>напряжение → разрешение</span></div>
        <div class="plain-block"><b>На пальцах:</b> на 4-й струне сыграй D (0-й лад), E♭ (1-й лад), E (2-й лад) — и обратно. Услышишь, как «грязь» просит разрешения.</div>
        <div class="mistake-block"><b>Типичная ошибка новичка:</b> бояться блюзовой ноты. Без неё блюз звучит как обычная пентатоника — вежливо и пресно.</div>
      </article>
    </div>

    <div class="theory-grid two" style="margin-top:12px">
      <article class="lesson-card">
        <h3>Как обыгрывать ♭5</h3>
        <p><strong>Бенд:</strong> из E♭ тяни в E — классический блюзовый ход. <strong>Слайд:</strong> съезжай с E♭ на E или D. <strong>Возврат:</strong> сыграй ♭5 и разреши в 4 или 5 — не оставайся на ней.</p>
        <div class="plain-block"><b>На пальцах:</b> 4-я струна, 1-й лад → бенд до 2-го лада. Или слайд с 1-го на 2-й. Или E♭ → D (0-й лад).</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> заканчивать фразу на ♭5. Разрешение обязательно — иначе фраза «висит».</div>
      </article>
      <article class="lesson-card">
        <h3>12 тактов: где что играть</h3>
        <p>В A-блюзе играй A-минорную блюзовую поверх всех трёх аккордов. В 9–10-м тактах (E7–D7) добавь движение к ♭5 и обратно — это классическая кульминация.</p>
        <div class="card-example">A7 · D7 · E7 <span>I–IV–V</span></div>
        <div class="plain-block"><b>На пальцах:</b> на E7 подчеркни G♯ (3-я струна, 1-й лад) — это терция доминанты.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> играть строго по гамме во всех тактах. Слушай аккорд и подчёркивай его терцию.</div>
      </article>
    </div>

    <!-- 12 тактов -->
    <div class="panel board-panel" style="margin-top:22px">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ФОРМА</div>
          <h2>12-тактовый блюз в A и E</h2>
          <p>Схема I–IV–V. Нажми на такт, чтобы услышать аккорд, или проиграй все двенадцать.</p>
        </div>
        <div class="button-row">
          <select id="blues-key" aria-label="Тоника блюза">
            <option value="A" selected>A</option>
            <option value="E">E</option>
          </select>
          <select id="blues-tempo" aria-label="Темп">
            <option value="76">76 BPM</option>
            <option value="90" selected>90 BPM</option>
            <option value="104">104 BPM</option>
          </select>
        </div>
      </div>
      <div class="chord-row" id="blues-bars" style="grid-template-columns:repeat(6,minmax(0,1fr))"></div>
      <div class="button-row" style="margin-top:10px">
        <button class="button button-dark" id="blues-play-12" type="button"><span>▶</span> Слушать 12 тактов</button>
        <button class="button button-ghost" id="blues-play-with-scale" type="button">Аккорды + блюзовая гамма</button>
      </div>
      <div class="fret-scroll" style="margin-top:12px">
        <div id="blues-chords-board" class="fretboard" aria-label="Аппликатуры блюзовых аккордов"></div>
      </div>
    </div>

    <!-- Упражнение 1 -->
    <div class="exercise" id="blues-note-quiz">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 10</div>
          <h2>Найди блюзовую ноту в позиции</h2>
          <p id="blues-note-prompt">Нажми на лад, где звучит блюзовая нота.</p>
        </div>
        <span class="exercise-stats" data-stats="bluesNote"></span>
      </div>
      <div class="fret-scroll exercise-board">
        <div id="blues-note-board" class="fretboard" aria-label="Найди блюзовую ноту"></div>
      </div>
      <div class="quiz-status" id="blues-note-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="blues-note-next" type="button">Новая позиция <span>↗</span></button>
          <p class="feedback" id="blues-note-feedback" aria-live="polite">Блюзовая нота — ♭5 в минорной или ♭3 в мажорной гамме.</p>
        </div>
        <span class="chip muted" id="blues-note-hint"></span>
      </div>
    </div>

    <!-- Упражнение 2 -->
    <div class="exercise" id="blues-build-quiz">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 10-b</div>
          <h2>Собери блюзовую гамму</h2>
          <p id="blues-build-prompt">Выбери все ноты блюзовой гаммы — по одному разу каждую.</p>
        </div>
        <span class="exercise-stats" data-stats="bluesBuild"></span>
      </div>
      <p class="task-hint">Шесть нот, включая блюзовую. Если забудешь ♭5 — увидишь, что именно пропустил.</p>
      <div class="fret-scroll exercise-board">
        <div id="blues-build-board" class="fretboard" aria-label="Собери блюзовую гамму"></div>
      </div>
      <div class="quiz-status" id="blues-build-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="selected-line">Выбрано: <strong id="blues-build-picked">пока ничего</strong></div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="blues-build-check" type="button">Проверить <span>↗</span></button>
          <p class="feedback" id="blues-build-feedback" aria-live="polite">Выбирай ноты на грифе.</p>
        </div>
        <div class="button-row">
          <button class="button button-ghost" id="blues-build-reset" type="button">Заново</button>
          <button class="button button-ghost" id="blues-build-next" type="button">Новая гамма <span>↗</span></button>
        </div>
      </div>
    </div>

    <!-- Упражнение 3 -->
    <div class="exercise" id="blues-chord-quiz">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 10-c</div>
          <h2>12-тактовый блюз: собери аккорды I–IV–V</h2>
          <p>Расставь аккорды по тактам. Подсказка: 9-й такт — V, 10-й — IV, 11-й снова I.</p>
        </div>
        <span class="exercise-stats" data-stats="bluesChords"></span>
      </div>
      <div class="field-row" style="margin-top:12px">
        <label>Тоника <select id="blues-quiz-root"><option value="A">A</option><option value="E">E</option><option value="G">G</option><option value="D">D</option></select></label>
        <button class="button button-dark" id="blues-quiz-check" type="button">Проверить <span>↗</span></button>
        <button class="button button-ghost" id="blues-quiz-next" type="button">Новая тоника <span>↻</span></button>
      </div>
      <div class="chord-row" id="blues-quiz-bars" style="grid-template-columns:repeat(6,minmax(0,1fr));margin-top:12px"></div>
      <p class="feedback" id="blues-quiz-feedback" aria-live="polite">Выбери аккорд для каждого такта.</p>
    </div>
  `;

  fillSelect("blues-root", ROOTS.map((root) => ({ value: root, label: prettyNote(root) })), "A");
  byId("blues-type").value = state.type;

  byId("blues-root").addEventListener("change", () => { renderBoard(); newNoteQuiz(); newBuildQuiz(); });
  byId("blues-type").addEventListener("change", () => {
    state.type = byId("blues-type").value;
    renderBoard();
    newNoteQuiz();
    newBuildQuiz();
  });
  byId("blues-play-scale").addEventListener("click", () => playScale(false));
  byId("blues-blue-only").addEventListener("click", () => playScale(true));
  byId("blues-boxes-toggle").addEventListener("click", () => {
    state.showBoxes = !state.showBoxes;
    const button = byId("blues-boxes-toggle");
    button.classList.toggle("active", state.showBoxes);
    button.setAttribute("aria-pressed", String(state.showBoxes));
    button.textContent = state.showBoxes ? "Скрыть боксы" : "Показать боксы";
    renderBoard();
  });

  byId("blues-key").addEventListener("change", renderBluesBars);
  byId("blues-play-12").addEventListener("click", () => playTwelveBar(false));
  byId("blues-play-with-scale").addEventListener("click", () => playTwelveBar(true));

  byId("blues-note-next").addEventListener("click", newNoteQuiz);
  byId("blues-build-check").addEventListener("click", checkBuild);
  byId("blues-build-reset").addEventListener("click", () => {
    state.selected.clear();
    drawBuild();
    setFeedback("blues-build-feedback", "Выбирай ноты на грифе.");
  });
  byId("blues-build-next").addEventListener("click", newBuildQuiz);

  byId("blues-quiz-root").addEventListener("change", newChordQuiz);
  byId("blues-quiz-check").addEventListener("click", checkChordQuiz);
  byId("blues-quiz-next").addEventListener("click", newChordQuiz);

  renderBoard();
  renderBluesBars();
  newNoteQuiz();
  newBuildQuiz();
  newChordQuiz();
}

/* ------------------------------------------------------------------ */
/*  Данные гаммы                                                       */
/* ------------------------------------------------------------------ */

function typeInfo() {
  return BLUES_TYPES.find((item) => item.id === state.type) || BLUES_TYPES[0];
}

function bluesData(root = byId("blues-root").value, type = state.type) {
  const info = typeInfo();
  const scale = getScale(info.scaleId);
  const rootPc = parseNote(root).pc;
  const names = scaleNames(root, scale);
  const bluePc = mod(rootPc + info.blueOffset);
  return { info, scale, rootPc, names, bluePc, baseMidi: 48 + rootPc };
}

function renderBoard() {
  const root = byId("blues-root").value;
  const { info, scale, rootPc, names, bluePc } = bluesData(root);
  const nameLookup = {};
  names.forEach((name) => { nameLookup[parseNote(name).pc] = name; });
  const pcs = scale.offsets.map((offset) => mod(rootPc + offset));

  const highlighted = [];
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = 0; fret <= 15; fret++) {
      const midi = STRINGS[string].midi + fret;
      const pc = mod(midi);
      if (pcs.includes(pc)) {
        highlighted.push({
          string, fret,
          kind: pc === rootPc ? "root" : pc === bluePc ? "blue" : "note",
        });
      }
    }
  }

  const boxes = state.showBoxes
    ? pentatonicBoxes(rootPc, state.type).map((box, index) => ({
        from: box.start, to: box.end, label: `Бокс ${index + 1}`,
      }))
    : [];

  renderFretboard({
    container: "blues-board",
    highlighted,
    boxes,
    names: nameLookup,
    status: "blues-status",
    clickable: true,
  });

  byId("blues-degrees").innerHTML = scale.degrees
    .map((degree, index) => {
      const isBlue = mod(parseNote(names[index]).pc - rootPc) === info.blueOffset;
      return `<span class="chip${isBlue ? " danger" : degree === "1" ? " success" : " muted"}">${degree}: <b>${prettyNote(names[index])}</b></span>`;
    }).join("");
  byId("blues-tip").innerHTML = `<span class="block-label">На пальцах</span>${scale.plain}`;
  byId("blues-mistake").innerHTML = `<span class="block-label">Типичная ошибка новичка</span>${scale.mistake}`;

  const notes = scaleNoteList(root, scale);
  byId("blues-summary").textContent =
    `${prettyNote(root)} ${state.type === "major" ? "мажорная" : "минорная"} блюзовая: ${notes.map((note) => prettyNote(note.name)).join(" – ")}`;
  renderStaff("blues-staff", notes, { durations: notes.map(() => "q"), ariaLabel: "Блюзовая гамма на стане" });
}

function playScale(blueOnly) {
  const root = byId("blues-root").value;
  const { scale, baseMidi, bluePc } = bluesData(root);
  if (!blueOnly) {
    playSequence([...scale.offsets.map((offset) => baseMidi + offset), baseMidi + 12], 0.28, 0.5);
    return;
  }
  // Блюзовая нота в контексте: 4 → ♭5 → 5 и обратно.
  const blue = bluePc + 48;
  const neighbourBelow = blue - 1;
  const neighbourAbove = blue + 1;
  playSequence([neighbourBelow, blue, neighbourAbove, blue, neighbourBelow], 0.36, 0.6);
  setFeedback("blues-note-feedback", "Прозвучала блюзовая нота между двумя соседними ступенями — слышишь, как она «трётся»?");
}

/* ------------------------------------------------------------------ */
/*  12 тактов                                                          */
/* ------------------------------------------------------------------ */

function renderBluesBars() {
  const key = byId("blues-key").value;
  const blues = twelveBarBlues(key);
  byId("blues-bars").innerHTML = blues.bars.map((bar, index) => `
    <button type="button" class="chord-pill" data-bar="${index}" style="padding:8px">
      <small>${bar.bar}</small>
      <strong style="font-size:13px">${prettyNote(bar.chord.name)}7</strong>
      <span>${bar.degree}</span>
    </button>`).join("");
  byId("blues-bars").querySelectorAll("[data-bar]").forEach((button) => {
    button.addEventListener("click", () => {
      const bar = blues.bars[Number(button.dataset.bar)];
      const chord = makeChord(bar.chord.name, getSeventh("dom7"));
      strum(chord.notes.map((note) => note.midi), 1.6);
      button.classList.add("active");
      setTimeout(() => button.classList.remove("active"), 700);
    });
  });

  // Аппликатуры трёх аккордов: A7 / D7 / E7 (или другие от выбранной тоники).
  const highlighted = [];
  const names = {};
  blues.chords.forEach((chord) => {
    const built = makeChord(chord.name, getSeventh("dom7"));
    built.names.forEach((name) => { names[parseNote(name).pc] = name; });
    const voicing = findVoicings(built.notes)[0];
    if (!voicing) return;
    voicing.positions.forEach((position) => {
      highlighted.push({
        string: position.string,
        fret: position.fret,
        kind: mod(position.midi) === parseNote(chord.name).pc ? "root" : "note",
      });
    });
  });
  renderFretboard({ container: "blues-chords-board", highlighted, names, showAll: false });
}

function playTwelveBar(withScale) {
  const key = byId("blues-key").value;
  const bpm = Number(byId("blues-tempo").value) || 90;
  const blues = twelveBarBlues(key);
  const chords = blues.chords.map((chord) => makeChord(chord.name, getSeventh("dom7")).notes.map((note) => note.midi));
  const byDegree = { I7: chords[0], IV7: chords[1], V7: chords[2] };
  const sequence = blues.bars.map((bar) => byDegree[bar.degree]);
  playProgressionAudio(sequence, bpm, 4);

  if (withScale) {
    // Блюзовая гамма «поверх»: играем её в паузах между аккордами,
    // чтобы обе линии были слышны, а не сливались в кашу.
    const { scale, baseMidi } = bluesData(key, "minor");
    const scaleMidis = [...scale.offsets.map((offset) => baseMidi + offset), baseMidi + 12];
    const beat = 60 / bpm;
    const events = scaleMidis.map((midi, index) => ({
      notes: [midi],
      duration: beat * 0.42,
      time: index * beat * 0.5,
      velocity: 0.5,
    }));
    playEvents(events);
  }
}

/* ------------------------------------------------------------------ */
/*  Упражнение 1: найди блюзовую ноту                                  */
/* ------------------------------------------------------------------ */

function newNoteQuiz() {
  const root = byId("blues-root").value;
  const { info, scale, rootPc, bluePc } = bluesData(root);
  const boxes = pentatonicBoxes(rootPc, state.type);
  const box = boxes[Math.floor(Math.random() * boxes.length)];
  state.find = { root, type: state.type, box, bluePc, blueOffset: info.blueOffset, scale, answered: false };
  const bluesName = bluesLetterName(bluePc);
  byId("blues-note-prompt").textContent =
    `Найди блюзовую ноту (${prettyNote(bluesName)}, ${info.id === "minor" ? "♭5" : "♭3"}) в позиции ${box.id}: лады ${box.start}–${box.end}.`;
  byId("blues-note-hint").textContent = `Подсказка: ${prettyNote(root)} + ${info.blueOffset} полутонов`;
  setFeedback("blues-note-feedback", "Нажми на лад, где звучит блюзовая нота.");
  drawNoteQuiz();
}

function bluesLetterName(pc) {
  return ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][pc];
}

function drawNoteQuiz(reveal = false) {
  const quiz = state.find;
  if (!quiz) return;
  const { box, bluePc, rootPc } = quiz;
  const highlighted = [];
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = Math.max(0, box.start); fret <= Math.min(15, box.end); fret++) {
      const pc = mod(STRINGS[string].midi + fret);
      if (reveal && pc === bluePc) {
        highlighted.push({ string, fret, kind: "blue" });
      }
    }
  }
  // Показываем корень как ориентир, а пентатонику — бледно, чтобы бокс читался.
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = Math.max(0, box.start); fret <= Math.min(15, box.end); fret++) {
      const pc = mod(STRINGS[string].midi + fret);
      if (pc === rootPc && !highlighted.some((item) => item.string === string && item.fret === fret)) {
        highlighted.push({ string, fret, kind: "root" });
      }
    }
  }
  renderFretboard({
    container: "blues-note-board",
    highlighted,
    showAll: false,
    showGhosts: true,
    fromFret: Math.max(0, box.start - 1),
    toFret: Math.min(15, box.end + 1),
    boxes: [{ from: box.start, to: box.end, label: `Бокс ${box.id}` }],
    clickable: true,
    status: "blues-note-status",
    onNoteClick: (position) => {
      if (quiz.answered) return;
      quiz.answered = true;
      const correct = position.pc === bluePc;
      record("bluesNote", correct);
      const examplePositions = [];
      for (let string = 0; string < STRINGS.length; string++) {
        for (let fret = Math.max(0, box.start); fret <= Math.min(15, box.end); fret++) {
          if (mod(STRINGS[string].midi + fret) === bluePc) {
            examplePositions.push(`${string + 1}-я струна, ${fret}-й лад`);
          }
        }
      }
      setFeedback(
        "blues-note-feedback",
        correct
          ? `Верно! ${prettyNote(bluesLetterName(bluePc))} — блюзовая нота. В этом боксе она есть ещё тут: ${examplePositions.slice(1).join("; ") || "это единственное место"}.`
          : `Не совсем: на ${position.string + 1}-й струне, ${position.fret}-м ладу звучит ${prettyNote(bluesLetterName(position.pc))}. Блюзовая нота — ${prettyNote(bluesLetterName(bluePc))}: ${examplePositions.map((p) => " " + p).join(";")}.`,
        correct ? "success" : "error",
      );
      drawNoteQuiz(true);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Упражнение 2: собери гамму                                         */
/* ------------------------------------------------------------------ */

function newBuildQuiz() {
  const root = byId("blues-root").value;
  const { scale, rootPc } = bluesData(root);
  state.selected.clear();
  state.buildQuiz = {
    root, type: state.type, scale,
    pcs: scale.offsets.map((offset) => mod(rootPc + offset)),
    answered: false,
  };
  byId("blues-build-prompt").textContent =
    `Выбери все шесть нот ${prettyNote(root)} ${state.type === "major" ? "мажорной" : "минорной"} блюзовой гаммы.`;
  setFeedback("blues-build-feedback", "Выбирай ноты на грифе.");
  drawBuild();
}

function drawBuild(reveal = false) {
  const quiz = state.buildQuiz;
  if (!quiz) return;
  const names = {};
  scaleNames(quiz.root, quiz.scale).forEach((name) => { names[parseNote(name).pc] = name; });
  const bluePc = mod(parseNote(quiz.root).pc + typeInfo().blueOffset);
  const highlighted = reveal
    ? quiz.pcs.map((pc) => {
        const position = bestPosition(48 + pc);
        return {
          string: position.string, fret: position.fret,
          kind: pc === parseNote(quiz.root).pc ? "root" : pc === bluePc ? "blue" : "note",
        };
      })
    : [];
  renderFretboard({
    container: "blues-build-board",
    highlighted,
    selected: [...state.selected],
    showAll: true,
    names,
    clickable: true,
    status: "blues-build-status",
    onNoteClick: (position) => {
      if (quiz.answered) return;
      if (state.selected.has(position.key)) state.selected.delete(position.key);
      else state.selected.add(position.key);
      drawBuild();
    },
  });
  const picked = [...state.selected].map((key) => {
    const [string, fret] = key.split(":").map(Number);
    return prettyNote(names[mod(STRINGS[string].midi + fret)] || "?");
  });
  byId("blues-build-picked").textContent = picked.length ? picked.join(" · ") : "пока ничего";
}

function checkBuild() {
  const quiz = state.buildQuiz;
  if (!quiz || quiz.answered) return;
  if (!state.selected.size) {
    setFeedback("blues-build-feedback", "Сначала выбери ноты на грифе.", "error");
    return;
  }
  const pickedPcs = [...new Set([...state.selected].map((key) => {
    const [string, fret] = key.split(":").map(Number);
    return mod(STRINGS[string].midi + fret);
  }))];
  const extra = pickedPcs.filter((pc) => !quiz.pcs.includes(pc));
  const missing = quiz.pcs.filter((pc) => !pickedPcs.includes(pc));
  const correct = !extra.length && !missing.length;
  quiz.answered = true;
  record("bluesBuild", correct);
  const bluePc = mod(parseNote(quiz.root).pc + typeInfo().blueOffset);
  const label = (pc) => {
    const index = quiz.pcs.indexOf(pc);
    const degree = index >= 0 ? quiz.scale.degrees[index] : "?";
    const mark = pc === bluePc ? " — блюзовая!" : "";
    return `${prettyNote(bluesLetterName(pc))} (${degree})${mark}`;
  };
  setFeedback(
    "blues-build-feedback",
    correct
      ? `Верно! ${scaleNames(quiz.root, quiz.scale).map(prettyNote).join(" – ")}. Блюзовая нота на месте.`
      : `Почти. ${missing.length ? `Не хватает: ${missing.map(label).join(", ")}. ` : ""}${extra.length ? `Лишние: ${extra.map(label).join(", ")}. ` : ""}`,
    correct ? "success" : "error",
  );
  drawBuild(true);
}

/* ------------------------------------------------------------------ */
/*  Упражнение 3: собери аккорды 12 тактов                              */
/* ------------------------------------------------------------------ */

const BLUES_CHORD_CHOICES = ["I7", "IV7", "V7"];

function newChordQuiz() {
  const root = byId("blues-quiz-root").value;
  const blues = twelveBarBlues(root);
  state.chordQuiz = {
    root,
    correct: blues.bars.map((bar) => bar.degree),
    answers: blues.bars.map(() => "I7"),
    answered: false,
  };
  byId("blues-quiz-feedback").textContent = "Выбери аккорд для каждого такта.";
  byId("blues-quiz-feedback").className = "feedback";
  renderChordQuiz();
}

function renderChordQuiz() {
  const quiz = state.chordQuiz;
  if (!quiz) return;
  const blues = twelveBarBlues(quiz.root);
  const names = { I7: blues.chords[0].name, IV7: blues.chords[1].name, V7: blues.chords[2].name };
  byId("blues-quiz-bars").innerHTML = quiz.answers.map((answer, index) => `
    <div class="function-slot" style="padding:8px">
      <label>${index + 1} такт</label>
      <select data-quiz-bar="${index}" ${quiz.answered ? "disabled" : ""}>
        ${BLUES_CHORD_CHOICES.map((degree) =>
          `<option value="${degree}" ${answer === degree ? "selected" : ""}>${degree} (${prettyNote(names[degree])}7)</option>`).join("")}
      </select>
    </div>`).join("");
  byId("blues-quiz-bars").querySelectorAll("[data-quiz-bar]").forEach((select) => {
    select.addEventListener("change", () => {
      quiz.answers[Number(select.dataset.quizBar)] = select.value;
    });
  });
}

function checkChordQuiz() {
  const quiz = state.chordQuiz;
  if (!quiz || quiz.answered) return;
  quiz.answered = true;
  const wrong = quiz.correct.map((degree, index) => degree === quiz.answers[index] ? null : index + 1).filter(Boolean);
  const correct = wrong.length === 0;
  record("bluesChords", correct);
  const blues = twelveBarBlues(quiz.root);
  const answerText = quiz.correct.map((degree, index) => `${index + 1}: ${degree}`).join(" · ");
  setFeedback(
    "blues-quiz-feedback",
    correct
      ? `Верно! ${blues.root}-блюз: ${answerText}. Теперь послушай, как это звучит.`
      : `Не всё: ошибки в тактах ${wrong.join(", ")}. Правильно: ${answerText}. Помни схему: I-I-I-I | IV-IV-I-I | V-IV-I-V.`,
    correct ? "success" : "error",
  );
  renderChordQuiz();
  playProgressionAudio(
    quiz.correct.map((degree, index) => {
      const chord = makeChord(blues.chords[["I7", "IV7", "V7"].indexOf(degree)].name, getSeventh("dom7"));
      return chord.notes.map((note) => note.midi);
    }),
    90, 4,
  );
}
