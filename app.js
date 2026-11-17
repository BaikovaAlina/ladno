/* ==========================================================================
   Ладно · Фортепиано — интерактивная логика, звук, нотный стан и Telegram-бот
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. КОНСТАНТЫ И МУЗЫКАЛЬНЫЕ ДАННЫЕ
     ------------------------------------------------------------------------ */
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const NOTE_RU = ["До", "До♯", "Ре", "Ре♯", "Ми", "Фа", "Фа♯", "Соль", "Соль♯", "Ля", "Ля♯", "Си"];

  // Сопоставление клавиш клавиатуры компьютера с нотами (1-я октава и начало 2-й)
  const KEY_SHORTCUTS = {
    KeyA: 60, // C4 (До 1)
    KeyW: 61, // C#4
    KeyS: 62, // D4 (Ре 1)
    KeyE: 63, // D#4
    KeyD: 64, // E4 (Ми 1)
    KeyF: 65, // F4 (Фа 1)
    KeyT: 66, // F#4
    KeyG: 67, // G4 (Соль 1)
    KeyY: 68, // G#4
    KeyH: 69, // A4 (Ля 1)
    KeyU: 70, // A#4
    KeyJ: 71, // B4 (Си 1)
    KeyK: 72, // C5 (До 2)
    KeyO: 73, // C#5
    KeyL: 74, // D5 (Ре 2)
    KeyP: 75, // D#5
    Semicolon: 76, // E5 (Ми 2)
  };

  const SHORTCUT_LABELS = {
    60: "A", 61: "W", 62: "S", 63: "E", 64: "D", 65: "F",
    66: "T", 67: "G", 68: "Y", 69: "H", 70: "U", 71: "J",
    72: "K", 73: "O", 74: "L", 75: "P", 76: ";"
  };

  const INTERVALS = [
    { id: "m2", name: "Малая секунда", semitones: 1, song: "«Челюсти» (тревога, 1 полутон)" },
    { id: "M2", name: "Большая секунда", semitones: 2, song: "«В траве сидел кузнечик» (шаг)" },
    { id: "m3", name: "Малая терция", semitones: 3, song: "Минорное настроение, колыбельная" },
    { id: "M3", name: "Большая терция", semitones: 4, song: "«Чижик-пыжик», «Ку-ку» (мажор)" },
    { id: "P4", name: "Чистая кварта", semitones: 5, song: "Торжественный гимн, призыв" },
    { id: "TT", name: "Тритон", semitones: 6, song: "Заставка The Simpsons (напряжение)" },
    { id: "P5", name: "Чистая квинта", semitones: 7, song: "Тема Star Wars (космос, мощь)" },
    { id: "m6", name: "Малая секста", semitones: 8, song: "Love Story (романтика)" },
    { id: "M6", name: "Большая секста", semitones: 9, song: "«В лесу родилась ёлочка»" },
    { id: "m7", name: "Малая септима", semitones: 10, song: "«Somewhere» (West Side Story)" },
    { id: "M7", name: "Большая септима", semitones: 11, song: "Острое тяготение в октаву" },
    { id: "P8", name: "Чистая октава", semitones: 12, song: "«Over the Rainbow» (слияние)" },
  ];

  const TRIADS = {
    major: { name: "Мажор", offsets: [0, 4, 7], desc: "Светлый, устойчивый (б.3 + м.3)" },
    minor: { name: "Минор", offsets: [0, 3, 7], desc: "Мягкий, задумчивый (м.3 + б.3)" },
    dim: { name: "Уменьшенное", offsets: [0, 3, 6], desc: "Сжатое, напряжённое (м.3 + м.3)" },
    aug: { name: "Увеличенное", offsets: [0, 4, 8], desc: "Таинственное, парящее (б.3 + б.3)" },
    sus4: { name: "Sus4", offsets: [0, 5, 7], desc: "Зависающее (ч.4 + б.2)" },
  };

  // База аккордов для упражнений на запоминание (аккордовый тренажёр)
  const MEMORIZE_CHORDS = [
    { id: "C", name: "C (До мажор)", rootPc: 0, offsets: [0, 4, 7], notes: ["C", "E", "G"], ruNotes: ["До", "Ми", "Соль"], type: "Мажор" },
    { id: "Dm", name: "Dm (Ре минор)", rootPc: 2, offsets: [0, 3, 7], notes: ["D", "F", "A"], ruNotes: ["Ре", "Фа", "Ля"], type: "Минор" },
    { id: "Em", name: "Em (Ми минор)", rootPc: 4, offsets: [0, 3, 7], notes: ["E", "G", "B"], ruNotes: ["Ми", "Соль", "Си"], type: "Минор" },
    { id: "F", name: "F (Фа мажор)", rootPc: 5, offsets: [0, 4, 7], notes: ["F", "A", "C"], ruNotes: ["Фа", "Ля", "До"], type: "Мажор" },
    { id: "G", name: "G (Соль мажор)", rootPc: 7, offsets: [0, 4, 7], notes: ["G", "B", "D"], ruNotes: ["Соль", "Си", "Ре"], type: "Мажор" },
    { id: "Am", name: "Am (Ля минор)", rootPc: 9, offsets: [0, 3, 7], notes: ["A", "C", "E"], ruNotes: ["Ля", "До", "Ми"], type: "Минор" },
    { id: "Bdim", name: "Bdim (Си уменьшенное)", rootPc: 11, offsets: [0, 3, 6], notes: ["B", "D", "F"], ruNotes: ["Си", "Ре", "Фа"], type: "Уменьшенное" },
    { id: "D", name: "D (Ре мажор)", rootPc: 2, offsets: [0, 4, 7], notes: ["D", "F#", "A"], ruNotes: ["Ре", "Фа♯", "Ля"], type: "Мажор" },
    { id: "A", name: "A (Ля мажор)", rootPc: 9, offsets: [0, 4, 7], notes: ["A", "C#", "E"], ruNotes: ["Ля", "До♯", "Ми"], type: "Мажор" },
    { id: "E", name: "E (Ми мажор)", rootPc: 4, offsets: [0, 4, 7], notes: ["E", "G#", "B"], ruNotes: ["Ми", "Соль♯", "Си"], type: "Мажор" }
  ];

  const SEVENTHS = {
    dom7: { name: "Септаккорд (C7)", offsets: [0, 4, 7, 10], desc: "Мажор + малая 7 (двигатель гармонии)" },
    maj7: { name: "Большой мажорный (Cmaj7)", offsets: [0, 4, 7, 11], desc: "Мажор + большая 7 (джазовый свет)" },
    m7: { name: "Малый минорный (Cm7)", offsets: [0, 3, 7, 10], desc: "Минор + малая 7 (соул, бархатный звук)" },
    m7b5: { name: "Полууменьшенный (Cø7)", offsets: [0, 3, 6, 10], desc: "Уменьшенное + малая 7 (ii ступень в миноре)" },
    dim7: { name: "Уменьшенный (C°7)", offsets: [0, 3, 6, 9], desc: "Три малых терции подряд (драма)" },
  };

  const SCALES = {
    major: {
      name: "Натуральный мажор",
      offsets: [0, 2, 4, 5, 7, 9, 11, 12],
      fingeringRight: [1, 2, 3, 1, 2, 3, 4, 5],
      fingeringLeft: [5, 4, 3, 2, 1, 3, 2, 1],
      formula: "Тон — Тон — Полутон — Тон — Тон — Тон — Полутон"
    },
    minor_natural: {
      name: "Натуральный минор",
      offsets: [0, 2, 3, 5, 7, 8, 10, 12],
      fingeringRight: [1, 2, 3, 1, 2, 3, 4, 5],
      fingeringLeft: [5, 4, 3, 2, 1, 3, 2, 1],
      formula: "Тон — Полутон — Тон — Тон — Полутон — Тон — Тон"
    },
    minor_harmonic: {
      name: "Гармонический минор (VII♯)",
      offsets: [0, 2, 3, 5, 7, 8, 11, 12],
      fingeringRight: [1, 2, 3, 1, 2, 3, 4, 5],
      fingeringLeft: [5, 4, 3, 2, 1, 3, 2, 1],
      formula: "Повышенная VII ступень (характерный восточный колорит)"
    },
    pentatonic_major: {
      name: "Мажорная пентатоника",
      offsets: [0, 2, 4, 7, 9, 12],
      fingeringRight: [1, 2, 3, 1, 2, 3],
      fingeringLeft: [5, 4, 3, 2, 1, 1],
      formula: "I — II — III — V — VI (без полутонов)"
    },
    blues: {
      name: "Блюзовая гамма",
      offsets: [0, 3, 5, 6, 7, 10, 12],
      fingeringRight: [1, 2, 3, 4, 1, 2, 3],
      fingeringLeft: [5, 4, 3, 2, 1, 2, 1],
      formula: "Минорная пентатоника + пониженная V ступень (blue note)"
    }
  };

  /* ------------------------------------------------------------------------
     2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ И ХРАНИЛИЩЕ LOCALSTORAGE
     ------------------------------------------------------------------------ */
  const STORAGE_KEY = "ladno-piano-v1";
  const TG_STORAGE_KEY = "ladno_piano_tg_v1";

  const DEFAULT_TG_SETTINGS = {
    botToken: "9194715215:AAE7Tly-kvnSCpzHL7zb12mZkM1uiXZkEJY",
    chatId: "",
    botUsername: "PianoTheoryTrainerBot",
    sendCompleted: true,
    sendErrors: true,
    sendStreaks: true,
    sendSummary: true,
    log: []
  };

  let state = {
    totalAnswered: 0,
    totalCorrect: 0,
    totalErrors: 0,
    currentStreak: 0,
    bestStreak: 0,
    timbre: "grand",
    labelMode: "doremi",
    showShortcuts: true,
    activeNotes: new Set(),
    recordedNotes: [],
    isRecording: false,
    statsByExercise: {}
  };

  let tgSettings = Object.assign({}, DEFAULT_TG_SETTINGS);

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
      }
    } catch (e) {
      console.warn("Ошибка чтения localStorage", e);
    }
    try {
      const savedTg = localStorage.getItem(TG_STORAGE_KEY);
      if (savedTg) {
        const parsedTg = JSON.parse(savedTg);
        Object.assign(tgSettings, parsedTg);
      }
    } catch (e) {
      console.warn("Ошибка чтения настроек Telegram", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalAnswered: state.totalAnswered,
          totalCorrect: state.totalCorrect,
          totalErrors: state.totalErrors,
          currentStreak: state.currentStreak,
          bestStreak: state.bestStreak,
          statsByExercise: state.statsByExercise
        })
      );
    } catch (e) {}
  }

  function saveTgSettings() {
    try {
      localStorage.setItem(TG_STORAGE_KEY, JSON.stringify(tgSettings));
    } catch (e) {}
  }

  /* ------------------------------------------------------------------------
     3. ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API)
     ------------------------------------------------------------------------ */
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playPianoTone(midi, duration = 1.2, velocity = 0.8) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const now = ctx.currentTime;

    const mainGain = ctx.createGain();
    const peakVolume = Math.min(0.35, (0.24 * velocity) / Math.sqrt(1));
    mainGain.gain.setValueAtTime(0.0001, now);
    mainGain.gain.linearRampToValueAtTime(peakVolume, now + 0.006);
    mainGain.gain.exponentialRampToValueAtTime(peakVolume * 0.45, now + 0.18);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    mainGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = state.timbre === "rhodes" ? "sine" : "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
    osc2.connect(gain2);
    gain2.connect(mainGain);

    if (state.timbre === "grand") {
      const osc3 = ctx.createOscillator();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(freq * 3, now);
      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.12, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.4);
      osc3.connect(gain3);
      gain3.connect(mainGain);
      osc3.start(now);
      osc3.stop(now + duration + 0.05);
    }

    osc1.connect(mainGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  }

  function playMidi(midi, duration = 1.0, velocity = 0.8) {
    getAudioContext();
    if (state.isRecording) {
      state.recordedNotes.push({ midi, time: Date.now() });
      const playBtn = document.getElementById("freelab-play-rec-btn");
      if (playBtn) playBtn.disabled = false;
    }
    playPianoTone(midi, duration, velocity);
  }

  function playChordMidi(midis, duration = 1.6, arpeggio = false) {
    getAudioContext();
    if (!midis || !midis.length) return;
    if (arpeggio) {
      midis.forEach((m, idx) => {
        setTimeout(() => playPianoTone(m, duration, 0.75), idx * 120);
      });
    } else {
      midis.forEach((m) => playPianoTone(m, duration, 0.75));
    }
  }

  /* ------------------------------------------------------------------------
     4. TELEGRAM-БОТ: ОТПРАВКА СООБЩЕНИЙ О ВЫПОЛНЕНИИ И ОШИБКАХ
     ------------------------------------------------------------------------ */
  async function sendTelegramMessage(text) {
    if (!tgSettings.botToken || !tgSettings.chatId) {
      return { success: false, reason: "Не указан Chat ID" };
    }

    const url = `https://api.telegram.org/bot${tgSettings.botToken}/sendMessage`;
    const payload = {
      chat_id: tgSettings.chatId,
      text: text,
      parse_mode: "HTML"
    };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.ok) {
        logTelegramEntry(text, true);
        updateTelegramStatusUI();
        return { success: true };
      } else {
        logTelegramEntry(text, false, data.description);
        updateTelegramStatusUI();
        return { success: false, reason: data.description };
      }
    } catch (err) {
      logTelegramEntry(text, false, err.message || "Ошибка сети");
      updateTelegramStatusUI();
      return { success: false, reason: err.message };
    }
  }

  function logTelegramEntry(message, success, errorDesc = "") {
    const timeStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const preview = message.replace(/<[^>]+>/g, "").slice(0, 110) + (message.length > 110 ? "..." : "");
    tgSettings.log.unshift({
      time: timeStr,
      preview: preview,
      success: success,
      error: errorDesc
    });
    if (tgSettings.log.length > 30) tgSettings.log.pop();
    saveTgSettings();
    renderTelegramLog();
  }

  function renderTelegramLog() {
    const list = document.getElementById("tg-log-list");
    if (!list) return;
    if (!tgSettings.log || !tgSettings.log.length) {
      list.innerHTML = `
        <div class="tg-log-entry" style="color:#788b7b;">
          <span>Здесь будут отображаться отчёты об отправленных в Telegram упражнениях, ошибках и сводках.</span>
          <span class="tg-log-time">—</span>
        </div>`;
      return;
    }

    list.innerHTML = tgSettings.log
      .map((entry) => `
        <div class="tg-log-entry ${entry.success ? "success-entry" : "error-entry"}">
          <div>
            <b>${entry.success ? "✓ Доставлено:" : "✕ Ошибка отправки:"}</b>
            <span>${escapeHtml(entry.preview)}</span>
            ${entry.error ? `<div style="font-size:10px; color:#c94532; margin-top:2px;">Причина: ${escapeHtml(entry.error)}</div>` : ""}
          </div>
          <span class="tg-log-time">${entry.time}</span>
        </div>
      `)
      .join("");
  }

  // Запрос информации о боте через getMe
  async function fetchBotInfo() {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${tgSettings.botToken}/getMe`);
      const data = await resp.json();
      if (data.ok && data.result?.username) {
        tgSettings.botUsername = data.result.username;
        const link = document.getElementById("open-tg-bot-link");
        if (link) {
          link.href = `https://t.me/${tgSettings.botUsername}`;
          link.textContent = `Открыть @${tgSettings.botUsername} ↗`;
        }
      }
    } catch (e) {}
  }

  // Автоматическое определение Chat ID через getUpdates
  async function autoDetectTelegramChatId() {
    const statusMsg = document.getElementById("tg-status-message");
    if (statusMsg) statusMsg.textContent = "Поиск входящих сообщений в боте...";

    try {
      const resp = await fetch(`https://api.telegram.org/bot${tgSettings.botToken}/getUpdates`);
      const data = await resp.json();
      if (!data.ok) {
        if (statusMsg) statusMsg.textContent = "Ошибка API: " + (data.description || "не удалось получить обновления");
        return;
      }

      const updates = data.result || [];
      if (!updates.length) {
        if (statusMsg) {
          statusMsg.textContent = "Сообщений не найдено. Нажмите «Открыть бота», напишите ему /start и попробуйте снова!";
        }
        alert("В боте пока нет сообщений. Откройте бота, отправьте ему /start, а затем нажмите 'Определить ID' ещё раз!");
        return;
      }

      const lastUpdate = updates[updates.length - 1];
      const msg = lastUpdate.message || lastUpdate.edited_message || lastUpdate.callback_query?.message;
      if (msg && msg.chat && msg.chat.id) {
        const detectedId = String(msg.chat.id);
        const userName = msg.from?.first_name || "музыкант";
        tgSettings.chatId = detectedId;
        const input = document.getElementById("tg-chat-id-input");
        if (input) input.value = detectedId;
        saveTgSettings();
        updateTelegramStatusUI();

        if (statusMsg) {
          statusMsg.textContent = `Успешно! Найден чат с ${userName} (ID: ${detectedId})`;
        }

        await sendTelegramMessage(
          `🎹 <b>Привет, ${userName}!</b>\n` +
          `Тренажёр <b>«Ладно · Фортепиано»</b> успешно подключен к твоему Telegram!\n\n` +
          `Теперь бот присылает:\n` +
          `• <b>Отчёты о выполненных упражнениях</b> (какие задания сделаны)\n` +
          `• <b>Подробный разбор ошибок</b> (где ошибся и как исправить)\n` +
          `• Поздравления с сериями успехов\n` +
          `• Итоговую сводку тренировки\n\n` +
          `<i>Приятной и вдохновляющей практики за клавишами! ✨</i>`
        );
      } else {
        if (statusMsg) statusMsg.textContent = "Не удалось извлечь ID из последнего сообщения.";
      }
    } catch (e) {
      if (statusMsg) statusMsg.textContent = "Ошибка сети: " + e.message;
    }
  }

  function updateTelegramStatusUI() {
    const isConfigured = Boolean(tgSettings.chatId);
    const topbarStatus = document.getElementById("topbar-tg-status");
    const sidebarLabel = document.getElementById("sidebar-tg-label");
    const sidebarDot = document.getElementById("sidebar-tg-dot");
    const sidebarDesc = document.getElementById("sidebar-tg-desc");

    if (topbarStatus) {
      topbarStatus.textContent = isConfigured ? "Telegram: Активен" : "Настроить Telegram";
    }
    if (sidebarLabel) {
      sidebarLabel.textContent = isConfigured ? "Telegram подключен" : "Настроить отчёты";
    }
    if (sidebarDot) {
      sidebarDot.className = "tg-status-dot" + (isConfigured ? "" : " pending");
    }
    if (sidebarDesc) {
      sidebarDesc.textContent = isConfigured
        ? `Отчёты приходят в чат ID ${tgSettings.chatId}.`
        : "Нажмите, чтобы подключить отправку отчётов в бот.";
    }

    const input = document.getElementById("tg-chat-id-input");
    if (input && tgSettings.chatId) input.value = tgSettings.chatId;

    const chkCompleted = document.getElementById("tg-send-completed");
    if (chkCompleted) chkCompleted.checked = tgSettings.sendCompleted;
    const chkErrors = document.getElementById("tg-send-errors");
    if (chkErrors) chkErrors.checked = tgSettings.sendErrors;
    const chkStreaks = document.getElementById("tg-send-streaks");
    if (chkStreaks) chkStreaks.checked = tgSettings.sendStreaks;
    const chkSummary = document.getElementById("tg-send-summary");
    if (chkSummary) chkSummary.checked = tgSettings.sendSummary;
  }

  // 1. Отправка в Telegram: какие упражнения пользователь выполнял
  async function notifyTelegramExerciseDone(exerciseName, taskDescription, details) {
    if (!tgSettings.sendCompleted || !tgSettings.chatId) return;

    const roundStats = state.statsByExercise[exerciseName] || { answered: 1, correct: 1 };
    const pct = roundStats.answered > 0 ? Math.round((roundStats.correct / roundStats.answered) * 100) : 100;

    const text =
      `✅ <b>Выполнено упражнение «Ладно · Фортепиано»</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Раздел:</b> ${exerciseName}\n` +
      `🎯 <b>Задание:</b> ${taskDescription}\n` +
      `✨ <b>Результат:</b> ${details}\n\n` +
      `📊 <b>Серия побед:</b> ${state.currentStreak} подряд | Точность в теме: ${pct}% (${roundStats.correct}/${roundStats.answered})`;

    await sendTelegramMessage(text);
  }

  // 2. Отправка в Telegram: где пользователь ошибался при выполнении упражнений
  async function notifyTelegramError(exerciseName, questionText, userAnswer, correctAnswer, explanation) {
    if (!tgSettings.sendErrors || !tgSettings.chatId) return;

    const roundStats = state.statsByExercise[exerciseName] || { answered: 1, correct: 0 };
    const pct = roundStats.answered > 0 ? Math.round((roundStats.correct / roundStats.answered) * 100) : 0;

    const text =
      `❌ <b>Ошибка в упражнении «Ладно · Фортепиано»</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Раздел:</b> ${exerciseName}\n` +
      `❓ <b>Задание:</b> ${questionText}\n` +
      `🔴 <b>Твой ответ:</b> ${userAnswer}\n` +
      `🟢 <b>Правильный ответ:</b> ${correctAnswer}\n\n` +
      `💡 <b>Где была ошибка и как запомнить:</b>\n${explanation}\n\n` +
      `📊 <b>Серия прервана:</b> 0 подряд | Точность в теме: ${pct}% (${roundStats.correct}/${roundStats.answered})`;

    await sendTelegramMessage(text);
  }

  async function notifyTelegramStreak(streakCount, exerciseName) {
    if (!tgSettings.sendStreaks || !tgSettings.chatId) return;
    if (streakCount !== 5 && streakCount !== 10 && streakCount !== 20 && streakCount !== 50) return;

    const text =
      `🔥 <b>Отличный результат в «Ладно · Фортепиано»!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>Раздел:</b> ${exerciseName}\n` +
      `⚡ <b>Серия:</b> <b>${streakCount}</b> правильных ответов подряд!\n` +
      `Пальцы и слух работают слаженно. Так держать! 🎹✨`;

    await sendTelegramMessage(text);
  }

  async function sendTelegramSessionSummary() {
    if (!tgSettings.chatId) {
      alert("Сначала подключите Telegram и укажите Chat ID!");
      return;
    }

    const accuracy = state.totalAnswered > 0 ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0;
    const dateStr = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

    let exerciseBreakdown = "";
    for (const [name, s] of Object.entries(state.statsByExercise)) {
      const p = s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0;
      exerciseBreakdown += `• <b>${name}:</b> ${s.correct}/${s.answered} (${p}%)\n`;
    }

    if (!exerciseBreakdown) {
      exerciseBreakdown = "• Пока выполнено мало заданий в текущей сессии.\n";
    }

    const text =
      `📊 <b>Сводка тренировки · Ладно Фортепиано</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>Дата:</b> ${dateStr}\n` +
      `🎯 <b>Всего упражнений:</b> ${state.totalAnswered}\n` +
      `✅ <b>Правильно:</b> ${state.totalCorrect} (${accuracy}%)\n` +
      `❌ <b>Ошибок:</b> ${state.totalErrors}\n` +
      `⚡ <b>Лучшая серия:</b> ${state.bestStreak} подряд\n\n` +
      `🔍 <b>Результаты по разделам:</b>\n${exerciseBreakdown}\n` +
      `🎹 <i>«Музыка начинает жить там, где кончаются сомнения». Продолжай заниматься регулярно!</i>`;

    const res = await sendTelegramMessage(text);
    if (res.success) {
      alert("✅ Итоговая сводка тренировки успешно отправлена тебе в Telegram!");
    } else {
      alert("Не удалось отправить сводку: " + (res.reason || "проверьте настройки"));
    }
  }

  /* ------------------------------------------------------------------------
     5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ НОТ
     ------------------------------------------------------------------------ */
  function midiToNote(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return {
      midi: midi,
      pc: pc,
      octave: octave,
      name: NOTE_NAMES[pc] + octave,
      letter: NOTE_NAMES[pc],
      doremi: NOTE_RU[pc],
      isBlack: [1, 3, 6, 8, 10].includes(pc)
    };
  }

  function getNoteLabel(note) {
    if (state.labelMode === "none") return "";
    if (state.labelMode === "letters") return note.letter;
    return note.doremi;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ------------------------------------------------------------------------
     6. ГЕНЕРАТОР КЛАВИАТУРЫ ФОРТЕПИАНО (Interactive Piano)
     ------------------------------------------------------------------------ */
  function renderPianoKeyboard(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const startMidi = options.startMidi || 48; // C3
    const endMidi = options.endMidi || 72; // C5
    const onKeyClick = options.onClick || null;
    const showShortcuts = options.showShortcuts !== undefined ? options.showShortcuts : state.showShortcuts;
    const fingerMap = options.fingers || {};

    container.innerHTML = "";

    const notes = [];
    for (let m = startMidi; m <= endMidi; m++) {
      notes.push(midiToNote(m));
    }

    const whiteNotes = notes.filter((n) => !n.isBlack);
    const totalWhite = whiteNotes.length;

    whiteNotes.forEach((note, whiteIndex) => {
      const keyEl = document.createElement("div");
      keyEl.className = "piano-key white";
      keyEl.dataset.midi = note.midi;
      keyEl.dataset.whiteIndex = whiteIndex;

      let inner = `<span class="key-note">${getNoteLabel(note)}</span>`;
      inner += `<span class="key-octave">${note.octave}</span>`;

      if (showShortcuts && SHORTCUT_LABELS[note.midi]) {
        inner += `<span class="key-shortcut">${SHORTCUT_LABELS[note.midi]}</span>`;
      }
      if (fingerMap[note.midi]) {
        inner += `<span class="key-finger">${fingerMap[note.midi]}</span>`;
      }

      keyEl.innerHTML = inner;

      keyEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        triggerKey(note.midi, keyEl, onKeyClick);
      });
      keyEl.addEventListener("touchstart", (e) => {
        e.preventDefault();
        triggerKey(note.midi, keyEl, onKeyClick);
      });

      container.appendChild(keyEl);
    });

    const blackNotes = notes.filter((n) => n.isBlack);
    blackNotes.forEach((note) => {
      const keyEl = document.createElement("div");
      keyEl.className = "piano-key black";
      keyEl.dataset.midi = note.midi;

      const prevWhite = whiteNotes.findIndex((w) => w.midi === note.midi - 1);
      if (prevWhite !== -1) {
        const pctLeft = ((prevWhite + 0.68) / totalWhite) * 100;
        keyEl.style.left = `${pctLeft}%`;
      }

      let inner = `<span class="key-note">${getNoteLabel(note)}</span>`;
      if (showShortcuts && SHORTCUT_LABELS[note.midi]) {
        inner += `<span class="key-shortcut">${SHORTCUT_LABELS[note.midi]}</span>`;
      }
      if (fingerMap[note.midi]) {
        inner += `<span class="key-finger">${fingerMap[note.midi]}</span>`;
      }

      keyEl.innerHTML = inner;

      keyEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        triggerKey(note.midi, keyEl, onKeyClick);
      });
      keyEl.addEventListener("touchstart", (e) => {
        e.preventDefault();
        triggerKey(note.midi, keyEl, onKeyClick);
      });

      container.appendChild(keyEl);
    });
  }

  function triggerKey(midi, keyEl, customCallback) {
    playMidi(midi, 1.1, 0.85);

    if (keyEl) {
      keyEl.classList.add("active");
      setTimeout(() => keyEl.classList.remove("active"), 180);
    }

    updateLiveStaff(midi);

    const note = midiToNote(midi);
    const statusEl = document.getElementById("notes-status");
    if (statusEl) {
      statusEl.textContent = `Звучит: ${note.doremi} (${note.name}) • ${note.octave}-я октава`;
    }

    if (customCallback) {
      customCallback(midi, note, keyEl);
    }
  }

  function updateLiveStaff(midi) {
    const activeSection = location.hash.slice(1) || "notes";
    if (activeSection === "sightreading") {
      renderGrandStaffSvg("staff-display", [midi]);
      const cap = document.getElementById("staff-note-name");
      if (cap) {
        const n = midiToNote(midi);
        cap.textContent = `Нота: ${n.doremi} (${n.name}) — ${n.octave} октава`;
      }
    } else if (activeSection === "play") {
      renderGrandStaffSvg("freelab-staff-display", [midi]);
      const cap = document.getElementById("freelab-caption");
      if (cap) {
        const n = midiToNote(midi);
        cap.textContent = `Сыграно: ${n.doremi} (${n.name})`;
      }
    }
  }

  /* ------------------------------------------------------------------------
     7. РЕНДЕРЕР НОТНОГО СТАНА GRAND STAFF (SVG)
     ------------------------------------------------------------------------ */
  function renderGrandStaffSvg(containerId, midis = [], options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = options.width || 680;
    const height = options.height || 260;
    const showClef = options.clef || "both";

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:auto;">`;
    svg += `<rect width="${width}" height="${height}" fill="#fffdfa" rx="8" />`;

    if (showClef === "both") {
      svg += `
        <line x1="38" y1="45" x2="38" y2="213" stroke="#26382f" stroke-width="2.5" />
        <path d="M 38 45 C 26 80, 24 110, 16 129 C 24 148, 26 178, 38 213" fill="none" stroke="#26382f" stroke-width="2.5" stroke-linecap="round" />
      `;
    }

    if (showClef === "both" || showClef === "treble") {
      for (let i = 0; i < 5; i++) {
        const y = 45 + i * 12;
        svg += `<line x1="40" y1="${y}" x2="${width - 25}" y2="${y}" stroke="#788b7d" stroke-width="1.2" />`;
      }
      svg += `<text x="46" y="94" font-family="serif" font-size="52" fill="#26382f">𝄞</text>`;
    }

    if (showClef === "both" || showClef === "bass") {
      for (let i = 0; i < 5; i++) {
        const y = 165 + i * 12;
        svg += `<line x1="40" y1="${y}" x2="${width - 25}" y2="${y}" stroke="#788b7d" stroke-width="1.2" />`;
      }
      svg += `<text x="48" y="196" font-family="serif" font-size="44" fill="#26382f">𝄢</text>`;
    }

    function getYForMidi(midi) {
      const diatonicMap = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
      const pc = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      const diatonicStepFromC4 = (octave - 4) * 7 + diatonicMap[pc];
      return 129 - diatonicStepFromC4 * 6;
    }

    const noteArray = Array.isArray(midis) ? midis : [midis];
    const totalNotes = noteArray.length;
    const startX = totalNotes > 1 ? 160 : 340;
    const spacingX = totalNotes > 1 ? Math.min(75, (width - 220) / totalNotes) : 0;

    noteArray.forEach((midi, idx) => {
      if (typeof midi !== "number") return;
      const y = getYForMidi(midi);
      const x = totalNotes > 1 ? startX + idx * spacingX : startX;
      const note = midiToNote(midi);

      if (Math.abs(y - 129) < 2) {
        svg += `<line x1="${x - 16}" y1="129" x2="${x + 16}" y2="129" stroke="#376b53" stroke-width="1.6" />`;
      }
      for (let ly = 33; ly >= y - 1; ly -= 12) {
        svg += `<line x1="${x - 14}" y1="${ly}" x2="${x + 14}" y2="${ly}" stroke="#376b53" stroke-width="1.4" />`;
      }
      for (let ly = 225; ly <= y + 1; ly -= 12) {
        svg += `<line x1="${x - 14}" y1="${ly}" x2="${x + 14}" y2="${ly}" stroke="#376b53" stroke-width="1.4" />`;
      }

      if (note.isBlack) {
        svg += `<text x="${x - 22}" y="${y + 5}" font-family="serif" font-size="20" fill="#376b53" font-weight="bold">♯</text>`;
      }

      svg += `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="6" fill="#244f3d" transform="rotate(-20 ${x} ${y})" />`;

      if (y > 120) {
        svg += `<line x1="${x + 7.5}" y1="${y}" x2="${x + 7.5}" y2="${y - 36}" stroke="#244f3d" stroke-width="1.8" />`;
      } else {
        svg += `<line x1="${x - 7.5}" y1="${y}" x2="${x - 7.5}" y2="${y + 36}" stroke="#244f3d" stroke-width="1.8" />`;
      }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  /* ------------------------------------------------------------------------
     8. ТРЕНИРОВКА РИТМА: МЕТРОНОМ И ТАП-ТРЕНАЖЁР
     ------------------------------------------------------------------------ */
  let metronomeTimer = null;
  let bpm = 90;
  let meter = 4;
  let currentBeat = 0;
  let isMetronomeRunning = false;
  let nextBeatTime = 0;

  let tapStats = {
    totalTaps: 0,
    perfectHits: 0,
    goodHits: 0,
    offsets: [],
    challengeActive: false,
    challengeTaps: 0,
    pattern: "quarters"
  };

  function playMetronomeClick(isAccent = false) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(isAccent ? 0.45 : 0.25, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function startMetronome() {
    getAudioContext();
    isMetronomeRunning = true;
    currentBeat = 0;
    const intervalMs = (60 / bpm) * 1000;

    const toggleBtn = document.getElementById("metronome-toggle-btn");
    if (toggleBtn) {
      toggleBtn.textContent = "⏹ Остановить метроном";
      toggleBtn.classList.add("button-accent");
    }

    function tick() {
      if (!isMetronomeRunning) return;
      currentBeat = (currentBeat % meter) + 1;
      const isAccent = currentBeat === 1;
      playMetronomeClick(isAccent);
      highlightMeterDot(currentBeat);
      nextBeatTime = Date.now() + intervalMs;
      metronomeTimer = setTimeout(tick, intervalMs);
    }

    tick();
  }

  function stopMetronome() {
    isMetronomeRunning = false;
    clearTimeout(metronomeTimer);
    const toggleBtn = document.getElementById("metronome-toggle-btn");
    if (toggleBtn) {
      toggleBtn.textContent = "▶ Запустить метроном";
      toggleBtn.classList.remove("button-accent");
    }
    clearMeterDots();
  }

  function highlightMeterDot(beat) {
    const dots = document.querySelectorAll(".meter-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx + 1 === beat);
    });
  }

  function clearMeterDots() {
    const dots = document.querySelectorAll(".meter-dot");
    dots.forEach((dot) => dot.classList.remove("active"));
  }

  function handleUserTap() {
    getAudioContext();
    const tapBtn = document.getElementById("tap-btn");
    if (tapBtn) {
      tapBtn.classList.add("pulse");
      setTimeout(() => tapBtn.classList.remove("pulse"), 120);
    }

    if (!isMetronomeRunning) {
      startMetronome();
    }

    const intervalMs = (60 / bpm) * 1000;
    const now = Date.now();
    const diffToNext = nextBeatTime - now;
    const diffToPrev = now - (nextBeatTime - intervalMs);
    let offsetMs = Math.abs(diffToNext) < Math.abs(diffToPrev) ? -diffToNext : diffToPrev;

    if (offsetMs > intervalMs / 2) offsetMs = offsetMs - intervalMs;
    if (offsetMs < -intervalMs / 2) offsetMs = offsetMs + intervalMs;

    tapStats.totalTaps++;
    tapStats.offsets.push(offsetMs);

    const absOff = Math.abs(offsetMs);
    let grade = "Идеально!";
    let markerClass = "perfect";

    if (absOff <= 25) {
      grade = "Идеально! ✦";
      markerClass = "perfect";
      tapStats.perfectHits++;
    } else if (absOff <= 55) {
      grade = "Отлично";
      markerClass = "good";
      tapStats.goodHits++;
    } else if (offsetMs < 0) {
      grade = `Раньше на ${Math.round(absOff)} мс`;
      markerClass = "early";
    } else {
      grade = `Позже на ${Math.round(absOff)} мс`;
      markerClass = "late";
    }

    const marker = document.getElementById("rhythm-marker");
    if (marker) {
      marker.style.display = "block";
      marker.className = `rhythm-hit-marker ${markerClass}`;
      const pctOffset = Math.max(-45, Math.min(45, (offsetMs / 200) * 45));
      marker.style.left = `${50 + pctOffset}%`;
    }

    const accuracyPct = Math.round(((tapStats.perfectHits + tapStats.goodHits * 0.7) / tapStats.totalTaps) * 100);
    const accEl = document.getElementById("rhythm-accuracy");
    if (accEl) accEl.textContent = `${accuracyPct}%`;
    const offEl = document.getElementById("rhythm-offset");
    if (offEl) offEl.textContent = `${offsetMs >= 0 ? "+" : ""}${Math.round(offsetMs)} мс`;
    const cntEl = document.getElementById("rhythm-tap-count");
    if (cntEl) cntEl.textContent = tapStats.totalTaps;
    const grdEl = document.getElementById("rhythm-grade");
    if (grdEl) grdEl.textContent = grade;

    // Проверка выполнения ритмического упражнения
    if (tapStats.challengeActive) {
      tapStats.challengeTaps++;
      const fb = document.getElementById("rhythm-challenge-feedback");
      if (fb) {
        fb.textContent = `Тап ${tapStats.challengeTaps} из 8... (${grade})`;
      }
      if (tapStats.challengeTaps >= 8) {
        finishRhythmChallenge(accuracyPct);
      }
    }
  }

  async function finishRhythmChallenge(accuracy) {
    tapStats.challengeActive = false;
    const fb = document.getElementById("rhythm-challenge-feedback");
    const passed = accuracy >= 75;

    const patternEl = document.getElementById("rhythm-pattern-select");
    const patternName = patternEl ? patternEl.options[patternEl.selectedIndex].text : "Четверти";
    const sumOffsets = tapStats.offsets.reduce((acc, v) => acc + Math.abs(v), 0);
    const avgOff = tapStats.offsets.length ? Math.round(sumOffsets / tapStats.offsets.length) : 20;

    if (passed) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `🎉 Отлично! Ритмическое упражнение «${patternName}» успешно выполнено с точностью ${accuracy}%! Отчёт отправлен в Telegram.`;
      }
      registerAnswerSuccess(
        "Тренировка ритма",
        `Ритмический паттерн «${patternName}» (${bpm} BPM)`,
        `Точность: ${accuracy}%, среднее отклонение: ±${avgOff} мс`
      );
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Слишком большая погрешность: точность ${accuracy}% (ср. отклонение ±${avgOff} мс). Ошибка отправлена в Telegram!`;
      }
      registerAnswerError(
        "Тренировка ритма",
        `Ритмический паттерн «${patternName}» (${bpm} BPM)`,
        `Точность ${accuracy}% (отклонение ±${avgOff} мс)`,
        "Точность от 75% и выше",
        "Ориентируйся на звонкий щелчок первой доли метронома и считай пульс вслух: «Раз-и, Два-и»."
      );
    }
  }

  /* ------------------------------------------------------------------------
     9. ОБРАБОТКА РЕЗУЛЬТАТОВ И ОБНОВЛЕНИЕ СТАТИСТИКИ
     ------------------------------------------------------------------------ */
  function registerAnswerSuccess(exerciseName, taskDescription = "", details = "") {
    state.totalAnswered++;
    state.totalCorrect++;
    state.currentStreak++;
    if (state.currentStreak > state.bestStreak) {
      state.bestStreak = state.currentStreak;
    }

    if (!state.statsByExercise[exerciseName]) {
      state.statsByExercise[exerciseName] = { answered: 0, correct: 0, errors: 0 };
    }
    state.statsByExercise[exerciseName].answered++;
    state.statsByExercise[exerciseName].correct++;

    updateGlobalStatsUI();
    saveState();

    // Отправляем в Telegram сообщение о том, какое упражнение выполнено!
    notifyTelegramExerciseDone(exerciseName, taskDescription, details);

    // Проверяем серии
    if (state.currentStreak === 5 || state.currentStreak === 10 || state.currentStreak === 20) {
      notifyTelegramStreak(state.currentStreak, exerciseName);
    }
  }

  function registerAnswerError(exerciseName, questionText, userAnswer, correctAnswer, explanation) {
    state.totalAnswered++;
    state.totalErrors++;
    state.currentStreak = 0;

    if (!state.statsByExercise[exerciseName]) {
      state.statsByExercise[exerciseName] = { answered: 0, correct: 0, errors: 0 };
    }
    state.statsByExercise[exerciseName].answered++;
    state.statsByExercise[exerciseName].errors++;

    updateGlobalStatsUI();
    saveState();

    // Отправляем в Telegram сообщение об ошибке с разбором!
    notifyTelegramError(exerciseName, questionText, userAnswer, correctAnswer, explanation);
  }

  function updateGlobalStatsUI() {
    const streakEl = document.getElementById("top-streak");
    if (streakEl) streakEl.textContent = state.currentStreak;
  }

  /* ------------------------------------------------------------------------
     10. УПРАЖНЕНИЕ 01: НАЙДИ НОТУ НА ПИАНИНО
     ------------------------------------------------------------------------ */
  let notesQuizTarget = null;

  function initNotesQuiz() {
    renderPianoKeyboard("notes-quiz-piano", {
      startMidi: 60,
      endMidi: 72,
      showShortcuts: true,
      onClick: handleNotesQuizKeyClick
    });
    nextNotesQuiz();
  }

  function nextNotesQuiz() {
    const midi = 60 + Math.floor(Math.random() * 13);
    notesQuizTarget = midiToNote(midi);

    const promptEl = document.getElementById("notes-quiz-prompt");
    if (promptEl) {
      promptEl.textContent = `Задание: Найди на клавишах ноту ${notesQuizTarget.doremi} (${notesQuizTarget.name})`;
    }
    const fb = document.getElementById("notes-feedback");
    if (fb) {
      fb.className = "feedback";
      fb.textContent = "Нажми нужную клавишу на пианино выше.";
    }

    const keys = document.querySelectorAll("#notes-quiz-piano .piano-key");
    keys.forEach((k) => k.classList.remove("quiz-correct", "quiz-wrong", "quiz-highlight"));
  }

  function handleNotesQuizKeyClick(midi, note) {
    if (!notesQuizTarget) return;

    const fb = document.getElementById("notes-feedback");
    const clickedKey = document.querySelector(`#notes-quiz-piano .piano-key[data-midi="${midi}"]`);
    const correctKey = document.querySelector(`#notes-quiz-piano .piano-key[data-midi="${notesQuizTarget.midi}"]`);

    if (midi === notesQuizTarget.midi) {
      if (clickedKey) clickedKey.classList.add("quiz-correct");
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `🎉 Точно! Это ${note.doremi} (${note.name}). Серия растёт!`;
      }
      registerAnswerSuccess(
        "Ноты и клавиши",
        `Поиск ноты ${notesQuizTarget.doremi} (${notesQuizTarget.name})`,
        `Клавиша ${note.doremi} найдена безошибочно!`
      );
      updateNotesStatsUI();
      setTimeout(nextNotesQuiz, 1400);
    } else {
      if (clickedKey) clickedKey.classList.add("quiz-wrong");
      if (correctKey) correctKey.classList.add("quiz-correct");
      const explanation = `Нота ${notesQuizTarget.doremi} (${notesQuizTarget.name}) расположена ${
        notesQuizTarget.isBlack ? "на чёрной клавише" : "на белой клавише"
      }. Ориентир: нота До (C) всегда находится слева от двух чёрных клавиш.`;

      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка: ты нажал ${note.doremi} (${note.name}), а требовалась ${notesQuizTarget.doremi} (${notesQuizTarget.name}). Отчёт отправлен в Telegram!`;
      }

      registerAnswerError(
        "Ноты и клавиши",
        `Найди ноту ${notesQuizTarget.doremi} (${notesQuizTarget.name})`,
        `${note.doremi} (${note.name})`,
        `${notesQuizTarget.doremi} (${notesQuizTarget.name})`,
        explanation
      );
      updateNotesStatsUI();
    }
  }

  function updateNotesStatsUI() {
    const s = state.statsByExercise["Ноты и клавиши"] || { answered: 0, correct: 0 };
    const el = document.getElementById("notes-stats");
    if (el) el.textContent = `Серия: ${state.currentStreak} • Всего: ${s.answered}`;
  }

  /* ------------------------------------------------------------------------
     11. УПРАЖНЕНИЕ 02: ЧТЕНИЕ НОТ С ЛИСТА (Grand Staff)
     ------------------------------------------------------------------------ */
  let sightTarget = null;

  function initSightReadingQuiz() {
    renderPianoKeyboard("sightreading-quiz-piano", {
      startMidi: 48,
      endMidi: 72,
      showShortcuts: true,
      onClick: handleSightKeyClick
    });
    nextSightReadingQuiz();
  }

  function nextSightReadingQuiz() {
    const clefMode = document.getElementById("quiz-clef-select")?.value || "treble";
    const accMode = document.getElementById("quiz-accidentals-select")?.value || "natural";

    let pool = [];
    if (clefMode === "treble") {
      pool = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
    } else if (clefMode === "bass") {
      pool = [43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60];
    } else {
      pool = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
    }

    if (accMode === "accidentals") {
      pool = pool.concat([61, 63, 66, 68, 70, 51, 54, 56]);
    }

    const midi = pool[Math.floor(Math.random() * pool.length)];
    sightTarget = midiToNote(midi);

    renderGrandStaffSvg("quiz-staff-display", [sightTarget.midi], { clef: clefMode });

    const answersContainer = document.getElementById("sightreading-answers");
    if (answersContainer) {
      answersContainer.innerHTML = "";
      const options = [sightTarget];
      while (options.length < 4) {
        const randMidi = pool[Math.floor(Math.random() * pool.length)];
        const candidate = midiToNote(randMidi);
        if (!options.some((o) => o.name === candidate.name)) {
          options.push(candidate);
        }
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer";
        btn.textContent = `${opt.doremi} (${opt.name})`;
        btn.addEventListener("click", () => handleSightAnswer(opt));
        answersContainer.appendChild(btn);
      });
    }

    const fb = document.getElementById("sightreading-feedback");
    if (fb) {
      fb.className = "feedback";
      fb.textContent = "Какая нота нарисована на стане? Сыграй клавишу или нажми кнопку.";
    }
  }

  function handleSightKeyClick(midi, note) {
    if (!sightTarget) return;
    handleSightAnswer(note);
  }

  function handleSightAnswer(chosenNote) {
    if (!sightTarget) return;

    const fb = document.getElementById("sightreading-feedback");
    const isCorrect = chosenNote.midi === sightTarget.midi || chosenNote.name === sightTarget.name;
    const clefMode = document.getElementById("quiz-clef-select")?.value || "treble";
    const clefName = clefMode === "treble" ? "Скрипичный ключ" : clefMode === "bass" ? "Басовый ключ" : "Оба ключа";

    const btns = document.querySelectorAll("#sightreading-answers .answer");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.textContent.includes(sightTarget.name)) b.classList.add("correct");
      if (!isCorrect && b.textContent.includes(chosenNote.name)) b.classList.add("wrong");
    });

    if (isCorrect) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `Верно! Это нота ${sightTarget.doremi} (${sightTarget.name}). Прекрасное чтение с листа!`;
      }
      registerAnswerSuccess(
        "Чтение нот с листа",
        `Нота на стане (${clefName})`,
        `Нота ${sightTarget.doremi} (${sightTarget.name}) прочитана безошибочно!`
      );
      updateSightStatsUI();
      setTimeout(nextSightReadingQuiz, 1400);
    } else {
      let advice = "";
      if (sightTarget.midi < 60) {
        advice = `В басовом ключе ориентир — 4-я линейка снизу (нота Фа/F3 между двумя точками). Нота ${sightTarget.doremi} относится к ${sightTarget.octave}-й октаве.`;
      } else {
        advice = `В скрипичном ключе ориентир — 2-я линейка снизу (нота Соль/G4, где начинается завиток). Нота ${sightTarget.doremi} относится к ${sightTarget.octave}-й октаве.`;
      }

      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка: выбран ответ ${chosenNote.doremi} (${chosenNote.name}), правильный — ${sightTarget.doremi} (${sightTarget.name}). Разбор отправлен в Telegram!`;
      }

      registerAnswerError(
        "Чтение нот с листа",
        `Чтение ноты на стане (${clefName})`,
        `${chosenNote.doremi} (${chosenNote.name})`,
        `${sightTarget.doremi} (${sightTarget.name})`,
        advice
      );
      updateSightStatsUI();
    }
  }

  function updateSightStatsUI() {
    const s = state.statsByExercise["Чтение нот с листа"] || { answered: 0, errors: 0 };
    const el = document.getElementById("sightreading-stats");
    if (el) el.textContent = `Серия: ${state.currentStreak} • Ошибок: ${s.errors}`;
  }

  /* ------------------------------------------------------------------------
     12. УПРАЖНЕНИЕ 03: ИНТЕРВАЛЫ НА СЛУХ
     ------------------------------------------------------------------------ */
  let intervalTarget = null;
  let intervalRootMidi = 60;

  function nextIntervalQuiz() {
    const rand = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    intervalRootMidi = 60 + Math.floor(Math.random() * 5);
    intervalTarget = rand;

    playIntervalSound(intervalRootMidi, intervalTarget.semitones, "up");

    const hint = document.getElementById("intervals-quiz-hint");
    if (hint) hint.textContent = "Интервал прозвучал. Выбери его название:";

    const ansContainer = document.getElementById("intervals-answers");
    if (ansContainer) {
      ansContainer.innerHTML = "";
      const choices = [intervalTarget];
      while (choices.length < 4) {
        const c = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
        if (!choices.some((item) => item.id === c.id)) choices.push(c);
      }
      choices.sort(() => Math.random() - 0.5);

      choices.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer";
        btn.textContent = item.name;
        btn.addEventListener("click", () => handleIntervalAnswer(item));
        ansContainer.appendChild(btn);
      });
    }

    const fb = document.getElementById("intervals-feedback");
    if (fb) {
      fb.className = "feedback";
      fb.textContent = "Послушай и определи интервал.";
    }
  }

  function playIntervalSound(rootMidi, semitones, mode = "up") {
    if (mode === "harmonic") {
      playChordMidi([rootMidi, rootMidi + semitones], 1.6);
    } else if (mode === "down") {
      playPianoTone(rootMidi + semitones, 0.9, 0.8);
      setTimeout(() => playPianoTone(rootMidi, 1.2, 0.8), 500);
    } else {
      playPianoTone(rootMidi, 0.9, 0.8);
      setTimeout(() => playPianoTone(rootMidi + semitones, 1.2, 0.8), 500);
    }
  }

  function handleIntervalAnswer(chosen) {
    if (!intervalTarget) return;

    const fb = document.getElementById("intervals-feedback");
    const isCorrect = chosen.id === intervalTarget.id;

    const btns = document.querySelectorAll("#intervals-answers .answer");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.textContent === intervalTarget.name) b.classList.add("correct");
      if (!isCorrect && b.textContent === chosen.name) b.classList.add("wrong");
    });

    if (isCorrect) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `🎯 Браво! Это ${intervalTarget.name} (${intervalTarget.semitones} полут.). Ассоциация: ${intervalTarget.song}.`;
      }
      registerAnswerSuccess(
        "Интервалы на слух",
        `Определение интервала ${intervalTarget.name}`,
        `Угадан интервал ${intervalTarget.name} (${intervalTarget.semitones} полутонов, ${intervalTarget.song})`
      );
      updateIntervalStatsUI();
      setTimeout(nextIntervalQuiz, 1600);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Неверно: выбран интервал «${chosen.name}», а звучал «${intervalTarget.name}» (${intervalTarget.song}). Ошибка отправлена в Telegram!`;
      }

      registerAnswerError(
        "Интервалы на слух",
        "Определи интервал по слуху",
        chosen.name,
        intervalTarget.name,
        `Интервал ${intervalTarget.name} равен ${intervalTarget.semitones} полутонам. Слуховой якорь для запоминания: ${intervalTarget.song}.`
      );
      updateIntervalStatsUI();
    }
  }

  function updateIntervalStatsUI() {
    const s = state.statsByExercise["Интервалы на слух"] || { answered: 0, errors: 0 };
    const el = document.getElementById("intervals-stats");
    if (el) el.textContent = `Серия: ${state.currentStreak} • Ошибок: ${s.errors}`;
  }

  /* ------------------------------------------------------------------------
     13. УПРАЖНЕНИЕ 04: ЗАПОМИНАНИЕ АККОРДОВ (3 РЕЖИМА)
     ------------------------------------------------------------------------ */
  let chordQuizMode = "build"; // 'build', 'spelling', 'ear'
  let chordTargetItem = null;
  let chordSelectedKeys = new Set(); // MIDI ноты при сборке

  function initChordQuiz() {
    // Клавиатура для сборки аккордов
    renderPianoKeyboard("chord-quiz-piano", {
      startMidi: 60, // C4
      endMidi: 76, // E5
      showShortcuts: true,
      onClick: handleChordBuildKeyClick
    });

    document.querySelectorAll("[data-chord-quiz-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-chord-quiz-mode]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        chordQuizMode = btn.dataset.chordQuizMode;

        const buildBox = document.getElementById("chord-quiz-build-box");
        const otherBox = document.getElementById("chord-quiz-other-box");
        if (buildBox) buildBox.style.display = chordQuizMode === "build" ? "block" : "none";
        if (otherBox) otherBox.style.display = chordQuizMode !== "build" ? "block" : "none";

        nextChordQuiz();
      });
    });

    document.getElementById("chord-build-reset-btn")?.addEventListener("click", resetChordBuildSelection);

    nextChordQuiz();
  }

  function resetChordBuildSelection() {
    chordSelectedKeys.clear();
    const keys = document.querySelectorAll("#chord-quiz-piano .piano-key");
    keys.forEach((k) => k.classList.remove("quiz-correct", "quiz-wrong", "quiz-highlight"));
    updateChordBuildCount();
  }

  function updateChordBuildCount() {
    const el = document.getElementById("chord-build-selected-notes");
    if (el) {
      el.textContent = `Нажато нот: ${chordSelectedKeys.size} из 3`;
    }
  }

  function nextChordQuiz() {
    chordTargetItem = MEMORIZE_CHORDS[Math.floor(Math.random() * MEMORIZE_CHORDS.length)];
    resetChordBuildSelection();

    const ansContainer = document.getElementById("chords-answers");
    const fb = document.getElementById("chords-feedback");
    const caption = document.getElementById("chords-answers-caption");

    if (chordQuizMode === "build") {
      // Режим 1: Сборка на клавиатуре
      if (caption) caption.textContent = "ИЛИ ВЫБЕРИ БУКВЕННОЕ ОБОЗНАЧЕНИЕ";
      const promptEl = document.getElementById("chord-quiz-build-prompt");
      if (promptEl) {
        promptEl.textContent = `Задание: Собери аккорд ${chordTargetItem.name} — нажми 3 клавиши (${chordTargetItem.ruNotes.join(" - ")})!`;
      }
      if (fb) {
        fb.className = "feedback";
        fb.textContent = `Нажми на пианино 3 ноты трезвучия ${chordTargetItem.name}.`;
      }
      renderChordSpellingAnswers();
    } else if (chordQuizMode === "spelling") {
      // Режим 2: Запоминание нотного состава
      if (caption) caption.textContent = "ИЗ КАКИХ НОТ СОСТОИТ АККОРД?";
      if (fb) {
        fb.className = "feedback";
        fb.textContent = `Из каких трёх нот состоит аккорд ${chordTargetItem.name}?`;
      }
      renderChordSpellingAnswers();
    } else {
      // Режим 3: На слух
      if (caption) caption.textContent = "ВЫБЕРИ ТИП АККОРДА";
      if (fb) {
        fb.className = "feedback";
        fb.textContent = "Послушай аккорд и выбери его тип.";
      }
      playCurrentChordSound();
      renderChordEarAnswers();
    }
  }

  function playCurrentChordSound() {
    if (!chordTargetItem) return;
    const baseMidi = 60 + chordTargetItem.rootPc;
    const midis = chordTargetItem.offsets.map((o) => baseMidi + o);
    playChordMidi(midis, 1.8);
  }

  function handleChordBuildKeyClick(midi, note, keyEl) {
    if (chordQuizMode !== "build" || !chordTargetItem) return;

    if (chordSelectedKeys.has(midi)) {
      chordSelectedKeys.delete(midi);
      if (keyEl) keyEl.classList.remove("quiz-highlight");
    } else {
      if (chordSelectedKeys.size < 3) {
        chordSelectedKeys.add(midi);
        if (keyEl) keyEl.classList.add("quiz-highlight");
      }
    }
    updateChordBuildCount();

    // Если выбрано 3 ноты — автоматически проверяем!
    if (chordSelectedKeys.size === 3) {
      checkChordBuildAnswer();
    }
  }

  function checkChordBuildAnswer() {
    const selectedPcs = Array.from(chordSelectedKeys).map((m) => ((m % 12) + 12) % 12);
    const targetPcs = chordTargetItem.offsets.map((off) => ((chordTargetItem.rootPc + off) % 12 + 12) % 12);

    const isMatch = targetPcs.every((pc) => selectedPcs.includes(pc));
    const fb = document.getElementById("chords-feedback");

    const selectedNoteNames = Array.from(chordSelectedKeys).map((m) => midiToNote(m).doremi).join(" - ");
    const correctNoteNames = chordTargetItem.ruNotes.join(" - ");

    if (isMatch) {
      playCurrentChordSound();
      const keys = document.querySelectorAll("#chord-quiz-piano .piano-key");
      keys.forEach((k) => {
        if (chordSelectedKeys.has(Number(k.dataset.midi))) {
          k.classList.remove("quiz-highlight");
          k.classList.add("quiz-correct");
        }
      });

      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `🎉 Точно! Аккорд ${chordTargetItem.name} (${correctNoteNames}) построен безупречно!`;
      }

      registerAnswerSuccess(
        "Запоминание аккордов",
        `Построение аккорда ${chordTargetItem.name}`,
        `Собраны ноты ${correctNoteNames}. Аккорд построен верно!`
      );
      updateChordStatsUI();
      setTimeout(nextChordQuiz, 1600);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка: ты собрал ноты (${selectedNoteNames}), а требовалось (${correctNoteNames}). Разбор отправлен в Telegram!`;
      }

      registerAnswerError(
        "Запоминание аккордов",
        `Построение аккорда ${chordTargetItem.name}`,
        selectedNoteNames,
        correctNoteNames,
        `Аккорд ${chordTargetItem.name} состоит из ступеней: ${correctNoteNames}. Строение: ${chordTargetItem.type === "Мажор" ? "б.3 (4 полутона) + м.3 (3 полутона)" : "м.3 (3 полутона) + б.3 (4 полутона)"}.`
      );
      updateChordStatsUI();
    }
  }

  function renderChordSpellingAnswers() {
    const ansContainer = document.getElementById("chords-answers");
    if (!ansContainer || !chordTargetItem) return;

    ansContainer.innerHTML = "";
    // Правильный вариант
    const correctOption = {
      text: `${chordTargetItem.id} = ${chordTargetItem.notes.join(" — ")}`,
      correct: true
    };

    // 3 дистрактора
    const wrong1 = {
      text: `${chordTargetItem.id} = ${NOTE_NAMES[(chordTargetItem.rootPc + 1) % 12]} — ${chordTargetItem.notes[1]} — ${chordTargetItem.notes[2]}`,
      correct: false
    };
    const wrong2 = {
      text: `${chordTargetItem.id} = ${chordTargetItem.notes[0]} — ${NOTE_NAMES[(chordTargetItem.rootPc + 5) % 12]} — ${chordTargetItem.notes[2]}`,
      correct: false
    };
    const wrong3 = {
      text: `${chordTargetItem.id} = ${chordTargetItem.notes[0]} — ${chordTargetItem.notes[1]} — ${NOTE_NAMES[(chordTargetItem.rootPc + 8) % 12]}`,
      correct: false
    };

    const options = [correctOption, wrong1, wrong2, wrong3].sort(() => Math.random() - 0.5);

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => handleChordSpellingAnswer(opt));
      ansContainer.appendChild(btn);
    });
  }

  function handleChordSpellingAnswer(opt) {
    const fb = document.getElementById("chords-feedback");
    const btns = document.querySelectorAll("#chords-answers .answer");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.textContent === `${chordTargetItem.id} = ${chordTargetItem.notes.join(" — ")}`) b.classList.add("correct");
      if (!opt.correct && b.textContent === opt.text) b.classList.add("wrong");
    });

    if (opt.correct) {
      playCurrentChordSound();
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `Абсолютно верно! Состав ${chordTargetItem.name}: ${chordTargetItem.notes.join(" — ")}!`;
      }
      registerAnswerSuccess(
        "Запоминание аккордов",
        `Состав аккорда ${chordTargetItem.name}`,
        `Правильно выбран состав: ${chordTargetItem.notes.join(" — ")}`
      );
      updateChordStatsUI();
      setTimeout(nextChordQuiz, 1500);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка! Правильный состав ${chordTargetItem.name}: ${chordTargetItem.notes.join(" — ")}. Отчёт ушёл в Telegram!`;
      }
      registerAnswerError(
        "Запоминание аккордов",
        `Состав аккорда ${chordTargetItem.name}`,
        opt.text,
        `${chordTargetItem.id} = ${chordTargetItem.notes.join(" — ")}`,
        `Запомни: аккорд ${chordTargetItem.name} состоит из звуков ${chordTargetItem.ruNotes.join(" — ")}.`
      );
      updateChordStatsUI();
    }
  }

  function renderChordEarAnswers() {
    const ansContainer = document.getElementById("chords-answers");
    if (!ansContainer) return;
    ansContainer.innerHTML = "";

    const types = [
      { id: "Мажор", name: "Мажорное трезвучие" },
      { id: "Минор", name: "Минорное трезвучие" },
      { id: "Уменьшенное", name: "Уменьшенное трезвучие" },
      { id: "Увеличенное", name: "Увеличенное трезвучие" }
    ];

    types.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer";
      btn.textContent = t.name;
      btn.addEventListener("click", () => handleChordEarAnswer(t.id));
      ansContainer.appendChild(btn);
    });
  }

  function handleChordEarAnswer(chosenType) {
    const fb = document.getElementById("chords-feedback");
    const isCorrect = chosenType === chordTargetItem.type;

    const btns = document.querySelectorAll("#chords-answers .answer");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.textContent.includes(chordTargetItem.type)) b.classList.add("correct");
      if (!isCorrect && b.textContent.includes(chosenType)) b.classList.add("wrong");
    });

    if (isCorrect) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `Верно! Прозвучал ${chordTargetItem.name} (${chordTargetItem.type}).`;
      }
      registerAnswerSuccess(
        "Запоминание аккордов",
        `Определение аккорда ${chordTargetItem.name} на слух`,
        `Точно определено наклонение: ${chordTargetItem.type}`
      );
      updateChordStatsUI();
      setTimeout(nextChordQuiz, 1500);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка: выбран «${chosenType}», а звучал «${chordTargetItem.name}» (${chordTargetItem.type}). Отчёт ушёл в Telegram!`;
      }
      registerAnswerError(
        "Запоминание аккордов",
        `Определение аккорда ${chordTargetItem.name} на слух`,
        chosenType,
        chordTargetItem.type,
        `Аккорд ${chordTargetItem.name} имеет наклонение: ${chordTargetItem.type}. Обрати внимание на окраску терции!`
      );
      updateChordStatsUI();
    }
  }

  function updateChordStatsUI() {
    const s = state.statsByExercise["Запоминание аккордов"] || { answered: 0, errors: 0 };
    const el = document.getElementById("chords-stats");
    if (el) el.textContent = `Серия: ${state.currentStreak} • Ошибок: ${s.errors}`;
  }

  /* ------------------------------------------------------------------------
     14. УПРАЖНЕНИЕ 05: СЕПТАККОРДЫ
     ------------------------------------------------------------------------ */
  let seventhTarget = null;
  let seventhRootMidi = 60;

  function nextSeventhQuiz() {
    const keys = ["dom7", "maj7", "m7", "dim7"];
    const chosenKey = keys[Math.floor(Math.random() * keys.length)];
    seventhTarget = { key: chosenKey, info: SEVENTHS[chosenKey] };
    seventhRootMidi = 60 + Math.floor(Math.random() * 5);

    playSeventhQuizSound();

    const ansContainer = document.getElementById("sevenths-answers");
    if (ansContainer) {
      ansContainer.innerHTML = "";
      keys.forEach((k) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer";
        btn.textContent = SEVENTHS[k].name;
        btn.addEventListener("click", () => handleSeventhAnswer(k));
        ansContainer.appendChild(btn);
      });
    }

    const fb = document.getElementById("sevenths-feedback");
    if (fb) {
      fb.className = "feedback";
      fb.textContent = "Послушай септаккорд и определи его тип.";
    }
  }

  function playSeventhQuizSound() {
    if (!seventhTarget) return;
    const midis = seventhTarget.info.offsets.map((off) => seventhRootMidi + off);
    playChordMidi(midis, 1.9);
  }

  function handleSeventhAnswer(chosenKey) {
    if (!seventhTarget) return;

    const fb = document.getElementById("sevenths-feedback");
    const isCorrect = chosenKey === seventhTarget.key;

    const btns = document.querySelectorAll("#sevenths-answers .answer");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.textContent === seventhTarget.info.name) b.classList.add("correct");
      if (!isCorrect && b.textContent === SEVENTHS[chosenKey].name) b.classList.add("wrong");
    });

    if (isCorrect) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `Верно! Это ${seventhTarget.info.name} — ${seventhTarget.info.desc}!`;
      }
      registerAnswerSuccess(
        "Септаккорды",
        `Определение ${seventhTarget.info.name}`,
        `Угадан тип: ${seventhTarget.info.desc}`
      );
      updateSeventhStatsUI();
      setTimeout(nextSeventhQuiz, 1500);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Неверно: выбран «${SEVENTHS[chosenKey].name}», правильный ответ — «${seventhTarget.info.name}». Отчёт ушёл в Telegram!`;
      }

      registerAnswerError(
        "Септаккорды",
        "Определи септаккорд на слух",
        SEVENTHS[chosenKey].name,
        seventhTarget.info.name,
        `Септаккорд ${seventhTarget.info.name} имеет структуру: ${seventhTarget.info.desc}.`
      );
      updateSeventhStatsUI();
    }
  }

  function updateSeventhStatsUI() {
    const s = state.statsByExercise["Септаккорды"] || { answered: 0, errors: 0 };
    const el = document.getElementById("sevenths-stats");
    if (el) el.textContent = `Серия: ${state.currentStreak} • Ошибок: ${s.errors}`;
  }

  /* ------------------------------------------------------------------------
     15. УПРАЖНЕНИЕ 06: ГАММЫ И СТУПЕНИ
     ------------------------------------------------------------------------ */
  const SCALE_QUESTIONS = [
    {
      q: "Какой палец правой руки нажимает ноту Фа (F) в До мажоре после подкладывания?",
      answers: ["1-й (большой)", "2-й (указательный)", "3-й (средний)", "4-й (безымянный)"],
      correct: 0,
      expl: "После 1-2-3 (До-Ре-Ми) большой палец подкладывается под 3-й и берёт ноту Фа первым пальцем!"
    },
    {
      q: "Какая нота является повышенной VII ступенью в Ля миноре гармоническом?",
      answers: ["Соль-диез (G♯)", "Соль (G)", "Фа-диез (F♯)", "Си (B)"],
      correct: 0,
      expl: "В Ля миноре натуральная VII ступень — Соль (G). При повышении она становится Соль-диезом (G♯)."
    },
    {
      q: "Сколько звуков содержит пентатоника в одной октаве?",
      answers: ["5 звуков", "7 звуков", "6 звуков", "12 звуков"],
      correct: 0,
      expl: "«Пента» означает пять. Пентатоника состоит из пяти ступеней без полутонов."
    },
    {
      q: "Какой интервал характерен для блюзовой гаммы («blue note»)?",
      answers: ["Пониженная V ступень (тритон)", "Повышенная I ступень", "Малая секунда", "Чистая октава"],
      correct: 0,
      expl: "Блюзовая нота — это пониженная 5-я ступень (тритон от тоники), создающая фирменный блюзовый плач."
    }
  ];

  let currentScaleQIdx = 0;

  function nextScaleQuiz() {
    currentScaleQIdx = Math.floor(Math.random() * SCALE_QUESTIONS.length);
    const item = SCALE_QUESTIONS[currentScaleQIdx];

    const qEl = document.getElementById("scales-quiz-question");
    if (qEl) qEl.textContent = item.q;

    const ansContainer = document.getElementById("scales-answers");
    if (ansContainer) {
      ansContainer.innerHTML = "";
      item.answers.forEach((ans, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer";
        btn.textContent = ans;
        btn.addEventListener("click", () => handleScaleAnswer(idx));
        ansContainer.appendChild(btn);
      });
    }

    const fb = document.getElementById("scales-feedback");
    if (fb) {
      fb.className = "feedback";
      fb.textContent = "Выбери правильный ответ.";
    }
  }

  function handleScaleAnswer(chosenIdx) {
    const item = SCALE_QUESTIONS[currentScaleQIdx];
    const isCorrect = chosenIdx === item.correct;
    const fb = document.getElementById("scales-feedback");

    const btns = document.querySelectorAll("#scales-answers .answer");
    btns.forEach((b, idx) => {
      b.disabled = true;
      if (idx === item.correct) b.classList.add("correct");
      if (!isCorrect && idx === chosenIdx) b.classList.add("wrong");
    });

    if (isCorrect) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `Отлично! ${item.expl}`;
      }
      registerAnswerSuccess(
        "Гаммы и пальцы",
        item.q,
        `Правильный ответ: «${item.answers[item.correct]}»`
      );
      updateScaleStatsUI();
      setTimeout(nextScaleQuiz, 1600);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка! Правильный ответ: «${item.answers[item.correct]}». Разбор отправлен в Telegram.`;
      }
      registerAnswerError(
        "Гаммы и пальцы",
        item.q,
        item.answers[chosenIdx],
        item.answers[item.correct],
        item.expl
      );
      updateScaleStatsUI();
    }
  }

  function updateScaleStatsUI() {
    const s = state.statsByExercise["Гаммы и пальцы"] || { answered: 0, errors: 0 };
    const el = document.getElementById("scales-stats");
    if (el) el.textContent = `Серия: ${state.currentStreak} • Ошибок: ${s.errors}`;
  }

  /* ------------------------------------------------------------------------
     16. УПРАЖНЕНИЕ 08: СЛУХОВОЙ ДИКТАНТ И СОЛЬФЕДЖИО
     ------------------------------------------------------------------------ */
  let dictationTargetNotes = [];
  let dictationUserNotes = [];

  function initSolfeggioDictation() {
    renderPianoKeyboard("solfeggio-piano", {
      startMidi: 60,
      endMidi: 72,
      showShortcuts: true,
      onClick: handleDictationKeyClick
    });
  }

  function playDictationMelody() {
    const len = parseInt(document.getElementById("solfeggio-length-select")?.value || "3", 10);
    const scale = [60, 62, 64, 65, 67, 69, 71, 72];

    // Настройка слуха тоническим трезвучием
    playPianoTone(60, 0.4, 0.7);
    setTimeout(() => playPianoTone(64, 0.4, 0.7), 250);
    setTimeout(() => playPianoTone(67, 0.4, 0.7), 500);
    setTimeout(() => playPianoTone(72, 0.6, 0.75), 750);

    dictationTargetNotes = [];
    let prev = 60;
    for (let i = 0; i < len; i++) {
      const stepCandidates = scale.filter((m) => Math.abs(m - prev) <= 4);
      const chosen = stepCandidates[Math.floor(Math.random() * stepCandidates.length)];
      dictationTargetNotes.push(chosen);
      prev = chosen;
    }

    dictationUserNotes = [];
    updateDictationUserDisplay();

    const prompt = document.getElementById("solfeggio-prompt");
    if (prompt) {
      prompt.textContent = `Настройка слуха (C-E-G-C), затем звучит мелодия из ${len} нот...`;
    }

    dictationTargetNotes.forEach((m, idx) => {
      setTimeout(() => {
        playPianoTone(m, 0.7, 0.85);
        if (idx === len - 1 && prompt) {
          prompt.textContent = `Мелодия прозвучала! Сыграй ${len} услышанных нот на клавиатуре ниже.`;
        }
      }, 1400 + idx * 600);
    });
  }

  function handleDictationKeyClick(midi, note) {
    const len = parseInt(document.getElementById("solfeggio-length-select")?.value || "3", 10);
    if (dictationUserNotes.length >= len) return;

    dictationUserNotes.push(note);
    updateDictationUserDisplay();
  }

  function updateDictationUserDisplay() {
    const el = document.getElementById("solfeggio-user-sequence");
    if (!el) return;
    if (!dictationUserNotes.length) {
      el.textContent = "(пока ничего не сыграно)";
    } else {
      el.textContent = dictationUserNotes.map((n) => `${n.doremi} (${n.name})`).join("  →  ");
    }
  }

  function checkDictationAnswer() {
    if (!dictationTargetNotes.length) {
      alert("Сначала послушай мелодию, нажав «Послушать мелодию диктанта»!");
      return;
    }

    const fb = document.getElementById("solfeggio-feedback");
    const len = dictationTargetNotes.length;

    if (dictationUserNotes.length < len) {
      if (fb) fb.textContent = `Нужно сыграть ещё ${len - dictationUserNotes.length} нот!`;
      return;
    }

    const userMidis = dictationUserNotes.map((n) => n.midi);
    const targetNames = dictationTargetNotes.map((m) => midiToNote(m).doremi).join(" - ");
    const userNames = dictationUserNotes.map((n) => n.doremi).join(" - ");

    let isMatch = true;
    for (let i = 0; i < len; i++) {
      if (userMidis[i] !== dictationTargetNotes[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `🎉 Браво! Абсолютно точно: ${targetNames}! Слух развит прекрасно!`;
      }
      registerAnswerSuccess(
        "Слуховой диктант",
        `Мелодический диктант из ${len} нот`,
        `Сыграна точная цепочка: ${targetNames}`
      );
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Не совсем так. Ты сыграл: ${userNames}. Правильная мелодия: ${targetNames}. Ошибка отправлена в Telegram!`;
      }
      registerAnswerError(
        "Слуховой диктант",
        `Мелодия из ${len} нот`,
        userNames,
        targetNames,
        `В До мажоре ориентируйся на опорные ноты тонического трезвучия До (I), Ми (III) и Соль (V).`
      );
    }
  }

  /* ------------------------------------------------------------------------
     17. НАВИГАЦИЯ ПО РАЗДЕЛАМ (VIEWS)
     ------------------------------------------------------------------------ */
  const VIEW_META = {
    notes: {
      no: "01 / САМОЕ НАЧАЛО",
      title: "Каждая клавиша —<br /><em>твой собственный голос.</em>",
      text: "Разберёмся в нотах, октавах, белых и чёрных клавишах. Слушай рояль и практикуйся.",
      stamp: "C4"
    },
    sightreading: {
      no: "02 / НОТНЫЙ СТАН",
      title: "Двойной стан:<br /><em>скрипичный и басовый ключи.</em>",
      text: "Читаем ноты с листа легко. До первой октавы как центральный мост для двух рук.",
      stamp: "𝄞+𝄢"
    },
    intervals: {
      no: "03 / ТРЕНИРОВКА СЛУХА",
      title: "Интервалы:<br /><em>эмоции и расстояния звуков.</em>",
      text: "Узнай 12 интервалов по знаменитым мелодиям и песням-ассоциациям.",
      stamp: "M3"
    },
    chords: {
      no: "04 / ГАРМОНИЯ ПИАНИНО",
      title: "Запоминание аккордов<br /><em>и их обращения.</em>",
      text: "Построение аккордов на клавишах, нотный состав и слуховой анализ.",
      stamp: "C/E"
    },
    sevenths: {
      no: "05 / ДЖАЗОВАЯ ГАРМОНИЯ",
      title: "Септаккорды:<br /><em>джаз и современный аккомпанемент.</em>",
      text: "C7, Cmaj7, Cm7, ø7, °7 и знаменитая формула движения ii - V - I.",
      stamp: "Cmaj7"
    },
    scales: {
      no: "06 / ПРАВИЛЬНЫЕ ПАЛЬЦЫ",
      title: "Гаммы, аппликатура<br /><em>и скорость игры.</em>",
      text: "Секрет подкладывания первого пальца, мажор, гармонический минор и пентатоника.",
      stamp: "1-2-3"
    },
    rhythm: {
      no: "07 / ЧУВСТВО ВРЕМЕНИ",
      title: "Ритмика, метр<br /><em>и внутренний пульс.</em>",
      text: "Интерактивный метроном и тап-тренажёр с подсчётом точности до миллисекунды.",
      stamp: "BPM"
    },
    solfeggio: {
      no: "08 / СОЛЬФЕДЖИО",
      title: "Слуховой диктант:<br /><em>услышь и повтори.</em>",
      text: "Опорные ступени тоники, разрешение неустойчивых звуков и подбор на слух.",
      stamp: "T-S-D"
    },
    play: {
      no: "09 / СВОБОДНОЕ ТВОРЧЕСТВО",
      title: "Мастерская фортепиано:<br /><em>играй, записывай, твори.</em>",
      text: "3 октавы, живое отображение на нотном стане и реалистичные тембры рояля.",
      stamp: "88"
    },
    telegram: {
      no: "10 / TELEGRAM ПОМОЩНИК",
      title: "Твой персональный бот<br /><em>с отчётами об ошибках.</em>",
      text: "Автоматическая отправка выполненных упражнений, разбора ошибок и серий побед прямо в мессенджер.",
      stamp: "TG"
    }
  };

  function showView(viewName) {
    const target = viewName || location.hash.slice(1) || "notes";
    const name = VIEW_META[target] ? target : "notes";
    const meta = VIEW_META[name];

    document.querySelectorAll(".view").forEach((v) => {
      v.hidden = v.id !== "view-" + name;
    });

    document.querySelectorAll(".navigation a").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === name);
    });

    const b = document.getElementById("breadcrumb");
    if (b) {
      const activeLink = document.querySelector(`.navigation a[data-nav="${name}"] span:nth-child(2)`);
      if (activeLink) b.textContent = activeLink.textContent;
    }

    const eyebrow = document.getElementById("intro-eyebrow");
    if (eyebrow) eyebrow.textContent = meta.no;
    const title = document.getElementById("intro-title");
    if (title) title.innerHTML = meta.title;
    const desc = document.getElementById("intro-text");
    if (desc) desc.textContent = meta.text;
    const stamp = document.getElementById("stamp-note");
    if (stamp) stamp.textContent = meta.stamp;

    if (name === "sightreading") {
      renderGrandStaffSvg("staff-display", [60]);
    } else if (name === "intervals") {
      updateIntervalSection();
    } else if (name === "chords") {
      updateChordSection();
    } else if (name === "sevenths") {
      updateSeventhSection();
    } else if (name === "scales") {
      updateScaleSection();
    } else if (name === "play") {
      renderGrandStaffSvg("freelab-staff-display", [60]);
    } else if (name === "telegram") {
      renderTelegramLog();
    }
  }

  /* ------------------------------------------------------------------------
     18. ОБНОВЛЕНИЯ ДЛЯ РАЗДЕЛОВ ИССЛЕДОВАНИЯ
     ------------------------------------------------------------------------ */
  function populateSelects() {
    const rootSelects = ["interval-root-select", "chord-root-select", "seventh-root-select", "scale-root-select"];
    rootSelects.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = NOTE_NAMES.map((name, idx) => `<option value="${idx}">${NOTE_RU[idx]} (${name})</option>`).join("");
      el.value = "0";
    });

    const intSel = document.getElementById("interval-select");
    if (intSel) {
      intSel.innerHTML = INTERVALS.map((item) => `<option value="${item.semitones}">${item.name} (${item.semitones} полут.)</option>`).join("");
      intSel.value = "4";
    }
  }

  function updateIntervalSection() {
    const rootPc = parseInt(document.getElementById("interval-root-select")?.value || "0", 10);
    const semitones = parseInt(document.getElementById("interval-select")?.value || "4", 10);
    const rootMidi = 60 + rootPc;
    const secondMidi = rootMidi + semitones;

    renderGrandStaffSvg("interval-staff-display", [rootMidi, secondMidi]);
    renderPianoKeyboard("interval-piano", {
      startMidi: 48,
      endMidi: 76,
      showShortcuts: false
    });

    const k1 = document.querySelector(`#interval-piano .piano-key[data-midi="${rootMidi}"]`);
    const k2 = document.querySelector(`#interval-piano .piano-key[data-midi="${secondMidi}"]`);
    if (k1) k1.classList.add("quiz-highlight");
    if (k2) k2.classList.add("quiz-correct");

    const intObj = INTERVALS.find((i) => i.semitones === semitones) || INTERVALS[3];
    const cap = document.getElementById("interval-info-caption");
    if (cap) {
      cap.textContent = `${intObj.name}: ${midiToNote(rootMidi).doremi} → ${midiToNote(secondMidi).doremi} • ${intObj.song}`;
    }
  }

  function updateChordSection() {
    const rootPc = parseInt(document.getElementById("chord-root-select")?.value || "0", 10);
    const chordType = document.getElementById("chord-type-select")?.value || "major";
    const inv = document.getElementById("chord-inversion-select")?.value || "root";
    const triad = TRIADS[chordType] || TRIADS.major;

    let offsets = [...triad.offsets];
    if (inv === "first") {
      offsets = [offsets[1], offsets[2], offsets[0] + 12];
    } else if (inv === "second") {
      offsets = [offsets[2], offsets[0] + 12, offsets[1] + 12];
    }

    const midis = offsets.map((o) => 60 + rootPc + o);
    renderGrandStaffSvg("chord-staff-display", midis);
    renderPianoKeyboard("chord-piano", {
      startMidi: 48,
      endMidi: 76,
      showShortcuts: false
    });

    midis.forEach((m) => {
      const k = document.querySelector(`#chord-piano .piano-key[data-midi="${m}"]`);
      if (k) k.classList.add("quiz-correct");
    });

    const cap = document.getElementById("chord-notes-caption");
    if (cap) {
      const noteNames = midis.map((m) => midiToNote(m).doremi).join(" — ");
      cap.textContent = `${triad.name}: ${noteNames} (${triad.desc})`;
    }
  }

  function updateSeventhSection() {
    const rootPc = parseInt(document.getElementById("seventh-root-select")?.value || "0", 10);
    const typeKey = document.getElementById("seventh-type-select")?.value || "dom7";
    const info = SEVENTHS[typeKey] || SEVENTHS.dom7;

    const midis = info.offsets.map((o) => 60 + rootPc + o);
    renderGrandStaffSvg("seventh-staff-display", midis);
    renderPianoKeyboard("seventh-piano", {
      startMidi: 48,
      endMidi: 76,
      showShortcuts: false
    });

    midis.forEach((m) => {
      const k = document.querySelector(`#seventh-piano .piano-key[data-midi="${m}"]`);
      if (k) k.classList.add("quiz-correct");
    });

    const cap = document.getElementById("seventh-caption");
    if (cap) {
      const noteNames = midis.map((m) => midiToNote(m).doremi).join(" — ");
      cap.textContent = `${info.name}: ${noteNames} • ${info.desc}`;
    }
  }

  function updateScaleSection() {
    const rootPc = parseInt(document.getElementById("scale-root-select")?.value || "0", 10);
    const scaleKey = document.getElementById("scale-type-select")?.value || "major";
    const hand = document.querySelector("[data-hand].active")?.dataset.hand || "right";
    const scaleObj = SCALES[scaleKey] || SCALES.major;

    const rootMidi = 60 + rootPc;
    const midis = scaleObj.offsets.map((o) => rootMidi + o);
    const fingers = hand === "right" ? scaleObj.fingeringRight : scaleObj.fingeringLeft;

    const fingerMap = {};
    midis.forEach((m, idx) => {
      if (fingers && fingers[idx]) fingerMap[m] = fingers[idx];
    });

    renderGrandStaffSvg("scale-staff-display", midis);
    renderPianoKeyboard("scale-piano", {
      startMidi: 48,
      endMidi: 76,
      showShortcuts: false,
      fingers: fingerMap
    });

    midis.forEach((m, idx) => {
      const k = document.querySelector(`#scale-piano .piano-key[data-midi="${m}"]`);
      if (k) {
        if (idx === 0) k.classList.add("quiz-highlight");
        else k.classList.add("quiz-correct");
      }
    });

    const cap = document.getElementById("scale-formula-caption");
    if (cap) {
      cap.textContent = `Формула: ${scaleObj.formula} (${hand === "right" ? "Правая рука" : "Левая рука"})`;
    }
  }

  /* ------------------------------------------------------------------------
     19. ИНИЦИАЛИЗАЦИЯ И СТАРТ
     ------------------------------------------------------------------------ */
  function initialize() {
    loadState();
    updateGlobalStatsUI();
    updateTelegramStatusUI();
    populateSelects();
    fetchBotInfo();

    renderPianoKeyboard("notes-piano", {
      startMidi: 48,
      endMidi: 72,
      showShortcuts: state.showShortcuts
    });

    renderPianoKeyboard("staff-piano", {
      startMidi: 48,
      endMidi: 72,
      showShortcuts: true
    });

    renderPianoKeyboard("freelab-piano", {
      startMidi: 48,
      endMidi: 84,
      showShortcuts: true
    });

    initNotesQuiz();
    initSightReadingQuiz();
    initChordQuiz();
    initSolfeggioDictation();
    nextIntervalQuiz();
    nextSeventhQuiz();
    nextScaleQuiz();

    // Слушатель клавиатуры ПК (ASDFGHJK + Space)
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleUserTap();
        return;
      }

      if (KEY_SHORTCUTS[e.code]) {
        e.preventDefault();
        const midi = KEY_SHORTCUTS[e.code];
        if (!state.activeNotes.has(midi)) {
          state.activeNotes.add(midi);
          const activeKey = document.querySelector(`.piano-key[data-midi="${midi}"]`);
          triggerKey(midi, activeKey);
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (KEY_SHORTCUTS[e.code]) {
        const midi = KEY_SHORTCUTS[e.code];
        state.activeNotes.delete(midi);
      }
    });

    const tapBtn = document.getElementById("tap-btn");
    if (tapBtn) {
      tapBtn.addEventListener("click", handleUserTap);
    }

    const metroBtn = document.getElementById("metronome-toggle-btn");
    if (metroBtn) {
      metroBtn.addEventListener("click", () => {
        if (isMetronomeRunning) stopMetronome();
        else startMetronome();
      });
    }

    const bpmSlider = document.getElementById("bpm-slider");
    if (bpmSlider) {
      bpmSlider.addEventListener("input", (e) => {
        bpm = parseInt(e.target.value, 10);
        const bpmVal = document.getElementById("bpm-val");
        if (bpmVal) bpmVal.textContent = bpm;
        if (isMetronomeRunning) {
          stopMetronome();
          startMetronome();
        }
      });
    }

    const meterSel = document.getElementById("meter-select");
    if (meterSel) {
      meterSel.addEventListener("change", (e) => {
        meter = parseInt(e.target.value, 10);
        const dotsContainer = document.getElementById("meter-dots-container");
        if (dotsContainer) {
          dotsContainer.innerHTML = "";
          for (let i = 1; i <= meter; i++) {
            const d = document.createElement("div");
            d.className = "meter-dot" + (i === 1 ? " accent-dot" : "");
            d.dataset.beat = i;
            dotsContainer.appendChild(d);
          }
        }
      });
    }

    const rhythmChalBtn = document.getElementById("rhythm-start-challenge-btn");
    if (rhythmChalBtn) {
      rhythmChalBtn.addEventListener("click", () => {
        tapStats.challengeActive = true;
        tapStats.challengeTaps = 0;
        tapStats.totalTaps = 0;
        tapStats.perfectHits = 0;
        tapStats.goodHits = 0;
        tapStats.offsets = [];
        if (!isMetronomeRunning) startMetronome();
        const fb = document.getElementById("rhythm-challenge-feedback");
        if (fb) {
          fb.className = "feedback";
          fb.textContent = "Раунд начался! Отбей 8 точных тапов ровно в такт (пробел или кнопка ТАП).";
        }
      });
    }

    document.getElementById("notes-next-btn")?.addEventListener("click", nextNotesQuiz);
    document.getElementById("sightreading-next-btn")?.addEventListener("click", nextSightReadingQuiz);
    document.getElementById("intervals-next-btn")?.addEventListener("click", nextIntervalQuiz);
    document.getElementById("chords-next-btn")?.addEventListener("click", nextChordQuiz);
    document.getElementById("sevenths-next-btn")?.addEventListener("click", nextSeventhQuiz);
    document.getElementById("scales-next-btn")?.addEventListener("click", nextScaleQuiz);

    document.getElementById("intervals-repeat-btn")?.addEventListener("click", () => {
      if (intervalTarget) playIntervalSound(intervalRootMidi, intervalTarget.semitones, "up");
    });
    document.getElementById("chords-repeat-btn")?.addEventListener("click", playCurrentChordSound);
    document.getElementById("sevenths-repeat-btn")?.addEventListener("click", playSeventhQuizSound);

    document.getElementById("interval-play-btn")?.addEventListener("click", () => {
      const mode = document.querySelector("[data-interval-mode].active")?.dataset.intervalMode || "up";
      const semitones = parseInt(document.getElementById("interval-select")?.value || "4", 10);
      const rootPc = parseInt(document.getElementById("interval-root-select")?.value || "0", 10);
      playIntervalSound(60 + rootPc, semitones, mode);
    });

    document.getElementById("chord-play-btn")?.addEventListener("click", () => {
      const mode = document.querySelector("[data-chord-play].active")?.dataset.chordPlay || "together";
      const rootPc = parseInt(document.getElementById("chord-root-select")?.value || "0", 10);
      const chordType = document.getElementById("chord-type-select")?.value || "major";
      const triad = TRIADS[chordType] || TRIADS.major;
      const midis = triad.offsets.map((o) => 60 + rootPc + o);
      playChordMidi(midis, 1.8, mode === "arpeggio");
    });

    document.getElementById("seventh-play-btn")?.addEventListener("click", () => {
      const rootPc = parseInt(document.getElementById("seventh-root-select")?.value || "0", 10);
      const typeKey = document.getElementById("seventh-type-select")?.value || "dom7";
      const info = SEVENTHS[typeKey] || SEVENTHS.dom7;
      const midis = info.offsets.map((o) => 60 + rootPc + o);
      playChordMidi(midis, 2.0);
    });

    document.getElementById("seventh-play-cadence-btn")?.addEventListener("click", () => {
      const dm7 = [50, 53, 57, 60];
      const g7 = [55, 59, 62, 65];
      const cmaj7 = [48, 52, 55, 59];
      playChordMidi(dm7, 1.4);
      setTimeout(() => playChordMidi(g7, 1.4), 1000);
      setTimeout(() => playChordMidi(cmaj7, 2.2), 2000);
    });

    document.getElementById("scale-play-btn")?.addEventListener("click", () => {
      const rootPc = parseInt(document.getElementById("scale-root-select")?.value || "0", 10);
      const scaleKey = document.getElementById("scale-type-select")?.value || "major";
      const scaleObj = SCALES[scaleKey] || SCALES.major;
      const midis = scaleObj.offsets.map((o) => 60 + rootPc + o);
      const sequence = midis.concat(midis.slice(0, -1).reverse());
      sequence.forEach((m, idx) => {
        setTimeout(() => playPianoTone(m, 0.45, 0.8), idx * 240);
      });
    });

    document.getElementById("solfeggio-play-dictation-btn")?.addEventListener("click", playDictationMelody);
    document.getElementById("solfeggio-clear-btn")?.addEventListener("click", () => {
      dictationUserNotes = [];
      updateDictationUserDisplay();
    });
    document.getElementById("solfeggio-check-btn")?.addEventListener("click", checkDictationAnswer);

    document.querySelectorAll("[data-timbre]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-timbre]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.timbre = btn.dataset.timbre;
      });
    });

    const recBtn = document.getElementById("freelab-rec-btn");
    const playRecBtn = document.getElementById("freelab-play-rec-btn");
    if (recBtn) {
      recBtn.addEventListener("click", () => {
        if (!state.isRecording) {
          state.isRecording = true;
          state.recordedNotes = [];
          recBtn.textContent = "■ Стоп запись";
          recBtn.style.background = "#9c3224";
        } else {
          state.isRecording = false;
          recBtn.textContent = "● Запись";
          recBtn.style.background = "#5c2d27";
        }
      });
    }
    if (playRecBtn) {
      playRecBtn.addEventListener("click", () => {
        if (!state.recordedNotes.length) return;
        const firstTime = state.recordedNotes[0].time;
        state.recordedNotes.forEach((item) => {
          const delay = item.time - firstTime;
          setTimeout(() => playPianoTone(item.midi, 0.9, 0.8), delay);
        });
      });
    }

    ["interval-select", "interval-root-select"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", updateIntervalSection);
    });
    ["chord-root-select", "chord-type-select", "chord-inversion-select"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", updateChordSection);
    });
    ["seventh-root-select", "seventh-type-select"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", updateSeventhSection);
    });
    ["scale-root-select", "scale-type-select"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", updateScaleSection);
    });

    document.querySelectorAll("[data-hand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-hand]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updateScaleSection();
      });
    });

    document.querySelectorAll("[data-interval-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-interval-mode]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.querySelectorAll("[data-chord-play]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-chord-play]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.querySelectorAll("[data-notes-label]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-notes-label]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.labelMode = btn.dataset.notesLabel;
        renderPianoKeyboard("notes-piano", {
          startMidi: 48,
          endMidi: 72,
          showShortcuts: state.showShortcuts
        });
      });
    });

    document.getElementById("btn-octave-up")?.addEventListener("click", () => {
      renderPianoKeyboard("notes-piano", { startMidi: 60, endMidi: 84 });
      const lbl = document.getElementById("current-octave-label");
      if (lbl) lbl.textContent = "C4 — B5 (1-я и 2-я)";
    });
    document.getElementById("btn-octave-down")?.addEventListener("click", () => {
      renderPianoKeyboard("notes-piano", { startMidi: 48, endMidi: 72 });
      const lbl = document.getElementById("current-octave-label");
      if (lbl) lbl.textContent = "C3 — B4 (Малая и 1-я)";
    });

    document.getElementById("sidebar-tg-card")?.addEventListener("click", () => {
      location.hash = "#telegram";
    });
    document.getElementById("topbar-tg-btn")?.addEventListener("click", () => {
      location.hash = "#telegram";
    });
    document.getElementById("auto-detect-chat-id-btn")?.addEventListener("click", autoDetectTelegramChatId);
    document.getElementById("save-tg-settings-btn")?.addEventListener("click", () => {
      const input = document.getElementById("tg-chat-id-input");
      if (input) tgSettings.chatId = input.value.trim();
      const chkCompleted = document.getElementById("tg-send-completed");
      if (chkCompleted) tgSettings.sendCompleted = chkCompleted.checked;
      const chkErrors = document.getElementById("tg-send-errors");
      if (chkErrors) tgSettings.sendErrors = chkErrors.checked;
      const chkStreaks = document.getElementById("tg-send-streaks");
      if (chkStreaks) tgSettings.sendStreaks = chkStreaks.checked;
      const chkSummary = document.getElementById("tg-send-summary");
      if (chkSummary) tgSettings.sendSummary = chkSummary.checked;

      saveTgSettings();
      updateTelegramStatusUI();
      alert("✅ Настройки Telegram сохранены!");
    });

    document.getElementById("test-tg-message-btn")?.addEventListener("click", async () => {
      const res = await sendTelegramMessage(
        `🎹 <b>Тестовое сообщение из «Ладно · Фортепиано»!</b>\n` +
        `Связь установлена отлично. Все отчёты о выполненных упражнениях и разбор ошибок будут оперативно приходить сюда! ✨`
      );
      if (res.success) {
        alert("✅ Тестовое сообщение доставлено в твой Telegram!");
      } else {
        alert("Ошибка отправки: " + (res.reason || "проверьте ID"));
      }
    });

    document.getElementById("send-summary-now-btn")?.addEventListener("click", sendTelegramSessionSummary);
    document.getElementById("clear-tg-log-btn")?.addEventListener("click", () => {
      tgSettings.log = [];
      saveTgSettings();
      renderTelegramLog();
    });

    document.getElementById("reset-all-progress-btn")?.addEventListener("click", () => {
      if (confirm("Точно сбросить всю статистику и серии?")) {
        state.totalAnswered = 0;
        state.totalCorrect = 0;
        state.totalErrors = 0;
        state.currentStreak = 0;
        state.bestStreak = 0;
        state.statsByExercise = {};
        saveState();
        updateGlobalStatsUI();
        alert("Статистика сброшена.");
      }
    });

    window.addEventListener("hashchange", () => {
      showView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    showView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
