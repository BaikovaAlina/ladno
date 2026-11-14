/*
 * 13. РИТМ И ГРУВ
 * Длительности, размеры, ритмическая линейка (HTML, не VexFlow),
 * метроном (Tone.Transport + запасной таймер), ударные и два упражнения:
 * «Хлопни ритм» и «Определи размер на слух».
 */
import {
  METERS, NOTE_VALUES, RHYTHM_PATTERNS, getMeter, getRhythmPattern,
  patternText, timingTolerance,
} from "../../core/rhythm.js";
import {
  playDrum, playRhythmPattern, startMetronome, stopMetronome,
} from "../../core/audio.js";
import { byId, setFeedback, answerButtons, makeOptions, unlockAnswers, fillSelect } from "../dom.js";
import { record, copyText, toast } from "../state.js";

const state = {
  pattern: "backbeat",
  bpm: 90,
  metronome: false,
  tap: { active: false, clicks: [], start: 0, timer: null, recording: false },
  meterQuizAnswered: false,
  tapRounds: 0,
};

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ДЛИТЕЛЬНОСТИ И РАЗМЕРЫ</div>
          <h2>Ритмическая линейка</h2>
          <p>Каждая клетка — доля. Полоски внутри — ноты. Нажми «Играть», чтобы услышать рисунок.</p>
        </div>
        <button class="button button-dark" id="rhythm-play-pattern" type="button"><span>▶</span> Играть рисунок</button>
      </div>

      <div class="controls">
        <label>Размер <select id="rhythm-meter"></select></label>
        <label>Рисунок <select id="rhythm-pattern"></select></label>
        <label>Темп <input type="range" id="rhythm-bpm" min="50" max="180" step="2" value="90"><span class="bpm-label" id="rhythm-bpm-label">90 BPM</span></label>
      </div>

      <div class="rhythm-strip" id="rhythm-strip"></div>
      <div class="info-strip">
        <span class="chip" id="rhythm-pattern-text"></span>
        <span class="chip muted" id="rhythm-description"></span>
      </div>
      <div class="plain-block" id="rhythm-plain" style="margin-top:10px"></div>
      <div class="mistake-block" id="rhythm-mistake"></div>

      <div class="metronome-panel">
        <div class="metronome-display" id="metronome-display"></div>
        <button class="button button-dark" id="metronome-toggle" type="button">▶ Метроном</button>
        <button class="button button-ghost" id="metronome-accent" type="button">Акцент на сильную долю</button>
      </div>
      <p class="notation-note">Метроном работает на Tone.Transport; если CDN недоступен — на обычном таймере (чуть менее точном).</p>

      <div class="composition-head">
        <div>
          <div class="overline">УДАРНЫЕ</div>
          <p>Синтезированные звуки: бочка, малый, хай-хэт. Играй пальцем или пробелом — по клику, без autoplay.</p>
        </div>
      </div>
      <div class="drum-pads">
        <button type="button" class="drum-pad" data-drum="kick">Бочка<small>низкий удар</small></button>
        <button type="button" class="drum-pad" data-drum="snare">Малый<small>бэкбит</small></button>
        <button type="button" class="drum-pad" data-drum="hat">Хай-хэт<small>пульс</small></button>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ТЕОРИЯ РИТМА</div>
        <h2>Длительность, размер, <em>доля.</em></h2>
      </div>
    </div>
    <div class="theory-grid three" id="rhythm-values"></div>
    <div class="theory-grid three" id="rhythm-meters" style="margin-top:12px"></div>

    <div class="exercise" id="tap-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 13</div>
          <h2>Хлопни ритм</h2>
          <p id="tap-prompt">Нажми «Начать», слушай клики метронома и хлопай по рисунку.</p>
        </div>
        <span class="exercise-stats" data-stats="rhythmTap"></span>
      </div>
      <div class="rhythm-score">
        <button class="button button-dark" id="tap-start" type="button"><span>▶</span> Начать</button>
        <span class="chip" id="tap-status">Готов, когда ты готов</span>
        <span class="chip muted">Пробел тоже работает</span>
      </div>
      <button type="button" class="tap-area" id="tap-area">
        <span>ЖМИ ЗДЕСЬ <kbd>или пробел</kbd></span>
        <small id="tap-count" style="color:var(--muted-2);font-size:10px">0 из 0 ударов</small>
      </button>
      <div class="hit-dots" id="tap-dots"></div>
      <p class="feedback" id="tap-feedback" aria-live="polite">После двух тактов метронома начинай хлопать.</p>
      <div class="button-row" style="margin-top:10px">
        <button class="button button-ghost" id="tap-retry" type="button">Ещё раз <span>↻</span></button>
        <button class="button button-ghost" id="tap-share" type="button">Поделиться результатом</button>
      </div>
    </div>

    <div class="exercise" id="meter-exercise">
      <div class="exercise-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / 13-b</div>
          <h2>Определи размер на слух</h2>
          <p>Послушай ритм и выбери: 4/4, 3/4 или 6/8.</p>
        </div>
        <span class="exercise-stats" data-stats="rhythmMeter"></span>
      </div>
      <div class="ear-controls">
        <button class="button button-dark" id="meter-play" type="button"><span>▶</span> Слушать</button>
        <button class="button button-ghost" id="meter-next" type="button">Новый пример <span>↻</span></button>
      </div>
      <div class="answer-row" id="meter-answers" style="margin-top:14px"></div>
      <p class="feedback" id="meter-feedback" aria-live="polite">Сначала послушай, затем выбери размер.</p>
    </div>
  `;

  fillSelect("rhythm-meter", [
    { value: "all", label: "Все размеры" },
    ...METERS.map((meter) => ({ value: meter.id, label: `${meter.name} — ${meter.description}` })),
  ], "4/4");
  renderPatternOptions();
  renderTheory();
  renderStrip();

  byId("rhythm-meter").addEventListener("change", () => {
    renderPatternOptions();
    const pattern = getRhythmPattern(byId("rhythm-pattern").value);
    state.pattern = pattern.id;
    renderStrip();
  });
  byId("rhythm-pattern").addEventListener("change", () => {
    state.pattern = byId("rhythm-pattern").value;
    renderStrip();
  });
  byId("rhythm-bpm").addEventListener("input", () => {
    state.bpm = Number(byId("rhythm-bpm").value);
    byId("rhythm-bpm-label").textContent = `${state.bpm} BPM`;
    if (state.metronome) {
      stopMetronome();
      startMetronomeSafe();
    }
  });
  byId("rhythm-play-pattern").addEventListener("click", () => {
    const pattern = getRhythmPattern(state.pattern);
    playRhythmPattern(pattern, state.bpm, { bars: 2 });
  });

  byId("metronome-toggle").addEventListener("click", toggleMetronome);
  byId("metronome-accent").addEventListener("click", () => {
    if (state.metronome) {
      stopMetronome();
      startMetronomeSafe();
    }
    setFeedback("tap-feedback", "Акцент на первую долю уже включён: метроном выделяет её громче.");
  });

  document.querySelectorAll("[data-drum]").forEach((pad) => {
    pad.addEventListener("click", () => {
      playDrum(pad.dataset.drum, true);
      pad.classList.add("hit");
      setTimeout(() => pad.classList.remove("hit"), 110);
    });
  });

  byId("tap-start").addEventListener("click", startTapGame);
  byId("tap-retry").addEventListener("click", startTapGame);
  byId("tap-area").addEventListener("click", handleTap);
  byId("tap-share").addEventListener("click", async () => {
    const message = `Я хлопнул ритм «${getRhythmPattern(state.pattern).name}» на ${state.bpm} BPM. Попробуй и ты — «Ладно. Сольфеджио».`;
    toast((await copyText(message)) ? "Результат скопирован." : message);
  });

  [byId("meter-play")].forEach((button) => button.addEventListener("click", playMeterExample));
  byId("meter-next").addEventListener("click", newMeterQuiz);

  newMeterQuiz();

  // Пробел — хлопок, но только когда раздел ритма открыт и не в поле ввода.
  document.addEventListener("keydown", spaceHandler);
}

function spaceHandler(event) {
  if (event.code !== "Space") return;
  const active = document.getElementById("view-rhythm");
  if (!active || active.hidden) return;
  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  event.preventDefault();
  handleTap();
}

function renderPatternOptions() {
  const meter = byId("rhythm-meter").value;
  const list = meter === "all" ? RHYTHM_PATTERNS : RHYTHM_PATTERNS.filter((pattern) => pattern.meter === meter);
  fillSelect("rhythm-pattern", list.map((pattern) => ({
    value: pattern.id,
    label: `${pattern.name} · ${pattern.meter}`,
  })), state.pattern);
  if (!list.some((pattern) => pattern.id === state.pattern)) {
    state.pattern = list[0]?.id || "backbeat";
    byId("rhythm-pattern").value = state.pattern;
  }
}

function renderStrip(flashBeat = null) {
  const pattern = getRhythmPattern(state.pattern);
  const meter = getMeter(pattern.meter);
  const beats = meter.beats;
  const cells = [];
  for (let beat = 0; beat < beats; beat++) {
    const hits = pattern.hits.filter((hit) => hit.start >= beat && hit.start < beat + 1);
    const strong = meter.strong.includes(beat);
    const content = hits.map((hit) => {
      const left = ((hit.start - beat) / 1) * 100;
      const width = Math.max(6, (hit.dur / 1) * 100 - 3);
      return `<span class="hit ${hit.voice} ${hit.accent ? "accent" : ""} ${flashBeat === beat ? "flash" : ""}" style="left:${left}%;width:${width}%"></span>`;
    }).join("");
    cells.push(`<div class="beat-cell ${strong ? "strong" : ""}" data-beat="${beat}">
      <span class="cell-no">${beat + 1}</span>${content}
    </div>`);
  }
  byId("rhythm-strip").innerHTML = `
    <div class="beat-bar">${cells.join("")}</div>
    <div style="display:flex;justify-content:space-between;color:var(--muted-2);font-size:9px;font-weight:700">
      <span>${pattern.meter} · ${pattern.name}</span>
      <span>${pattern.bars} такт${pattern.bars > 1 ? "а" : ""} в цикле</span>
    </div>`;

  byId("rhythm-pattern-text").textContent = patternText(pattern);
  byId("rhythm-description").textContent = pattern.description;
  byId("rhythm-plain").innerHTML = `<span class="block-label">На пальцах</span>${pattern.plain}`;
  byId("rhythm-mistake").innerHTML = `<span class="block-label">Типичная ошибка новичка</span>${pattern.mistake}`;
}

function renderTheory() {
  byId("rhythm-values").innerHTML = NOTE_VALUES.map((value) => `
    <article class="lesson-card" style="min-height:auto">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">${value.name}</h3>
        <span style="font-family:Georgia,serif;font-size:30px;line-height:1">${value.glyph}</span>
      </div>
      <p style="margin-top:8px">${value.description}</p>
      <div class="card-example">${value.beats} ${value.beats === 1 ? "доля" : value.beats < 1 ? "доли" : "доли"} <span>в 4/4</span></div>
    </article>`).join("");

  byId("rhythm-meters").innerHTML = METERS.map((meter) => `
    <article class="lesson-card" style="min-height:auto">
      <span class="card-no">${meter.name} <span>↗</span></span>
      <h3>${meter.name === "4/4" ? "Рок и поп" : meter.name === "3/4" ? "Вальс" : meter.name === "6/8" ? "Баллада" : "Марш"}</h3>
      <p>${meter.description}</p>
      <div class="card-example">${Array.from({ length: meter.beats }, (_, i) => meter.strong.includes(i) ? "●" : "○").join(" ")} <span>сильные и слабые доли</span></div>
    </article>`).join("");
}

/* ------------------------------------------------------------------ */
/*  Метроном                                                           */
/* ------------------------------------------------------------------ */

function toggleMetronome() {
  if (state.metronome) {
    state.metronome = false;
    stopMetronome();
    byId("metronome-toggle").innerHTML = "▶ Метроном";
    setFeedback("tap-feedback", "Метроном остановлен.");
    return;
  }
  startMetronomeSafe();
  byId("metronome-toggle").innerHTML = "■ Остановить";
}

function startMetronomeSafe() {
  const pattern = getRhythmPattern(state.pattern);
  const meter = getMeter(pattern.meter);
  state.metronome = true;
  const display = byId("metronome-display");
  display.innerHTML = Array.from({ length: meter.beats }, (_, index) =>
    `<span class="metronome-dot ${meter.strong.includes(index) ? "accent" : ""}" data-dot="${index}"></span>`).join("");
  const dots = [...display.children];
  startMetronome({
    bpm: state.bpm,
    accentEvery: meter.beats,
    onTick: (tick) => {
      const dot = dots[tick % meter.beats];
      dots.forEach((node) => node.classList.remove("on"));
      if (dot) dot.classList.add("on");
    },
  });
  setFeedback("tap-feedback", `Метроном ${state.bpm} BPM · ${pattern.meter}. Первая доля выделена.`);
}

/* ------------------------------------------------------------------ */
/*  «Хлопни ритм»                                                      */
/* ------------------------------------------------------------------ */

function startTapGame() {
  const pattern = getRhythmPattern(state.pattern);
  const bpm = state.bpm;
  const beatSeconds = 60 / bpm;
  const stepSeconds = pattern.meter === "6/8" ? beatSeconds / 2 : beatSeconds;
  const totalBeats = (pattern.meter === "6/8" ? 6 : Number(pattern.meter.split("/")[0]));

  clearTimeout(state.tap.timer);
  state.tap.timeouts?.forEach((id) => clearTimeout(id));
  state.tap = { active: true, clicks: [], start: 0, timer: null, recording: false };
  byId("tap-dots").innerHTML = pattern.hits.map(() => `<span class="hit-dot"></span>`).join("");
  byId("tap-count").textContent = `0 из ${pattern.hits.length} ударов`;
  setFeedback("tap-feedback", "Слушай два такта метронома — потом начинай хлопать.");

  // Два такта отсчёта, затем запись.
  const countIn = 2 * totalBeats * stepSeconds;
  const tickInterval = stepSeconds * 1000;
  state.tap.timeouts = [];
  state.tap.start = performance.now() + countIn * 1000;

  // Слышимый отсчёт: клики идут ровно по сетке.
  for (let beat = 0; beat < totalBeats * 2; beat++) {
    state.tap.timeouts.push(setTimeout(() => {
      if (!state.tap.active) return;
      playDrum("click", beat % totalBeats === 0);
      const cell = byId("rhythm-strip").querySelector(`[data-beat="${beat % totalBeats}"]`);
      if (cell) {
        cell.classList.add("flash");
        setTimeout(() => cell.classList.remove("flash"), 90);
      }
      if (beat === totalBeats * 2 - 1) {
        state.tap.recording = true;
        setFeedback("tap-feedback", "Хлопай! Считай «раз-и-два-и».");
      }
    }, beat * tickInterval));
  }

  // Окно записи: ещё два такта.
  const recordWindow = 2 * totalBeats * stepSeconds * 1000;
  state.tap.timer = setTimeout(() => finishTapGame(pattern, stepSeconds, totalBeats), countIn * 1000 + recordWindow);
}

function handleTap() {
  if (!state.tap.active) {
    // Если игра не запущена, но раздел открыт — просто дадим звук.
    playDrum("snare", false);
    return;
  }
  playDrum("snare", false);
  byId("tap-area").classList.add("tap");
  setTimeout(() => byId("tap-area").classList.remove("tap"), 90);
  if (!state.tap.recording) return;
  const now = performance.now();
  const relative = (now - state.tap.start) / 1000;
  const pattern = getRhythmPattern(state.pattern);
  const beatSeconds = 60 / state.bpm;
  const stepSeconds = pattern.meter === "6/8" ? beatSeconds / 2 : beatSeconds;
  const totalBeats = pattern.meter === "6/8" ? 6 : Number(pattern.meter.split("/")[0]);
  const cycle = totalBeats * stepSeconds;
  const position = ((relative % cycle) + cycle) % cycle;
  state.tap.clicks.push(position / stepSeconds);

  const dots = [...byId("tap-dots").children];
  if (dots[state.tap.clicks.length - 1]) dots[state.tap.clicks.length - 1].classList.add("ok");
  byId("tap-count").textContent = `${state.tap.clicks.length} из ${pattern.hits.length} ударов`;
}

function finishTapGame(pattern, stepSeconds, totalBeats) {
  state.tap.recording = false;
  state.tap.active = false;
  const clicks = state.tap.clicks;
  if (!clicks.length) {
    setFeedback("tap-feedback", "Не было ни одного хлопка. Попробуй ещё раз: нажми «Начать» и слушай отсчёт.", "error");
    return;
  }
  // Раскладываем клики по такту: сравниваем с рисунком в долях.
  const tolerance = timingTolerance(pattern) / stepSeconds;
  const hits = pattern.hits;
  const used = new Set();
  let matched = 0;
  const results = hits.map((hit) => {
    let best = -1;
    let bestDistance = Infinity;
    clicks.forEach((click, index) => {
      if (used.has(index)) return;
      const distance = Math.abs(click - hit.start);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    if (best >= 0 && bestDistance <= tolerance) {
      used.add(best);
      matched += 1;
      return true;
    }
    return false;
  });

  const dots = [...byId("tap-dots").children];
  results.forEach((ok, index) => {
    if (!dots[index]) return;
    dots[index].classList.add(ok ? "ok" : "miss");
  });
  clicks.forEach((click, index) => {
    if (used.has(index) || !dots[index]) return;
    dots[index].classList.add("extra");
  });

  const percent = Math.round((matched / hits.length) * 100);
  const passed = percent >= 70;
  record("rhythmTap", passed);
  state.tapRounds += 1;
  setFeedback(
    "tap-feedback",
    passed
      ? `Хорошо! ${matched} из ${hits.length} ударов в точку (${percent}%). Попробуй на ${state.bpm + 10} BPM быстрее.`
      : `Пока ${matched} из ${hits.length} (${percent}%). Секрет простой: сначала просто хлопай на каждую долю, потом переходи к рисунку.`,
    passed ? "success" : "error",
  );
  byId("tap-status").textContent = passed ? "Получилось!" : "Тренируемся дальше";
}

/* ------------------------------------------------------------------ */
/*  Определи размер на слух                                            */
/* ------------------------------------------------------------------ */

function playMeterExample() {
  const quiz = state.meterQuiz;
  if (!quiz) return;
  playRhythmPattern(quiz.pattern, 96, { bars: 2 });
  setFeedback("meter-feedback", "Слушай: где чувствуется повтор — через 2, 3 или 6 долей?");
}

function newMeterQuiz() {
  const candidates = RHYTHM_PATTERNS.filter((pattern) => ["quarters", "waltz", "sixEight", "backbeat"].includes(pattern.id));
  const pattern = candidates[Math.floor(Math.random() * candidates.length)];
  const correct = pattern.meter;
  state.meterQuiz = { pattern, correct };
  const options = ["4/4", "3/4", "6/8"].map((meter) => ({ value: meter, label: meter }));
  unlockAnswers("meter-answers");
  answerButtons("meter-answers", makeOptions(options.find((item) => item.value === correct), options), correct, (isCorrect) => {
    record("rhythmMeter", isCorrect);
    const meter = getMeter(correct);
    setFeedback(
      "meter-feedback",
      isCorrect
        ? `Верно: ${correct}. ${meter.description}`
        : `Это ${correct}. ${meter.description} Подсказка: слушай повтор ударных — он задаёт размер.`,
      isCorrect ? "success" : "error",
    );
  });
  setFeedback("meter-feedback", "Нажми «Слушать», затем выбери размер.");
}
