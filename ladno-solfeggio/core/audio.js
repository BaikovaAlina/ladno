/*
 * ЯДРО: звук.
 *
 * Правила, которые нельзя нарушать:
 *  1) никакого autoplay — всё начинается только после клика;
 *  2) Tone.js подключается с CDN, но при его отсутствии работает
 *     собственный синтезатор на Web Audio;
 *  3) все функции асинхронные, но ошибку звука никогда не «валит» наружу:
 *     страница остаётся рабочей.
 */

const state = {
  instrument: "guitar",
  ready: false,
  usingTone: false,
  polySynth: null,
  drums: null,
  clickSynth: null,
  fallback: null,
  fallbackInstrument: "guitar",
  metronomeTimer: null,
  metronomeTick: 0,
  statusText: "Звук по нажатию",
};

/**
 * Разблокировать звук после первого действия пользователя.
 * Браузеры разрешают AudioContext только в ответ на жест — вызываем
 * это из app.js на первый pointerdown/keydown.
 */
export async function unlockAudio() {
  await ensureTone();
  fallbackContext();
  return state.ready;
}

export function setInstrument(instrument) {
  state.instrument = instrument === "piano" ? "piano" : "guitar";
  // При смене тембра пересоздаём синтезатор при следующем звуке.
  if (state.polySynth) {
    try { state.polySynth.dispose(); } catch (error) { /* уже освобождён — это нормально */ }
    state.polySynth = null;
  }
}

export const getInstrument = () => state.instrument;
export const audioStatus = () => state.statusText;

const midiToNote = (midi) => {
  if (globalThis.Tone?.Frequency) return globalThis.Tone.Frequency(midi, "midi").toNote();
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
};

const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/* ------------------------------------------------------------------ */
/*  Tone.js                                                            */
/* ------------------------------------------------------------------ */

async function ensureTone() {
  if (!globalThis.Tone) return false;
  if (state.polySynth) return true;
  try {
    await globalThis.Tone.start();
    const Tone = globalThis.Tone;
    const guitar = {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.006, decay: 0.42, sustain: 0.16, release: 0.5 },
      volume: -12,
    };
    const piano = {
      oscillator: { type: "sine", partials: [1, 0.32, 0.14, 0.06] },
      envelope: { attack: 0.004, decay: 0.9, sustain: 0.22, release: 1.2 },
      volume: -12,
    };
    const options = state.instrument === "piano" ? piano : guitar;
    state.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: options.oscillator,
      envelope: options.envelope,
    }).toDestination();
    state.polySynth.volume.value = options.volume;
    state.usingTone = true;
    state.ready = true;
    state.statusText = state.instrument === "piano" ? "Звук: пиано" : "Звук: гитара";
    return true;
  } catch (error) {
    console.warn("Tone.js недоступен, включаем запасной синтезатор.", error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Запасной синтезатор на Web Audio                                   */
/* ------------------------------------------------------------------ */

function fallbackContext() {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return null;
  if (!state.fallback) state.fallback = new Audio();
  if (state.fallback.state === "suspended") state.fallback.resume();
  return state.fallback;
}

/**
 * Один тон с затуханием. Для «гитары» добавляем низкочастотный фильтр
 * и быстрый спад — так звук больше похож на щипок, чем на орган.
 */
function fallbackTone(midi, at, duration, velocity = 0.7) {
  const context = state.fallback;
  const guitar = state.instrument !== "piano";
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(guitar ? 2600 : 5200, at);
  filter.frequency.exponentialRampToValueAtTime(guitar ? 900 : 3000, at + duration);
  oscillator.type = guitar ? "sawtooth" : "sine";
  oscillator.frequency.value = midiToHz(midi);
  const volume = Math.max(0.02, 0.16 * velocity);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + (guitar ? 0.008 : 0.02));
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.4), at + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.05);
}

/* ------------------------------------------------------------------ */
/*  Публичный API                                                      */
/* ------------------------------------------------------------------ */

/**
 * Проиграть события: [{ notes: [midi], duration, time?, velocity? }].
 * `duration` и `time` — в секундах.
 */
export async function playEvents(events, options = {}) {
  if (!events?.length) return;
  const instrumentChanged = state.polySynth && options.forceRecreate;
  if (instrumentChanged) state.polySynth = null;
  if (await ensureTone()) {
    try {
      const Tone = globalThis.Tone;
      const start = Tone.now() + 0.05;
      events.forEach((event) => {
        const notes = [...new Set(event.notes)].map((midi) => midiToNote(midi));
        state.polySynth.triggerAttackRelease(
          notes,
          event.duration,
          start + (event.time || 0),
          event.velocity ?? 0.7,
        );
      });
      return;
    } catch (error) {
      console.warn("Tone.js не смог воспроизвести, используем Web Audio.", error);
    }
  }
  const context = fallbackContext();
  if (!context) {
    state.statusText = "Звук недоступен";
    return;
  }
  const start = context.currentTime + 0.05;
  events.forEach((event) => {
    const notes = [...new Set(event.notes)];
    notes.forEach((midi) => fallbackTone(midi, start + (event.time || 0), event.duration, event.velocity));
  });
  state.statusText = "Звук браузера";
}

/** Одна нота. */
export const playNote = (midi, duration = 0.7, velocity = 0.7) =>
  playEvents([{ notes: [midi], duration, velocity }]);

/** Несколько нот одновременно. */
export const playChord = (midis, duration = 1.6, velocity = 0.65) =>
  playEvents([{ notes: midis, duration, velocity }]);

/** Аккорд короткими ударами — «бой» по струнам. */
export const strum = (midis, duration = 1.4, spread = 0.055) =>
  playEvents(
    [...midis].sort((a, b) => b - a).map((midi, index) => ({
      notes: [midi], duration, time: index * spread, velocity: 0.6,
    })),
  );

/**
 * Интервал в одном из режимов:
 *   up — снизу вверх, down — сверху вниз,
 *   together — одновременно, round — «туда-обратно».
 */
export function playIntervalAudio(low, high, mode = "up", gap = 0.75) {
  if (mode === "together") return playEvents([{ notes: [low, high], duration: 1.6 }]);
  if (mode === "down") {
    return playEvents([
      { notes: [high], duration: gap, time: 0 },
      { notes: [low], duration: gap + 0.25, time: gap },
    ]);
  }
  if (mode === "round") {
    return playEvents([
      { notes: [low], duration: gap * 0.9, time: 0 },
      { notes: [high], duration: gap * 0.9, time: gap },
      { notes: [low], duration: gap * 1.3, time: gap * 2 },
    ]);
  }
  return playEvents([
    { notes: [low], duration: gap, time: 0 },
    { notes: [high], duration: gap + 0.25, time: gap },
  ]);
}

/**
 * Последовательность нот (гамма, мелодия).
 * gap — пауза между нотами в секундах; duration — длина каждой.
 */
export const playSequence = (midis, gap = 0.34, duration = 0.6) =>
  playEvents(midis.map((midi, index) => ({
    notes: [midi], duration, time: index * gap, velocity: 0.68,
  })));

/** Мотив с ритмом: [{ midi, beats }] и BPM. */
export function playMotif(notes, bpm = 90, startChordMidis = null) {
  const beat = 60 / bpm;
  let time = 0;
  const events = notes.map((note) => {
    const event = {
      notes: [note.midi],
      duration: Math.max(0.15, note.beats * beat * 0.9),
      time,
      velocity: 0.7,
    };
    time += note.beats * beat;
    return event;
  });
  if (startChordMidis) {
    events.push({ notes: startChordMidis, duration: 1.2, time: 0.02, velocity: 0.45 });
  }
  return playEvents(events);
}

/** Аккордовая прогрессия: chords — массив массивов MIDI. */
export function playProgressionAudio(chords, bpm = 84, beatsPerChord = 4) {
  const beat = 60 / bpm;
  const events = [];
  chords.forEach((chord, index) => {
    const time = index * beatsPerChord * beat;
    // Бас + аккорд: сначала бас, потом строй — так аккорд читается яснее.
    events.push({ notes: [Math.min(...chord)], duration: beatsPerChord * beat * 0.95, time, velocity: 0.55 });
    chord.forEach((midi, voice) => {
      events.push({
        notes: [midi],
        duration: beatsPerChord * beat * 0.95,
        time: time + voice * 0.04,
        velocity: 0.5,
      });
    });
  });
  return playEvents(events);
}

/* ------------------------------------------------------------------ */
/*  Метроном и ударные                                                 */
/* ------------------------------------------------------------------ */

function ensureDrums() {
  if (!globalThis.Tone || state.drums) return state.drums;
  const Tone = globalThis.Tone;
  try {
    state.drums = {
      kick: new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 5, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination(),
      snare: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } }).toDestination(),
      hat: new Tone.MetalSynth({ frequency: 220, envelope: { attack: 0.001, decay: 0.05, release: 0.02 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
    };
    state.drums.hat.volume.value = -22;
    state.drums.snare.volume.value = -14;
    state.clickSynth = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.001, decay: 0.03, sustain: 0 } }).toDestination();
    state.clickSynth.volume.value = -16;
  } catch (error) {
    console.warn("Ударные Tone.js недоступны.", error);
  }
  return state.drums;
}

function fallbackDrum(voice, at, accent) {
  const context = state.fallback || fallbackContext();
  if (!context) return;
  if (voice === "kick") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(120, at);
    oscillator.frequency.exponentialRampToValueAtTime(45, at + 0.18);
    gain.gain.setValueAtTime(0.5, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(at); oscillator.stop(at + 0.3);
    return;
  }
  // snare и hat — шумовые всплески с разной фильтрацией.
  const duration = voice === "snare" ? 0.16 : 0.05;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = voice === "snare" ? "bandpass" : "highpass";
  filter.frequency.value = voice === "snare" ? 1800 : 7000;
  gain.gain.setValueAtTime((accent ? 0.35 : 0.22) * (voice === "hat" ? 0.45 : 1), at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.buffer = buffer;
  source.connect(filter); filter.connect(gain); gain.connect(context.destination);
  source.start(at);
}

/** Один удар: voice = kick | snare | hat | click. */
export async function playDrum(voice, accent = false) {
  if (await ensureTone()) {
    const drums = ensureDrums();
    const time = globalThis.Tone.now() + 0.02;
    try {
      if (voice === "kick") drums?.kick?.triggerAttackRelease("C1", "8n", time);
      else if (voice === "snare") drums?.snare?.triggerAttackRelease("16n", time, accent ? 0.9 : 0.6);
      else if (voice === "hat") drums?.hat?.triggerAttackRelease("32n", time, accent ? 0.8 : 0.5);
      else state.clickSynth?.triggerAttackRelease(accent ? "C6" : "C5", "32n", time);
      return;
    } catch (error) { /* упадём в запасной вариант */ }
  }
  const context = fallbackContext();
  if (!context) return;
  if (voice === "click") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = accent ? 1500 : 1000;
    gain.gain.setValueAtTime(0.14, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(context.currentTime + 0.01);
    oscillator.stop(context.currentTime + 0.08);
    return;
  }
  fallbackDrum(voice, context.currentTime + 0.01, accent);
}

/**
 * Метроном на Tone.Transport. `onTick(beat, accent)` вызывается на каждой доле.
 * Возвращает функцию остановки.
 */
export async function startMetronome({ bpm = 90, accentEvery = 4, onTick = null } = {}) {
  stopMetronome();
  if (await ensureTone()) {
    const Tone = globalThis.Tone;
    try {
      ensureDrums();
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.bpm.value = Math.min(220, Math.max(30, bpm));
      state.metronomeTick = 0;
      Tone.Transport.scheduleRepeat((time) => {
        const beat = state.metronomeTick % accentEvery;
        const accent = beat === 0;
        try {
          state.clickSynth.triggerAttackRelease(accent ? "C6" : "C5", "32n", time);
        } catch (error) { /* тишина лучше падения */ }
        Tone.Draw.schedule(() => onTick?.(state.metronomeTick, accent), time);
        state.metronomeTick += 1;
      }, "4n", 0);
      Tone.Transport.start("+0.05");
      state.statusText = `Метроном ${bpm} BPM`;
      return true;
    } catch (error) {
      console.warn("Tone.Transport недоступен, включаем таймер.", error);
    }
  }
  // Запасной метроном на setInterval — менее точный, но работает всегда.
  const interval = (60 / bpm) * 1000;
  state.metronomeTick = 0;
  state.metronomeTimer = setInterval(() => {
    const beat = state.metronomeTick % accentEvery;
    playDrum("click", beat === 0);
    onTick?.(state.metronomeTick, beat === 0);
    state.metronomeTick += 1;
  }, interval);
  state.statusText = `Метроном ${bpm} BPM`;
  return true;
}

export function stopMetronome() {
  if (state.metronomeTimer) {
    clearInterval(state.metronomeTimer);
    state.metronomeTimer = null;
  }
  if (globalThis.Tone?.Transport) {
    try {
      globalThis.Tone.Transport.stop();
      globalThis.Tone.Transport.cancel();
    } catch (error) { /* Transport мог не запускаться */ }
  }
}

/** Сыграть один такт паттерна (для «Определи размер» и демонстрации грува). */
export async function playRhythmPattern(pattern, bpm = 90, { bars = 1, onStep = null } = {}) {
  const beat = 60 / bpm;
  const stepSeconds = pattern.meter === "6/8" ? beat / 2 : beat;
  const totalBeats = (pattern.meter === "6/8" ? 6 : Number(pattern.meter.split("/")[0])) * bars;
  if (await ensureTone()) {
    const drums = ensureDrums();
    if (drums) {
      const Tone = globalThis.Tone;
      const start = Tone.now() + 0.08;
      for (let bar = 0; bar < bars; bar++) {
        pattern.hits.forEach((hit) => {
          const time = start + (hit.start + bar * totalBeats) * stepSeconds;
          try {
            if (hit.voice === "kick") drums.kick.triggerAttackRelease("C1", "8n", time, hit.accent ? 1 : 0.8);
            else if (hit.voice === "snare") drums.snare.triggerAttackRelease("16n", time, hit.accent ? 0.9 : 0.55);
            else drums.hat.triggerAttackRelease("32n", time, hit.accent ? 0.8 : 0.45);
          } catch (error) { /* пропускаем удар */ }
        });
        if (onStep) {
          Tone.Draw.schedule(() => onStep(bar), start + bar * totalBeats * stepSeconds);
        }
      }
      return totalBeats * stepSeconds * bars;
    }
  }
  // Запасной вариант: планируем удары на Web Audio через setTimeout.
  const duration = totalBeats * stepSeconds * bars;
  pattern.hits.forEach((hit) => {
    for (let bar = 0; bar < bars; bar++) {
      const delay = (hit.start + bar * totalBeats) * stepSeconds * 1000;
      setTimeout(() => playDrum(hit.voice, hit.accent), delay + 60);
    }
  });
  return duration;
}

export function stopAll() {
  stopMetronome();
  if (globalThis.Tone?.Transport) {
    try { globalThis.Tone.Transport.stop(); } catch (error) { /* уже остановлен */ }
  }
}
