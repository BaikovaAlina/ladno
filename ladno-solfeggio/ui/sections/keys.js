/*
 * 06. КВИНТОВЫЙ КРУГ
 * SVG-круг с 12 узлами, ключевые знаки, аккорды тональности I–vii° с
 * функциями и готовые пути модуляции.
 */
import { ROOTS, parseNote, prettyNote } from "../../core/notes.js";
import {
  CIRCLE, ENHARMONIC_KEYS, DEGREE_INFO, circleNeighbours, keySignList,
  modulations, prettySigns, keySignText,
} from "../../core/keys.js";
import { chordOfDegree, makeChord, getTriad, getSeventh } from "../../core/chords.js";
import { playProgressionAudio, strum } from "../../core/audio.js";
import { byId, setFeedback } from "../dom.js";
import { playChord } from "../../core/audio.js";
import { record } from "../state.js";

const state = { index: 0, mode: "major", variant: null, task: "signs", quiz: null, showDegrees: true };

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> НАЙДИ СВОЮ ТОНАЛЬНОСТЬ</div>
          <h2>Квинтовый круг</h2>
          <p>Соседи по кругу отличаются одним ключевым знаком. Нажми на узел, чтобы услышать тонику и увидеть аккорды.</p>
        </div>
        <div class="switch" role="group" aria-label="Лад">
          <button type="button" class="active" data-key-mode="major" aria-pressed="true">Мажор</button>
          <button type="button" data-key-mode="minor" aria-pressed="false">Минор</button>
        </div>
      </div>

      <div class="circle-layout">
        <div class="key-circle" id="key-circle" aria-label="Квинтовый круг"></div>
        <div class="key-detail">
          <div class="overline" id="key-overline">ВЫБРАННАЯ ТОНАЛЬНОСТЬ</div>
          <h3 id="key-title">C</h3>
          <p id="key-signs-text"></p>
          <div class="enharmonic-options" id="key-variants"></div>
          <div class="key-detail-line"><span>Ключевые знаки</span><strong id="key-signs"></strong></div>
          <div class="key-detail-line"><span>Параллельная</span><strong id="key-relative"></strong></div>
          <div class="key-detail-line"><span>Соседи по кругу</span><strong id="key-neighbours"></strong></div>
          <div class="key-detail-line"><span>Тоника</span><strong id="key-tonic"></strong></div>
          <p class="fine-print" id="key-note"></p>
          <div class="button-row" style="margin-top:14px">
            <button class="button button-dark button-small" id="key-play-tonic" type="button"><span>▶</span> Тоника</button>
            <button class="button button-ghost button-small" id="key-play-degrees" type="button">Аккорды I–IV–V</button>
          </div>
        </div>
      </div>

      <div class="composition-head">
        <div>
          <div class="overline">АККОРДЫ ТОНАЛЬНОСТИ</div>
          <p>Семь ступеней с функциями: T — покой, S — движение, D — напряжение.</p>
        </div>
        <button class="button button-ghost button-small" id="key-toggle-degrees" type="button">Скрыть аккорды</button>
      </div>
      <div class="table-wrap" id="key-degrees-wrap" style="margin-top:10px">
        <table class="data" id="key-degrees"></table>
      </div>

      <div class="section-title" style="margin:26px 0 12px">
        <div>
          <div class="overline">МОДУЛЯЦИИ</div>
          <h2 style="font-size:19px">Как уйти <em>в соседнюю тональность.</em></h2>
        </div>
      </div>
      <div class="theory-grid three" id="key-modulations"></div>
    </div>

    <div class="exercise" id="key-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 06</div>
          <h2>Ключевые знаки</h2>
          <p id="key-quiz-prompt">Сколько знаков в этой тональности?</p>
        </div>
        <span class="exercise-stats" data-stats="keySigns"></span>
      </div>
      <div class="answer-row" id="key-answers" style="margin-top:14px"></div>
      <div class="exercise-bottom">
        <div>
          <button class="button button-ghost" id="key-next" type="button">Другое задание <span>↗</span></button>
          <p class="feedback" id="key-feedback" aria-live="polite">Выбери ответ.</p>
        </div>
        <span class="chip muted">Помни: диезы идут по квинтам вверх, бемоли — вниз</span>
      </div>
    </div>
  `;

  document.querySelectorAll("[data-key-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.keyMode;
      document.querySelectorAll("[data-key-mode]").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      renderKey();
    });
  });

  byId("key-play-tonic").addEventListener("click", () => {
    const key = activeKey();
    const tonic = state.mode === "major" ? key.major : key.minor.replace("m", "");
    const chord = state.mode === "major"
      ? makeChord(tonic, getTriad("major"))
      : makeChord(tonic, getTriad("minor"));
    strum(chord.notes.map((note) => note.midi), 1.8);
  });
  byId("key-play-degrees").addEventListener("click", () => {
    const key = activeKey();
    const chords = [0, 3, 4].map((degree) => {
      const chord = chordOfDegree(key.major, degree);
      return chord.notes.map((note) => note.midi);
    });
    playProgressionAudio(chords, 90, 4);
  });
  byId("key-toggle-degrees").addEventListener("click", () => {
    state.showDegrees = !state.showDegrees;
    byId("key-degrees-wrap").hidden = !state.showDegrees;
    byId("key-toggle-degrees").textContent = state.showDegrees ? "Скрыть аккорды" : "Показать аккорды";
  });

  byId("key-next").addEventListener("click", newQuiz);

  renderKey();
  newQuiz();
}

function activeKey() {
  const base = CIRCLE[state.index];
  if (state.variant) {
    const variant = ENHARMONIC_KEYS.find((item) => item.major === state.variant);
    if (variant) return variant;
  }
  return base;
}

function renderKey() {
  renderCircle();
  const key = activeKey();
  const isMajor = state.mode === "major";
  const tonicName = isMajor ? key.major : key.minor.replace("m", "");
  const neighbor = circleNeighbours(state.index);

  byId("key-title").textContent = isMajor ? key.major : key.minor;
  byId("key-overline").textContent = isMajor ? "МАЖОРНАЯ ТОНАЛЬНОСТЬ" : "МИНОРНАЯ ТОНАЛЬНОСТЬ";
  byId("key-signs-text").textContent = `${keySignText(key)}${key.count ? ": " + prettySigns(key) : ""}.`;
  byId("key-signs").textContent = key.count ? `${key.count} · ${key.kind === "#" ? "диезы" : "бемоли"}` : "нет";
  byId("key-relative").textContent = isMajor ? `${key.minor} (${key.count} знаков)` : `${key.major} (${key.count} знаков)`;
  byId("key-neighbours").innerHTML = `<span title="на кварту вниз">${neighbor.left.major}</span> · <span title="на квинту вверх">${neighbor.right.major}</span>`;
  byId("key-tonic").textContent = tonicName;

  // Энгармонические варианты: для F#/Gb, C#/Db и Cb/B.
  const variants = ENHARMONIC_KEYS.filter((item) =>
    parseNote(item.major).pc === parseNote(key.major).pc || item.index === state.index);
  byId("key-variants").innerHTML = variants.length
    ? variants.map((item) => `
      <button type="button" data-variant="${item.major}" class="${item.major === key.major ? "active" : ""}">${prettyNote(item.major)} (${item.count} ${item.kind === "#" ? "♯" : "♭"})</button>`).join("")
    : "";
  byId("key-variants").querySelectorAll("[data-variant]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.variant;
      const variant = ENHARMONIC_KEYS.find((item) => item.major === next);
      if (variant && parseNote(variant.major).pc === parseNote(CIRCLE[state.index].major).pc) {
        state.variant = variant.major;
      } else {
        state.variant = null;
        const index = CIRCLE.findIndex((item) => item.major === next);
        if (index >= 0) state.index = index;
      }
      renderKey();
    });
  });

  byId("key-note").textContent = key.count === 0
    ? "C-мажор и A-минор — единственные тональности без знаков. Все остальные получают по одному знаку при движении по кругу."
    : `Каждый шаг по часовой стрелке добавляет ${key.kind === "#" ? "диез" : "бемоль"}; против часовой — убирает.`;

  renderDegrees(key);
  renderModulations(key);
  renderCircle();
}

function renderCircle() {
  const size = 380;
  const center = size / 2;
  const outer = 158;
  const inner = 112;
  const key = activeKey();
  const parts = [
    `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Квинтовый круг: 12 тональностей">`,
    `<circle cx="${center}" cy="${center}" r="${outer}" fill="var(--paper-2)" stroke="var(--line-2)"/>`,
    `<circle cx="${center}" cy="${center}" r="${inner}" fill="var(--white)" stroke="var(--line)"/>`,
  ];
  CIRCLE.forEach((item, index) => {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    const x = center + Math.cos(angle) * (outer - 30);
    const y = center + Math.sin(angle) * (outer - 30);
    const active = index === state.index;
    const isMinorActive = state.mode === "minor";
    parts.push(`
      <g class="key-node" data-index="${index}" role="button" tabindex="0" aria-label="${item.major} мажор или ${item.minor}">
        <circle cx="${x}" cy="${y}" r="25" fill="${active ? "var(--deep)" : "var(--white)"}" stroke="${active ? "var(--deep)" : "var(--line-2)"}" stroke-width="1.4"/>
        <text x="${x}" y="${y - 3}" text-anchor="middle" fill="${active ? "#f6faf2" : "var(--ink-soft)"}" font-family="Arial, sans-serif" font-size="11.5" font-weight="700">${prettyNote(item.major)}</text>
        <text x="${x}" y="${y + 10}" text-anchor="middle" fill="${active ? "#cfe3bf" : "var(--muted)"}" font-family="Arial, sans-serif" font-size="8.5">${item.count ? item.count + (item.kind === "#" ? "♯" : "♭") : "0"}</text>
      </g>`);
    // Параллельный минор внутри круга.
    const ix = center + Math.cos(angle) * (inner - 24);
    const iy = center + Math.sin(angle) * (inner - 24);
    const minorActive = active && isMinorActive;
    parts.push(`
      <g class="key-node" data-index="${index}" data-minor="1" role="button" tabindex="0" aria-label="${item.minor} минор">
        <circle cx="${ix}" cy="${iy}" r="19" fill="${minorActive ? "var(--deep)" : "var(--soft)"}" stroke="${minorActive ? "var(--deep)" : "var(--line)"}"/>
        <text x="${ix}" y="${iy + 3.5}" text-anchor="middle" fill="${minorActive ? "#f6faf2" : "var(--muted)"}" font-family="Arial, sans-serif" font-size="9.5" font-weight="700">${prettyNote(item.minor)}</text>
      </g>`);
  });
  // Центральная подпись.
  parts.push(`
    <text x="${center}" y="${center - 10}" text-anchor="middle" fill="var(--muted-2)" font-family="Arial, sans-serif" font-size="8" font-weight="700" letter-spacing="1">КВИНТОВЫЙ</text>
    <text x="${center}" y="${center + 4}" text-anchor="middle" fill="var(--muted-2)" font-family="Arial, sans-serif" font-size="8" font-weight="700" letter-spacing="1">КРУГ</text>
    <text x="${center}" y="${center + 22}" text-anchor="middle" fill="${key.major === CIRCLE[state.index].major ? "var(--green)" : "var(--muted-2)"}" font-family="Georgia, serif" font-size="17">${prettyNote(key.major)}</text>`);
  parts.push("</svg>");
  byId("key-circle").innerHTML = parts.join("");

  const activate = (target) => {
    const group = target.closest("[data-index]");
    if (!group) return;
    state.index = Number(group.dataset.index);
    const minorClick = !!group.dataset.minor;
    if (minorClick) state.mode = "minor";

    // Тонику выбранной тональности слышим сразу — коротким трезвучием.
    const node = CIRCLE[state.index];
    const tonic = (minorClick || state.mode === "minor") ? node.minor.replace("m", "") : node.major;
    const chord = makeChord(tonic, getTriad(minorClick || state.mode === "minor" ? "minor" : "major"));
    playChord(chord.notes.map((note) => note.midi), 1.1, 0.5);

    state.variant = null;
    if (group.dataset.minor) state.mode = "minor";
    document.querySelectorAll("[data-key-mode]").forEach((b) => {
      const active = b.dataset.keyMode === state.mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderKey();
  };
  byId("key-circle").onclick = (event) => activate(event.target);
  byId("key-circle").onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(event.target);
    }
  };
}

function renderDegrees(key) {
  const rows = DEGREE_INFO.map((info) => {
    const chord = chordOfDegree(key.major, info.degree);
    return `<tr>
      <td><strong>${info.roman}</strong> <span class="fn-badge" title="${info.note}">${info.fn}</span></td>
      <td><strong>${prettyNote(chord.symbol)}</strong></td>
      <td>${info.quality}</td>
      <td style="color:var(--muted)">${info.note}</td>
    </tr>`;
  }).join("");
  byId("key-degrees").innerHTML = `
    <thead><tr><th>Ступень</th><th>Аккорд</th><th>Тип</th><th>Функция</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderModulations(key) {
  const moves = modulations(state.index);
  byId("key-modulations").innerHTML = moves.map((move, index) => `
    <article class="lesson-card" style="min-height:auto">
      <span class="card-no">0${index + 1} <span>↗</span></span>
      <h3>${prettyNote(key.major)} → ${prettyNote(move.target.replace("m", ""))}</h3>
      <p>${move.explanation}</p>
      <div class="card-example">${move.how} <span>${move.chord}</span></div>
    </article>`).join("");
}

function newQuiz() {
  // Задание: «сколько знаков» или «какая тональность» — по очереди.
  const askSigns = Math.random() < 0.6;
  const pool = [...CIRCLE, ...ENHARMONIC_KEYS];
  const item = pool[Math.floor(Math.random() * pool.length)];
  // Для «сколько знаков» нужны разные ответы — берём 0..7.
  const counts = [0, 1, 2, 3, 4, 5, 6, 7];
  if (askSigns) {
    byId("key-quiz-prompt").textContent = `Сколько ключевых знаков в ${prettyNote(item.major)}-мажоре?`;
    const options = counts.map((count) => ({ value: count, label: String(count) }));
    renderAnswerButtons(byId("key-answers"), options, item.count, (correct) => {
      record("keySigns", correct);
      setFeedback(
        "key-feedback",
        correct
          ? `Верно: ${item.count} ${item.kind === "#" ? "диез(ей)" : "бемоль(ей)"}${item.count ? " — " + prettySigns(item) : ""}.`
          : `На самом деле ${item.count} ${item.kind === "#" ? "диез(ей)" : "бемоль(ей)"}${item.count ? " — " + prettySigns(item) : ""}.`,
        correct ? "success" : "error",
      );
    });
  } else {
    byId("key-quiz-prompt").textContent = `Какая тональность имеет ${item.count} ${item.kind === "#" ? "диез(ей)" : "бемоль(ей)"}${item.count ? " (" + prettySigns(item) + ")" : " (без знаков)"}?`;
    const candidates = [...CIRCLE, ...ENHARMONIC_KEYS]
      .filter((candidate) => candidate.major !== item.major)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((candidate) => ({ value: candidate.major, label: prettyNote(candidate.major) }));
    const options = [...candidates, { value: item.major, label: prettyNote(item.major) }].sort(() => Math.random() - 0.5);
    renderAnswerButtons(byId("key-answers"), options, item.major, (correct) => {
      record("keySigns", correct);
      setFeedback(
        "key-feedback",
        correct
          ? `Верно: ${prettyNote(item.major)}-мажор, ${item.count} ${item.kind === "#" ? "диез(ей)" : "бемоль(ей)"}.`
          : `Это ${prettyNote(item.major)}-мажор (${item.count} ${item.kind === "#" ? "диез(ей)" : "бемоль(ей)"}).`,
        correct ? "success" : "error",
      );
    });
  }
}

function renderAnswerButtons(container, options, correctValue, callback) {
  container.innerHTML = "";
  container.dataset.locked = "0";
  options.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.textContent = item.label;
    button.dataset.value = String(item.value);
    button.addEventListener("click", () => {
      if (container.dataset.locked === "1") return;
      container.dataset.locked = "1";
      const correct = String(item.value) === String(correctValue);
      [...container.children].forEach((child) => {
        child.disabled = true;
        if (child.dataset.value === String(correctValue)) child.classList.add("correct");
      });
      if (!correct) button.classList.add("wrong");
      callback(correct);
    });
    container.append(button);
  });
}
