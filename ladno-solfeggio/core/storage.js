/*
 * ЯДРО: сохранение прогресса в localStorage.
 *
 * Единый ключ — ladno.progress.v2. Внутри есть поле version, и при загрузке
 * данные всегда пропускаются через нормализацию: старый или частично
 * испорченный объект не ломает приложение.
 *
 * Отдельно поддерживается миграция из первого проекта «Ладно»
 * (ladno-progress-v1): серии и счётчики переносятся, а не теряются.
 */

export const STORAGE_KEY = "ladno.progress.v2";
export const LEGACY_KEY = "ladno-progress-v1";
export const SCHEMA_VERSION = 2;

const now = () => Date.now();

/** Пустой прогресс новой схемы. */
export function emptyProgress() {
  return {
    version: SCHEMA_VERSION,
    createdAt: now(),
    updatedAt: now(),
    // Общая серия правильных ответов и общий счёт.
    streak: 0,
    bestStreak: 0,
    correct: 0,
    mistakes: 0,
    // Статистика простых упражнений: { [key]: {correct, mistakes, streak, bestStreak} }.
    exercises: {},
    // Тренажёр интервалов: { [intervalId]: { [mode]: {correct, mistakes} } }.
    earIntervals: {},
    // Тренажёр аккордов: { [chordTypeId]: {correct, mistakes} }.
    earChords: {},
    // Курс: какие разделы открыты и где остановились.
    course: { visited: {}, last: "notes", completed: {} },
    // Ритм: лучшие результаты по паттернам.
    rhythm: { records: {}, bestBpm: 0 },
    // Чтение с листа: рекорд за 30 секунд.
    notation: { best: 0, attempts: 0, correct: 0, total: 0 },
    // Композиция: сохранённые мотивы ученика.
    composition: { motifs: [] },
    // Настройки интерфейса и звука.
    settings: { theme: "light", instrument: "guitar", bpm: 90, soundOn: true },
  };
}

const emptyStats = () => ({ correct: 0, mistakes: 0, streak: 0, bestStreak: 0 });

function normaliseStats(value) {
  const base = emptyStats();
  if (!value || typeof value !== "object") return base;
  return {
    correct: Number(value.correct) || 0,
    mistakes: Number(value.mistakes) || 0,
    streak: Number(value.streak) || 0,
    bestStreak: Number(value.bestStreak) || 0,
  };
}

/**
 * Приведение любого объекта к актуальной схеме.
 * Здесь намеренно нет «умных» догадок: только безопасные значения по умолчанию.
 */
export function normaliseProgress(input) {
  const base = emptyProgress();
  if (!input || typeof input !== "object") return base;
  const safe = { ...base, ...input };

  safe.exercises = {};
  if (input.exercises && typeof input.exercises === "object") {
    Object.entries(input.exercises).forEach(([key, value]) => {
      if (value && typeof value === "object") safe.exercises[key] = normaliseStats(value);
    });
  }

  safe.earIntervals = {};
  if (input.earIntervals && typeof input.earIntervals === "object") {
    Object.entries(input.earIntervals).forEach(([intervalId, modes]) => {
      if (!modes || typeof modes !== "object") return;
      safe.earIntervals[intervalId] = {};
      Object.entries(modes).forEach(([mode, value]) => {
        if (value && typeof value === "object") {
          safe.earIntervals[intervalId][mode] = {
            correct: Number(value.correct) || 0,
            mistakes: Number(value.mistakes) || 0,
          };
        }
      });
    });
  }

  safe.earChords = {};
  if (input.earChords && typeof input.earChords === "object") {
    Object.entries(input.earChords).forEach(([typeId, value]) => {
      if (value && typeof value === "object") {
        safe.earChords[typeId] = {
          correct: Number(value.correct) || 0,
          mistakes: Number(value.mistakes) || 0,
        };
      }
    });
  }

  safe.course = {
    visited: input.course?.visited && typeof input.course.visited === "object" ? input.course.visited : {},
    completed: input.course?.completed && typeof input.course.completed === "object" ? input.course.completed : {},
    last: typeof input.course?.last === "string" ? input.course.last : "notes",
  };

  safe.rhythm = {
    records: input.rhythm?.records && typeof input.rhythm.records === "object" ? input.rhythm.records : {},
    bestBpm: Number(input.rhythm?.bestBpm) || 0,
  };

  safe.notation = {
    best: Number(input.notation?.best) || 0,
    attempts: Number(input.notation?.attempts) || 0,
    correct: Number(input.notation?.correct) || 0,
    total: Number(input.notation?.total) || 0,
  };

  safe.composition = {
    motifs: Array.isArray(input.composition?.motifs)
      ? input.composition.motifs.filter((motif) => motif && Array.isArray(motif.notes))
      : [],
  };

  const settings = input.settings && typeof input.settings === "object" ? input.settings : {};
  safe.settings = {
    theme: settings.theme === "dark" ? "dark" : "light",
    instrument: settings.instrument === "piano" ? "piano" : "guitar",
    bpm: Math.min(220, Math.max(40, Number(settings.bpm) || 90)),
    soundOn: settings.soundOn !== false,
  };

  safe.streak = Number(input.streak) || 0;
  safe.bestStreak = Math.max(Number(input.bestStreak) || 0, safe.streak);
  safe.correct = Number(input.correct) || 0;
  safe.mistakes = Number(input.mistakes) || 0;
  safe.version = SCHEMA_VERSION;
  safe.updatedAt = now();
  return safe;
}

/**
 * Миграция из «Ладно v1»: структура была плоской
 * (streak, correct, mistakes, exercises{key:{...}}).
 */
export function migrateFromV1(legacy) {
  const base = emptyProgress();
  if (!legacy || typeof legacy !== "object") return base;
  base.streak = Number(legacy.streak) || 0;
  base.correct = Number(legacy.correct) || 0;
  base.mistakes = Number(legacy.mistakes) || 0;
  base.bestStreak = base.streak;
  if (legacy.exercises && typeof legacy.exercises === "object") {
    Object.entries(legacy.exercises).forEach(([key, value]) => {
      base.exercises[key] = normaliseStats(value);
    });
  }
  return base;
}

/** Мягкая загрузка: при любой ошибке возвращаем пустой прогресс, а не падаем. */
export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SCHEMA_VERSION) return normaliseProgress(parsed);
      // Объект без версии — всё равно пробуем прочитать: лучше, чем потерять.
      return normaliseProgress(parsed);
    }
    const legacyRaw = storage?.getItem(LEGACY_KEY);
    if (legacyRaw) return migrateFromV1(JSON.parse(legacyRaw));
  } catch (error) {
    console.warn("Прогресс не загрузился, начинаем с чистого листа.", error);
  }
  return emptyProgress();
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    progress.updatedAt = now();
    storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (error) {
    console.warn("Не удалось сохранить прогресс.", error);
    return false;
  }
}

export function clearProgress(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    storage?.removeItem(LEGACY_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Операции над прогрессом (чистые функции: возвращают новый объект)  */
/* ------------------------------------------------------------------ */

/**
 * Записать ответ. `key` — идентификатор упражнения, например "notes"
 * или "pentatonic-find". Возвращает { progress, stats, streak }.
 */
export function recordAnswer(progress, key, isCorrect) {
  const next = { ...progress, exercises: { ...progress.exercises } };
  const stats = normaliseStats(next.exercises[key]);
  if (isCorrect) {
    next.streak += 1;
    next.correct += 1;
    stats.correct += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    if (next.streak > next.bestStreak) next.bestStreak = next.streak;
  } else {
    next.streak = 0;
    next.mistakes += 1;
    stats.mistakes += 1;
    stats.streak = 0;
  }
  next.exercises[key] = stats;
  return { progress: next, stats, streak: next.streak };
}

export function statsFor(progress, key) {
  return normaliseStats(progress.exercises[key]);
}

/** Записать ответ в тренажёре интервалов: интервал × режим. */
export function recordIntervalAnswer(progress, intervalId, mode, isCorrect) {
  const next = { ...progress, earIntervals: { ...progress.earIntervals } };
  const byMode = { ...(next.earIntervals[intervalId] || {}) };
  const value = { correct: 0, mistakes: 0, ...(byMode[mode] || {}) };
  if (isCorrect) value.correct += 1;
  else value.mistakes += 1;
  byMode[mode] = value;
  next.earIntervals[intervalId] = byMode;
  const answer = recordAnswer(next, "ear-intervals", isCorrect);
  return { progress: { ...answer.progress, earIntervals: next.earIntervals }, streak: answer.streak };
}

/** Записать ответ в тренажёре аккордов. */
export function recordChordAnswer(progress, typeId, isCorrect) {
  const next = { ...progress, earChords: { ...progress.earChords } };
  const value = { correct: 0, mistakes: 0, ...(next.earChords[typeId] || {}) };
  if (isCorrect) value.correct += 1;
  else value.mistakes += 1;
  next.earChords[typeId] = value;
  const answer = recordAnswer(next, "ear-chords", isCorrect);
  return { progress: { ...answer.progress, earChords: next.earChords }, streak: answer.streak };
}

/** Точность в процентах (0, если попыток не было). */
export function accuracy(correct = 0, mistakes = 0) {
  const total = correct + mistakes;
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** Таблица «интервал × режим» — массив строк для рендера. */
export function intervalTable(progress, intervals, modes) {
  return intervals.map((interval) => ({
    id: interval.id,
    short: interval.short,
    name: interval.name,
    modes: Object.fromEntries(
      modes.map((mode) => {
        const value = progress.earIntervals?.[interval.id]?.[mode.id] || { correct: 0, mistakes: 0 };
        return [mode.id, {
          ...value,
          total: value.correct + value.mistakes,
          accuracy: accuracy(value.correct, value.mistakes),
        }];
      }),
    ),
  }));
}

/** Топ проблемных интервалов: сначала самые низкие точность и число попыток. */
export function weakIntervals(progress, intervals, minimumAttempts = 3) {
  return intervals
    .map((interval) => {
      const modes = Object.values(progress.earIntervals?.[interval.id] || {});
      const correct = modes.reduce((sum, item) => sum + (item.correct || 0), 0);
      const mistakes = modes.reduce((sum, item) => sum + (item.mistakes || 0), 0);
      return {
        interval,
        correct,
        mistakes,
        total: correct + mistakes,
        accuracy: accuracy(correct, mistakes),
      };
    })
    .filter((item) => item.total >= minimumAttempts)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 3);
}

/** Топ проблемных типов аккордов. */
export function weakChords(progress, types, minimumAttempts = 3) {
  return types
    .map((type) => {
      const value = progress.earChords?.[type.id] || { correct: 0, mistakes: 0 };
      return {
        type,
        correct: value.correct,
        mistakes: value.mistakes,
        total: value.correct + value.mistakes,
        accuracy: accuracy(value.correct, value.mistakes),
      };
    })
    .filter((item) => item.total >= minimumAttempts)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 3);
}

/** Отметить раздел курса как открытый. */
export function markVisited(progress, sectionId) {
  return {
    ...progress,
    course: {
      ...progress.course,
      visited: { ...progress.course.visited, [sectionId]: true },
      last: sectionId,
    },
  };
}

/** Процент прохождения курса: сколько разделов открыто. */
export function courseProgress(progress, sectionIds) {
  const visited = sectionIds.filter((id) => progress.course?.visited?.[id]).length;
  return { visited, total: sectionIds.length, percent: Math.round((visited / sectionIds.length) * 100) };
}

/** Сохранить мотив ученика (максимум 30 штук, новые сверху). */
export function saveMotif(progress, motif) {
  const motifs = [motif, ...progress.composition.motifs].slice(0, 30);
  return { ...progress, composition: { ...progress.composition, motifs } };
}

export function removeMotif(progress, id) {
  return {
    ...progress,
    composition: {
      ...progress.composition,
      motifs: progress.composition.motifs.filter((motif) => motif.id !== id),
    },
  };
}

/** Текст для кнопки «Поделиться результатом». */
export function shareText(progress, exerciseKey = null) {
  if (exerciseKey) {
    const stats = statsFor(progress, exerciseKey);
    return `Моя серия «${exerciseKey}»: ${stats.streak} подряд! Точность ${accuracy(stats.correct, stats.mistakes)}% · всего ${stats.correct + stats.mistakes} попыток. Учусь по «Ладно».`;
  }
  return `Моя серия в «Ладно»: ${progress.streak} подряд! Лучшая серия ${progress.bestStreak}, точность ${accuracy(progress.correct, progress.mistakes)}%.`;
}
