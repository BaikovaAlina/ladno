/*
 * 14. ЧТЕНИЕ С ЛИСТА И НОТАЦИЯ
 *
 * Теория стана для гитары, VexFlow-нота на стане → найти лад на грифе,
 * режим «30 секунд» с рекордом в localStorage.
 */
import {
  CHROMATIC, LAST_FRET, STRINGS, bestPosition, midiOctave, mod, prettyNote, writtenNote,
} from "../../core/notes.js";
import { playNote } from "../../core/audio.js";
import { byId, setFeedback } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderStaff } from "../staff.js";
import { record, getProgress, update, toast, copyText } from "../state.js";
import { countdown, buildNotePool, pickPosition } from "../exercises.js";

// Диапазон первого задания: ноты в открытой позиции + до 5-го лада,
// чтобы чтение с листа не превращалось в поиск по всему грифу.
const POOL = buildNotePool({ minFret: 0, maxFret: 5, strings: [0, 1, 2, 3, 4, 5] });

const state = {
  quiz: null,
  timer: null,
  running: false,
  score: 0,
  misses: 0,
  best: 0,
  attempts: 0,
  startedAt: 0,
};

export function mount(container) {
  const progress = getProgress();
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> НОТЫ НА СТАНЕ</div>
          <h2>Как читать нотную запись</h2>
          <p>Стан — это пять линеек. Чем выше нота на стане, тем выше звук на грифе.</p>
        </div>
        <button class="button button-dark" id="notation-play" type="button"><span>▶</span> Услышать ноту</button>
      </div>

      <div class="notation-board" id="notation-staff" aria-label="Пример нот на стане"></div>
      <div class="note-question">
        <span class="chip" id="notation-note-name">E – F – G – A</span>
        <span class="chip muted" id="notation-hint">Четыре ноты подряд: чем выше нота на стане, тем ближе лад к корпусу</span>
      </div>
      <div class="score-block" style="margin-top:14px">
        <div>
          <div class="overline">ТЕОРИЯ В ОДНОМ АБЗАЦЕ</div>
          <strong>Скрипичный ключ и гитара</strong>
          <p>Пять линеек снизу вверх — E, G, B, D, F. Гитара звучит октавой ниже, чем записано: нота «E4» на стане — это открытая 1-я струна.</p>
        </div>
        <div class="theory-grid" style="gap:6px">
          <div class="reference-item"><span>Нижняя линейка</span><strong>E</strong></div>
          <div class="reference-item"><span>Под линейками</span><strong>D, C</strong></div>
          <div class="reference-item"><span>Три линейки — B</span><strong>2-я струна</strong></div>
          <div class="reference-item"><span>Добавочная сверху</span><strong>A, B, C</strong></div>
        </div>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ЧИТАЕМ С ЛИСТА</div>
        <h2>Тренировка <em>на 30 секунд.</em></h2>
      </div>
    </div>

    <div class="exercise" id="notation-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 14</div>
          <h2>Найди ноту на грифе</h2>
          <p>На стане появится нота — нажми на лад, где она звучит. В зачёт идёт любая октава.</p>
        </div>
        <span class="exercise-stats" data-stats="notation"></span>
      </div>

      <div class="timer-line">
        <span class="timer-value" id="notation-timer">30</span>
        <div class="timer-bar"><span id="notation-timer-bar"></span></div>
        <span class="chip" id="notation-best">рекорд: ${progress.notation.best || 0}</span>
      </div>

      <div class="exercise-board" style="margin-top:12px">
        <div id="notation-quiz-staff" class="staff" aria-label="Нота для чтения с листа"></div>
      </div>
      <div class="fret-scroll exercise-board">
        <div id="notation-board" class="fretboard" aria-label="Найди ноту на грифе"></div>
      </div>
      <div class="quiz-status" id="notation-status" aria-live="polite">Нажми на ноту ♫</div>

      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="notation-start" type="button"><span>▶</span> Старт на 30 секунд</button>
          <p class="feedback" id="notation-feedback" aria-live="polite">Нажми «Старт», чтобы начать отсчёт.</p>
        </div>
        <div class="button-row">
          <button class="button button-ghost" id="notation-retry" type="button">Ещё раз</button>
          <button class="button button-ghost" id="notation-share" type="button">Поделиться рекордом</button>
        </div>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ТЕОРИЯ</div>
        <h2>Ключ, октавы, <em>длительности.</em></h2>
      </div>
      <span class="reading-time">≈ 4 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">01 <span>↗</span></span>
        <h3>Скрипичный ключ</h3>
        <p>Завиток ключа обводит вторую линейку снизу — там живёт нота G. От неё отсчитываем остальные: линейка, между линейками, добавочная.</p>
        <div class="card-example">E G B D F <span>линейки снизу вверх</span></div>
        <div class="plain-block"><b>На пальцах:</b> нота на второй линейке снизу — G. Это 3-я струна, открытая или 12-й лад.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> считать, что верх стана = толстая струна. Наоборот: выше на стане — выше звук, тоньше струна.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">02 <span>↗</span></span>
        <h3>Транспозиция гитары</h3>
        <p>Гитара звучит октавой ниже записанного. Поэтому одна и та же нота на стане подходит к двум местам на грифе — и это нормально.</p>
        <div class="card-example">написано E4 → звучит E3 <span>октава вниз</span></div>
        <div class="plain-block"><b>На пальцах:</b> открытая 1-я струна (E4) и 2-й лад на 4-й струне (E3) — оба «E».</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> искать одну-единственную позицию. В задании принимается любая октава.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">03 <span>↗</span></span>
        <h3>Длительности и паузы</h3>
        <p>Штиль и рёбра говорят о длительности: целая — без штиля, половинная — штиль, четверть — закрашенная головка, восьмая — с флажком.</p>
        <div class="card-example">𝅝 𝅗𝅥 ♩ ♪ <span>от длинной к короткой</span></div>
        <div class="plain-block"><b>На пальцах:</b> пауза — это тоже знак. Если видишь 𝄽, просто не играй эту долю.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> смотреть только на высоту и игнорировать штили. Ритм читается так же внимательно.</div>
      </article>
    </div>

    <details class="reference">
      <summary>Шпаргалка: ноты на стане и на грифе <span>＋</span></summary>
      <p>Для каждой ноты — самое удобное место в первых пяти ладах.</p>
      <div class="table-wrap" id="notation-table"></div>
    </details>
  `;

  // Пример на стане: четыре ноты подряд, чтобы было видно, как высота
  // ноты связана с ладом на грифе.
  renderStaff(
    "notation-staff",
    [
      { midi: 64, name: "E" },
      { midi: 65, name: "F" },
      { midi: 67, name: "G" },
      { midi: 69, name: "A" },
    ],
    {
      durations: ["q", "q", "q", "q"],
      height: 180,
      maxHeight: 170,
      ariaLabel: "Пример: ноты E, F, G, A на нотном стане",
    },
  );
  renderCheatsheet();
  newQuiz();
  drawBoard();

  byId("notation-play").addEventListener("click", () => {
    if (state.quiz) playNote(state.quiz.midi, 0.9);
  });
  byId("notation-start").addEventListener("click", startSession);
  byId("notation-retry").addEventListener("click", startSession);
  byId("notation-share").addEventListener("click", async () => {
    const progress = getProgress();
    const text = `Мой рекорд в чтении с листа: ${progress.notation.best} нот за 30 секунд! Учусь по «Ладно. Сольфеджио».`;
    toast((await copyText(text)) ? "Рекорд скопирован — можно делиться." : text);
  });

  state.timer = countdown(30, {
    onTick(secondsLeft) {
      byId("notation-timer").textContent = String(Math.ceil(secondsLeft));
      const bar = byId("notation-timer-bar");
      bar.style.width = `${(secondsLeft / 30) * 100}%`;
      bar.classList.toggle("low", secondsLeft <= 7);
    },
    onFinish: finishSession,
  });
}

function renderCheatsheet() {
  const rows = [];
  for (let pc = 0; pc < 12; pc++) {
    const midi = 48 + pc;
    const position = bestPosition(midi);
    const names = CHROMATIC[pc];
    rows.push(`<tr>
      <td><strong>${prettyNote(names)}</strong></td>
      <td>${writtenNote(names, midi)}</td>
      <td>${position.string + 1}-я струна, ${position.fret}-й лад</td>
      <td>${STRINGS.filter((string) => midi - string.midi >= 0 && midi - string.midi <= 5).length} мест в 0–5 ладах</td>
    </tr>`);
  }
  byId("notation-table").innerHTML = `
    <table class="data">
      <thead><tr><th>Нота</th><th>Запись</th><th>Удобная позиция</th><th>Позиций рядом</th></tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>`;
}

function newQuiz() {
  const position = pickPosition(POOL, state.quiz?.key);
  state.quiz = { ...position, answered: false };
  const name = CHROMATIC[state.quiz.pc];
  renderStaff("notation-quiz-staff", [{ midi: state.quiz.midi, name }], {
    duration: "w",
    height: 190,
    ariaLabel: `Нота ${writtenNote(name, state.quiz.midi)} на стане`,
  });
  // Подпись под примером в теории не трогаем: она относится к нотам E–F–G–A,
  // а не к текущему заданию. Задание живёт в блоке упражнения ниже.
}

function drawBoard(reveal = false) {
  renderFretboard({
    container: "notation-board",
    highlighted: reveal && state.quiz
      ? [{ string: state.quiz.string, fret: state.quiz.fret, kind: "root" }]
      : [],
    showAll: true,
    hideLabels: true,
    clickable: true,
    status: "notation-status",
    onNoteClick: (position) => handleAnswer(position),
  });
}

function handleAnswer(position) {
  const quiz = state.quiz;
  if (!quiz || !state.running) {
    // Вне сессии просто даём потренироваться и показываем результат.
    const correct = quiz && position.pc === quiz.pc;
    if (quiz) {
      setFeedback(
        "notation-feedback",
        correct
          ? `Верно! ${prettyNote(CHROMATIC[quiz.pc])} — это ${position.string + 1}-я струна, ${position.fret}-й лад.`
          : `Не совсем: здесь ${prettyNote(CHROMATIC[position.pc])}. Правильно, например: ${bestPosition(quiz.midi).string + 1}-я струна, ${bestPosition(quiz.midi).fret}-й лад.`,
        correct ? "success" : "error",
      );
      drawBoard(true);
    }
    return;
  }
  if (quiz.answered) return;
  quiz.answered = true;
  const correct = position.pc === quiz.pc;
  if (correct) {
    state.score += 1;
    record("notation", true);
    setFeedback("notation-feedback", `Верно! ${prettyNote(CHROMATIC[quiz.pc])}. Счёт: ${state.score}.`, "success");
    newQuiz();
    drawBoard(false);
    // Небольшая задержка, чтобы не «мигало» слишком быстро.
    setTimeout(() => { if (state.running) { drawBoard(false); } }, 30);
  } else {
    state.misses += 1;
    record("notation", false);
    setFeedback(
      "notation-feedback",
      `Здесь ${prettyNote(CHROMATIC[position.pc])}. Эта нота — ${prettyNote(CHROMATIC[quiz.pc])}: например, ${bestPosition(quiz.midi).string + 1}-я струна, ${bestPosition(quiz.midi).fret}-й лад.`,
      "error",
    );
    drawBoard(true);
    setTimeout(() => {
      if (!state.running) return;
      newQuiz();
      drawBoard(false);
    }, 900);
  }
}

function startSession() {
  state.running = true;
  state.score = 0;
  state.misses = 0;
  byId("notation-start").disabled = true;
  byId("notation-retry").disabled = true;
  setFeedback("notation-feedback", "Поехали! Читай ноту на стане и жми лад.");
  newQuiz();
  drawBoard(false);
  state.timer.start();
}

function finishSession() {
  state.running = false;
  byId("notation-start").disabled = false;
  byId("notation-retry").disabled = false;
  const score = state.score;
  const progress = getProgress();
  const best = Math.max(progress.notation.best, score);
  update((current) => ({
    ...current,
    notation: {
      ...current.notation,
      best,
      attempts: current.notation.attempts + 1,
      correct: current.notation.correct + score,
      total: current.notation.total + score + state.misses,
    },
  }), "notation-finish");
  byId("notation-best").textContent = `рекорд: ${best}`;
  const isRecord = score >= best && score > 0;
  setFeedback(
    "notation-feedback",
    isRecord
      ? `Новый рекорд: ${score} нот за 30 секунд! Ошибок: ${state.misses}.`
      : `Результат: ${score} нот за 30 секунд, ошибок ${state.misses}. Рекорд: ${best}.`,
    isRecord ? "success" : score > 0 ? "" : "error",
  );
  if (isRecord) toast(`Новый рекорд: ${score} нот за 30 секунд!`);
  byId("notation-timer").textContent = "30";
  byId("notation-timer-bar").style.width = "100%";
  byId("notation-timer-bar").classList.remove("low");
}

export function onShow() {
  const progress = getProgress();
  const best = byId("notation-best");
  if (best) best.textContent = `рекорд: ${progress.notation.best || 0}`;
}
