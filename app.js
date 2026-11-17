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
  const NOTE_RU_FLAT = ["До", "Ре♭", "Ре", "Ми♭", "Ми", "Фа", "Соль♭", "Соль", "Ля♭", "Ля", "Си♭", "Си"];

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
    labelMode: "doremi", // 'doremi', 'letters', 'none'
    showShortcuts: true,
    octaveRange: "dual", // 'single-c4', 'single-c3', 'dual', 'triple'
    currentOctaveOffset: 0,
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
     3. ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API + TONE.JS)
     ------------------------------------------------------------------------ */
  let audioCtx = null;
  let tonePolySynth = null;

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

  // Акустический синтезатор фортепиано на Web Audio API
  function playPianoTone(midi, duration = 1.2, velocity = 0.8) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const now = ctx.currentTime;

    // Главный узел усиления ноты с фортепианной огибающей
    const mainGain = ctx.createGain();
    const peakVolume = Math.min(0.35, (0.24 * velocity) / Math.sqrt(1));
    mainGain.gain.setValueAtTime(0.0001, now);
    // Быстрая атака (удар войлочного молоточка)
    mainGain.gain.linearRampToValueAtTime(peakVolume, now + 0.006);
    // Экспоненциальный спад и послезвучание
    mainGain.gain.exponentialRampToValueAtTime(peakVolume * 0.45, now + 0.18);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    mainGain.connect(ctx.destination);

    // 1-й генератор: Основной тон (Fundamental)
    const osc1 = ctx.createOscillator();
    osc1.type = state.timbre === "rhodes" ? "sine" : "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    // 2-й генератор: 2-я гармоника (октава выше) для акустического резонанса
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
    osc2.connect(gain2);
    gain2.connect(mainGain);

    // 3-й генератор: 3-я гармоника (для концертного рояля)
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
     4. TELEGRAM-БОТ: ОТПРАВКА СООБЩЕНИЙ, АВТООПРЕДЕЛЕНИЕ И ЛОГ
     ------------------------------------------------------------------------ */
  async function sendTelegramMessage(text) {
    if (!tgSettings.botToken || !tgSettings.chatId) {
      console.log("Telegram не отправлен: отсутствует botToken или chatId");
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
          <span>Здесь будут отображаться отчёты об отправленных в Telegram ошибках и сводках.</span>
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
        alert("В боте пока нет сообщений. Откройте бота @PianoTheoryTrainerBot, нажмите /start, а затем нажмите 'Определить ID' ещё раз!");
        return;
      }

      // Берём последнее входящее сообщение
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

        // Отправляем приветственное подтверждение
        await sendTelegramMessage(
          `🎹 <b>Привет, ${userName}!</b>\n` +
          `Тренажёр <b>«Ладно · Фортепиано»</b> успешно подключен к твоему Telegram!\n\n` +
          `Теперь сюда будут приходить:\n` +
          `• Подробный разбор ошибок в упражнениях\n` +
          `• Поздравления с сериями успехов\n` +
          `• Итоговая сводка тренировки\n\n` +
          `<i>Приятной и вдохновляющей практики за клавишами! ✨</i>`
        );
      } else {
        if (statusMsg) statusMsg.textContent = "Не удалось извлечь ID из последнего сообщения.";
      }
    } catch (e) {
      if (statusMsg) statusMsg.textContent = "Ошибка сети: " + e.message;
    }
  }

  // Обновление статуса в сайдбаре и шапке
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
        : "Нажмите, чтобы подключить отправку ошибок в бот.";
    }

    const input = document.getElementById("tg-chat-id-input");
    if (input && tgSettings.chatId) input.value = tgSettings.chatId;

    const chkErrors = document.getElementById("tg-send-errors");
    if (chkErrors) chkErrors.checked = tgSettings.sendErrors;
    const chkStreaks = document.getElementById("tg-send-streaks");
    if (chkStreaks) chkStreaks.checked = tgSettings.sendStreaks;
    const chkSummary = document.getElementById("tg-send-summary");
    if (chkSummary) chkSummary.checked = tgSettings.sendSummary;
  }

  // Уведомление об ошибке в Telegram
  async function notifyTelegramError(exerciseName, questionText, userAnswer, correctAnswer, explanation) {
    if (!tgSettings.sendErrors || !tgSettings.chatId) return;

    const roundStats = state.statsByExercise[exerciseName] || { answered: 1, correct: 0 };
    const pct = roundStats.answered > 0 ? Math.round((roundStats.correct / roundStats.answered) * 100) : 0;

    const text =
      `❌ <b>Ошибка в упражнении «Ладно · Фортепиано»</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Раздел:</b> ${exerciseName}\n` +
      `❓ <b>Вопрос:</b> ${questionText}\n` +
      `🔴 <b>Твой ответ:</b> ${userAnswer}\n` +
      `🟢 <b>Правильно:</b> ${correctAnswer}\n\n` +
      `💡 <b>Музыкальный совет:</b>\n${explanation}\n\n` +
      `📊 <b>Серия прервана:</b> 0 подряд | Точность в теме: ${pct}% (${roundStats.correct}/${roundStats.answered})`;

    await sendTelegramMessage(text);
  }

  // Уведомление о триумфальной серии
  async function notifyTelegramStreak(streakCount, exerciseName) {
    if (!tgSettings.sendStreaks || !tgSettings.chatId) return;
    if (streakCount !== 5 && streakCount !== 10 && streakCount !== 20 && streakCount !== 50) return;

    const text =
      `🔥 <b>Отличный результат в «Ладно · Фортепиано»!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>Раздел:</b> ${exerciseName}\n` +
      `⚡ <b>Серия побед:</b> <b>${streakCount}</b> правильных ответов подряд!\n` +
      `Пальцы и слух работают синхронно. Так держать! 🎹✨`;

    await sendTelegramMessage(text);
  }

  // Сводный отчёт сессии
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
     5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ НОТ И ИНТЕРВАЛОВ
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
     6. ГЕНЕРАТОР КЛАВИАТУРЫ ФОРТЕПИАНО (Interactive Piano Renderer)
     ------------------------------------------------------------------------ */
  function renderPianoKeyboard(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const startMidi = options.startMidi || 48; // C3
    const endMidi = options.endMidi || 72; // C5
    const onKeyClick = options.onClick || null;
    const showShortcuts = options.showShortcuts !== undefined ? options.showShortcuts : state.showShortcuts;
    const fingerMap = options.fingers || {}; // midi -> finger number

    container.innerHTML = "";

    // Собираем ноты
    const notes = [];
    for (let m = startMidi; m <= endMidi; m++) {
      notes.push(midiToNote(m));
    }

    // Считаем только белые клавиши для расчёта ширины
    const whiteNotes = notes.filter((n) => !n.isBlack);
    const totalWhite = whiteNotes.length;

    // Сначала создаём белые клавиши в flex
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

    // Теперь рассчитываем и позиционируем чёрные клавиши
    const blackNotes = notes.filter((n) => n.isBlack);
    blackNotes.forEach((note) => {
      const keyEl = document.createElement("div");
      keyEl.className = "piano-key black";
      keyEl.dataset.midi = note.midi;

      // Чёрная клавиша находится между нотой note.midi - 1 и note.midi + 1
      const prevWhite = whiteNotes.findIndex((w) => w.midi === note.midi - 1);
      if (prevWhite !== -1) {
        // Процент позиции по ширине белых клавиш
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

    // Обновляем визуализацию ноты на нотном стане, если есть
    updateLiveStaff(midi);

    const note = midiToNote(midi);
    const statusEl = document.getElementById("notes-status");
    if (statusEl) {
      statusEl.textContent = `Звучит: ${note.doremi} (${note.name}) • ${note.octave}-я октава`;
    }

    if (customCallback) {
      customCallback(midi, note);
    }
  }

  function updateLiveStaff(midi) {
    // Отображаем на основном стане или стане лаборатории
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
     Скрипичный (𝄞) и басовый (𝄢) ключи, акколада, добавочные линейки
     ------------------------------------------------------------------------ */
  function renderGrandStaffSvg(containerId, midis = [], options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = options.width || 680;
    const height = options.height || 260;
    const showClef = options.clef || "both"; // 'both', 'treble', 'bass'

    // Координаты линеек
    // Скрипичный стан (верхний): линейки на y = 45, 57, 69, 81, 93 (5 линеек с шагом 12)
    // Линейка 1 (снизу): E4 (y = 93), Линейка 2: G4 (y = 81), Линейка 3: B4 (y = 69), Линейка 4: D5 (y = 57), Линейка 5: F5 (y = 45)
    // Шаг между смежными ступенями (линейка-промежуток) = 6px!
    const trebleBottomLineY = 93; // E4

    // Басовый стан (нижний): линейки на y = 165, 177, 189, 201, 213 (5 линеек с шагом 12)
    // Линейка 1 (снизу): G2 (y = 213), Линейка 2: B2 (y = 201), Линейка 3: D3 (y = 189), Линейка 4: F3 (y = 177), Линейка 5: A3 (y = 165)
    const bassBottomLineY = 213; // G2

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:auto;">`;

    // Фон стана
    svg += `<rect width="${width}" height="${height}" fill="#fffdfa" rx="8" />`;

    // Акколада (фигурная скобка слева)
    if (showClef === "both") {
      svg += `
        <line x1="38" y1="45" x2="38" y2="213" stroke="#26382f" stroke-width="2.5" />
        <path d="M 38 45 C 26 80, 24 110, 16 129 C 24 148, 26 178, 38 213" fill="none" stroke="#26382f" stroke-width="2.5" stroke-linecap="round" />
      `;
    }

    // Скрипичный стан (5 линеек)
    if (showClef === "both" || showClef === "treble") {
      for (let i = 0; i < 5; i++) {
        const y = 45 + i * 12;
        svg += `<line x1="40" y1="${y}" x2="${width - 25}" y2="${y}" stroke="#788b7d" stroke-width="1.2" />`;
      }
      // Символ скрипичного ключа
      svg += `<text x="46" y="94" font-family="${options.serif ? 'Georgia, serif' : 'serif'}" font-size="52" fill="#26382f">𝄞</text>`;
    }

    // Басовый стан (5 линеек)
    if (showClef === "both" || showClef === "bass") {
      for (let i = 0; i < 5; i++) {
        const y = 165 + i * 12;
        svg += `<line x1="40" y1="${y}" x2="${width - 25}" y2="${y}" stroke="#788b7d" stroke-width="1.2" />`;
      }
      // Символ басового ключа
      svg += `<text x="48" y="196" font-family="serif" font-size="44" fill="#26382f">𝄢</text>`;
    }

    // Центральная линия До первой октавы (C4, y = 129)
    // Нота C4 лежит посередине между станами
    // Вычисляем Y для любой ноты по ступеням диатонической шкалы
    function getYForMidi(midi) {
      // Диатонические ступени от C4 = 0:
      // C=0, D=1, E=2, F=3, G=4, A=5, B=6
      const diatonicMap = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
      const pc = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      const diatonicStepFromC4 = (octave - 4) * 7 + diatonicMap[pc];

      // C4 находится на Y = 129
      // Каждый шаг вверх уменьшает Y на 6px!
      return 129 - diatonicStepFromC4 * 6;
    }

    // Отрисовка нот
    const noteArray = Array.isArray(midis) ? midis : [midis];
    const totalNotes = noteArray.length;
    const startX = totalNotes > 1 ? 160 : 340;
    const spacingX = totalNotes > 1 ? Math.min(75, (width - 220) / totalNotes) : 0;

    noteArray.forEach((midi, idx) => {
      if (typeof midi !== "number") return;
      const y = getYForMidi(midi);
      const x = totalNotes > 1 ? startX + idx * spacingX : startX;
      const note = midiToNote(midi);

      // Добавочные линейки
      // Для скрипичного ключа: линейки идут на 45, 57, 69, 81, 93
      // Ниже E4 (y > 93): добавочная линейка C4 (y = 129), A3 (y = 141)...
      // Выше F5 (y < 45): A5 (y = 33), C6 (y = 21)...
      // Для басового ключа: линейки на 165, 177, 189, 201, 213
      // Ниже G2 (y > 213): E2 (y = 225), C2 (y = 237)...
      // Добавочная линейка C4 (y = 129)
      if (Math.abs(y - 129) < 2) {
        svg += `<line x1="${x - 16}" y1="129" x2="${x + 16}" y2="129" stroke="#376b53" stroke-width="1.6" />`;
      }
      // Выше скрипичного стана
      for (let ly = 33; ly >= y - 1; ly -= 12) {
        svg += `<line x1="${x - 14}" y1="${ly}" x2="${x + 14}" y2="${ly}" stroke="#376b53" stroke-width="1.4" />`;
      }
      // Ниже басового стана
      for (let ly = 225; ly <= y + 1; ly += 12) {
        svg += `<line x1="${x - 14}" y1="${ly}" x2="${x + 14}" y2="${ly}" stroke="#376b53" stroke-width="1.4" />`;
      }

      // Знак альтерации (диез ♯) если нота чёрная
      if (note.isBlack) {
        svg += `<text x="${x - 22}" y="${y + 5}" font-family="serif" font-size="20" fill="#376b53" font-weight="bold">♯</text>`;
      }

      // Головка ноты (овал под наклоном)
      svg += `
        <ellipse cx="${x}" cy="${y}" rx="8.5" ry="6" fill="#244f3d" transform="rotate(-20 ${x} ${y})" />
      `;

      // Штиль ноты (вверх или вниз в зависимости от высоты)
      if (y > 120) {
        // Штиль вверх справа
        svg += `<line x1="${x + 7.5}" y1="${y}" x2="${x + 7.5}" y2="${y - 36}" stroke="#244f3d" stroke-width="1.8" />`;
      } else {
        // Штиль вниз слева
        svg += `<line x1="${x - 7.5}" y1="${y}" x2="${x - 7.5}" y2="${y + 36}" stroke="#244f3d" stroke-width="1.8" />`;
      }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  /* ------------------------------------------------------------------------
     8. РИТМИКА: ВСТРОЕННЫЙ МЕТРОНОМ И ТАП-ТРЕНАЖЁР
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
    challengeTaps: 0
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
      // Если метроном выключен, включим его для удобства
      startMetronome();
    }

    const intervalMs = (60 / bpm) * 1000;
    const now = Date.now();
    // Вычисляем отклонение от ближайшей доли
    // nextBeatTime — время следующей доли, (nextBeatTime - intervalMs) — предыдущей
    const diffToNext = nextBeatTime - now;
    const diffToPrev = now - (nextBeatTime - intervalMs);
    let offsetMs = Math.abs(diffToNext) < Math.abs(diffToPrev) ? -diffToNext : diffToPrev;

    // Ограничиваем разумными пределами
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

    // Обновляем таймлайн
    const marker = document.getElementById("rhythm-marker");
    if (marker) {
      marker.style.display = "block";
      marker.className = `rhythm-hit-marker ${markerClass}`;
      // Центр — 50%. Отклонение ±150мс переводим в %
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

    // Проверка зачёта по ритмике
    if (tapStats.challengeActive) {
      tapStats.challengeTaps++;
      const fb = document.getElementById("rhythm-challenge-feedback");
      if (fb) {
        fb.textContent = `Тап ${tapStats.challengeTaps} из 10... (${grade})`;
      }
      if (tapStats.challengeTaps >= 10) {
        finishRhythmChallenge(accuracyPct);
      }
    }
  }

  async function finishRhythmChallenge(accuracy) {
    tapStats.challengeActive = false;
    const fb = document.getElementById("rhythm-challenge-feedback");
    const passed = accuracy >= 75;

    if (passed) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `🎉 Отлично! Ритмический зачёт сдан с точностью ${accuracy}%! Отчёт отправлен в Telegram.`;
      }
      registerAnswerSuccess("Ритмика");
      if (tgSettings.chatId && tgSettings.sendStreaks) {
        await sendTelegramMessage(
          `🥁 <b>Ритмический зачёт сдан в «Ладно · Фортепиано»!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏱ <b>Темп:</b> ${bpm} BPM (размер ${meter}/4)\n` +
          `🎯 <b>Точность попадания в долю:</b> <b>${accuracy}%</b>\n` +
          `Чувство грува и стабильность пульса на высоте! 🔥`
        );
      }
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Не хватило стабильности: точность ${accuracy}%. Попробуй ещё раз, ориентируясь на щелчок метронома!`;
      }
      registerAnswerError("Ритмика", "10 тапов в темпе", `${accuracy}%`, "минимум 75%", "Старайся слышать долю заранее и не ускорять темп.");
    }
  }

  /* ------------------------------------------------------------------------
     9. ОБРАБОТКА СТАТИСТИКИ И ОТВЕТОВ В УПРАЖНЕНИЯХ
     ------------------------------------------------------------------------ */
  function registerAnswerSuccess(exerciseName) {
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

    // Проверяем триумфальные серии для Telegram
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

    // Отправляем разбор ошибки в Telegram
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
      startMidi: 60, // C4
      endMidi: 72, // C5
      showShortcuts: true,
      onClick: handleNotesQuizKeyClick
    });
    nextNotesQuiz();
  }

  function nextNotesQuiz() {
    // Выбираем случайную ноту в 1-й октаве
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

    // Снимаем подсветку
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
        fb.textContent = `🎉 Точно! Это ${note.doremi} (${note.name}). Серия правильных ответов растёт!`;
      }
      registerAnswerSuccess("Ноты и клавиши");
      updateNotesStatsUI();
      setTimeout(nextNotesQuiz, 1400);
    } else {
      if (clickedKey) clickedKey.classList.add("quiz-wrong");
      if (correctKey) correctKey.classList.add("quiz-correct");
      const explanation = `Нота ${notesQuizTarget.doremi} (${notesQuizTarget.name}) находится на клавиатуре ${
        notesQuizTarget.isBlack ? "на чёрной клавише" : "на белой клавише"
      }. Ориентир: нота До (C) всегда находится слева от двух чёрных клавиш.`;

      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка: ты нажал ${note.doremi} (${note.name}), а требовалась ${notesQuizTarget.doremi} (${notesQuizTarget.name}). Ошибка записана и отправлена в Telegram!`;
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
     11. УПРАЖНЕНИЕ 02: ЧТЕНИЕ НОТ С ЛИСТА
     ------------------------------------------------------------------------ */
  let sightTarget = null;

  function initSightReadingQuiz() {
    renderPianoKeyboard("sightreading-quiz-piano", {
      startMidi: 48, // C3
      endMidi: 72, // C5
      showShortcuts: true,
      onClick: handleSightKeyClick
    });
    nextSightReadingQuiz();
  }

  function nextSightReadingQuiz() {
    const clefMode = document.getElementById("quiz-clef-select")?.value || "treble";
    const accMode = document.getElementById("quiz-accidentals-select")?.value || "natural";

    // Пул нот в зависимости от ключа
    let pool = [];
    if (clefMode === "treble") {
      // Скрипичный ключ: от C4 (60) до G5 (79)
      pool = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
    } else if (clefMode === "bass") {
      // Басовый ключ: от F2 (41) до C4 (60)
      pool = [43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60];
    } else {
      // Grand Staff: C3 (48) до C5 (72)
      pool = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
    }

    if (accMode === "accidentals") {
      // Добавляем диезы
      pool = pool.concat([61, 63, 66, 68, 70, 51, 54, 56]);
    }

    const midi = pool[Math.floor(Math.random() * pool.length)];
    sightTarget = midiToNote(midi);

    // Рисуем на стане задания
    renderGrandStaffSvg("quiz-staff-display", [sightTarget.midi], { clef: clefMode });

    // Генерируем 4 кнопки вариантов ответов
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
      // Перемешиваем
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

    // Блокируем кнопки
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
      registerAnswerSuccess("Чтение нот с листа");
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
        `Нота на нотном стане (${sightTarget.midi < 60 ? "Басовый ключ" : "Скрипичный ключ"})`,
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
    intervalRootMidi = 60 + Math.floor(Math.random() * 5); // C4 до E4
    intervalTarget = rand;

    playIntervalSound(intervalRootMidi, intervalTarget.semitones, "up");

    const hint = document.getElementById("intervals-quiz-hint");
    if (hint) hint.textContent = "Интервал прозвучал. Выбери его название:";

    // Генерируем 4 варианта
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
      registerAnswerSuccess("Интервалы на слух");
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
     13. УПРАЖНЕНИЕ 04: АККОРДЫ НА СЛУХ
     ------------------------------------------------------------------------ */
  let chordTarget = null;
  let chordRootMidi = 60;

  function nextChordQuiz() {
    const types = ["major", "minor", "dim", "aug"];
    const typeKey = types[Math.floor(Math.random() * types.length)];
    chordTarget = { type: typeKey, info: TRIADS[typeKey] };
    chordRootMidi = 60 + Math.floor(Math.random() * 7);

    playChordQuizSound();

    const ansContainer = document.getElementById("chords-answers");
    if (ansContainer) {
      ansContainer.innerHTML = "";
      types.forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer";
        btn.textContent = TRIADS[t].name;
        btn.addEventListener("click", () => handleChordAnswer(t));
        ansContainer.appendChild(btn);
      });
    }

    const fb = document.getElementById("chords-feedback");
    if (fb) {
      fb.className = "feedback";
      fb.textContent = "Послушай аккорд и выбери его тип.";
    }
  }

  function playChordQuizSound() {
    if (!chordTarget) return;
    const midis = chordTarget.info.offsets.map((off) => chordRootMidi + off);
    playChordMidi(midis, 1.8);
  }

  function handleChordAnswer(chosenKey) {
    if (!chordTarget) return;

    const fb = document.getElementById("chords-feedback");
    const isCorrect = chosenKey === chordTarget.type;

    const btns = document.querySelectorAll("#chords-answers .answer");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.textContent === chordTarget.info.name) b.classList.add("correct");
      if (!isCorrect && b.textContent === TRIADS[chosenKey].name) b.classList.add("wrong");
    });

    if (isCorrect) {
      if (fb) {
        fb.className = "feedback success-feedback";
        fb.textContent = `Правильно! Прозвучал ${chordTarget.info.name} (${chordTarget.info.desc}).`;
      }
      registerAnswerSuccess("Трезвучия и аккорды");
      updateChordStatsUI();
      setTimeout(nextChordQuiz, 1500);
    } else {
      if (fb) {
        fb.className = "feedback error-feedback";
        fb.textContent = `Ошибка: ты выбрал «${TRIADS[chosenKey].name}», а звучал «${chordTarget.info.name}». Разбор отправлен в Telegram!`;
      }

      registerAnswerError(
        "Трезвучия и аккорды",
        "Определи тип трезвучия на слух",
        TRIADS[chosenKey].name,
        chordTarget.info.name,
        `Строение ${chordTarget.info.name} трезвучия: ${chordTarget.info.desc}. Обрати внимание на окраску терции!`
      );
      updateChordStatsUI();
    }
  }

  function updateChordStatsUI() {
    const s = state.statsByExercise["Трезвучия и аккорды"] || { answered: 0, errors: 0 };
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
      registerAnswerSuccess("Септаккорды");
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
      registerAnswerSuccess("Гаммы и пальцы");
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
      startMidi: 60, // C4
      endMidi: 72, // C5
      showShortcuts: true,
      onClick: handleDictationKeyClick
    });
  }

  function playDictationMelody() {
    const len = parseInt(document.getElementById("solfeggio-length-select")?.value || "3", 10);
    // До мажор: ноты C4(60), D4(62), E4(64), F4(65), G4(67), A4(69), B4(71), C5(72)
    const scale = [60, 62, 64, 65, 67, 69, 71, 72];

    // Сначала играем тоническое трезвучие До-Ми-Соль-До для настройки слуха
    playPianoTone(60, 0.4, 0.7);
    setTimeout(() => playPianoTone(64, 0.4, 0.7), 250);
    setTimeout(() => playPianoTone(67, 0.4, 0.7), 500);
    setTimeout(() => playPianoTone(72, 0.6, 0.75), 750);

    // Затем мелодию диктанта через 1.4 секунды
    dictationTargetNotes = [];
    let prev = 60;
    for (let i = 0; i < len; i++) {
      // Плавное шаговое движение
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
      registerAnswerSuccess("Слуховой диктант");
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
     17. НАВИГАЦИЯ ПО РАЗДЕЛАМ (VIEWS) И ИНИЦИАЛИЗАЦИЯ
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
      title: "Трезвучия<br /><em>и их обращения.</em>",
      text: "Мажор, минор, уменьшенные и увеличенные аккорды. Голосоведение и пальцы 1-3-5.",
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
      text: "Автоматическая отправка разбора ошибок, серий побед и итоговой статистики прямо в мессенджер.",
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

    // Специфические рендеры для открытого раздела
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
     18. ОБНОВЛЕНИЯ ДЛЯ РАЗДЕЛОВ ИССЛЕДОВАНИЯ (EXPLORERS)
     ------------------------------------------------------------------------ */
  function populateSelects() {
    // Тоники
    const rootSelects = ["interval-root-select", "chord-root-select", "seventh-root-select", "scale-root-select"];
    rootSelects.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = NOTE_NAMES.map((name, idx) => `<option value="${idx}">${NOTE_RU[idx]} (${name})</option>`).join("");
      el.value = "0"; // C
    });

    // Интервалы
    const intSel = document.getElementById("interval-select");
    if (intSel) {
      intSel.innerHTML = INTERVALS.map((item) => `<option value="${item.semitones}">${item.name} (${item.semitones} полут.)</option>`).join("");
      intSel.value = "4"; // Большая терция
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

    // Подсвечиваем клавиши интервала
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
     19. ИНИЦИАЛИЗАЦИЯ ВСЕХ ОБРАБОТЧИКОВ И СТАРТ ПРИЛОЖЕНИЯ
     ------------------------------------------------------------------------ */
  function initialize() {
    loadState();
    updateGlobalStatsUI();
    updateTelegramStatusUI();
    populateSelects();

    // Главное интерактивное пианино 1-го раздела
    renderPianoKeyboard("notes-piano", {
      startMidi: 48, // C3
      endMidi: 72, // C5
      showShortcuts: state.showShortcuts
    });

    // Пианино для раздела чтения нот со стана
    renderPianoKeyboard("staff-piano", {
      startMidi: 48,
      endMidi: 72,
      showShortcuts: true
    });

    // Пианино свободной игры (Piano Lab)
    renderPianoKeyboard("freelab-piano", {
      startMidi: 48, // C3
      endMidi: 84, // C6 (3 октавы!)
      showShortcuts: true
    });

    // Инициализация тренажёров
    initNotesQuiz();
    initSightReadingQuiz();
    initSolfeggioDictation();
    nextIntervalQuiz();
    nextChordQuiz();
    nextSeventhQuiz();
    nextScaleQuiz();

    // Обработчик клавиш клавиатуры компьютера (ASDF...)
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        return;
      }

      // Пробел — тап в метроном
      if (e.code === "Space") {
        e.preventDefault();
        handleUserTap();
        return;
      }

      // Клавиши нот пианино
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

    // Тап кнопка мыши / тача
    const tapBtn = document.getElementById("tap-btn");
    if (tapBtn) {
      tapBtn.addEventListener("click", handleUserTap);
    }

    // Метроном старт/стоп
    const metroBtn = document.getElementById("metronome-toggle-btn");
    if (metroBtn) {
      metroBtn.addEventListener("click", () => {
        if (isMetronomeRunning) stopMetronome();
        else startMetronome();
      });
    }

    // BPM слайдер
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

    // Выбор размера метра
    const meterSel = document.getElementById("meter-select");
    if (meterSel) {
      meterSel.addEventListener("change", (e) => {
        meter = parseInt(e.target.value, 10);
        // Перерисовываем точки метра
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

    // Ритмический зачёт
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
          fb.textContent = "Раунд начался! Сделай 10 точных тапов в такт (пробел или клик по кнопке ТАП).";
        }
      });
    }

    // Кнопки следующих заданий
    document.getElementById("notes-next-btn")?.addEventListener("click", nextNotesQuiz);
    document.getElementById("sightreading-next-btn")?.addEventListener("click", nextSightReadingQuiz);
    document.getElementById("intervals-next-btn")?.addEventListener("click", nextIntervalQuiz);
    document.getElementById("chords-next-btn")?.addEventListener("click", nextChordQuiz);
    document.getElementById("sevenths-next-btn")?.addEventListener("click", nextSeventhQuiz);
    document.getElementById("scales-next-btn")?.addEventListener("click", nextScaleQuiz);

    // Кнопки повторного прослушивания
    document.getElementById("intervals-repeat-btn")?.addEventListener("click", () => {
      if (intervalTarget) playIntervalSound(intervalRootMidi, intervalTarget.semitones, "up");
    });
    document.getElementById("chords-repeat-btn")?.addEventListener("click", playChordQuizSound);
    document.getElementById("sevenths-repeat-btn")?.addEventListener("click", playSeventhQuizSound);

    // Кнопки проигрывания в разделах теории
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
      // ii - V - I (Dm7 -> G7 -> Cmaj7)
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
      // Вверх и вниз
      const sequence = midis.concat(midis.slice(0, -1).reverse());
      sequence.forEach((m, idx) => {
        setTimeout(() => playPianoTone(m, 0.45, 0.8), idx * 240);
      });
    });

    // Слуховой диктант
    document.getElementById("solfeggio-play-dictation-btn")?.addEventListener("click", playDictationMelody);
    document.getElementById("solfeggio-clear-btn")?.addEventListener("click", () => {
      dictationUserNotes = [];
      updateDictationUserDisplay();
    });
    document.getElementById("solfeggio-check-btn")?.addEventListener("click", checkDictationAnswer);

    // Свободная игра: тембры и запись
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

    // Слушатели переключателей теории
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

    // Переключатель подписей нот
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

    // Навигация октав
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

    // Telegram UI
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
        `Связь установлена отлично. Все отчёты об упражнениях и разбор ошибок будут оперативно приходить сюда! ✨`
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

    // Сброс статистики
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

    // Обработка перехода по разделам (хэш)
    window.addEventListener("hashchange", () => {
      showView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    showView();
  }

  // Запуск после загрузки DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
