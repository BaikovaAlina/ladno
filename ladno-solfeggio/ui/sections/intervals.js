/*
 * 02. ИНТЕРВАЛЫ
 * Наглядный пример, обращения, составные интервалы, таблица «как звучит»
 * и упражнение «построй интервал» + быстрый слуховой тест.
 */
import {
  CHROMATIC, ROOTS, bestPosition, mod, parseNote, positionsForMidi, prettyNote,
  rootMidi, semiText, spellInterval, writtenNote,
} from "../../core/notes.js";
import {
  INTERVALS, INTERVAL_FEEL, getInterval, intervalOptions, invertInterval,
} from "../../core/chords.js";
import { playEvents, playIntervalAudio } from "../../core/audio.js";
import { byId, fillSelect, makeOptions, setFeedback, answerButtons, unlockAnswers, setSwitch } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderStaff } from "../staff.js";
import { record } from "../state.js";
import { buildNotePool, pickPosition } from "../exercises.js";

// Составные интервалы: нона, децима, ундецима, дуодецима. Кратко, для кругозора.
const COMPOUND = [
  { id: "M9", name: "Нона (б.9)", semitones: 14, steps: 8, base: "б.2 через октаву", usage: "Джаз: 9-я ступень поверх аккорда — мягкая «искра»." },
  { id: "M10", name: "Децима (б.10)", semitones: 16, steps: 9, base: "б.3 через октаву", usage: "Широкий «светлый» интервал, часто в аранжировках." },
  { id: "P11", name: "Ундецима (ч.11)", semitones: 17, steps: 10, base: "ч.4 через октаву", usage: "Звучит «пусто» и открыто, как кварта, но шире." },
  { id: "P12", name: "Дуодецима (ч.12)", semitones: 19, steps: 11, base: "ч.5 через октаву", usage: "Двойная квинта — полный, «органный» звук." },
];

const state = { build: null, ear: null, task: "build" };

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ПОСМОТРИ И ПОСЛУШАЙ</div>
          <h2>Расстояние между нотами</h2>
          <p>Выбери первую ноту и интервал. Обе ноты отмечены на грифе и на стане.</p>
        </div>
        <button class="button button-dark" id="interval-play" type="button"><span>▶</span> Прослушать</button>
      </div>

      <div class="controls">
        <label>От ноты <select id="interval-root"></select></label>
        <label>Интервал <select id="interval-type"></select></label>
        <label>Звучание <select id="interval-play-mode">
          <option value="up">Вверх (снизу вверх)</option>
          <option value="down">Вниз (сверху вниз)</option>
          <option value="together">Одновременно</option>
          <option value="round">Туда-обратно</option>
        </select></label>
        <button class="button button-ghost" id="interval-random" type="button">Случайный интервал <span>↻</span></button>
      </div>

      <div class="fret-scroll">
        <div id="interval-board" class="fretboard" aria-label="Интервал на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> первая нота</span>
          <span><i class="legend-note"></i> вторая нота</span>
        </div>
        <span id="interval-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="score-block">
        <div>
          <div class="overline">НОТНЫЙ СТАН</div>
          <strong id="interval-summary"></strong>
          <p id="interval-description"></p>
        </div>
        <div id="interval-staff" class="staff" aria-label="Интервал на нотном стане"></div>
      </div>
      <div class="info-strip" id="interval-info"></div>
      <p class="notation-note">На стане — реальная высота звучания. Обращение интервала: сумма с ним всегда даёт октаву.</p>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">РАССТОЯНИЕ И ЗВУЧАНИЕ</div>
        <h2>Две ноты, <em>одна идея.</em></h2>
      </div>
      <span class="reading-time">≈ 5 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">01 <span>↗</span></span>
        <h3>Что такое интервал</h3>
        <p>Это расстояние между двумя звуками. Сыграй C на 5-й струне, 3-м ладу, затем E на 4-й струне, 2-м ладу: четыре полутона — <strong>большая терция</strong>.</p>
        <div class="card-example">C → E <span>4 полутона = б.3</span></div>
        <div class="plain-block"><b>На пальцах:</b> C (5-я струна, 3-й лад) → E (4-я струна, 2-й лад).</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> считать интервал только в ладах. Между струнами разное расстояние: 3-я и 2-я отличаются на 4 полутона.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">02 <span>↗</span></span>
        <h3>Полутоны и ступени</h3>
        <p>Название интервала складывается из <strong>количества букв</strong> и <strong>полутонов</strong>. C–E — терция (три буквы C, D, E) и 4 полутона; C–F — кварта и 5 полутонов.</p>
        <div class="card-example">C–E: 3 буквы, 4 пт <span>C–F: 4 буквы, 5 пт</span></div>
        <div class="plain-block"><b>На пальцах:</b> одна и та же «ширина» в полутонах может записываться по-разному. C♯–F — увеличенная кварта (5 полутонов), а C♯–E♯ — большая терция (4 полутона).</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> звать тритон «ув.4», когда по буквам это ум.5. Звучат одинаково, пишутся по-разному.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">03 <span>↗</span></span>
        <h3>Обращения</h3>
        <p>Переставь ноты местами — получится <strong>обращение</strong>. м.3 обращается в б.6, ч.4 — в ч.5, а тритон — сам в себя. Сумма всегда 12 полутонов.</p>
        <div class="card-example">м.3 → б.6 <span>3 + 9 = 12</span></div>
        <div class="plain-block"><b>На пальцах:</b> C–E♭ (м.3) и E♭–C (б.6). Второй интервал — тот же, но шире.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> ждать, что обращение меняет «характер». Наоборот: консонанс остаётся консонансом.</div>
      </article>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ШПАРГАЛКА</div>
        <h2>Как звучит <em>каждый интервал.</em></h2>
      </div>
    </div>
    <div class="theory-grid two">
      <article class="lesson-card" style="min-height:auto">
        <h3>По характеру</h3>
        <div class="reference-grid" id="interval-feel-grid"></div>
      </article>
      <article class="lesson-card" style="min-height:auto">
        <h3>Короткие подсказки</h3>
        <p style="margin:0">Каждый интервал можно угадать по «сюжету»: <strong>м.2</strong> — «Челюсти», <strong>б.2</strong> — «Happy Birthday», <strong>м.3</strong> — «Кузнечик», <strong>б.3</strong> — «Когда я был маленьким», <strong>ч.4</strong> — «Марсельеза», <strong>ч.5</strong> — «Звёздные войны», <strong>м.6</strong> — «История любви», <strong>б.6</strong> — «Мой ласковый и нежный зверь», <strong>м.7</strong> — «Тема Бонда», <strong>б.7</strong> — «Superman», <strong>ч.8</strong> — «Где-то над радугой». Пой или напевай — так слух запоминает быстрее.</p>
      </article>
    </div>

    <details class="reference">
      <summary>Все интервалы, их обращения и составные <span>＋</span></summary>
      <p>Компактная таблица: полутоны, обращение и характер звучания.</p>
      <div class="table-wrap"><table class="data" id="interval-table"></table></div>
      <h3 style="margin:16px 0 8px;font-size:13px">Составные интервалы (кратко)</h3>
      <div class="table-wrap"><table class="data" id="compound-table"></table></div>
    </details>

    <div class="exercise" id="interval-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 02</div>
          <h2>Построй интервал</h2>
          <p id="interval-build-prompt">Найди вторую ноту на грифе.</p>
        </div>
        <span class="exercise-stats" data-stats="intervalBuild"></span>
      </div>
      <p class="task-hint">Нажимай на лады: сработает любая струна с нужной высотой. Подсказка появляется после ответа.</p>
      <div class="fret-scroll exercise-board">
        <div id="interval-quiz-board" class="fretboard" aria-label="Построй интервал"></div>
      </div>
      <div class="quiz-status" id="interval-quiz-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-ghost" id="interval-build-next" type="button">Другое задание <span>↗</span></button>
          <p class="feedback" id="interval-build-feedback" aria-live="polite">Нажми на вторую ноту.</p>
        </div>
        <button class="button button-ghost" id="interval-hear-random" type="button">Услышать от случайной ноты <span>♫</span></button>
      </div>
    </div>

    <div class="exercise" id="interval-ear-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 02-b</div>
          <h2>Быстрый слуховой тест</h2>
          <p>Послушай интервал и выбери его название. Для настоящей статистики по режимам — раздел 11.</p>
        </div>
        <span class="exercise-stats" data-stats="intervalEar"></span>
      </div>
      <div class="ear-controls">
        <button class="button button-dark" id="ear-play" type="button"><span>▶</span> Слушать</button>
        <label>Звучание
          <select id="ear-play-mode">
            <option value="up">Вверх</option>
            <option value="down">Вниз</option>
            <option value="together">Одновременно</option>
            <option value="round">Туда-обратно</option>
          </select>
        </label>
        <button class="button button-ghost" id="ear-next" type="button">Новый интервал <span>↻</span></button>
      </div>
      <div class="answer-row" id="ear-answers" style="margin-top:14px"></div>
      <p class="feedback" id="ear-feedback" aria-live="polite">Сначала послушай, затем выбери ответ.</p>
    </div>
  `;

  fillSelect("interval-root", ROOTS.map((r) => ({ value: r, label: prettyNote(r) })), "C");
  fillSelect("interval-type", INTERVALS.map((item) => ({
    value: item.id,
    label: `${item.name} · ${semiText(item.semitones)}`,
  })), "M3");

  renderFeelGrid();
  renderTables();

  ["interval-root", "interval-type"].forEach((id) => byId(id).addEventListener("change", renderInterval));
  byId("interval-play").addEventListener("click", () => {
    const first = rootMidi(byId("interval-root").value);
    const interval = getInterval(byId("interval-type").value);
    playIntervalAudio(first, first + interval.semitones, byId("interval-play-mode").value);
  });
  byId("interval-play-mode").addEventListener("change", () => {
    const first = rootMidi(byId("interval-root").value);
    const interval = getInterval(byId("interval-type").value);
    playIntervalAudio(first, first + interval.semitones, byId("interval-play-mode").value);
  });
  byId("interval-random").addEventListener("click", () => {
    const roots = ROOTS;
    byId("interval-root").value = roots[Math.floor(Math.random() * roots.length)];
    byId("interval-type").value = INTERVALS[Math.floor(Math.random() * INTERVALS.length)].id;
    renderInterval();
    byId("interval-play").click();
  });
  byId("interval-build-next").addEventListener("click", newBuild);
  byId("interval-hear-random").addEventListener("click", () => {
    const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    const first = rootMidi(root) + 12;
    playIntervalAudio(first, first + interval.semitones, "up");
    setFeedback("interval-build-feedback", `Прозвучал: ${interval.name} от ${prettyNote(root)} (${semiText(interval.semitones)}).`);
  });
  byId("ear-next").addEventListener("click", newEar);
  byId("ear-play").addEventListener("click", () => {
    if (!state.ear) return;
    playIntervalAudio(state.ear.midi, state.ear.midi + state.ear.interval.semitones, byId("ear-play-mode").value);
  });

  renderInterval();
  newBuild();
  newEar();
}

function renderFeelGrid() {
  const grid = byId("interval-feel-grid");
  grid.innerHTML = INTERVAL_FEEL.map((group) => `
    <div class="reference-item">
      <span>${group.items.join(" · ")}</span>
      <strong>${group.feel}</strong>
    </div>`).join("");
}

function renderTables() {
  const table = byId("interval-table");
  table.innerHTML = `
    <thead><tr><th>Интервал</th><th class="num">Полутоны</th><th>Обращение</th><th>Характер</th></tr></thead>
    <tbody>${INTERVALS.map((item) => {
      const inverted = invertInterval(item).interval;
      return `<tr>
        <td><strong>${item.short}</strong> ${item.name}</td>
        <td class="num">${item.semitones}</td>
        <td>${inverted ? inverted.short : "—"}</td>
        <td>${item.feel}</td>
      </tr>`;
    }).join("")}</tbody>`;

  const compound = byId("compound-table");
  compound.innerHTML = `
    <thead><tr><th>Интервал</th><th class="num">Полутоны</th><th>Это</th><th>Где встречается</th></tr></thead>
    <tbody>${COMPOUND.map((item) => `<tr>
      <td><strong>${item.name}</strong></td>
      <td class="num">${item.semitones}</td>
      <td>${item.base}</td>
      <td>${item.usage}</td>
    </tr>`).join("")}</tbody>`;
}

function renderInterval() {
  const root = byId("interval-root").value;
  const interval = getInterval(byId("interval-type").value);
  const first = rootMidi(root);
  const second = first + interval.semitones;
  const other = spellInterval(root, interval.semitones, interval.steps);
  const a = bestPosition(first);
  const b = bestPosition(second);
  const names = { [parseNote(root).pc]: root, [parseNote(other).pc]: other };

  renderFretboard({
    container: "interval-board",
    highlighted: [
      { string: a.string, fret: a.fret, kind: "root" },
      { string: b.string, fret: b.fret, kind: "note" },
    ],
    names,
    status: "interval-status",
  });

  byId("interval-summary").textContent =
    `${writtenNote(root, first)} → ${writtenNote(other, second)} · ${semiText(interval.semitones)}`;
  byId("interval-description").textContent =
    `${interval.name}: ${interval.character} ${interval.tip}`;
  renderStaff("interval-staff", [
    { midi: first, name: root },
    { midi: second, name: other },
  ], { durations: ["q", "q"], ariaLabel: `${interval.name} на стане` });

  const inversion = invertInterval(interval);
  byId("interval-info").innerHTML = [
    `<span class="chip">${interval.short}: <b>${semiText(interval.semitones)}</b></span>`,
    `<span class="chip">Характер: <b>${interval.feel}</b></span>`,
    `<span class="chip">Обращение: <b>${inversion.interval ? inversion.interval.short : "—"}</b></span>`,
    `<span class="chip muted">${interval.character}</span>`,
  ].join("");
}

const buildPool = buildNotePool({ minFret: 0, maxFret: 7, strings: [2, 3, 4, 5] });

function newBuild() {
  const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
  const base = pickPosition(buildPool, state.build?.base.key);
  const root = CHROMATIC[mod(base.midi)];
  const answerName = spellInterval(root, interval.semitones, interval.steps);
  state.build = {
    interval, base, root, answerName,
    target: base.midi + interval.semitones,
    rootPc: mod(base.midi),
    answered: false,
  };
  byId("interval-build-prompt").textContent = `Построй «${interval.name}» вверх от ${writtenNote(root, base.midi)} (${base.string + 1}-я струна, ${base.fret}-й лад).`;
  setFeedback("interval-build-feedback", "Нажми на вторую ноту на грифе.");
  byId("interval-quiz-status").textContent = "Нажми на ноту ♫";
  drawBuild();
}

function drawBuild() {
  const quiz = state.build;
  if (!quiz) return;
  const reveal = quiz.answered;
  const places = reveal ? positionsForMidi(quiz.target) : [];
  renderFretboard({
    container: "interval-quiz-board",
    highlighted: [
      { string: quiz.base.string, fret: quiz.base.fret, kind: "root" },
      ...places.map((position) => ({ string: position.string, fret: position.fret, kind: "note" })),
    ],
    showAll: true,
    clickable: true,
    status: "interval-quiz-status",
    onNoteClick: (position) => {
      if (state.build.answered) return;
      state.build.answered = true;
      const correct = position.midi === state.build.target;
      record("intervalBuild", correct);
      const example = bestPosition(state.build.target);
      setFeedback(
        "interval-build-feedback",
        correct
          ? `Верно! ${writtenNote(state.build.answerName, state.build.target)} — это ${quiz.interval.name}, ${semiText(quiz.interval.semitones)}.`
          : `Не совсем. От ${writtenNote(quiz.root, quiz.base.midi)} на ${semiText(quiz.interval.semitones)} вверх — ${writtenNote(quiz.answerName, quiz.target)}, например ${example.string + 1}-я струна, ${example.fret}-й лад.`,
        correct ? "success" : "error",
      );
      drawBuild();
    },
  });
}

function newEar() {
  const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
  const midi = 48 + Math.floor(Math.random() * 10);
  state.ear = { interval, midi };
  const pool = intervalOptions();
  const correct = pool.find((item) => item.value === interval.id);
  unlockAnswers("ear-answers");
  answerButtons("ear-answers", makeOptions(correct, pool), interval.id, (correctAnswer) => {
    record("intervalEar", correctAnswer);
    setFeedback(
      "ear-feedback",
      correctAnswer
        ? `Верно! ${interval.name}, ${semiText(interval.semitones)}.`
        : `Это ${interval.name}, ${semiText(interval.semitones)}. Запомни краску: ${interval.feel}.`,
      correctAnswer ? "success" : "error",
    );
  });
  setFeedback("ear-feedback", "Нажми «Слушать», затем выбери ответ.");
}
