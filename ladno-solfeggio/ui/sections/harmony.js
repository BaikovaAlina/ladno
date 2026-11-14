/*
 * 07. ГАРМОНИЯ
 * Девять прогрессий, прослушивание, аккорды по долям, подсказки по мелодии,
 * 12-тактовый блюз и упражнение «собери прогрессию».
 */
import { ROOTS, mod, parseNote, prettyNote } from "../../core/notes.js";
import { PROGRESSIONS, getProgression, progressionChords, progressionLabel } from "../../core/progressions.js";
import { twelveBarBlues } from "../../core/scales.js";
import { getSeventh, makeChord, findVoicings } from "../../core/chords.js";
import { playEvents, playProgressionAudio } from "../../core/audio.js";
import { byId, fillSelect, setFeedback } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderChordStaff } from "../staff.js";
import { record } from "../state.js";

const state = { index: 0, mode: "major", task: "build", quiz: null };

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> АККОРДЫ ВМЕСТЕ</div>
          <h2>Прогрессия: гармония + мелодия</h2>
          <p>Выбери тональность и последовательность. Аккорды покажем по долям и сыграем вместе.</p>
        </div>
        <button class="button button-dark" id="harmony-play" type="button"><span>▶</span> Играть</button>
      </div>

      <div class="controls">
        <label>Тоника <select id="harmony-root"></select></label>
        <label>Прогрессия <select id="harmony-progression"></select></label>
        <label>Лад
          <select id="harmony-mode">
            <option value="major">Мажор</option>
            <option value="minor">Минор</option>
          </select>
        </label>
        <label>Темп
          <select id="harmony-tempo">
            <option value="70">70 BPM — медленно</option>
            <option value="84" selected>84 BPM — средне</option>
            <option value="100">100 BPM — бодро</option>
            <option value="120">120 BPM — быстро</option>
          </select>
        </label>
        <label class="inline"><input type="checkbox" id="harmony-sevenths"> Септаккорды</label>
      </div>

      <div class="chord-row" id="harmony-chords"></div>

      <div class="fret-scroll">
        <div id="harmony-board" class="fretboard" aria-label="Ноты прогрессии на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> корень аккорда</span>
          <span><i class="legend-note"></i> ноты аккорда</span>
        </div>
        <span id="harmony-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="scale-info">
        <div>
          <div class="overline">ХАРАКТЕР И ПРОИСХОЖДЕНИЕ</div>
          <strong id="harmony-character"></strong>
          <p id="harmony-origin"></p>
        </div>
        <div>
          <div class="overline">МЕЛОДИЧЕСКИЕ ХОДЫ</div>
          <ul class="melody-tips" id="harmony-tips" style="margin:6px 0 0;padding-left:16px;color:var(--muted);font-size:11.5px;line-height:1.75"></ul>
        </div>
      </div>
      <div class="info-strip" id="harmony-info"></div>
      <div class="score-block">
        <div>
          <div class="overline">ЗАПИСЬ ПЕРВОГО АККОРДА</div>
          <strong id="harmony-notation-title"></strong>
          <p>Каждая нота подписана своей ступенью.</p>
        </div>
        <div id="harmony-staff" class="staff" aria-label="Аккорд на стане"></div>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ФУНКЦИИ</div>
        <h2>Покой, движение, <em>напряжение.</em></h2>
      </div>
      <span class="reading-time">≈ 5 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">T <span>↗</span></span>
        <h3>Тоника — покой</h3>
        <p>I, iii и vi. Дом, в который хочется вернуться. Если фраза закончилась на тонике, слушатель выдыхает.</p>
        <div class="card-example">I · iii · vi <span>покой</span></div>
        <div class="plain-block"><b>На пальцах:</b> в C-мажоре это C, Em, Am — три аккорда из одних и тех же нот.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> заканчивать всё на тонике. Иногда вопрос звучит интереснее ответа.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">S <span>↗</span></span>
        <h3>Субдоминанта — движение</h3>
        <p>ii и IV. Уводит от дома, создаёт «дорогу». Хорошо работает в середине фразы.</p>
        <div class="card-example">ii · IV <span>движение</span></div>
        <div class="plain-block"><b>На пальцах:</b> Dm и F в C-мажоре. F — тот же аккорд, что Am с другой опорой.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> ставить IV слишком рано. Сначала дай слушателю услышать тонику.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">D <span>↗</span></span>
        <h3>Доминанта — напряжение</h3>
        <p>V и vii°. Самое сильное тяготение: VII ступень хочет подняться в I. После V почти всегда ждёшь I.</p>
        <div class="card-example">V · vii° <span>напряжение</span></div>
        <div class="plain-block"><b>На пальцах:</b> G в C-мажоре: B (2-я струна, 0 лад) тянется в C (2-я струна, 1-й лад).</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> оставлять V без разрешения в конце. Это допустимо, но должно быть осознанным.</div>
      </article>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ДВЕНАДЦАТЬ ТАКТОВ</div>
        <h2>Блюзовая форма <em>в A и E.</em></h2>
      </div>
    </div>
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <h2>12-тактовый блюз</h2>
          <p>Три аккорда, двенадцать тактов. Сыграй — и услышишь, почему эта форма живёт сто лет.</p>
        </div>
        <div class="button-row">
          <select id="harmony-blues-root" aria-label="Тоника блюза">
            <option value="A" selected>A</option>
            <option value="E">E</option>
            <option value="G">G</option>
            <option value="D">D</option>
            <option value="C">C</option>
          </select>
        </div>
      </div>
      <div class="chord-row" id="harmony-blues-bars" style="grid-template-columns:repeat(4,minmax(0,1fr))"></div>
      <div class="button-row" style="margin-top:10px">
        <button class="button button-dark" id="blues-play" type="button"><span>▶</span> Слушать 12 тактов</button>
        <button class="button button-ghost" id="blues-play-shuffle" type="button">С шаффлом (шаффл-ритм)</button>
        <span class="chip muted">A7 · D7 · E7 — доминантсептаккорды, так звучит блюз</span>
      </div>
      <div class="fret-scroll" style="margin-top:12px">
        <div id="harmony-blues-board" class="fretboard" aria-label="Блюзовые аккорды на грифе"></div>
      </div>
      <p class="notation-note">Аппликатуры A7, D7, E7 — ниже. Играй их по схеме тактов сверху.</p>
    </div>

    <div class="exercise" id="harmony-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 07</div>
          <h2>Собери прогрессию</h2>
          <p id="harmony-quiz-prompt">Выбери аккорд для каждой ступени.</p>
        </div>
        <span class="exercise-stats" data-stats="harmony"></span>
      </div>
      <div class="function-slots" id="harmony-slots"></div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="harmony-check" type="button">Проверить <span>↗</span></button>
          <p class="feedback" id="harmony-feedback" aria-live="polite">Собери все аккорды.</p>
        </div>
        <div class="button-row">
          <button class="button button-ghost" id="harmony-reset" type="button">Заново</button>
          <button class="button button-ghost" id="harmony-next" type="button">Новое задание <span>↗</span></button>
        </div>
      </div>
    </div>
  `;

  fillSelect("harmony-root", ROOTS.map((r) => ({ value: r, label: prettyNote(r) })), "C");
  fillSelect("harmony-progression", PROGRESSIONS.map((item) => ({ value: item.id, label: `${item.name} · ${item.title}` })), "1451");

  ["harmony-root", "harmony-progression", "harmony-mode", "harmony-sevenths"].forEach((id) =>
    byId(id).addEventListener("change", () => { state.index = 0; renderHarmony(); }));
  byId("harmony-play").addEventListener("click", playCurrent);
  ["harmony-blues-root"].forEach((id) => byId(id).addEventListener("change", renderBlues));
  byId("blues-play").addEventListener("click", () => playBlues(false));
  byId("blues-play-shuffle").addEventListener("click", () => playBlues(true));

  byId("harmony-check").addEventListener("click", checkQuiz);
  byId("harmony-reset").addEventListener("click", () => { state.quiz.answers = {}; renderSlots(); });
  byId("harmony-next").addEventListener("click", newQuiz);

  renderHarmony();
  renderBlues();
  newQuiz();
}

function currentChords() {
  const root = byId("harmony-root").value;
  const progression = getProgression(byId("harmony-progression").value);
  const mode = byId("harmony-mode").value;
  const sevenths = byId("harmony-sevenths").checked;
  return { root, progression, mode, chords: progressionChords(root, progression, mode, sevenths) };
}

function renderHarmony() {
  const { root, progression, mode, chords } = currentChords();
  const label = progressionLabel(progression, mode);

  byId("harmony-chords").innerHTML = chords.map((chord, index) => `
    <button type="button" class="chord-pill ${index === state.index ? "active" : ""}" data-chord-index="${index}">
      <small>${index + 1} · ${mode === "minor" ? (["i", "iv", "v", "i"][index] || "i") : (chord.roman || "")}</small>
      <strong>${prettyNote(chord.symbol)}</strong>
      <span>${chord.notes.map((note) => prettyNote(note.name)).join(" ")}</span>
    </button>`).join("");
  byId("harmony-chords").querySelectorAll("[data-chord-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.index = Number(button.dataset.chordIndex);
      renderHarmony();
    });
  });

  const active = chords[state.index] || chords[0];
  const names = {};
  active?.names.forEach((name) => { names[parseNote(name).pc] = name; });
  const highlighted = active
    ? active.notes.map((note) => {
        const midi = note.midi;
        // Ищем удобную позицию каждой ноты аккорда.
        return { kind: mod(midi) === parseNote(active.root).pc ? "root" : "note", midi };
      })
    : [];
  const positions = [];
  highlighted.forEach((item) => {
    for (let string = 0; string < 6; string++) {
      const fret = item.midi - [64, 59, 55, 50, 45, 40][string];
      if (fret >= 0 && fret <= 12 && !positions.some((p) => p.string === string)) {
        positions.push({ string, fret, kind: item.kind });
        break;
      }
    }
  });

  renderFretboard({
    container: "harmony-board",
    highlighted: positions,
    names,
    showAll: false,
    status: "harmony-status",
    clickable: true,
  });

  byId("harmony-character").textContent = label;
  byId("harmony-origin").textContent = `${progression.title} · ${progression.character} · размер ${progression.meter}`;
  byId("harmony-tips").innerHTML = progression.melodyTips.map((tip) => `<li>${tip}</li>`).join("");
  byId("harmony-info").innerHTML = chords.map((chord, index) =>
    `<button type="button" class="chip${index === state.index ? " success" : ""}" data-chip="${index}">${prettyNote(chord.symbol)}</button>`).join("") +
    `<span class="chip muted">${progression.example}</span>`;
  byId("harmony-info").querySelectorAll("[data-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.index = Number(chip.dataset.chip);
      renderHarmony();
    });
  });

  if (active) {
    byId("harmony-notation-title").textContent = `${active.symbol} — ${active.notes.map((note) => prettyNote(note.name)).join(" – ")}`;
    renderChordStaff("harmony-staff", active.notes, { ariaLabel: `${active.symbol} на стане` });
  }
}

function playCurrent() {
  const { chords } = currentChords();
  const bpm = Number(byId("harmony-tempo").value);
  const beats = Number(getProgression(byId("harmony-progression").value).beatsPerChord) || 4;
  playProgressionAudio(chords.map((chord) => chord.notes.map((note) => note.midi)), bpm, beats);
}

/* ------------------------------------------------------------------ */
/*  Блюз                                                              */
/* ------------------------------------------------------------------ */

function renderBlues() {
  const root = byId("harmony-blues-root").value;
  const blues = twelveBarBlues(root);
  byId("harmony-blues-bars").innerHTML = blues.bars.map((bar) => `
    <div class="chord-pill" style="padding:9px">
      <small>${bar.bar} такт</small>
      <strong style="font-size:14px">${prettyNote(bar.chord.name)}7</strong>
      <span>${bar.degree}</span>
    </div>`).join("");

  // Показываем реальные аппликатуры A7 / D7 / E7: берём самый удобный вариант
  // из общего поиска позиций и подсвечиваем его на грифе.
  const highlighted = [];
  const names = {};
  blues.chords.forEach((chord) => {
    const built = makeChord(chord.name, getSeventh("dom7"));
    built.names.forEach((name) => { names[parseNote(name).pc] = name; });
    const voicing = findVoicings(built.notes)[0];
    if (voicing) {
      voicing.positions.forEach((position) => {
        highlighted.push({
          string: position.string,
          fret: position.fret,
          kind: mod(position.midi) === parseNote(chord.name).pc ? "root" : "note",
        });
      });
    }
  });
  renderFretboard({ container: "harmony-blues-board", highlighted, names, showAll: false, status: null });
}

function playBlues(withShuffle) {
  const root = byId("harmony-blues-root").value;
  const blues = twelveBarBlues(root);
  // Доминантсептаккорд от каждой из трёх ступеней: 1 – 3 – 5 – ♭7.
  const chords = blues.chords.map((chord) =>
    makeChord(chord.name, getSeventh("dom7")).notes.map((note) => note.midi));
  const byDegree = { I7: chords[0], IV7: chords[1], V7: chords[2] };
  const sequence = blues.bars.map((bar) => byDegree[bar.degree]);
  if (!withShuffle) {
    playProgressionAudio(sequence, 84, 4);
    return;
  }
  // Шаффл: восьмые играем как триоли «долгая-короткая» — 3 удара на 2 доли.
  const bpm = 84;
  const beat = 60 / bpm;
  const events = [];
  sequence.forEach((chord, barIndex) => {
    const barStart = barIndex * 4 * beat;
    for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
      const time = barStart + beatIndex * beat;
      events.push({ notes: chord, duration: beat * 0.6, time, velocity: 0.55 });
      events.push({ notes: chord.map((m) => m + 12), duration: beat * 0.3, time: time + beat * 0.66, velocity: 0.35 });
    }
  });
  playEvents(events);
}

/* ------------------------------------------------------------------ */
/*  Упражнение «собери прогрессию»                                     */
/* ------------------------------------------------------------------ */

function newQuiz() {
  const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
  const progression = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
  const mode = progression.minorDegrees && Math.random() < 0.35 ? "minor" : "major";
  const chords = progressionChords(root, progression, mode);
  state.quiz = {
    root, progression, chords, mode,
    answers: {},
    answered: false,
  };
  byId("harmony-quiz-prompt").textContent =
    `Собери «${progressionLabel(progression, mode)}» в ${prettyNote(root)} ${mode === "major" ? "мажоре" : "миноре"}: ${chords.length} аккорда.`;
  setFeedback("harmony-feedback", "Выбери аккорд для каждой ступени.");
  renderSlots();
}

function renderSlots() {
  const quiz = state.quiz;
  if (!quiz) return;
  const allOptions = [...new Set([
    ...quiz.chords.map((chord) => prettyNote(chord.symbol)),
    ...ROOTS.flatMap((root) => [prettyNote(root), prettyNote(root) + "m", prettyNote(root) + "7"]),
  ])].sort();

  byId("harmony-slots").innerHTML = quiz.chords.map((chord, index) => {
    const chosen = quiz.answers[index];
    return `<div class="function-slot">
      <label>${index + 1}-й аккорд</label>
      <select data-slot="${index}">
        <option value="">— выбери —</option>
        ${allOptions.map((name) => `<option value="${name}" ${chosen === name ? "selected" : ""}>${name}</option>`).join("")}
      </select>
      <div style="margin-top:6px;color:var(--muted);font-size:10px">${quiz.mode === "minor" ? ["i", "iv", "v", "i"][index] || "i" : chord.roman || ""}</div>
    </div>`;
  }).join("");

  byId("harmony-slots").querySelectorAll("[data-slot]").forEach((select) => {
    select.addEventListener("change", () => {
      quiz.answers[Number(select.dataset.slot)] = select.value;
    });
  });
}

function checkQuiz() {
  const quiz = state.quiz;
  if (!quiz || quiz.answered) return;
  const missing = quiz.chords.some((chord, index) => !quiz.answers[index]);
  if (missing) {
    setFeedback("harmony-feedback", "Выбери аккорд в каждом слоте.", "error");
    return;
  }
  const correct = quiz.chords.every((chord, index) =>
    quiz.answers[index] === prettyNote(chord.symbol));
  quiz.answered = true;
  record("harmony", correct);
  const answer = quiz.chords.map((chord) => prettyNote(chord.symbol)).join(" – ");
  setFeedback(
    "harmony-feedback",
    correct
      ? `Верно! ${prettyNote(quiz.root)}: ${answer}. Послушай, как это звучит.`
      : `Почти. Правильно: ${answer}. Помни: в мажоре ii, iii и vi — минорные.`,
    correct ? "success" : "error",
  );
  byId("harmony-slots").querySelectorAll("select").forEach((select, index) => {
    select.value = prettyNote(quiz.chords[index].symbol);
    select.disabled = true;
  });
  playProgressionAudio(quiz.chords.map((chord) => chord.notes.map((note) => note.midi)), 84, 4);
}
