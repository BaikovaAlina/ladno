/*
 * ЯДРО: ритм — длительности, размеры, паттерны и нотация.
 *
 * Всё считается в долях (beats), а не в секундах: длительность pattерна
 * не зависит от темпа. Секунды появляются только при воспроизведении.
 *
 * Поля ноты паттерна:
 *   start — начало в долях от начала такта,
 *   dur   — длительность в долях (1 = четверть),
 *   voice — "kick" | "snare" | "hat" | "clap".
 *
 * Поля паттерна:
 *   id, name, meter, group,
 *   hits  — ноты для линейки (start/dur/voice/accent),
 *   bars  — сколько тактов в цикле,
 *   description, plain, mistake.
 */

export const NOTE_VALUES = [
  { id: "whole", name: "Целая", beats: 4, glyph: "𝅝", description: "4 доли — весь такт 4/4." },
  { id: "half", name: "Половинная", beats: 2, glyph: "𝅗𝅥", description: "2 доли — половина такта." },
  { id: "quarter", name: "Четверть", beats: 1, glyph: "♩", description: "1 доля — пульс, который ты топаешь ногой." },
  { id: "eighth", name: "Восьмая", beats: 0.5, glyph: "♪", description: "Полдоли — две ноты на одну долю." },
  { id: "sixteenth", name: "Шестнадцатая", beats: 0.25, glyph: "𝅘𝅥𝅯", description: "Четверть доли — четыре ноты на долю." },
  { id: "dotHalf", name: "Половинная с точкой", beats: 3, glyph: "𝅗𝅥.", description: "2 + 1 доля: точка добавляет половину." },
  { id: "dottedQuarter", name: "Четверть с точкой", beats: 1.5, glyph: "♩.", description: "1,5 доли — «пунктирный» ритм." },
  { id: "eighthTriplet", name: "Триоль восьмых", beats: 1 / 3, glyph: "♪³", description: "Три ноты на долю — триоль." },
  { id: "restQuarter", name: "Пауза (четверть)", beats: 1, glyph: "𝄽", description: "Молчание тоже часть ритма." },
];

export const METERS = [
  { id: "4/4", name: "4/4", beats: 4, noteBeats: 1, strong: [0, 2], description: "Четыре доли, сильные — 1 и 3. Основа рока и попа." },
  { id: "3/4", name: "3/4", beats: 3, noteBeats: 1, strong: [0], description: "Три доли: раз-два-три, вальс." },
  { id: "6/8", name: "6/8", beats: 6, noteBeats: 0.5, strong: [0, 3], description: "Шесть восьмых: две группы по три, «качание»." },
  { id: "2/4", name: "2/4", name2: "2/4", beats: 2, noteBeats: 1, strong: [0], description: "Две доли — марш." },
];

export const getMeter = (id) => METERS.find((item) => item.id === id) || METERS[0];

/**
 * Ритмические паттерны для упражнений и линейки.
 * start/dur указаны в долях; для 6/8 доля — восьмая.
 */
export const RHYTHM_PATTERNS = [
  {
    id: "quarters", name: "Четверти", meter: "4/4", group: "basic",
    hits: [0, 1, 2, 3].map((start) => ({ start, dur: 1, voice: "snare", accent: start % 2 === 0 })),
    bars: 1,
    description: "Ровный пульс: четыре удара в такте.",
    plain: "Хлопай вместе с метрономом. Считай вслух «раз-два-три-четыре».",
    mistake: "Ускорять на третьей доле. Тянись к метроному, а не наоборот.",
  },
  {
    id: "eighths", name: "Восьмые", meter: "4/4", group: "basic",
    hits: Array.from({ length: 8 }, (_, i) => ({ start: i * 0.5, dur: 0.5, voice: "hat", accent: i % 2 === 0 })),
    bars: 1,
    description: "Два удара на каждую долю: «раз-и, два-и».",
    plain: "Считай «раз-и-два-и» и хлопай на каждый слог.",
    mistake: "Хлопать только на «раз», теряя «и». Считай вслух.",
  },
  {
    id: "backbeat", name: "Бэкбит", meter: "4/4", group: "groove",
    hits: [
      { start: 0, dur: 1, voice: "kick" },
      { start: 0, dur: 0.5, voice: "hat" },
      { start: 0.5, dur: 0.5, voice: "hat" },
      { start: 1, dur: 1, voice: "snare" },
      { start: 1, dur: 0.5, voice: "hat" },
      { start: 1.5, dur: 0.5, voice: "hat" },
      { start: 2, dur: 1, voice: "kick" },
      { start: 2, dur: 0.5, voice: "hat" },
      { start: 2.5, dur: 0.5, voice: "hat" },
      { start: 3, dur: 1, voice: "snare" },
      { start: 3, dur: 0.5, voice: "hat" },
      { start: 3.5, dur: 0.5, voice: "hat" },
    ],
    bars: 1,
    description: "Бочка на 1 и 3, малый на 2 и 4. Базовый грув.",
    plain: "Хлопай на 2 и 4 — это и есть «бэкбит», основной грув рока.",
    mistake: "Хлопать на 1 и 3 — это уже другой грув, звучит тяжелее.",
  },
  {
    id: "dotted", name: "Пунктир", meter: "4/4", group: "rhythm",
    hits: [
      { start: 0, dur: 1.5, voice: "snare", accent: true },
      { start: 1.5, dur: 0.5, voice: "snare", accent: true },
      { start: 2, dur: 1.5, voice: "snare", accent: true },
      { start: 3.5, dur: 0.5, voice: "snare", accent: true },
    ],
    bars: 1,
    description: "Долгая-короткая пара: 1 + ½ доли. Основа маршей.",
    plain: "Считай «та-а-та», где первая нота тянется, а вторая — короткая.",
    mistake: "Играть ровно восьмыми — теряется характер.",
  },
  {
    id: "syncopation", name: "Синкопа", meter: "4/4", group: "rhythm",
    hits: [
      { start: 0, dur: 1, voice: "kick" },
      { start: 0.5, dur: 0.5, voice: "snare", accent: true },
      { start: 1.5, dur: 1, voice: "snare", accent: true },
      { start: 2.5, dur: 1, voice: "snare", accent: true },
      { start: 3.5, dur: 0.5, voice: "snare", accent: true },
    ],
    bars: 1,
    description: "Акценты смещаются с сильных долей на «и».",
    plain: "Хлопай на «раз-и» (второй слог), потом на «два-и», потом «три-и». Сначала считай вслух.",
    mistake: "Синкопа — это не «быстрее». Пульс тот же, смещаются только акценты.",
  },
  {
    id: "waltz", name: "Вальс", meter: "3/4", group: "basic",
    hits: [
      { start: 0, dur: 1, voice: "kick", accent: true },
      { start: 1, dur: 1, voice: "snare" },
      { start: 2, dur: 1, voice: "snare" },
    ],
    bars: 1,
    description: "Сильная первая доля и две лёгкие.",
    plain: "«Раз» — heavy, «два-три» — легко. Хлопай сильнее на первую долю.",
    mistake: "Ровно акцентировать все три доли: вальс качает.",
  },
  {
    id: "sixEight", name: "Шесть восьмых", meter: "6/8", group: "basic",
    hits: [
      { start: 0, dur: 1, voice: "kick", accent: true },
      { start: 1, dur: 1, voice: "hat" },
      { start: 2, dur: 1, voice: "hat" },
      { start: 3, dur: 1, voice: "snare", accent: true },
      { start: 4, dur: 1, voice: "hat" },
      { start: 5, dur: 1, voice: "hat" },
    ],
    bars: 1,
    description: "Две группы по три: раз-два-три | четыре-пять-шесть.",
    plain: "Две маленькие тройки в одном такте: «раз-и-а, два-и-а».",
    mistake: "Считать 6/8 как 3/4. Это два центра по три, а не три по два.",
  },
  {
    id: "triplet", name: "Триоли", meter: "4/4", group: "rhythm",
    hits: Array.from({ length: 12 }, (_, i) => ({ start: i / 3, dur: 1 / 3, voice: "hat", accent: i % 3 === 0 })),
    bars: 1,
    description: "Три ноты на долю: шаффл и свинг.",
    plain: "Сыграй по три ноты на каждую долю. Получится «качающий» шаффл.",
    mistake: "Играть триоли ровно, но без акцента на первой — теряется свинг.",
  },
  {
    id: "sixteen", name: "Шестнадцатые", meter: "4/4", group: "rhythm",
    hits: Array.from({ length: 16 }, (_, i) => ({ start: i * 0.25, dur: 0.25, voice: "snare", accent: i % 4 === 0 })),
    bars: 1,
    description: "Четыре ноты на долю: «раз-е-и-а».",
    plain: "Считай «раз-та-и-та». Хлопай каждую ноту, держи темп.",
    mistake: "Спешить: шестнадцатые любят разгоняться.",
  },
];

export const getRhythmPattern = (id) =>
  RHYTHM_PATTERNS.find((item) => item.id === id) || RHYTHM_PATTERNS[0];

/** Сетка ровных долей для сравнения кликов пользователя. */
export function beatGrid(pattern) {
  const meter = getMeter(pattern.meter);
  const total = pattern.bars * meter.beats;
  return Array.from({ length: Math.round(total) }, (_, i) => i);
}

/**
 * Допуск для «Хлопни ритм» — половина минимальной длительности паттерна.
 * В долях; в секунды переводится в момент сравнения.
 */
export function timingTolerance(pattern) {
  const minDur = Math.min(...pattern.hits.map((hit) => hit.dur));
  return Math.max(0.12, minDur * 0.55);
}

/** Подсчёт точности попаданий: [{hit, ok}] + процент. */
export function scoreRhythmClicks(pattern, clickTimes) {
  const used = new Set();
  const results = pattern.hits.map((hit) => {
    let bestIndex = -1;
    let bestDistance = Infinity;
    clickTimes.forEach((time, index) => {
      if (used.has(index)) return;
      const distance = Math.abs(time - hit.start);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestDistance <= 0.55) {
      used.add(bestIndex);
      return { hit, distance: bestDistance, ok: true };
    }
    return { hit, distance: bestDistance, ok: false };
  });
  const hits = results.filter((item) => item.ok).length;
  const extra = clickTimes.length - used.size;
  return {
    results,
    hits,
    extra,
    total: pattern.hits.length,
    accuracy: Math.round((hits / pattern.hits.length) * 100),
  };
}

/** Текст ритма для подсказки: «♩ ♩ ♩ ♩» или «♪♪♪♪». */
export function patternText(pattern) {
  return pattern.hits
    .map((hit) => {
      if (hit.dur >= 2) return "𝅗𝅥";
      if (hit.dur >= 1) return "♩";
      if (hit.dur >= 0.5) return "♪";
      return "𝅘𝅥𝅯";
    })
    .join(" ");
}

/** Сколько секунд звучит один такт паттерна при данном BPM. */
export function barSeconds(pattern, bpm) {
  const meter = getMeter(pattern.meter);
  const beatSeconds = 60 / bpm;
  // В 6/8 BPM относится к восьмым (то есть «доля» = восьмая).
  return pattern.bars * meter.beats * (pattern.meter === "6/8" ? beatSeconds / 2 : beatSeconds);
}
