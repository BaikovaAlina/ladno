/*
 * ui/state.js — единое версионированное хранилище состояния и статистики курса
 * в localStorage под ключом `ladno.progress.v2` (с мягкой миграцией со старого v1).
 */

import { EAR_INTERVAL_IDS } from "../data/intervals.js";
import { EAR_CHORD_TYPES } from "../data/chords.js";

export const STORAGE_KEY = "ladno.progress.v2";
const LEGACY_KEY = "ladno-progress-v1";

export const EAR_MODES = ["asc", "desc", "harm", "melodic"];

export const ALL_SECTION_IDS = [
  "notes",
  "intervals",
  "triads",
  "sevenths",
  "scales",
  "keys",
  "harmony",
  "composition",
  "pentatonic",
  "blues",
  "ear-intervals",
  "ear-chords",
  "rhythm",
  "sight-reading",
];

function createEmptyEarMatrix() {
  const matrix = {};
  EAR_INTERVAL_IDS.forEach((id) => {
    matrix[id] = {
      asc: { attempts: 0, correct: 0 },
      desc: { attempts: 0, correct: 0 },
      harm: { attempts: 0, correct: 0 },
      melodic: { attempts: 0, correct: 0 },
    };
  });
  return matrix;
}

function createEmptyChordStats() {
  const byType = {};
  EAR_CHORD_TYPES.forEach((t) => {
    byType[t.id] = { attempts: 0, correct: 0 };
  });
  return byType;
}

export function createDefaultState() {
  return {
    version: 2,
    theme: "light",
    visitedSections: ["notes"],
    streak: 0,
    bestStreak: 0,
    correct: 0,
    mistakes: 0,
    exercises: {},
    earIntervals: {
      streak: 0,
      bestStreak: 0,
      total: 0,
      correct: 0,
      matrix: createEmptyEarMatrix(),
    },
    earChords: {
      streak: 0,
      bestStreak: 0,
      total: 0,
      correct: 0,
      byType: createEmptyChordStats(),
    },
    sightReading: {
      bestScore30s: 0,
      attempts: 0,
      correct: 0,
    },
    savedMotifs: [],
  };
}

let storageAvailable = true;
let state = createDefaultState();
const listeners = new Set();

function mergeSafeState(rawObj) {
  const base = createDefaultState();
  if (!rawObj || typeof rawObj !== "object") return base;

  base.theme = rawObj.theme === "dark" ? "dark" : "light";
  base.streak = Number(rawObj.streak) || 0;
  base.bestStreak = Math.max(Number(rawObj.bestStreak) || 0, base.streak);
  base.correct = Number(rawObj.correct) || 0;
  base.mistakes = Number(rawObj.mistakes) || 0;

  if (Array.isArray(rawObj.visitedSections)) {
    base.visitedSections = [
      ...new Set(
        rawObj.visitedSections.filter((id) => ALL_SECTION_IDS.includes(id)),
      ),
    ];
    if (!base.visitedSections.length) base.visitedSections = ["notes"];
  }

  if (rawObj.exercises && typeof rawObj.exercises === "object") {
    Object.entries(rawObj.exercises).forEach(([k, v]) => {
      if (v && typeof v === "object") {
        const s = Number(v.streak) || 0;
        base.exercises[k] = {
          streak: s,
          bestStreak: Math.max(Number(v.bestStreak) || 0, s),
          correct: Number(v.correct) || 0,
          mistakes: Number(v.mistakes) || 0,
        };
      }
    });
  }

  if (rawObj.earIntervals && typeof rawObj.earIntervals === "object") {
    base.earIntervals.streak = Number(rawObj.earIntervals.streak) || 0;
    base.earIntervals.bestStreak = Math.max(
      Number(rawObj.earIntervals.bestStreak) || 0,
      base.earIntervals.streak,
    );
    base.earIntervals.total = Number(rawObj.earIntervals.total) || 0;
    base.earIntervals.correct = Number(rawObj.earIntervals.correct) || 0;

    const savedMatrix = rawObj.earIntervals.matrix || {};
    EAR_INTERVAL_IDS.forEach((id) => {
      if (savedMatrix[id] && typeof savedMatrix[id] === "object") {
        EAR_MODES.forEach((m) => {
          const cell = savedMatrix[id][m];
          if (cell && typeof cell === "object") {
            base.earIntervals.matrix[id][m] = {
              attempts: Number(cell.attempts) || 0,
              correct: Number(cell.correct) || 0,
            };
          }
        });
      }
    });
  }

  if (rawObj.earChords && typeof rawObj.earChords === "object") {
    base.earChords.streak = Number(rawObj.earChords.streak) || 0;
    base.earChords.bestStreak = Math.max(
      Number(rawObj.earChords.bestStreak) || 0,
      base.earChords.streak,
    );
    base.earChords.total = Number(rawObj.earChords.total) || 0;
    base.earChords.correct = Number(rawObj.earChords.correct) || 0;

    const savedByType = rawObj.earChords.byType || {};
    EAR_CHORD_TYPES.forEach((t) => {
      if (savedByType[t.id] && typeof savedByType[t.id] === "object") {
        base.earChords.byType[t.id] = {
          attempts: Number(savedByType[t.id].attempts) || 0,
          correct: Number(savedByType[t.id].correct) || 0,
        };
      }
    });
  }

  if (rawObj.sightReading && typeof rawObj.sightReading === "object") {
    base.sightReading = {
      bestScore30s: Number(rawObj.sightReading.bestScore30s) || 0,
      attempts: Number(rawObj.sightReading.attempts) || 0,
      correct: Number(rawObj.sightReading.correct) || 0,
    };
  }

  if (Array.isArray(rawObj.savedMotifs)) {
    base.savedMotifs = rawObj.savedMotifs.slice(0, 20);
  }

  return base;
}

export function loadState() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (parsed && parsed.version === 2) {
        state = mergeSafeState(parsed);
        return state;
      }
    }
    // Плавный перенос базового прогресса из старого ключа v1, если он есть.
    const rawV1 = localStorage.getItem(LEGACY_KEY);
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      state = mergeSafeState({
        version: 2,
        streak: v1?.streak || 0,
        correct: v1?.correct || 0,
        mistakes: v1?.mistakes || 0,
        exercises: v1?.exercises || {},
      });
      saveState();
    }
  } catch (err) {
    storageAvailable = false;
  }
  return state;
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    storageAvailable = false;
  }
  notifyListeners();
}

export function getState() {
  return state;
}

export function isStorageAvailable() {
  return storageAvailable;
}

export function subscribeState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error("Ошибка подписчика состояния:", err);
    }
  });
}

export function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", state.theme);
  saveState();
}

export function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
  return state.theme;
}

export function markSectionVisited(sectionId) {
  if (
    ALL_SECTION_IDS.includes(sectionId) &&
    !state.visitedSections.includes(sectionId)
  ) {
    state.visitedSections.push(sectionId);
    saveState();
  }
}

export function statsForExercise(key) {
  return (
    state.exercises[key] || {
      streak: 0,
      bestStreak: 0,
      correct: 0,
      mistakes: 0,
    }
  );
}

export function formatExerciseStats(key) {
  const s = statsForExercise(key);
  return `✓ ${s.streak} подряд · всего ${s.correct} · × ${s.mistakes}`;
}

export function recordExerciseResult(key, isCorrect) {
  const s = { ...statsForExercise(key) };
  if (isCorrect) {
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correct++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.correct++;
  } else {
    state.streak = 0;
    state.mistakes++;
    s.streak = 0;
    s.mistakes++;
  }
  state.exercises[key] = s;
  saveState();
}

// Запись попытки в расширенном тренировщике интервалов (модуль 11).
export function recordEarIntervalAttempt(intervalId, mode, isCorrect) {
  const m = EAR_MODES.includes(mode) ? mode : "asc";
  if (!state.earIntervals.matrix[intervalId]) {
    state.earIntervals.matrix[intervalId] = {
      asc: { attempts: 0, correct: 0 },
      desc: { attempts: 0, correct: 0 },
      harm: { attempts: 0, correct: 0 },
      melodic: { attempts: 0, correct: 0 },
    };
  }
  const cell = state.earIntervals.matrix[intervalId][m];
  cell.attempts++;
  state.earIntervals.total++;

  if (isCorrect) {
    cell.correct++;
    state.earIntervals.correct++;
    state.earIntervals.streak++;
    state.earIntervals.bestStreak = Math.max(
      state.earIntervals.bestStreak,
      state.earIntervals.streak,
    );
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correct++;
  } else {
    state.earIntervals.streak = 0;
    state.streak = 0;
    state.mistakes++;
  }
  saveState();
}

// Вычисление топ-3 проблемных интервалов по накопленной статистике.
export function getWeakIntervals(limit = 3) {
  const items = [];
  EAR_INTERVAL_IDS.forEach((id) => {
    const row = state.earIntervals.matrix[id];
    if (!row) return;
    let attempts = 0;
    let correct = 0;
    EAR_MODES.forEach((m) => {
      attempts += row[m]?.attempts || 0;
      correct += row[m]?.correct || 0;
    });
    if (attempts > 0) {
      const accuracy = Math.round((correct / attempts) * 100);
      const errors = attempts - correct;
      items.push({ id, attempts, correct, errors, accuracy });
    }
  });

  // Сначала те, где есть хотя бы одна ошибка и самый низкий процент точности
  return items
    .filter((item) => item.errors > 0 || item.accuracy < 100)
    .sort((a, b) => a.accuracy - b.accuracy || b.errors - a.errors)
    .slice(0, limit);
}

export function resetEarIntervalsStats() {
  state.earIntervals = {
    streak: 0,
    bestStreak: 0,
    total: 0,
    correct: 0,
    matrix: createEmptyEarMatrix(),
  };
  saveState();
}

// Запись попытки в модуле 12 «Аккорды на слух».
export function recordEarChordAttempt(chordId, isCorrect) {
  if (!state.earChords.byType[chordId]) {
    state.earChords.byType[chordId] = { attempts: 0, correct: 0 };
  }
  const entry = state.earChords.byType[chordId];
  entry.attempts++;
  state.earChords.total++;

  if (isCorrect) {
    entry.correct++;
    state.earChords.correct++;
    state.earChords.streak++;
    state.earChords.bestStreak = Math.max(
      state.earChords.bestStreak,
      state.earChords.streak,
    );
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correct++;
  } else {
    state.earChords.streak = 0;
    state.streak = 0;
    state.mistakes++;
  }
  saveState();
}

export function resetEarChordsStats() {
  state.earChords = {
    streak: 0,
    bestStreak: 0,
    total: 0,
    correct: 0,
    byType: createEmptyChordStats(),
  };
  saveState();
}

// Запись результата спринта и одиночных попыток в модуле 14 «Чтение с листа».
export function recordSightReadingAttempt(isCorrect, sprintScore = null) {
  state.sightReading.attempts++;
  if (isCorrect) {
    state.sightReading.correct++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correct++;
  } else {
    state.streak = 0;
    state.mistakes++;
  }
  if (sprintScore !== null && sprintScore > state.sightReading.bestScore30s) {
    state.sightReading.bestScore30s = sprintScore;
  }
  saveState();
}

export function updateSightReadingBest(score) {
  if (score > state.sightReading.bestScore30s) {
    state.sightReading.bestScore30s = score;
    saveState();
    return true;
  }
  return false;
}

// Сохранение мотива из раздела 08 «Композиция».
export function saveCompositionMotif(motifObj) {
  const item = {
    id: "motif-" + Date.now(),
    createdAt: new Date().toISOString(),
    ...motifObj,
  };
  state.savedMotifs = [item, ...state.savedMotifs].slice(0, 15);
  saveState();
  return item;
}

export function deleteCompositionMotif(motifId) {
  state.savedMotifs = state.savedMotifs.filter((m) => m.id !== motifId);
  saveState();
}

export function resetAllProgress() {
  const currentTheme = state.theme;
  state = createDefaultState();
  state.theme = currentTheme;
  saveState();
}

// Формирование текста для кнопки «Поделиться результатом».
export function buildShareSummary(customFocus = null) {
  if (customFocus === "ear-intervals") {
    const ei = state.earIntervals;
    const pct = ei.total ? Math.round((ei.correct / ei.total) * 100) : 0;
    return `Моя серия в интервалах на слух («Ладно · Сольфеджио»): ${ei.streak} подряд (лучшая: ${ei.bestStreak}, точность ${pct}% из ${ei.total})! 🎸`;
  }
  if (customFocus === "ear-chords") {
    const ec = state.earChords;
    const pct = ec.total ? Math.round((ec.correct / ec.total) * 100) : 0;
    return `Моя серия в аккордах на слух («Ладно · Сольфеджио»): ${ec.streak} подряд (точность ${pct}% из ${ec.total})! 🎶`;
  }
  if (customFocus === "sight-reading") {
    return `Мой рекорд чтения нот на грифе за 30 секунд («Ладно · Сольфеджио»): ${state.sightReading.bestScore30s} нот! 🎼`;
  }
  return `Учу сольфеджио на гитаре в «Ладно»: текущая серия — ${state.streak} подряд (лучшая: ${state.bestStreak}, открыто ${state.visitedSections.length}/${ALL_SECTION_IDS.length} глав)! 🎸`;
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Переходим к резервному способу через textarea
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch (_) {
    return false;
  }
}

// Первичная загрузка при импорте модуля
loadState();
