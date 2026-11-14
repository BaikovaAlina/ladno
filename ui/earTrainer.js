/*
 * ui/earTrainer.js — звуковой движок (Tone.js с резервом на чистом Web Audio API,
 * инициализация строго по первому клику пользователя, тембры «Гитара» и «Пианино»,
 * синтезированные ударные kick/snare/hihat и щелчок метронома)
 * + контроллеры модулей 11 «Тренировщик слуха (интервалы)» и 12 «Аккорды на слух».
 */

import {
  ROOTS,
  CHROMATIC,
  mod,
  randomItem,
  unique,
  parseNote,
  prettyNote,
  rootMidi,
  spellInterval,
  writtenNote,
  bestPosition,
  nameMap,
  escapeHTML,
} from "../data/notes.js";
import {
  EAR_INTERVALS,
  INTERVAL_PRESETS,
  semiText,
} from "../data/intervals.js";
import {
  EAR_CHORD_TYPES,
  makeChord,
  findVoicings,
  voicedNotes,
} from "../data/chords.js";
import {
  getState,
  subscribeState,
  recordEarIntervalAttempt,
  getWeakIntervals,
  resetEarIntervalsStats,
  recordEarChordAttempt,
  resetEarChordsStats,
  buildShareSummary,
  copyTextToClipboard,
} from "./state.js";
import { renderFretboard, setFretboardAudioPlayer } from "./fretboard.js";
import { renderStaff } from "./staff.js";

let guitarSynth = null;
let pianoSynth = null;
let drumSynths = null;
let nativeCtx = null;
let defaultTimbre = "guitar";

function updateAudioBadge(label) {
  const el = document.getElementById("audio-status");
  if (el) el.textContent = label;
}

async function ensureNativeAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("Web Audio API не поддерживается");
  if (!nativeCtx) nativeCtx = new AudioCtx();
  if (nativeCtx.state === "suspended") {
    await nativeCtx.resume();
  }
  return nativeCtx;
}

export async function ensureToneReady() {
  if (window.Tone) {
    try {
      await window.Tone.start();
      if (!guitarSynth) {
        guitarSynth = new window.Tone.PolySynth(window.Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: {
            attack: 0.008,
            decay: 0.24,
            sustain: 0.22,
            release: 0.75,
          },
        }).toDestination();
        guitarSynth.volume.value = -9;
      }
      if (!pianoSynth) {
        pianoSynth = new window.Tone.PolySynth(window.Tone.Synth, {
          oscillator: { type: "sine" },
          envelope: {
            attack: 0.014,
            decay: 0.38,
            sustain: 0.32,
            release: 1.05,
          },
        }).toDestination();
        pianoSynth.volume.value = -8;
      }
      updateAudioBadge("Tone.js активен");
      return true;
    } catch (err) {
      console.warn("Tone.js недоступен, используем Web Audio:", err);
    }
  }
  return false;
}

export async function playEvents(events, timbre = defaultTimbre) {
  if (!Array.isArray(events) || !events.length) return;

  const toneOk = await ensureToneReady();
  if (toneOk && window.Tone) {
    try {
      const synth = timbre === "piano" ? pianoSynth : guitarSynth;
      const start = window.Tone.now() + 0.035;
      events.forEach((event) => {
        const notes = unique(event.notes).map((midi) =>
          window.Tone.Frequency(midi, "midi").toNote(),
        );
        synth.triggerAttackRelease(
          notes,
          event.duration || 0.55,
          start + (event.time || 0),
          event.velocity || 0.72,
        );
      });
      return;
    } catch (err) {
      console.warn("Сбой воспроизведения Tone.js, резерв Web Audio:", err);
    }
  }

  try {
    const ctx = await ensureNativeAudio();
    const start = ctx.currentTime + 0.035;
    events.forEach((event) => {
      const notes = unique(event.notes);
      notes.forEach((midi) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = start + (event.time || 0);
        const dur = event.duration || 0.55;
        const end = at + dur;
        osc.type = timbre === "piano" ? "sine" : "triangle";
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        const vol =
          (0.17 * (event.velocity || 0.7)) /
          Math.sqrt(Math.max(1, notes.length));
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(
          vol,
          at + (timbre === "piano" ? 0.016 : 0.008),
        );
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0002, vol * 0.38),
          Math.max(at + 0.03, end),
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(end + 0.3);
      });
    });
    updateAudioBadge("Звук Web Audio");
  } catch (err) {
    updateAudioBadge("Звук недоступен");
    console.warn("Не удалось воспроизвести звук:", err);
  }
}

export function playNote(midi, timbre = defaultTimbre) {
  return playEvents(
    [{ notes: [midi], duration: 0.58, velocity: 0.74 }],
    timbre,
  );
}

// Синхронное планирование для точного времени Tone.Transport.
export function scheduleToneDrum(type = "click", accent = false, time = null) {
  if (!drumSynths) {
    const kick = new window.Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 5,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.08 },
    }).toDestination();
    kick.volume.value = -6;

    const snare = new window.Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.13, sustain: 0 },
    }).toDestination();
    snare.volume.value = -10;

    const hihat = new window.Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
    }).toDestination();
    hihat.volume.value = -15;

    const click = new window.Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
    }).toDestination();
    click.volume.value = -8;

    drumSynths = { kick, snare, hihat, click };
  }
  const now = time ?? window.Tone.now();
  if (type === "kick") drumSynths.kick.triggerAttackRelease("C1", "8n", now);
  else if (type === "snare") drumSynths.snare.triggerAttackRelease("16n", now);
  else if (type === "hihat") drumSynths.hihat.triggerAttackRelease("32n", now);
  else {
    drumSynths.click.triggerAttackRelease(
      accent ? "C6" : "G5",
      "32n",
      now,
      accent ? 0.9 : 0.55,
    );
  }
  return true;
}

// Синтезированные ударные (kick, snare, hihat) и метрономный клик для модуля 13.
export async function playDrumSound(type = "click", accent = false) {
  const toneOk = await ensureToneReady();
  if (toneOk && window.Tone) {
    try {
      scheduleToneDrum(type, accent);
      return;
    } catch (_) {
      // Переход к Web Audio ниже
    }
  }

  try {
    const ctx = await ensureNativeAudio();
    const now = ctx.currentTime;
    if (type === "kick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (type === "snare" || type === "hihat") {
      const bufferSize = ctx.sampleRate * (type === "snare" ? 0.12 : 0.045);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = type === "snare" ? "bandpass" : "highpass";
      filter.frequency.value = type === "snare" ? 1800 : 6500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(type === "snare" ? 0.24 : 0.12, now);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + (type === "snare" ? 0.12 : 0.045),
      );
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = accent ? 1120 : 780;
      gain.gain.setValueAtTime(accent ? 0.25 : 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (_) {
    // Тихий отказ при отсутствии аудиоустройства
  }
}

export function playIntervalInMode(
  lowMidi,
  highMidi,
  mode = "asc",
  gap = 0.65,
  timbre = "guitar",
) {
  if (mode === "harm" || mode === "together") {
    return playEvents(
      [{ notes: [lowMidi, highMidi], duration: 1.35, velocity: 0.72 }],
      timbre,
    );
  }
  if (mode === "desc") {
    return playEvents(
      [
        { notes: [highMidi], time: 0, duration: gap * 0.88, velocity: 0.75 },
        { notes: [lowMidi], time: gap, duration: 0.95, velocity: 0.75 },
      ],
      timbre,
    );
  }
  if (mode === "melodic") {
    return playEvents(
      [
        { notes: [lowMidi], time: 0, duration: gap * 0.85, velocity: 0.72 },
        { notes: [highMidi], time: gap, duration: gap * 0.85, velocity: 0.76 },
        {
          notes: [lowMidi],
          time: gap * 2,
          duration: gap * 0.85,
          velocity: 0.72,
        },
        {
          notes: [lowMidi, highMidi],
          time: gap * 3.05,
          duration: 1.15,
          velocity: 0.68,
        },
      ],
      timbre,
    );
  }
  // По умолчанию восходящий ('asc' / 'sequential')
  return playEvents(
    [
      { notes: [lowMidi], time: 0, duration: gap * 0.88, velocity: 0.75 },
      { notes: [highMidi], time: gap, duration: 0.95, velocity: 0.75 },
    ],
    timbre,
  );
}

export function playChordInMode(
  notes,
  mode = "harm",
  timbre = "guitar",
  gap = 0.28,
) {
  const midis = notes.map((n) => (typeof n === "number" ? n : n.midi));
  if (mode === "asc") {
    return playEvents(
      midis.map((m, i) => ({
        notes: [m],
        time: i * gap,
        duration: 0.8,
        velocity: 0.74,
      })),
      timbre,
    );
  }
  if (mode === "desc") {
    const rev = [...midis].reverse();
    return playEvents(
      rev.map((m, i) => ({
        notes: [m],
        time: i * gap,
        duration: 0.8,
        velocity: 0.74,
      })),
      timbre,
    );
  }
  if (mode === "arpChord") {
    const arp = midis.map((m, i) => ({
      notes: [m],
      time: i * (gap * 0.85),
      duration: 0.65,
      velocity: 0.7,
    }));
    arp.push({
      notes: midis,
      time: midis.length * (gap * 0.85) + 0.18,
      duration: 1.35,
      velocity: 0.72,
    });
    return playEvents(arp, timbre);
  }
  return playEvents([{ notes: midis, duration: 1.45, velocity: 0.72 }], timbre);
}

// Подключаем воспроизведение ноты при клике по любому грифу в приложении.
setFretboardAudioPlayer((midi) => playNote(midi, defaultTimbre));

// Микроанимация волны правильного / неправильного ответа на карточке тренажёра.
export function triggerFeedbackWave(containerEl, isCorrect) {
  if (!containerEl) return;
  containerEl.classList.remove("wave-success", "wave-error");
  // Принудительный reflow для перезапуска CSS-анимации
  void containerEl.offsetWidth;
  containerEl.classList.add(isCorrect ? "wave-success" : "wave-error");
}

export function showToast(message) {
  let toast = document.getElementById("ladno-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ladno-toast";
    toast.className = "toast-banner";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

const MODE_LABELS = {
  asc: "Восходящий ↑",
  desc: "Нисходящий ↓",
  harm: "Гармонический ⇅",
  melodic: "Туда-обратно ↑↓",
};

/* =========================================================================
 * МОДУЛЬ 11: РАСШИРЕННЫЙ ТРЕНИРОВЩИК СЛУХА (ВСЕ 12 ИНТЕРВАЛОВ × 4 РЕЖИМА)
 * ========================================================================= */
export function initIntervalEarTrainer() {
  const rootEl = document.getElementById("view-ear-intervals");
  if (!rootEl) return;

  let activeIds = new Set(INTERVAL_PRESETS[0].ids);
  let currentQuestion = null;

  const presetSelect = document.getElementById("ei-preset");
  const modeSelect = document.getElementById("ei-mode");
  const speedSelect = document.getElementById("ei-speed");
  const timbreSelect = document.getElementById("ei-timbre");
  const chipsWrap = document.getElementById("ei-interval-chips");
  const answersWrap = document.getElementById("ei-answers");
  const feedbackEl = document.getElementById("ei-feedback");
  const playBtn = document.getElementById("ei-play");
  const replayBtn = document.getElementById("ei-replay");
  const nextBtn = document.getElementById("ei-next");
  const weakBtn = document.getElementById("ei-train-weak");
  const shareBtn = document.getElementById("ei-share");
  const resetBtn = document.getElementById("ei-reset");
  const trainerCard = document.getElementById("ei-trainer-card");

  function renderChips() {
    chipsWrap.innerHTML = EAR_INTERVALS.map((iv) => {
      const checked = activeIds.has(iv.id);
      return `<button type="button" class="chip-toggle ${checked ? "active" : ""}" data-ei-chip="${iv.id}" aria-pressed="${checked}" title="${escapeHTML(iv.name)}">${escapeHTML(iv.short)}</button>`;
    }).join("");

    chipsWrap.querySelectorAll("[data-ei-chip]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.eiChip;
        if (activeIds.has(id)) {
          if (activeIds.size <= 2) {
            showToast("Оставь хотя бы 2 интервала для сравнения!");
            return;
          }
          activeIds.delete(id);
        } else {
          activeIds.add(id);
        }
        presetSelect.value = "custom";
        renderChips();
        generateQuestion(false);
      });
    });
  }

  function generateQuestion(autoPlay = false) {
    const pool = EAR_INTERVALS.filter((iv) => activeIds.has(iv.id));
    if (!pool.length) return;
    const interval = randomItem(pool);
    const chosenModeSetting = modeSelect.value;
    const actualMode =
      chosenModeSetting === "mixed"
        ? randomItem(["asc", "desc", "harm", "melodic"])
        : chosenModeSetting;

    // Выбираем базовую ноту от E3 (52) до F4 (65), чтобы обе ноты удобно читались на стане и грифе
    const baseMidi = 48 + Math.floor(Math.random() * 13);
    const rootName = CHROMATIC[mod(baseMidi)];
    const secondMidi = baseMidi + interval.semitones;
    const secondName = spellInterval(
      rootName,
      interval.semitones,
      interval.steps,
    );

    currentQuestion = {
      interval,
      mode: actualMode,
      baseMidi,
      secondMidi,
      rootName,
      secondName,
      answered: false,
    };

    renderAnswerGrid(pool);
    feedbackEl.className = "feedback";
    feedbackEl.textContent = `Режим: ${MODE_LABELS[actualMode]}. Нажми «Слушать интервал» и выбери ответ.`;

    // Пока ответ не дан — на грифе показана только стартовая нота со знаком вопроса
    const firstPos = bestPosition(
      actualMode === "desc" ? secondMidi : baseMidi,
      15,
    );
    renderFretboard({
      container: "ei-board",
      highlighted: firstPos ? [firstPos.key] : [],
      root: firstPos ? [firstPos.key] : [],
      questionKey: firstPos ? firstPos.key : null,
      maxFret: 15,
      statusId: "ei-board-status",
    });

    const staffContainer = document.getElementById("ei-staff");
    if (staffContainer) {
      staffContainer.innerHTML =
        '<div class="staff-placeholder">Нотная расшифровка появится сразу после твоего ответа ♫</div>';
    }

    if (autoPlay) playCurrent();
  }

  function playCurrent() {
    if (!currentQuestion) generateQuestion(false);
    const gap = Number(speedSelect.value) || 0.62;
    const timbre = timbreSelect.value || "guitar";
    defaultTimbre = timbre;
    playIntervalInMode(
      currentQuestion.baseMidi,
      currentQuestion.secondMidi,
      currentQuestion.mode,
      gap,
      timbre,
    );
  }

  function renderAnswerGrid(pool) {
    answersWrap.innerHTML = pool
      .map(
        (iv) =>
          `<button type="button" class="answer answer-wide" data-ei-ans="${iv.id}"><strong>${escapeHTML(iv.short)}</strong> <span>${escapeHTML(iv.name)}</span></button>`,
      )
      .join("");

    answersWrap.querySelectorAll("[data-ei-ans]").forEach((btn) => {
      btn.addEventListener("click", () => handleAnswer(btn.dataset.eiAns, btn));
    });
  }

  function handleAnswer(pickedId, btnEl) {
    if (!currentQuestion || currentQuestion.answered) return;
    currentQuestion.answered = true;
    const q = currentQuestion;
    const isCorrect = pickedId === q.interval.id;

    answersWrap.querySelectorAll("button").forEach((b) => {
      b.disabled = true;
      if (b.dataset.eiAns === q.interval.id) b.classList.add("correct");
    });
    if (!isCorrect) btnEl.classList.add("wrong");

    recordEarIntervalAttempt(q.interval.id, q.mode, isCorrect);
    triggerFeedbackWave(trainerCard, isCorrect);

    const notesPair = `${writtenNote(q.rootName, q.baseMidi)} → ${writtenNote(q.secondName, q.secondMidi)}`;
    feedbackEl.className = `feedback ${isCorrect ? "success" : "error"}`;
    feedbackEl.textContent = isCorrect
      ? `Верно! ${q.interval.short} (${q.interval.name}, ${semiText(q.interval.semitones)}) · Звучали ${notesPair}. Окраска: ${q.interval.moodTag}.`
      : `Мимо! Звучал ${q.interval.short} — ${q.interval.name} (${semiText(q.interval.semitones)}), ноты ${notesPair}. Подсказка: ${q.interval.melodyHint}`;

    // Показываем обе ноты на грифе и нотном стане
    const posA = bestPosition(q.baseMidi, 15);
    const posB = bestPosition(q.secondMidi, 15);
    const activeKeys = [posA?.key, posB?.key].filter(Boolean);
    renderFretboard({
      container: "ei-board",
      highlighted: activeKeys,
      root: posA ? [posA.key] : [],
      names: nameMap([q.rootName, q.secondName]),
      maxFret: 15,
      statusId: "ei-board-status",
    });
    renderStaff(
      "ei-staff",
      q.mode === "desc"
        ? [
            { midi: q.secondMidi, name: q.secondName },
            { midi: q.baseMidi, name: q.rootName },
          ]
        : [
            { midi: q.baseMidi, name: q.rootName },
            { midi: q.secondMidi, name: q.secondName },
          ],
      q.mode === "harm",
    );
  }

  function renderStatsView() {
    const st = getState().earIntervals;
    const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0;

    document.getElementById("ei-stat-streak").textContent = String(st.streak);
    document.getElementById("ei-stat-best").textContent = String(st.bestStreak);
    document.getElementById("ei-stat-total").textContent = String(st.total);
    document.getElementById("ei-stat-acc").textContent = `${pct}%`;

    const weak = getWeakIntervals(3);
    const weakEl = document.getElementById("ei-weak-list");
    if (!weak.length) {
      weakEl.textContent =
        st.total > 0
          ? "Ошибок пока нет — отличная чистота слуха!"
          : "Сделай несколько попыток, и здесь появятся топ-3 интервала для проработки.";
      weakBtn.disabled = true;
    } else {
      weakEl.innerHTML = weak
        .map((w) => {
          const iv = EAR_INTERVALS.find((item) => item.id === w.id);
          return `<span class="weak-badge">${escapeHTML(iv ? iv.short : w.id)} · ${w.accuracy}% (${w.correct}/${w.attempts})</span>`;
        })
        .join(" ");
      weakBtn.disabled = weak.length < 2;
    }

    const tbody = document.getElementById("ei-matrix-body");
    tbody.innerHTML = EAR_INTERVALS.map((iv) => {
      const row = st.matrix[iv.id] || {};
      const cellStr = (m) => {
        const c = row[m] || { attempts: 0, correct: 0 };
        if (!c.attempts) return '<span class="muted-cell">—</span>';
        const p = Math.round((c.correct / c.attempts) * 100);
        return `<b>${p}%</b> <small>(${c.correct}/${c.attempts})</small>`;
      };
      const totAtt = ["asc", "desc", "harm", "melodic"].reduce(
        (s, m) => s + (row[m]?.attempts || 0),
        0,
      );
      const totCor = ["asc", "desc", "harm", "melodic"].reduce(
        (s, m) => s + (row[m]?.correct || 0),
        0,
      );
      const totStr = totAtt
        ? `<strong>${Math.round((totCor / totAtt) * 100)}%</strong> (${totCor}/${totAtt})`
        : '<span class="muted-cell">0 попыток</span>';

      return `<tr>
        <td><strong>${escapeHTML(iv.short)}</strong> · ${escapeHTML(iv.name)}</td>
        <td>${cellStr("asc")}</td>
        <td>${cellStr("desc")}</td>
        <td>${cellStr("harm")}</td>
        <td>${cellStr("melodic")}</td>
        <td>${totStr}</td>
      </tr>`;
    }).join("");
  }

  presetSelect.addEventListener("change", () => {
    const found = INTERVAL_PRESETS.find((p) => p.id === presetSelect.value);
    if (found) {
      activeIds = new Set(found.ids);
      renderChips();
      generateQuestion(false);
    }
  });
  modeSelect.addEventListener("change", () => generateQuestion(false));
  timbreSelect.addEventListener("change", () => {
    defaultTimbre = timbreSelect.value;
  });

  playBtn.addEventListener("click", () => playCurrent());
  replayBtn.addEventListener("click", () => playCurrent());
  nextBtn.addEventListener("click", () => generateQuestion(true));

  weakBtn.addEventListener("click", () => {
    const weak = getWeakIntervals(3);
    if (weak.length >= 2) {
      activeIds = new Set(weak.map((w) => w.id));
      presetSelect.value = "custom";
      renderChips();
      generateQuestion(true);
      showToast("Включён прицельный режим по слабым интервалам!");
    }
  });

  shareBtn.addEventListener("click", async () => {
    const text = buildShareSummary("ear-intervals");
    const ok = await copyTextToClipboard(text);
    showToast(ok ? "Результат скопирован в буфер обмена!" : text);
  });

  resetBtn.addEventListener("click", () => {
    if (window.confirm("Сбросить всю статистику тренировщика интервалов?")) {
      resetEarIntervalsStats();
      showToast("Статистика интервалов очищена.");
    }
  });

  subscribeState(renderStatsView);
  renderChips();
  generateQuestion(false);
  renderStatsView();
}

/* =========================================================================
 * МОДУЛЬ 12: АККОРДЫ НА СЛУХ (9 ТИПОВ ТРЕЗВУЧИЙ И СЕПТАККОРДОВ)
 * ========================================================================= */
export function initChordEarTrainer() {
  const rootEl = document.getElementById("view-ear-chords");
  if (!rootEl) return;

  const groupSelect = document.getElementById("ec-group");
  const modeSelect = document.getElementById("ec-mode");
  const timbreSelect = document.getElementById("ec-timbre");
  const playBtn = document.getElementById("ec-play");
  const replayBtn = document.getElementById("ec-replay");
  const nextBtn = document.getElementById("ec-next");
  const shareBtn = document.getElementById("ec-share");
  const resetBtn = document.getElementById("ec-reset");
  const answersWrap = document.getElementById("ec-answers");
  const feedbackEl = document.getElementById("ec-feedback");
  const trainerCard = document.getElementById("ec-trainer-card");

  let currentChordQuiz = null;

  function activePool() {
    const grp = groupSelect.value;
    if (grp === "triads")
      return EAR_CHORD_TYPES.filter((t) => t.category === "triad");
    if (grp === "sevenths")
      return EAR_CHORD_TYPES.filter((t) => t.category === "seventh");
    return EAR_CHORD_TYPES;
  }

  function newChordQuestion(autoPlay = false) {
    const pool = activePool();
    const type = randomItem(pool);
    const root = randomItem(ROOTS);
    const chord = makeChord(root, type, 0);
    const positions =
      findVoicings(chord.notes, { maxFret: 12 })[0] ||
      chord.notes.map((n) => bestPosition(n.midi, 12)).filter(Boolean);
    const voiced = positions.length
      ? voicedNotes(positions, chord.names)
      : chord.notes;

    currentChordQuiz = {
      root,
      type,
      chord,
      positions,
      voiced,
      answered: false,
    };

    answersWrap.innerHTML = pool
      .map(
        (item) =>
          `<button type="button" class="answer answer-wide" data-ec-ans="${item.id}"><strong>${escapeHTML(item.earLabel)}</strong></button>`,
      )
      .join("");

    answersWrap.querySelectorAll("[data-ec-ans]").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleChordAnswer(btn.dataset.ecAns, btn),
      );
    });

    feedbackEl.className = "feedback";
    feedbackEl.textContent =
      "Послушай аккорд (арпеджио или целиком) и определи его окраску.";

    // До ответа показываем только тонику со знаком вопроса
    const rootPos = bestPosition(rootMidi(root), 12);
    renderFretboard({
      container: "ec-board",
      highlighted: rootPos ? [rootPos.key] : [],
      root: rootPos ? [rootPos.key] : [],
      questionKey: rootPos ? rootPos.key : null,
      statusId: "ec-board-status",
    });

    const staffEl = document.getElementById("ec-staff");
    if (staffEl) {
      staffEl.innerHTML =
        '<div class="staff-placeholder">После ответа здесь откроются ноты и аппликатура аккорда ♫</div>';
    }

    if (autoPlay) playCurrentChord();
  }

  function playCurrentChord() {
    if (!currentChordQuiz) newChordQuestion(false);
    const mode = modeSelect.value || "arpChord";
    const timbre = timbreSelect.value || "guitar";
    defaultTimbre = timbre;
    playChordInMode(currentChordQuiz.voiced, mode, timbre, 0.28);
  }

  function handleChordAnswer(pickedId, btnEl) {
    if (!currentChordQuiz || currentChordQuiz.answered) return;
    currentChordQuiz.answered = true;
    const q = currentChordQuiz;
    const isCorrect = pickedId === q.type.id;

    answersWrap.querySelectorAll("button").forEach((b) => {
      b.disabled = true;
      if (b.dataset.ecAns === q.type.id) b.classList.add("correct");
    });
    if (!isCorrect) btnEl.classList.add("wrong");

    recordEarChordAttempt(q.type.id, isCorrect);
    triggerFeedbackWave(trainerCard, isCorrect);

    const spelledNotes = q.voiced
      .map((n) => writtenNote(n.name, n.midi))
      .join(" – ");
    const symbolText = `${prettyNote(q.root)}${q.type.symbol}`;
    feedbackEl.className = `feedback ${isCorrect ? "success" : "error"}`;
    feedbackEl.textContent = isCorrect
      ? `Верно! Прозвучал ${symbolText} (${q.type.earLabel}) · Ноты: ${spelledNotes} · Формула: ${q.type.formula}.`
      : `Не угадала! Это был ${symbolText} (${q.type.earLabel}) · Прозвучали ноты: ${spelledNotes} (${q.type.formula}).`;

    renderFretboard({
      container: "ec-board",
      highlighted: q.positions.map((p) => p.key),
      root: parseNote(q.root).pc,
      names: nameMap(q.chord.names),
      statusId: "ec-board-status",
    });
    renderStaff("ec-staff", q.voiced, true);
  }

  function renderChordStats() {
    const st = getState().earChords;
    const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0;
    document.getElementById("ec-stat-streak").textContent = String(st.streak);
    document.getElementById("ec-stat-best").textContent = String(st.bestStreak);
    document.getElementById("ec-stat-total").textContent = String(st.total);
    document.getElementById("ec-stat-acc").textContent = `${pct}%`;

    const tbody = document.getElementById("ec-stats-body");
    tbody.innerHTML = EAR_CHORD_TYPES.map((t) => {
      const row = st.byType[t.id] || { attempts: 0, correct: 0 };
      const acc = row.attempts
        ? `<strong>${Math.round((row.correct / row.attempts) * 100)}%</strong>`
        : '<span class="muted-cell">—</span>';
      return `<tr>
        <td><strong>${escapeHTML(t.earLabel)}</strong></td>
        <td>${escapeHTML(t.formula)}</td>
        <td>${row.correct} / ${row.attempts}</td>
        <td>${acc}</td>
      </tr>`;
    }).join("");
  }

  groupSelect.addEventListener("change", () => newChordQuestion(false));
  playBtn.addEventListener("click", () => playCurrentChord());
  replayBtn.addEventListener("click", () => playCurrentChord());
  nextBtn.addEventListener("click", () => newChordQuestion(true));

  shareBtn.addEventListener("click", async () => {
    const text = buildShareSummary("ear-chords");
    const ok = await copyTextToClipboard(text);
    showToast(ok ? "Результат по аккордам скопирован!" : text);
  });

  resetBtn.addEventListener("click", () => {
    if (window.confirm("Сбросить статистику распознавания аккордов на слух?")) {
      resetEarChordsStats();
      showToast("Статистика аккордов на слух сброшена.");
    }
  });

  subscribeState(renderChordStats);
  newChordQuestion(false);
  renderChordStats();
}
