/*
 * 09. ПЕНТАТОНИКА
 *
 * Минорная (1 ♭3 4 5 ♭7) и мажорная (1 2 3 5 6) пентатоника:
 *  - гриф с подсветкой всех нот и отдельным цветом корня;
 *  - кнопка «показать 5 боксов» — полупрозрачные области позиций;
 *  - упражнения: «найди все ноты», «определи на слух», «сыграй в позиции N».
 */
import {
  ROOTS, STRINGS, bestPosition, mod, parseNote, pentatonicBoxes, prettyNote,
} from "../../core/notes.js";
import {
  PENTATONIC_TYPES, getScale, scaleNames, pentatonicPositions,
} from "../../core/scales.js";
import { playSequence } from "../../core/audio.js";
import {
  answerButtons, byId, fillSelect, makeOptions, setFeedback, unlockAnswers,
} from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { renderStaff } from "../staff.js";
import { record } from "../state.js";

const state = {
  type: "minor",
  showBoxes: true,
  activeBox: null,
  selected: new Set(),
  find: null,
  ear: null,
  boxQuiz: null,
  boxSelected: new Set(),
};

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ПЯТЬ НОТ ВМЕСТО СЕМИ</div>
          <h2>Пентатоника на грифе</h2>
          <p>Корень — тёмный круг, остальные ноты — зелёные. Кнопка «Показать 5 боксов» накладывает окна позиций.</p>
        </div>
        <button class="button button-dark" id="pent-play" type="button"><span>▶</span> Слушать гамму</button>
      </div>

      <div class="controls">
        <label>Тоника <select id="pent-root"></select></label>
        <label>Тип <select id="pent-type">
          <option value="minor">Минорная (1 ♭3 4 5 ♭7)</option>
          <option value="major">Мажорная (1 2 3 5 6)</option>
        </select></label>
        <div class="switch" role="group" aria-label="Боксы">
          <button type="button" class="active" id="pent-boxes-toggle" aria-pressed="true">Показать 5 боксов</button>
        </div>
        <button class="button button-ghost" id="pent-lick" type="button">Сыграть фразу <span>♪</span></button>
      </div>

      <div class="fret-scroll">
        <div id="pent-board" class="fretboard" aria-label="Пентатоника на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> тоника</span>
          <span><i class="legend-note"></i> ноты пентатоники</span>
          <span><i class="legend-muted"></i> остальной гриф</span>
        </div>
        <span id="pent-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="info-strip" id="pent-degrees"></div>

      <div class="composition-head">
        <div>
          <div class="overline">ПЯТЬ БОКСОВ</div>
          <p>Бокс — окно в четыре лада, где все ноты играются без смены руки. Нажми на карточку, чтобы выделить окно.</p>
        </div>
        <button class="button button-ghost button-small" id="pent-box-clear" type="button">Снять выделение</button>
      </div>
      <div class="box-grid" id="pent-boxes"></div>

      <div class="plain-block" id="pent-tip" style="margin-top:14px"></div>
      <div class="mistake-block" id="pent-mistake"></div>

      <div class="score-block">
        <div>
          <div class="overline">ПЕНТАТОНИКА НА СТАНЕ</div>
          <strong id="pent-summary"></strong>
          <p>Пять нот и повтор тоники. На стане видно, какие ступени пропущены.</p>
        </div>
        <div id="pent-staff" class="staff" aria-label="Пентатоника на нотном стане"></div>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ОТКУДА ОНА БЕРЁТСЯ</div>
        <h2>Убери полутоны — <em>получишь пентатонику.</em></h2>
      </div>
      <span class="reading-time">≈ 6 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">01 <span>↗</span></span>
        <h3>Минорная пентатоника</h3>
        <p>Формула: <strong>1 – ♭3 – 4 – 5 – ♭7</strong>. Это натуральный минор без II и VI ступеней — именно они дают «полутоновые» конфликты. В A: A C D E G.</p>
        <div class="card-example">A C D E G <span>1 ♭3 4 5 ♭7</span></div>
        <div class="plain-block"><b>На пальцах:</b> 5-я струна открытая (A), 3-й лад (C); 4-я струна открытая (D), 2-й лад (E); 3-я струна открытая (G). Вся гамма — в открытой позиции.</div>
        <div class="mistake-block"><b>Типичная ошибка новичка:</b> считать, что пентатоника «неправильная» гамма. Это не обрезанный минор, а самостоятельный лад, где нет полутонов — поэтому любая нота звучит «в тему».</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">02 <span>↗</span></span>
        <h3>Мажорная пентатоника</h3>
        <p>Формула: <strong>1 – 2 – 3 – 5 – 6</strong>. Мажор без IV и VII ступеней. В C: C D E G A — ровно ноты открытых струн гитары.</p>
        <div class="card-example">C D E G A <span>1 2 3 5 6</span></div>
        <div class="plain-block"><b>На пальцах:</b> 5-я струна 3-й лад (C), 4-я струна 2-й лад (E), 3-я струна открытая (G), 3-я струна 2-й лад (A), 2-я струна 1-й лад (C).</div>
        <div class="mistake-block"><b>Типичная ошибка новичка:</b> путать C-мажорную пентатонику с A-минорной. Первая — те же ноты, что вторая, но центр другой: C против A. Определи, на какой ноте ты хочешь «стоять».</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">03 <span>↗</span></span>
        <h3>Боксы и переходы</h3>
        <p>Пять боксов покрывают весь гриф. Каждый следующий — на 2–3 лада выше. Бокс задаётся окном в четыре лада и корнем на конкретной струне.</p>
        <div class="card-example">бокс 1 → 2 → 3 → 4 → 5 <span>+2…3 лада</span></div>
        <div class="plain-block"><b>На пальцах:</b> выучи бокс 1 (A на 6-й струне, 5-й лад). Передвинь всю схему на 2 лада вверх — это уже другой бокс, но та же гамма.</div>
        <div class="mistake-block"><b>Типичная ошибка новичка:</b> выучить один бокс и играть только его. Профессионалы мыслят переходами между боксами — учи сразу связки.</div>
      </article>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ТЕХНИКА</div>
        <h2>Легато и бенды <em>на пентатонике.</em></h2>
      </div>
    </div>
    <div class="theory-grid two">
      <article class="lesson-card">
        <h3>Легато: молоток и срыв</h3>
        <p><strong>Hammer-on</strong> — удар пальцем левой руки вместо щипка. <strong>Pull-off</strong> — «срыв» пальца, звук извлекается левой рукой. Играй пентатонику легато, чтобы фраза звучала плавно, а не «тыкала».</p>
        <div class="card-example">5h7 на 5-й струне <span>удар + срыв</span></div>
        <div class="plain-block"><b>На пальцах:</b> на 5-й струне щипни A (открытая), ударь 3-й лад (C) — это хаммер. Обратно — пулл-офф.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> слишком сильно прижимать струну при пулл-оффе. Нужно движение пальца вниз-в сторону, а не просто «отпустить».</div>
      </article>
      <article class="lesson-card">
        <h3>Бенды: ♭3 → 3 и ♭7 → 1</h3>
        <p>Бенд — натяжение струны, чтобы повысить ноту. В минорной пентатонике самые выразительные бенды: из <strong>♭3 в 3</strong> (блюзовая краска) и из <strong>♭7 в 1</strong> (возвращение домой).</p>
        <div class="card-example">C → C♯ <span>бенд на полтона</span></div>
        <div class="plain-block"><b>На пальцах:</b> 2-я струна, 1-й лад (C) — тяни до 2-го лада (C♯). Сначала медленно, слушая, как меняется высота.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> бендиться «на глаз», не слыша ноту. Всегда доводи бенд до точной высоты — иначе это просто грязь.</div>
      </article>
    </div>

    <!-- Упражнение 1 -->
    <div class="exercise" id="pent-find">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 09</div>
          <h2>Найди все ноты пентатоники</h2>
          <p id="pent-find-prompt">Выбери каждую ноту пентатоники — по одному разу.</p>
        </div>
        <span class="exercise-stats" data-stats="pentatonicFind"></span>
      </div>
      <p class="task-hint">Как в разделе гамм: ровно пять разных звуков, без лишних. Повторный клик снимает выбор.</p>
      <div class="fret-scroll exercise-board">
        <div id="pent-find-board" class="fretboard" aria-label="Найти ноты пентатоники"></div>
      </div>
      <div class="quiz-status" id="pent-find-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="selected-line">Выбрано: <strong id="pent-find-picked">пока ничего</strong></div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="pent-find-check" type="button">Проверить <span>↗</span></button>
          <p class="feedback" id="pent-find-feedback" aria-live="polite">Выбирай ноты на грифе.</p>
        </div>
        <div class="button-row">
          <button class="button button-ghost" id="pent-find-reset" type="button">Заново</button>
          <button class="button button-ghost" id="pent-find-next" type="button">Новое задание <span>↗</span></button>
        </div>
      </div>
    </div>

    <!-- Упражнение 2 -->
    <div class="exercise" id="pent-ear">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 09-b</div>
          <h2>Определи пентатонику на слух</h2>
          <p>Минорная или мажорная? Слушай третью ступень: она решает всё.</p>
        </div>
        <span class="exercise-stats" data-stats="pentatonicEar"></span>
      </div>
      <div class="ear-controls">
        <button class="button button-dark" id="pent-ear-play" type="button"><span>▶</span> Слушать</button>
        <button class="button button-ghost" id="pent-ear-next" type="button">Новая пентатоника <span>↻</span></button>
      </div>
      <div class="answer-row" id="pent-ear-answers" style="margin-top:14px"></div>
      <p class="feedback" id="pent-ear-feedback" aria-live="polite">Сначала послушай гамму, затем выбери тип.</p>
    </div>

    <!-- Упражнение 3 -->
    <div class="exercise" id="pent-box-quiz">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 09-c</div>
          <h2>Сыграй пентатонику в позиции N</h2>
          <p id="pent-box-prompt">Найди бокс и сыграй все его ноты по очереди.</p>
        </div>
        <span class="exercise-stats" data-stats="pentatonicBox"></span>
      </div>
      <p class="task-hint">Внутри выделенного окна нажми на лады, где есть ноты пентатоники. Порядок не важен, важны точность и границы бокса.</p>
      <div class="fret-scroll exercise-board">
        <div id="pent-box-board" class="fretboard" aria-label="Пентатоника в позиции"></div>
      </div>
      <div class="quiz-status" id="pent-box-status" aria-live="polite">Нажми на ноту ♫</div>
      <div class="selected-line">Выбрано: <strong id="pent-box-picked">пока ничего</strong></div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-dark" id="pent-box-check" type="button">Проверить <span>↗</span></button>
          <p class="feedback" id="pent-box-feedback" aria-live="polite">Выбери все ноты в окне бокса.</p>
        </div>
        <div class="button-row">
          <button class="button button-ghost" id="pent-box-reset" type="button">Заново</button>
          <button class="button button-ghost" id="pent-box-next" type="button">Другая позиция <span>↗</span></button>
        </div>
      </div>
    </div>
  `;

  fillSelect("pent-root", ROOTS.map((root) => ({ value: root, label: prettyNote(root) })), "A");
  byId("pent-type").value = state.type;

  byId("pent-root").addEventListener("change", () => {
    renderBoard();
    newFind();
    newBoxQuiz();
  });
  byId("pent-type").addEventListener("change", () => {
    state.type = byId("pent-type").value;
    state.activeBox = null;
    renderBoard();
    newFind();
    newEar();
    newBoxQuiz();
  });
  byId("pent-boxes-toggle").addEventListener("click", () => {
    state.showBoxes = !state.showBoxes;
    const button = byId("pent-boxes-toggle");
    button.classList.toggle("active", state.showBoxes);
    button.setAttribute("aria-pressed", String(state.showBoxes));
    button.textContent = state.showBoxes ? "Показать 5 боксов" : "Скрыть боксы";
    renderBoard();
  });
  byId("pent-play").addEventListener("click", () => playScale(false));
  byId("pent-lick").addEventListener("click", () => playScale(true));
  byId("pent-box-clear").addEventListener("click", () => {
    state.activeBox = null;
    renderBoard();
  });

  byId("pent-find-check").addEventListener("click", checkFind);
  byId("pent-find-reset").addEventListener("click", () => {
    state.selected.clear();
    drawFind();
    setFeedback("pent-find-feedback", "Выбирай ноты на грифе.");
  });
  byId("pent-find-next").addEventListener("click", newFind);

  byId("pent-ear-play").addEventListener("click", () => {
    const type = state.ear?.type || "minor";
    const root = byId("pent-root").value;
    playSequence(scaleMidis(root, type), 0.28, 0.5);
  });
  byId("pent-ear-next").addEventListener("click", newEar);

  byId("pent-box-check").addEventListener("click", checkBoxQuiz);
  byId("pent-box-reset").addEventListener("click", () => {
    state.boxSelected.clear();
    drawBoxQuiz();
  });
  byId("pent-box-next").addEventListener("click", newBoxQuiz);

  renderBoard();
  newFind();
  newEar();
  newBoxQuiz();
}

/* ------------------------------------------------------------------ */
/*  Общий рендер                                                       */
/* ------------------------------------------------------------------ */

function scaleMidis(root, type) {
  const scale = getScale(type === "major" ? "majorPent" : "minorPent");
  const base = 48 + parseNote(root).pc;
  return [...scale.offsets.map((offset) => base + offset), base + 12];
}

function playScale(withLick) {
  const root = byId("pent-root").value;
  const type = byId("pent-type").value;
  const midis = scaleMidis(root, type);
  if (!withLick) {
    playSequence(midis, 0.28, 0.5);
    return;
  }
  // Небольшая фраза: вверх, возврат на ♭3, бенд-имитация и завершение на тонике.
  const phrase = [midis[0], midis[1], midis[2], midis[3], midis[2], midis[1], midis[0], midis[2], midis[1], midis[0]];
  playSequence(phrase, 0.26, 0.42);
}

function renderBoard() {
  const root = byId("pent-root").value;
  const type = byId("pent-type").value;
  const scale = getScale(type === "major" ? "majorPent" : "minorPent");
  const rootPc = parseNote(root).pc;
  const names = scaleNames(root, scale);
  const nameLookup = {};
  names.forEach((name) => { nameLookup[parseNote(name).pc] = name; });
  const pcs = scale.offsets.map((offset) => mod(rootPc + offset));

  const highlighted = [];
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = 0; fret <= 15; fret++) {
      const midi = STRINGS[string].midi + fret;
      if (pcs.includes(mod(midi))) {
        highlighted.push({
          string, fret,
          kind: mod(midi) === rootPc ? "root" : "note",
        });
      }
    }
  }

  const boxes = state.showBoxes
    ? pentatonicBoxes(rootPc, type).map((box, index) => ({
        from: box.start,
        to: box.end,
        label: `Бокс ${index + 1}`,
        color: state.activeBox === box.id ? "rgba(120, 160, 110, 0.26)" : undefined,
        stroke: state.activeBox === box.id ? "rgba(80, 120, 80, 0.8)" : undefined,
      }))
    : state.activeBox
      ? [{ from: pentatonicBoxes(rootPc, type).find((b) => b.id === state.activeBox)?.start,
           to: pentatonicBoxes(rootPc, type).find((b) => b.id === state.activeBox)?.end,
           label: `Бокс ${state.activeBox}` }]
      : [];

  renderFretboard({
    container: "pent-board",
    highlighted,
    boxes,
    names: nameLookup,
    status: "pent-status",
    clickable: true,
    // С пятью боксами гриф шире: иначе последний бокс (12–15) обрезался.
    toFret: state.showBoxes || state.activeBox ? 15 : 12,
  });

  byId("pent-degrees").innerHTML = scale.degrees
    .map((degree, index) => `<span class="chip${degree === "1" ? " success" : " muted"}">${degree}: <b>${prettyNote(names[index])}</b></span>`)
    .join("");

  const boxesData = pentatonicBoxes(rootPc, type);
  byId("pent-boxes").innerHTML = boxesData.map((box, index) => `
    <button type="button" class="box-card ${state.activeBox === box.id ? "" : ""}" aria-pressed="${state.activeBox === box.id}" data-box="${box.id}">
      <small>${box.hint}</small>
      <strong>Бокс ${index + 1}</strong>
      <span>лады ${box.start}–${box.end}</span>
    </button>`).join("");
  byId("pent-boxes").querySelectorAll("[data-box]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.box);
      state.activeBox = state.activeBox === id ? null : id;
      state.showBoxes = true;
      byId("pent-boxes-toggle").classList.add("active");
      byId("pent-boxes-toggle").setAttribute("aria-pressed", "true");
      renderBoard();
    });
  });

  const baseMidi = 48 + rootPc;
  const notes = [...scale.offsets.map((offset, index) => ({
    midi: baseMidi + offset, name: names[index],
  })), { midi: baseMidi + 12, name: root }];
  byId("pent-summary").textContent =
    `${prettyNote(root)} ${type === "major" ? "мажорная" : "минорная"}: ${notes.map((note) => prettyNote(note.name)).join(" – ")}`;
  renderStaff("pent-staff", notes, { durations: notes.map(() => "q"), ariaLabel: "Пентатоника на стане" });

  byId("pent-tip").innerHTML = `<span class="block-label">На пальцах</span>${scale.plain}`;
  byId("pent-mistake").innerHTML = `<span class="block-label">Типичная ошибка новичка</span>${scale.mistake}`;
}

/* ------------------------------------------------------------------ */
/*  Упражнение 1: найди ноты                                           */
/* ------------------------------------------------------------------ */

function newFind() {
  const root = byId("pent-root").value;
  const type = byId("pent-type").value;
  const scale = getScale(type === "major" ? "majorPent" : "minorPent");
  state.selected.clear();
  state.find = {
    root, type, scale,
    pcs: scale.offsets.map((offset) => mod(parseNote(root).pc + offset)),
    answered: false,
  };
  byId("pent-find-prompt").textContent =
    `Выбери все ноты ${prettyNote(root)} ${type === "major" ? "мажорной" : "минорной"} пентатоники — по одной на каждый звук.`;
  setFeedback("pent-find-feedback", "Выбирай ноты на грифе.");
  drawFind();
}

function drawFind(reveal = false) {
  const quiz = state.find;
  if (!quiz) return;
  const names = {};
  scaleNames(quiz.root, quiz.scale).forEach((name) => { names[parseNote(name).pc] = name; });
  const highlighted = reveal
    ? quiz.pcs.map((pc) => {
        const position = bestPosition(48 + pc);
        return { string: position.string, fret: position.fret, kind: pc === parseNote(quiz.root).pc ? "root" : "note" };
      })
    : [];
  renderFretboard({
    container: "pent-find-board",
    highlighted,
    selected: [...state.selected],
    showAll: true,
    names,
    clickable: true,
    status: "pent-find-status",
    onNoteClick: (position) => {
      if (state.find.answered) return;
      if (state.selected.has(position.key)) state.selected.delete(position.key);
      else state.selected.add(position.key);
      drawFind();
    },
  });
  const picked = [...state.selected].map((key) => {
    const [string, fret] = key.split(":").map(Number);
    return prettyNote(names[mod(STRINGS[string].midi + fret)] || "?");
  });
  byId("pent-find-picked").textContent = picked.length ? picked.join(" · ") : "пока ничего";
}

function checkFind() {
  const quiz = state.find;
  if (!quiz || quiz.answered) return;
  if (!state.selected.size) {
    setFeedback("pent-find-feedback", "Сначала выбери ноты на грифе.", "error");
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
  record("pentatonicFind", correct);
  const label = (pc) => {
    const index = quiz.pcs.indexOf(pc);
    return index >= 0 ? `${prettyNote(scaleNames(quiz.root, quiz.scale)[index])} (${quiz.scale.degrees[index]})` : prettyNote(["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][pc]);
  };
  setFeedback(
    "pent-find-feedback",
    correct
      ? `Верно! ${scaleNames(quiz.root, quiz.scale).map(prettyNote).join(" – ")} — все пять нот.`
      : `Почти. ${missing.length ? "Не хватает: " + missing.map(label).join(", ") : ""} ${extra.length ? "Лишние: " + extra.map(label).join(", ") : ""}`,
    correct ? "success" : "error",
  );
  drawFind(true);
}

/* ------------------------------------------------------------------ */
/*  Упражнение 2: на слух                                              */
/* ------------------------------------------------------------------ */

function newEar() {
  const root = byId("pent-root").value;
  const type = Math.random() < 0.5 ? "minor" : "major";
  state.ear = { root, type };
  const options = [
    { value: "minor", label: "Минорная" },
    { value: "major", label: "Мажорная" },
  ];
  unlockAnswers("pent-ear-answers");
  answerButtons("pent-ear-answers", makeOptions(options.find((item) => item.value === type), options), type, (correct) => {
    record("pentatonicEar", correct);
    setFeedback(
      "pent-ear-feedback",
      correct
        ? `Верно! Это ${type === "minor" ? "минорная" : "мажорная"} пентатоника от ${prettyNote(root)}. ${type === "minor" ? "Малая терция даёт «тёмную» третью ступень." : "Большая терция даёт «светлую» третью ступень."}`
        : `Это ${type === "minor" ? "минорная" : "мажорная"} пентатоника. Слушай третью ступень: ${type === "minor" ? "на 3 лада от тоники" : "на 4 лада от тоники"}.`,
      correct ? "success" : "error",
    );
  });
  setFeedback("pent-ear-feedback", "Нажми «Слушать», затем выбери тип.");
}

/* ------------------------------------------------------------------ */
/*  Упражнение 3: сыграй в позиции                                     */
/* ------------------------------------------------------------------ */

function newBoxQuiz() {
  const root = byId("pent-root").value;
  const type = byId("pent-type").value;
  const rootPc = parseNote(root).pc;
  const boxes = pentatonicBoxes(rootPc, type);
  const box = boxes[Math.floor(Math.random() * boxes.length)];
  const positions = pentatonicPositions(rootPc, type).find((item) => item.id === box.id);
  state.boxQuiz = { root, type, box, positions, answered: false };
  state.boxSelected.clear();
  byId("pent-box-prompt").textContent =
    `Позиция ${box.id}: сыграй все ноты ${prettyNote(root)} ${type === "major" ? "мажорной" : "минорной"} пентатоники в окне ${box.start}–${box.end} ладов (${box.hint}).`;
  setFeedback("pent-box-feedback", "Выбери все ноты в окне бокса.");
  drawBoxQuiz();
}

function drawBoxQuiz(reveal = false) {
  const quiz = state.boxQuiz;
  if (!quiz) return;
  const { box, positions } = quiz;
  const expected = positions?.notes || [];
  const highlighted = reveal
    ? expected.map((note) => ({
        string: note.string, fret: note.fret,
        kind: note.isRoot ? "root" : "note",
      }))
    : [];
  renderFretboard({
    container: "pent-box-board",
    highlighted,
    selected: [...state.boxSelected],
    showAll: false,
    showGhosts: true,
    fromFret: Math.max(0, box.start - 1),
    toFret: Math.min(15, box.end + 1),
    boxes: [{ from: box.start, to: box.end, label: `Бокс ${box.id}` }],
    clickable: true,
    status: "pent-box-status",
    onNoteClick: (position) => {
      if (quiz.answered) return;
      if (state.boxSelected.has(position.key)) state.boxSelected.delete(position.key);
      else state.boxSelected.add(position.key);
      drawBoxQuiz();
    },
  });
  byId("pent-box-picked").textContent = state.boxSelected.size
    ? `${state.boxSelected.size} из ${expected.length}`
    : "пока ничего";
}

function checkBoxQuiz() {
  const quiz = state.boxQuiz;
  if (!quiz || quiz.answered) return;
  const expected = quiz.positions?.notes || [];
  const expectedKeys = new Set(expected.map((note) => `${note.string}:${note.fret}`));
  const chosen = [...state.boxSelected];
  const correctSet = chosen.length === expectedKeys.size && chosen.every((key) => expectedKeys.has(key));
  quiz.answered = true;
  record("pentatonicBox", correctSet);

  if (correctSet) {
    setFeedback(
      "pent-box-feedback",
      `Верно! Бокс ${quiz.box.id} — это лады ${quiz.box.start}–${quiz.box.end}. Сыграй его по порядку и перенеси на другой корень.`,
      "success",
    );
    // Проигрываем ноты бокса по порядку струн — это и есть аппликатура.
    const ordered = [...expected].sort((a, b) => a.string - b.string || a.fret - b.fret);
    playSequence(ordered.map((note) => note.midi), 0.18, 0.4);
  } else {
    const missing = expected.filter((note) => !state.boxSelected.has(`${note.string}:${note.fret}`)).length;
    const extra = chosen.filter((key) => !expectedKeys.has(key)).length;
    setFeedback(
      "pent-box-feedback",
      `Пока не то. ${missing ? `Не хватает ${missing} нот. ` : ""}${extra ? `Лишних ${extra}. ` : ""}В боксе ${quiz.box.id} ровно ${expected.length} позиций — лады ${quiz.box.start}–${quiz.box.end}.`,
      "error",
    );
  }
  drawBoxQuiz(true);
}
