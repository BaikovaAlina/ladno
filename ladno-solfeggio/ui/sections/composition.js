/*
 * 08. КОМПОЗИЦИЯ
 * Мотив из 16 долей: выбор гаммы, прогрессии, ритма (четверти/восьмые/пунктир),
 * прослушивание, сохранение в localStorage и экспорт в JSON.
 */
import { ROOTS, mod, parseNote, prettyNote, writtenNote } from "../../core/notes.js";
import { SCALES, getScale, scaleNames } from "../../core/scales.js";
import { PROGRESSIONS, getProgression, progressionChords } from "../../core/progressions.js";
import { playEvents } from "../../core/audio.js";
import { byId, fillSelect, setFeedback } from "../dom.js";
import { renderFretboard } from "../fretboard.js";
import { saveMotif, removeMotif } from "../../core/storage.js";
import { update, getProgress, toast } from "../state.js";
import { renderStaff } from "../staff.js";

// Ритмические сетки мотива: массив длительностей в долях, сумма — 4 доли (такт).
const RHYTHMS = [
  {
    id: "quarters", name: "Четверти (4 доли)",
    grid: [1, 1, 1, 1],
    pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    noteLength: 1,
  },
  {
    id: "eighths", name: "Восьмые (8 нот)",
    grid: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    pattern: Array.from({ length: 16 }, () => 0.5),
    noteLength: 0.5,
  },
  {
    id: "dotted", name: "Пунктир (долгая + короткая)",
    grid: [1.5, 0.5, 1.5, 0.5],
    pattern: [1.5, 0, 0.5, 0, 1.5, 0, 0.5, 0, 1.5, 0, 0.5, 0, 1.5, 0, 0.5, 0],
    noteLength: 1.5,
  },
  {
    id: "syncopated", name: "Синкопа (акцент на «и»)",
    grid: [0.5, 1, 0.5, 0.5, 1, 0.5],
    pattern: [0.5, 0, 0.5, 0.5, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 0, 0.5, 0.5, 0.5, 0],
    noteLength: 0.5,
  },
];

const state = { motif: null, rhythm: "quarters", playing: false, timer: null };

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> МАЛЕНЬКАЯ МУЗЫКАЛЬНАЯ ЛАБОРАТОРИЯ</div>
          <h2>Твой первый набросок</h2>
          <p>Четыре такта, гамма и ритм. Сыграй, сохрани в браузере или скачай как JSON.</p>
        </div>
        <button class="button button-dark" id="composition-play" type="button"><span>▶</span> Играть вместе</button>
      </div>

      <div class="controls">
        <label>Тоника <select id="composition-root"></select></label>
        <label>Прогрессия <select id="composition-progression"></select></label>
        <label>Гамма мелодии <select id="composition-scale"></select></label>
        <label>Ритм <select id="composition-rhythm"></select></label>
        <label>Темп <select id="composition-tempo">
          <option value="70">70 BPM</option>
          <option value="90" selected>90 BPM</option>
          <option value="110">110 BPM</option>
          <option value="128">128 BPM</option>
        </select></label>
      </div>

      <div class="composition-head">
        <div>
          <div class="overline">МОТИВ · 4 ТАКТА · 4/4 · <span id="composition-rhythm-label">ЧЕТВЕРТИ</span></div>
          <p id="composition-hint"></p>
        </div>
        <div class="button-row">
          <button class="button button-ghost button-small" id="composition-regenerate" type="button">Новый мотив <span>↻</span></button>
          <button class="button button-ghost button-small" id="composition-save" type="button">Сохранить <span>✳</span></button>
          <button class="button button-ghost button-small" id="composition-export" type="button">Скачать JSON <span>↓</span></button>
        </div>
      </div>

      <div class="motif-editor">
        <div class="motif-line" id="composition-motif" aria-label="Ноты созданного мотива"></div>
        <div class="motif-line" id="composition-rhythm-line" style="opacity:.75"></div>
      </div>
      <div class="fret-scroll" style="margin-top:12px">
        <div id="composition-board" class="fretboard" aria-label="Ноты мотива на грифе"></div>
      </div>
      <div class="board-footer">
        <div class="legend">
          <span><i class="legend-root"></i> тоника</span>
          <span><i class="legend-note"></i> гамма мелодии</span>
        </div>
        <span id="composition-status" class="note-status" aria-live="polite">Нажми на ноту ♫</span>
      </div>

      <div class="score-block">
        <div>
          <div class="overline">МОТИВ НА СТАНЕ</div>
          <strong id="composition-notation"></strong>
          <p>Такт 1 из 4. Одна нота — одна доля (или её часть).</p>
        </div>
        <div id="composition-staff" class="staff" aria-label="Мотив на стане"></div>
      </div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">КАК ЭТО РАБОТАЕТ</div>
        <h2>Из идеи — <em>в маленькую пьесу.</em></h2>
      </div>
      <span class="reading-time">≈ 3 МИН ЧТЕНИЯ</span>
    </div>

    <div class="theory-grid three">
      <article class="lesson-card">
        <span class="card-no">01 <span>↗</span></span>
        <h3>Найди опору</h3>
        <p>Возьми прогрессию I–IV–V–I. На сильной доле попробуй звук текущего аккорда: C над C, F над F, G над G. Все три легко найти на грифе.</p>
        <div class="card-example">C → F → G → C <span>четыре такта</span></div>
        <div class="plain-block"><b>На пальцах:</b> C — 5-я струна, 3-й лад; F — 4-я струна, 3-й лад; G — 6-я струна, 3-й лад.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> играть мелодию вне гармонии. Сначала аккорд, потом нота.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">02 <span>↗</span></span>
        <h3>Повтори и измени</h3>
        <p>Мотив — короткая узнаваемая мысль. Сыграй C–D–E на 5-й струне, лады 3–5–7; повтори и измени последнюю ноту. Оставляй паузы.</p>
        <div class="card-example">C D E · C D G <span>повтор + изменение</span></div>
        <div class="plain-block"><b>На пальцах:</b> одна фраза — два такта; второй раз повтори начало и поменяй конец.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> заполнять нотами каждую долю. Тишина — тоже часть музыки.</div>
      </article>
      <article class="lesson-card">
        <span class="card-no">03 <span>↗</span></span>
        <h3>Выбери ритм</h3>
        <p>Ритм решает настроение: ровные четверти — марш, восьмые — движение, пунктир — характер, синкопа — грув.</p>
        <div class="card-example">четверти · восьмые · пунктир · синкопа <span>4 варианта</span></div>
        <div class="plain-block"><b>На пальцах:</b> переключи ритм при тех же нотах — услышишь, как меняется фраза.</div>
        <div class="mistake-block"><b>Типичная ошибка:</b> путать темп и ритм. Темп — скорость, ритм — рисунок.</div>
      </article>
    </div>

    <div class="panel board-panel" style="margin-top:22px">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ТВОЙ АРХИВ</div>
          <h2>Сохранённые мотивы</h2>
          <p>Всё хранится в этом браузере под ключом ladno.progress.v2. Экспорт JSON — чтобы вернуться к эскизу.</p>
        </div>
        <span class="small-chip" id="composition-count">0 мотивов</span>
      </div>
      <div class="saved-motifs" id="composition-saved"></div>
    </div>
  `;

  fillSelect("composition-root", ROOTS.map((r) => ({ value: r, label: prettyNote(r) })), "C");
  fillSelect("composition-progression", PROGRESSIONS.map((item) => ({ value: item.id, label: `${item.name} · ${item.title}` })), "1451");
  fillSelect("composition-scale", SCALES.map((item) => ({ value: item.id, label: item.name })), "major");
  fillSelect("composition-rhythm", RHYTHMS.map((item) => ({ value: item.id, label: item.name })), "quarters");

  ["composition-root", "composition-progression", "composition-scale"].forEach((id) =>
    byId(id).addEventListener("change", () => renderComposition()));
  byId("composition-rhythm").addEventListener("change", () => {
    state.rhythm = byId("composition-rhythm").value;
    renderComposition();
  });
  byId("composition-regenerate").addEventListener("click", () => {
    state.motif = generateMotif();
    renderComposition();
    setFeedback("composition-status", "Новый мотив готов. Нажми «Играть вместе».");
  });
  byId("composition-play").addEventListener("click", playComposition);
  byId("composition-save").addEventListener("click", saveCurrentMotif);
  byId("composition-export").addEventListener("click", exportMotif);
  byId("composition-motif").addEventListener("click", (event) => {
    const slot = event.target.closest("[data-slot]");
    if (!slot || !state.motif) return;
    const index = Number(slot.dataset.slot);
    const note = state.motif.notes[index];
    if (!note) return;
    playEvents([{ notes: [note.midi], duration: 0.8, velocity: 0.7 }]);
  });

  state.motif = generateMotif();
  renderComposition();
  renderSaved();
}

/* ------------------------------------------------------------------ */
/*  Генерация мотива                                                   */
/* ------------------------------------------------------------------ */

const SCALE_DEGREE_WEIGHTS = [0, 2, 4, 1, 3, 5, 2, 4, 0, 6, 4, 2];
const RHYTHM_MAP = Object.fromEntries(RHYTHMS.map((item) => [item.id, item]));

/**
 * Мотив: 16 шагов сетки. В каждой позиции — нота из гаммы или пауза.
 * Логика простая и «музыкальная»: фраза тяготеет к 1, 3, 5 ступеням,
 * а последняя нота почти всегда — тоника.
 */
function generateMotif() {
  const root = byId("composition-root").value;
  const scaleId = byId("composition-scale").value;
  const progressionId = byId("composition-progression").value;
  const rhythmId = state.rhythm || "quarters";
  const rhythm = RHYTHM_MAP[rhythmId];
  const scale = getScale(scaleId);
  const names = scaleNames(root, scale);
  const base = 48 + parseNote(root).pc;
  const progression = getProgression(progressionId);
  const chords = progressionChords(root, progression);

  const notes = [];
  let step = 0;
  const grid = rhythm.pattern;
  for (let index = 0; index < grid.length; index++) {
    const length = grid[index];
    if (!length) {
      notes.push({ rest: true, beats: 0, grid: index });
      continue;
    }
    // Позиция внутри прогрессии: каждый такт — свой аккорд.
    const bar = Math.floor(index / 4) % 4;
    const chord = chords[bar] || chords[0];
    const chordPcs = chord.pcs;
    const degreeIndex = SCALE_DEGREE_WEIGHTS[(index + step) % SCALE_DEGREE_WEIGHTS.length] % scale.offsets.length;
    const name = names[degreeIndex];
    const pc = parseNote(name).pc;
    const midi = base + scale.offsets[degreeIndex];
    const fits = chordPcs.includes(pc);
    const final = index >= grid.length - 2;
    const useFinal = final && Math.random() < 0.8;
    notes.push({
      midi: useFinal ? base : (fits || Math.random() < 0.45 ? midi : midi + 12),
      name: useFinal ? root : name,
      degree: useFinal ? "1" : scale.degrees[degreeIndex],
      beats: length,
      grid: index,
      fits,
    });
    step += 1;
  }

  return {
    id: "motif-" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    title: `${prettyNote(root)} ${scale.name.toLowerCase()}`,
    root,
    scaleId,
    progressionId,
    rhythmId,
    bpm: Number(byId("composition-tempo").value) || 90,
    bars: 4,
    meter: "4/4",
    notes: notes.map((note) => note.rest ? { rest: true, beats: 0, grid: note.grid } : note),
    chordSymbols: chords.map((chord) => chord.symbol),
  };
}

function renderComposition() {
  const root = byId("composition-root").value;
  const scale = getScale(byId("composition-scale").value);
  const rhythm = RHYTHM_MAP[state.rhythm] || RHYTHMS[0];
  const progression = getProgression(byId("composition-progression").value);
  const chords = progressionChords(root, progression);

  // Мотив хранится отдельно от настроек: после смены гаммы он остаётся,
  // пока ученик сам не нажмёт «Новый мотив». Это защищает от потери наброска.
  if (!state.motif) state.motif = generateMotif();
  const motif = state.motif;

  byId("composition-rhythm-label").textContent = rhythm.name.toUpperCase();
  byId("composition-hint").textContent =
    `${progression.name}: ${chords.map((chord) => prettyNote(chord.symbol)).join(" – ")}. Мелодия — ${prettyNote(root)} ${scale.name.toLowerCase()}.`;

  const slots = motif.notes;
  byId("composition-motif").innerHTML = slots.map((note, index) => {
    if (note.rest) {
      return `<div class="motif-slot rest" data-slot="${index}" title="пауза">—<small>${index + 1}</small></div>`;
    }
    return `<div class="motif-slot" data-slot="${index}" title="${note.degree || ""}">
      ${writtenNote(note.name, note.midi)}
      <small>${index + 1}</small>
    </div>`;
  }).join("");

  byId("composition-rhythm-line").innerHTML = slots.map((note, index) => {
    const beat = note.beats || 0;
    const glyph = beat >= 2 ? "𝅗𝅥" : beat >= 1 ? "♩" : beat > 0 ? "♪" : "·";
    return `<div class="motif-slot rest" style="min-height:26px;font-size:13px">${glyph}</div>`;
  }).join("");

  // Гриф: гамма + подсветка мотива.
  const scalePositions = [];
  const scalePcs = scale.offsets.map((offset) => mod(parseNote(root).pc + offset));
  for (let string = 0; string < 6; string++) {
    for (let fret = 0; fret <= 14; fret++) {
      const midi = [64, 59, 55, 50, 45, 40][string] + fret;
      if (scalePcs.includes(mod(midi))) {
        scalePositions.push({ string, fret, kind: mod(midi) === parseNote(root).pc ? "root" : "note" });
      }
    }
  }
  const motifMidis = new Set(slots.filter((note) => !note.rest).map((note) => note.midi));
  const highlighted = scalePositions.map((position) => {
    const midi = [64, 59, 55, 50, 45, 40][position.string] + position.fret;
    return motifMidis.has(midi) ? { ...position, kind: "selected" } : position;
  });

  renderFretboardSimple("composition-board", highlighted);

  byId("composition-notation").textContent =
    slots.filter((note) => !note.rest).slice(0, 6).map((note) => writtenNote(note.name, note.midi)).join(" · ") + " …";
  renderStaff("composition-staff", slots.filter((note) => !note.rest).slice(0, 8),
    { durations: slots.filter((note) => !note.rest).slice(0, 8).map((note) => note.beats >= 2 ? "h" : note.beats >= 1 ? "q" : "8") });

  byId("composition-tempo").onchange = () => {
    state.motif.bpm = Number(byId("composition-tempo").value);
  };

  renderSaved();
}

function renderFretboardSimple(containerId, highlighted) {
  // Общий рендерер + отдельная подсветка нот, входящих в мотив.
  renderFretboard({
    container: containerId,
    highlighted: highlighted.filter((item) => item.kind !== "selected"),
    selected: highlighted
      .filter((item) => item.kind === "selected")
      .map((item) => `${item.string}:${item.fret}`),
    showAll: false,
    status: "composition-status",
    clickable: true,
  });
}

function playComposition() {
  const motif = state.motif;
  if (!motif) return;
  const bpm = Number(byId("composition-tempo").value) || 90;
  const beat = 60 / bpm;
  let time = 0;
  const events = [];
  motif.notes.forEach((note) => {
    if (note.rest) return;
    events.push({
      notes: [note.midi],
      duration: Math.max(0.16, (note.beats || 1) * beat * 0.92),
      time,
      velocity: 0.72,
    });
    time += (note.beats || 1) * beat;
  });
  // Аккорды прогрессии — тихо, под мелодией.
  const root = byId("composition-root").value;
  const progression = getProgression(byId("composition-progression").value);
  const chords = progressionChords(root, progression);
  chords.forEach((chord, index) => {
    const start = index * 4 * beat;
    events.push({
      notes: chord.notes.map((n) => n.midi),
      duration: 4 * beat * 0.9,
      time: start,
      velocity: 0.3,
    });
  });
  playEvents(events.sort((a, b) => a.time - b.time));

  // Подсветка текущего шага — по таймеру, без анимации requestAnimationFrame.
  const cells = [...byId("composition-motif").children];
  cells.forEach((cell) => cell.classList.remove("playing"));
  clearTimeout(state.timer);
  let index = 0;
  let elapsed = 0;
  const tick = () => {
    cells.forEach((cell) => cell.classList.remove("playing"));
    const cell = cells[index];
    if (cell) cell.classList.add("playing");
    const note = motif.notes[index];
    elapsed = (note?.beats || 1) * beat * 1000;
    index += 1;
    if (index < cells.length) state.timer = setTimeout(tick, elapsed);
    else state.timer = setTimeout(() => cells.forEach((cell) => cell.classList.remove("playing")), elapsed);
  };
  tick();
}

function saveCurrentMotif() {
  const motif = state.motif;
  if (!motif) return;
  const progress = getProgress();
  if (progress.composition.motifs.some((item) => item.id === motif.id)) {
    toast("Этот мотив уже сохранён.");
    return;
  }
  update((current) => saveMotif(current, { ...motif }));
  renderSaved();
  toast("Мотив сохранён в этом браузере.");
}

function exportMotif() {
  const motif = state.motif;
  if (!motif) return;
  const data = {
    app: "ladno-solfeggio",
    version: 2,
    exportedAt: new Date().toISOString(),
    motif: {
      ...motif,
      // Для переносимости добавляем расшифровку: имена нот и аккордов.
      noteNames: motif.notes.map((note) => note.rest ? "rest" : writtenNote(note.name, note.midi)),
      chords: motif.chordSymbols || [],
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${motif.id}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Файл с мотивом скачан.");
}

function renderSaved() {
  const progress = getProgress();
  const motifs = progress.composition.motifs;
  byId("composition-count").textContent = `${motifs.length} ${motifs.length === 1 ? "мотив" : motifs.length < 5 ? "мотива" : "мотивов"}`;
  const list = byId("composition-saved");
  if (!motifs.length) {
    list.innerHTML = `<p style="margin:0;color:var(--muted);font-size:11px">Пока пусто. Собери мотив и нажми «Сохранить» — он появится здесь и переживёт перезагрузку страницы.</p>`;
    return;
  }
  list.innerHTML = motifs.map((motif) => `
    <div class="saved-motif">
      <div>
        <b>${motif.title}</b> · ${motif.chordSymbols?.map(prettyNote).join(" – ") || "—"}
        <div style="font-size:10px;color:var(--muted-2)">${new Date(motif.createdAt).toLocaleString("ru-RU")} · ${RHYTHM_MAP[motif.rhythmId]?.name || motif.rhythmId}</div>
      </div>
      <div class="mini-actions">
        <button type="button" class="mini-btn" data-load="${motif.id}">Открыть</button>
        <button type="button" class="mini-btn" data-remove="${motif.id}">Удалить</button>
      </div>
    </div>`).join("");
  list.querySelectorAll("[data-load]").forEach((button) => {
    button.addEventListener("click", () => {
      const motif = motifs.find((item) => item.id === button.dataset.load);
      if (!motif) return;
      state.motif = JSON.parse(JSON.stringify(motif));
      state.rhythm = motif.rhythmId;
      byId("composition-root").value = ROOTS.includes(motif.root) ? motif.root : "C";
      byId("composition-scale").value = motif.scaleId;
      byId("composition-progression").value = motif.progressionId;
      byId("composition-rhythm").value = motif.rhythmId;
      byId("composition-tempo").value = String(motif.bpm || 90);
      renderComposition();
      toast("Мотив загружен — можно играть.");
    });
  });
  list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      update((current) => removeMotif(current, button.dataset.remove));
      renderSaved();
      toast("Мотив удалён.");
    });
  });
}
