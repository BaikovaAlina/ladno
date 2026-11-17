"use strict";

/* Ладно — самостоятельный курс фортепиано, без сборщика и внешних библиотек. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const byId = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const unique = (items) => [...new Set(items)];
const mod = (number, base = 12) => ((number % base) + base) % base;
const escapeHTML = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const PC_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const PC_RU = ["до", "до-диез", "ре", "ре-диез", "ми", "фа", "фа-диез", "соль", "соль-диез", "ля", "ля-диез", "си"];
const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NATURAL_PCS = new Set(Object.values(NATURAL_PC));
const KEYBOARD_LOW = 60; // C4
const KEYBOARD_HIGH = 83; // B5
const STORAGE_KEY = "ladno-piano-progress-v1";
const NOTIFICATION_KEY = "ladno-piano-telegram-enabled-v1";

function midiToLabel(midi) {
  const pitch = mod(midi);
  const octave = Math.floor(midi / 12) - 1;
  return `${PC_NAMES[pitch]}${octave}`;
}
function midiToFullLabel(midi) {
  return `${midiToLabel(midi)} (${PC_RU[mod(midi)]})`;
}
function pcToLabel(pc) {
  return `${PC_NAMES[mod(pc)]} (${PC_RU[mod(pc)]})`;
}
function noteCountLabel(count) {
  return `${count} ${count === 1 ? "ноту" : count < 5 ? "ноты" : "нот"}`;
}
function midiToStaffSpelling(midi) {
  const pitch = mod(midi);
  const octave = Math.floor(midi / 12) - 1;
  const spellings = {
    0: ["C", ""], 1: ["C", "♯"], 2: ["D", ""], 3: ["D", "♯"],
    4: ["E", ""], 5: ["F", ""], 6: ["F", "♯"], 7: ["G", ""],
    8: ["G", "♯"], 9: ["A", ""], 10: ["A", "♯"], 11: ["B", ""],
  };
  const [letter, accidental] = spellings[pitch];
  return { letter, accidental, octave, label: `${letter}${accidental}${octave}` };
}
function diatonicIndex(note) {
  return note.octave * 7 + NOTE_LETTERS.indexOf(note.letter);
}

const EMPTY_PROGRESS = () => ({
  total: 0,
  correct: 0,
  errors: 0,
  streak: 0,
  bestStreak: 0,
  lessonsDone: [],
  skill: {},
  history: [],
});
let progress = EMPTY_PROGRESS();
let storageAvailable = true;
let lastMidi = null;
let activeKeyboardTask = null;
let readingMode = "note";
let readingNotes = [];
let readingInput = [];
let readingAnswered = false;
let earQuestion = null;
let earAnswered = false;
let chordQuestion = null;
let chordPicks = new Map();
let chordAnswered = false;
let rhythmQuestion = null;
let rhythmRun = null;
let memorySequence = [];
let memoryInput = [];
let memoryReady = false;
let memoryPlaybackTimer = null;
let currentLesson = null;
let appServerStatus = null;
let telegramAuthenticated = false;
let telegramEnabled = false;
let midiAccess = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== "object") return;
    progress = {
      ...EMPTY_PROGRESS(),
      ...stored,
      lessonsDone: Array.isArray(stored.lessonsDone) ? stored.lessonsDone : [],
      skill: stored.skill && typeof stored.skill === "object" ? stored.skill : {},
      history: Array.isArray(stored.history) ? stored.history.slice(0, 40) : [],
    };
  } catch (error) {
    storageAvailable = false;
  }
}
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    storageAvailable = true;
    byId("storage-status").textContent = "Прогресс хранится в этом браузере";
  } catch (error) {
    storageAvailable = false;
    byId("storage-status").textContent = "Прогресс сохранится только до закрытия страницы";
  }
  renderDashboard();
}

const LESSONS = [
  {
    id: "keyboard",
    no: "01",
    title: "Клавиатура и первые звуки",
    level: "Начало",
    minutes: 12,
    summary: "Ориентируемся в группах чёрных клавиш, находим До и знакомимся с октавами.",
    lead: "Фортепианная клавиатура — это повторяющийся рисунок из двенадцати звуков. Не нужно учить все клавиши по одной: сначала научимся быстро находить ориентиры.",
    points: ["Найди группы из двух и трёх чёрных клавиш.", "Белая клавиша слева от пары чёрных — До (C).", "Расстояние от одного До до следующего — октава; названия нот внутри неё повторяются."],
    example: "C · D · E · F · G · A · B · C",
    practice: "reading",
    practiceLabel: "Попробовать чтение нот",
  },
  {
    id: "pulse",
    no: "02",
    title: "Пульс, такт и длительности",
    level: "Начало",
    minutes: 15,
    summary: "Считаем четверти и восьмые, слышим паузы и держим ровный пульс.",
    lead: "Ритм помогает музыке двигаться. Сначала почувствуй ровный пульс, а потом научись делить его на более короткие звуки и замечать тишину.",
    points: ["В размере 4/4 в такте четыре четвертные доли.", "Две восьмые занимают столько же времени, сколько одна четверть.", "Пауза — это тоже длительность: в этот момент мы считаем, но не играем."],
    example: "РАЗ · и · ДВА · и · ТРИ · и · ЧЕТЫРЕ · и",
    practice: "rhythm",
    practiceLabel: "Повторить ритм",
  },
  {
    id: "staff",
    no: "03",
    title: "Нотный стан и чтение с листа",
    level: "База",
    minutes: 20,
    summary: "Читаем скрипичный ключ, интервалы между нотами и короткие мелодии.",
    lead: "Пять линий и четыре промежутка — карта для нот. Считай ступеньки от знакомой ноты, а не пытайся каждый раз запоминать картинку целиком.",
    points: ["Линии скрипичного ключа снизу вверх: E–G–B–D–F (ми–соль–си–ре–фа).", "Между линиями: F–A–C–E (фа–ля–до–ми).", "Среднее До (C4) находится на добавочной линии под нотным станом."],
    example: "Линии: E G B D F · промежутки: F A C E",
    practice: "reading",
    practiceLabel: "Прочитать ноты с листа",
  },
  {
    id: "ear",
    no: "04",
    title: "Слух: интервалы и аккорды",
    level: "База",
    minutes: 18,
    summary: "Сравниваем звуки, узнаём интервалы и различаем окраску аккордов.",
    lead: "Слух развивается от внимательного сравнения. Сначала поймай, стал ли звук выше или ниже; затем замечай, насколько далеко он ушёл и как звучат ноты вместе.",
    points: ["Интервал — расстояние между двумя нотами.", "В мажорном трезвучии расстояния 4 и 3 полутона; в минорном — 3 и 4.", "Напой ноты после прослушивания: голос помогает закрепить высоту и направление."],
    example: "Слушай → напой → назови",
    practice: "ear",
    practiceLabel: "Тренировать слух",
  },
  {
    id: "triads",
    no: "05",
    title: "Аккорды, обращения и опора",
    level: "Средний",
    minutes: 25,
    summary: "Строим трезвучия, изучаем обращения и соединяем аккорды плавно.",
    lead: "Аккорд — несколько звуков, которые звучат одновременно. Строй его по ступеням, а затем ищи ближайшее расположение нот, чтобы руки двигались спокойно.",
    points: ["Трезвучие строится из первой, третьей и пятой ступеней.", "Перенос нижней ноты на октаву вверх создаёт обращение того же аккорда.", "Для плавной смены аккордов оставляй общие звуки на месте и двигай остальные на ближайшую клавишу."],
    example: "C–E–G → E–G–C → G–C–E",
    practice: "chords",
    practiceLabel: "Собрать аккорд",
  },
  {
    id: "coordination",
    no: "06",
    title: "Гаммы и координация рук",
    level: "Средний",
    minutes: 25,
    summary: "Знакомимся с гаммами, аппликатурой и простыми упражнениями для обеих рук.",
    lead: "Гамма — последовательность звуков, из которой часто складывается мелодия. Играй медленно и удобно: цель — ровное движение и ясный звук, а не скорость.",
    points: ["До мажор состоит из белых клавиш от C до следующего C.", "Пальцы 1–5 — большой, указательный, средний, безымянный и мизинец.", "Сначала отдельно найди аппликатуру каждой руки, затем соединяй руки в очень медленном темпе."],
    example: "C · D · E · F · G · A · B · C",
    practice: "memory",
    practiceLabel: "Укрепить музыкальную память",
  },
  {
    id: "rhythm-reading",
    no: "07",
    title: "Сложный ритм и выразительное чтение",
    level: "Продвинутый",
    minutes: 30,
    summary: "Работаем с синкопами, штрихами, фразировкой и более длинными нотными рисунками.",
    lead: "Когда ноты уже знакомы, учись читать вперёд и замечать не только высоту, но и фразировку. В сложном ритме сначала найди опорные доли, затем добавь промежуточные звуки.",
    points: ["Синкопа смещает акцент на слабую долю или промежуток между долями.", "Смотри на несколько нот вперёд, пока играешь текущую.", "Динамика, артикуляция и паузы помогают мелодии звучать осмысленно."],
    example: "Считай опору · читай вперёд · дыши фразой",
    practice: "rhythm",
    practiceLabel: "Потренировать точность ритма",
  },
  {
    id: "harmony",
    no: "08",
    title: "Гармония, память и свой репертуар",
    level: "Продвинутый",
    minutes: 35,
    summary: "Соединяем слух, аккорды и самостоятельную работу над музыкой.",
    lead: "На продвинутом уровне важна самостоятельность: услышать гармонию, увидеть форму, разобрать трудный фрагмент и собрать его обратно в музыку.",
    points: ["Устойчивые звуки создают опору; неустойчивые стремятся к разрешению.", "Учись небольшими фразами: отдельно ритм, затем высота, затем соединение.", "Записывай, что получилось и над чем хочется поработать в следующий раз."],
    example: "услышь · пойми · сыграй · расскажи",
    practice: "ear",
    practiceLabel: "Проверить слух и память",
  },
];

const VIEW_META = {
  home: {
    label: "Мой курс", eyebrow: "01 / ТВОЙ МУЗЫКАЛЬНЫЙ ПУТЬ", line1: "Музыка начинается", line2: "с одной ноты.",
    text: "Познакомимся с клавиатурой, научимся читать ноты и слушать музыку. Всё по порядку, без спешки и сложных слов.",
  },
  reading: {
    label: "Ноты с листа", eyebrow: "02 / ВИДЕТЬ И СЛЫШАТЬ", line1: "Одна нота за раз —", line2: "и мелодия яснее.",
    text: "Научимся читать ноты на стане и сразу находить их на клавиатуре. Начни с одной ноты, а затем попробуй короткую мелодию.",
  },
  ear: {
    label: "Тренировка слуха", eyebrow: "03 / СЛУШАЙ ВНИМАТЕЛЬНО", line1: "Музыка уже внутри —", line2: "научись её узнавать.",
    text: "Различай интервалы, аккорды и высоту звуков. Слух не врождённый экзамен, а навык, который растёт от практики.",
  },
  chords: {
    label: "Аккорды", eyebrow: "04 / ПЕРВЫЕ СОЗВУЧИЯ", line1: "Несколько клавиш —", line2: "целое настроение.",
    text: "Собирай трезвучия и септаккорды на клавиатуре. Разберём состав аккорда и посмотрим, почему его звучание меняется.",
  },
  rhythm: {
    label: "Ритм и пульс", eyebrow: "05 / ЧУВСТВОВАТЬ ВРЕМЯ", line1: "Музыка движется", line2: "в своём ритме.",
    text: "Научимся держать пульс, слышать паузы и повторять ритмический рисунок — сначала медленно, затем увереннее.",
  },
  memory: {
    label: "Музыкальная память", eyebrow: "06 / УСЛЫШАТЬ И ПОВТОРИТЬ", line1: "Сохрани мелодию", line2: "и дай ей прозвучать.",
    text: "Слушай короткую фразу, запоминай движение нот и повторяй её на клавиатуре. Начни с трёх звуков.",
  },
  course: {
    label: "Все уроки", eyebrow: "07 / ОТ ПЕРВОГО ШАГА ДО СВОБОДЫ", line1: "Один курс —", line2: "много открытий.",
    text: "Пройди путь от ориентации на клавиатуре до чтения, гармонии и выразительной игры. Любой урок можно открыть в своём темпе.",
  },
};

const INTERVALS = [
  { id: "m2", name: "Малая секунда", semitones: 1 },
  { id: "M2", name: "Большая секунда", semitones: 2 },
  { id: "m3", name: "Малая терция", semitones: 3 },
  { id: "M3", name: "Большая терция", semitones: 4 },
  { id: "P4", name: "Чистая кварта", semitones: 5 },
  { id: "P5", name: "Чистая квинта", semitones: 7 },
  { id: "m6", name: "Малая секста", semitones: 8 },
  { id: "M6", name: "Большая секста", semitones: 9 },
  { id: "P8", name: "Октава", semitones: 12 },
];
const CHORD_TYPES = [
  { id: "major", name: "Мажорное трезвучие", short: "Мажор", offsets: [0, 4, 7] },
  { id: "minor", name: "Минорное трезвучие", short: "Минор", offsets: [0, 3, 7] },
  { id: "diminished", name: "Уменьшённое трезвучие", short: "Уменьшённое", offsets: [0, 3, 6] },
  { id: "augmented", name: "Увеличенное трезвучие", short: "Увеличенное", offsets: [0, 4, 8] },
  { id: "maj7", name: "Большой мажорный септаккорд", short: "Мажорный maj7", offsets: [0, 4, 7, 11] },
  { id: "min7", name: "Малый минорный септаккорд", short: "Минорный m7", offsets: [0, 3, 7, 10] },
  { id: "dom7", name: "Доминантсептаккорд", short: "Доминантовый 7", offsets: [0, 4, 7, 10] },
];

/* Лёгкий синтезатор на Web Audio: работает локально и не требует CDN. */
const AudioEngine = (() => {
  let context = null;
  let master = null;
  function ensure() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Браузер не поддерживает Web Audio");
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.6;
      master.connect(context.destination);
    }
    if (context.state === "suspended") context.resume();
    byId("audio-status").textContent = "Звук включён";
    return context;
  }
  function playNote(midi, delay = 0, duration = 0.62, velocity = 0.2) {
    const ctx = ensure();
    const start = Math.max(ctx.currentTime + 0.008, ctx.currentTime + delay);
    const end = start + duration;
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const envelope = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(4800, frequency * 8), start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.01, velocity), start + 0.018);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.008, velocity * 0.32), start + Math.min(0.18, duration * 0.38));
    envelope.gain.setTargetAtTime(0.0001, Math.max(start + 0.2, end - 0.12), 0.055);
    filter.connect(envelope);
    envelope.connect(master);
    const fundamental = ctx.createOscillator();
    fundamental.type = "triangle";
    fundamental.frequency.setValueAtTime(frequency, start);
    fundamental.connect(filter);
    fundamental.start(start);
    fundamental.stop(end + 0.03);
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = "sine";
    overtone.frequency.setValueAtTime(frequency * 2, start);
    overtoneGain.gain.value = 0.12;
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    overtone.start(start);
    overtone.stop(end + 0.03);
  }
  function playSequence(notes, gap = 0.48, duration = 0.42) {
    ensure();
    notes.forEach((midi, index) => playNote(midi, index * gap, duration, 0.17));
  }
  function playChord(notes) {
    ensure();
    notes.forEach((midi) => playNote(midi, 0, 1.05, 0.11));
  }
  function playClick(delay = 0, accented = false) {
    const ctx = ensure();
    const start = Math.max(ctx.currentTime + 0.008, ctx.currentTime + delay);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(accented ? 1220 : 850, start);
    gain.gain.setValueAtTime(accented ? 0.16 : 0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.08);
  }
  return { ensure, playNote, playSequence, playChord, playClick };
})();

function setFeedback(element, message, state = "") {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("correct", "incorrect");
  if (state) element.classList.add(state);
}
function renderDashboard() {
  byId("stat-total").textContent = String(progress.total);
  byId("stat-correct").textContent = String(progress.correct);
  byId("stat-lessons").textContent = String(progress.lessonsDone.length);
  byId("stat-best").textContent = String(progress.bestStreak);
  byId("top-streak").textContent = String(progress.streak);
  const accuracy = progress.total ? Math.round((progress.correct / progress.total) * 100) : 0;
  byId("stat-accuracy").textContent = progress.total ? `${accuracy}% точность ответов` : "пока без ошибок";
  const percent = Math.round((progress.lessonsDone.length / LESSONS.length) * 100);
  byId("progress-label").textContent = `${percent}%`;
  byId("course-progress-bar").style.width = `${percent}%`;
  const nextLesson = LESSONS.find((lesson) => !progress.lessonsDone.includes(lesson.id));
  if (nextLesson) {
    byId("next-step-title").innerHTML = `${escapeHTML(nextLesson.title)} <em>— твой следующий шаг.</em>`;
    byId("course-progress-copy").textContent = `${progress.lessonsDone.length} из ${LESSONS.length} уроков пройдено. Следующий — «${nextLesson.title}».`;
  } else {
    byId("next-step-title").innerHTML = "Курс пройден <em>— продолжай играть.</em>";
    byId("course-progress-copy").textContent = "Все восемь шагов позади. Возвращайся к упражнениям и выбирай, что хочется укрепить.";
  }
  renderLessonCards("home-lesson-grid", true);
  renderLessonCards("course-lesson-grid", false);
}
function recordResult(exercise, isCorrect, detail, expected = "", actual = "") {
  progress.total += 1;
  if (isCorrect) {
    progress.correct += 1;
    progress.streak += 1;
    progress.bestStreak = Math.max(progress.bestStreak, progress.streak);
  } else {
    progress.errors += 1;
    progress.streak = 0;
  }
  progress.skill[exercise] ||= { total: 0, correct: 0, errors: 0 };
  progress.skill[exercise].total += 1;
  if (isCorrect) progress.skill[exercise].correct += 1;
  else progress.skill[exercise].errors += 1;
  const entry = {
    at: new Date().toISOString(),
    exercise,
    correct: Boolean(isCorrect),
    detail: String(detail || "").slice(0, 180),
    expected: String(expected || "").slice(0, 90),
    actual: String(actual || "").slice(0, 90),
  };
  progress.history.unshift(entry);
  progress.history = progress.history.slice(0, 40);
  saveProgress();
  sendTelegramReport(entry);
}
function markLessonDone(id) {
  if (!LESSONS.some((lesson) => lesson.id === id) || progress.lessonsDone.includes(id)) return;
  progress.lessonsDone.push(id);
  saveProgress();
  openLesson(id);
}
function renderLessonCards(targetId, compact) {
  const container = byId(targetId);
  if (!container) return;
  container.innerHTML = LESSONS.map((lesson) => {
    const done = progress.lessonsDone.includes(lesson.id);
    return `<button class="module-card${done ? " done" : ""}" type="button" data-open-lesson="${lesson.id}" aria-label="Открыть урок ${escapeHTML(lesson.title)}">
      <span class="module-card-top"><span class="module-no">ШАГ ${lesson.no} ${done ? "· ПРОЙДЕН" : ""}</span><span class="module-level">${escapeHTML(lesson.level)}</span></span>
      <h3>${escapeHTML(lesson.title)}</h3><p>${escapeHTML(lesson.summary)}</p>
      <span class="module-card-foot"><span>≈ ${lesson.minutes} МИНУТ${compact ? " · ОТКРЫТЬ УРОК" : " · НАЖМИ, ЧТОБЫ ИЗУЧИТЬ"}</span><strong>${done ? "✓" : "↗"}</strong></span>
    </button>`;
  }).join("");
}
function openLesson(id) {
  const lesson = LESSONS.find((item) => item.id === id);
  if (!lesson) return;
  currentLesson = lesson;
  const done = progress.lessonsDone.includes(id);
  const points = lesson.points.map((point) => `<li>${escapeHTML(point)}</li>`).join("");
  byId("lesson-detail").innerHTML = `<div class="lesson-meta"><span class="module-no">ШАГ ${lesson.no} · ${escapeHTML(lesson.level.toUpperCase())}</span><span class="reading-time">≈ ${lesson.minutes} МИНУТ</span></div>
    <h2>${escapeHTML(lesson.title)}</h2><p class="lesson-lead">${escapeHTML(lesson.lead)}</p>
    <div class="lesson-example">${escapeHTML(lesson.example)}</div>
    <h3>Главное по шагам</h3><ul>${points}</ul>
    <div class="lesson-actions"><button class="button button-dark" type="button" data-lesson-practice="${lesson.practice}">${escapeHTML(lesson.practiceLabel)} <span>↗</span></button>
      ${done ? '<span class="lesson-complete">✓ Урок пройден</span>' : `<button class="button button-ghost" type="button" data-mark-lesson="${lesson.id}">Отметить как пройденный</button>`}</div>`;
  byId("lesson-detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function nextLesson() {
  return LESSONS.find((lesson) => !progress.lessonsDone.includes(lesson.id)) || LESSONS[LESSONS.length - 1];
}

function renderKeyboard(container) {
  if (!container) return;
  const whiteMidis = [];
  for (let midi = KEYBOARD_LOW; midi <= KEYBOARD_HIGH; midi += 1) {
    if (NATURAL_PCS.has(mod(midi))) whiteMidis.push(midi);
  }
  const whiteIndex = new Map(whiteMidis.map((midi, index) => [midi, index]));
  const keys = [];
  for (const midi of whiteMidis) {
    keys.push(`<button class="piano-key white" type="button" data-midi="${midi}" aria-label="${escapeHTML(midiToFullLabel(midi))}" title="${escapeHTML(midiToFullLabel(midi))}"><span>${midiToLabel(midi)}</span></button>`);
  }
  for (let midi = KEYBOARD_LOW; midi <= KEYBOARD_HIGH; midi += 1) {
    if (NATURAL_PCS.has(mod(midi))) continue;
    let before = midi - 1;
    while (!NATURAL_PCS.has(mod(before))) before -= 1;
    const index = whiteIndex.get(before);
    const left = ((index + 1) / whiteMidis.length) * 100 - 1.8;
    keys.push(`<button class="piano-key black" type="button" data-midi="${midi}" style="left:${left}%" aria-label="${escapeHTML(midiToFullLabel(midi))}" title="${escapeHTML(midiToFullLabel(midi))}"></button>`);
  }
  container.innerHTML = keys.join("");
}
function selectedKeyboardMidis() {
  if (activeKeyboardTask === "reading") return readingInput;
  if (activeKeyboardTask === "chords") return [...chordPicks.values()];
  if (activeKeyboardTask === "memory") return memoryInput;
  return [];
}
function refreshKeyboardHighlights() {
  const selected = new Set(selectedKeyboardMidis());
  $$(".piano-key").forEach((key) => {
    const midi = Number(key.dataset.midi);
    key.classList.toggle("selected", selected.has(midi));
    key.classList.toggle("last-note", lastMidi === midi);
  });
}
function handlePianoInput(midi) {
  if (!Number.isFinite(midi)) return;
  lastMidi = midi;
  try { AudioEngine.playNote(midi, 0, 0.62, 0.18); } catch (error) { /* браузер без Web Audio */ }
  if (activeKeyboardTask === "reading" && !readingAnswered) {
    if (readingMode === "note") readingInput = [midi];
    else if (readingInput.length < readingNotes.length) readingInput.push(midi);
    updateReadingPrompt();
    if (readingMode === "note") byId("reading-check").disabled = readingInput.length !== 1;
    if (readingMode === "phrase" && readingInput.length === readingNotes.length) gradeReading();
  } else if (activeKeyboardTask === "chords" && !chordAnswered && chordQuestion) {
    const pc = mod(midi);
    if (chordPicks.has(pc)) chordPicks.delete(pc);
    else chordPicks.set(pc, midi);
    updateChordPicked();
  } else if (activeKeyboardTask === "memory" && memoryReady && memoryInput.length < memorySequence.length) {
    memoryInput.push(midi);
    updateMemorySlots();
    if (memoryInput.length === memorySequence.length) gradeMemory();
  }
  refreshKeyboardHighlights();
}
function initialiseKeyboards() {
  $$(".piano-keys").forEach((container) => {
    renderKeyboard(container);
    container.addEventListener("click", (event) => {
      const key = event.target.closest(".piano-key");
      if (key) handlePianoInput(Number(key.dataset.midi));
    });
  });
}

function renderStaff(notes) {
  const width = notes.length === 1 ? 430 : 570;
  const height = 176;
  const xStart = notes.length === 1 ? 245 : 105;
  const gap = notes.length === 1 ? 0 : Math.min(92, (width - xStart - 38) / Math.max(1, notes.length - 1));
  const staffLeft = 48;
  const staffRight = width - 16;
  const topY = 48;
  const bottomY = 128;
  const stepY = 10;
  const e4Index = 4 * 7 + NOTE_LETTERS.indexOf("E");
  const svg = [];
  svg.push(`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Нотный стан со скрипичным ключом">`);
  svg.push(`<rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#fdfdf9"/>`);
  for (let line = 0; line < 5; line += 1) {
    const y = topY + line * 20;
    svg.push(`<line x1="${staffLeft}" y1="${y}" x2="${staffRight}" y2="${y}" stroke="#bac5b7" stroke-width="1.2"/>`);
  }
  svg.push(`<text x="7" y="113" fill="#56734f" font-family="Georgia,serif" font-size="73">𝄞</text>`);
  notes.forEach((midi, index) => {
    const note = midiToStaffSpelling(midi);
    const noteIndex = diatonicIndex(note);
    const y = bottomY - (noteIndex - e4Index) * stepY;
    const x = xStart + index * gap;
    if (y < topY) {
      for (let ledger = topY - 20; ledger >= y - 1; ledger -= 20) {
        svg.push(`<line x1="${x - 15}" y1="${ledger}" x2="${x + 15}" y2="${ledger}" stroke="#aebba9" stroke-width="1.2"/>`);
      }
    }
    if (y > bottomY) {
      for (let ledger = bottomY + 20; ledger <= y + 1; ledger += 20) {
        svg.push(`<line x1="${x - 15}" y1="${ledger}" x2="${x + 15}" y2="${ledger}" stroke="#aebba9" stroke-width="1.2"/>`);
      }
    }
    if (note.accidental) svg.push(`<text x="${x - 24}" y="${y + 6}" fill="#4c6951" font-family="Georgia,serif" font-size="23">${note.accidental}</text>`);
    svg.push(`<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.7" fill="#2d4936" transform="rotate(-18 ${x} ${y})"/>`);
    const stemDown = y < 84;
    const stemX = stemDown ? x - 7 : x + 7;
    const stemY2 = stemDown ? y + 34 : y - 34;
    svg.push(`<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemY2}" stroke="#2d4936" stroke-width="1.6"/>`);
    if (notes.length > 1 && index < notes.length - 1) {
      const next = midiToStaffSpelling(notes[index + 1]);
      const nextY = bottomY - (diatonicIndex(next) - e4Index) * stepY;
      svg.push(`<line x1="${x + 9}" y1="${y - 2}" x2="${x + gap - 9}" y2="${nextY - 2}" stroke="#9da99a" stroke-width="1" stroke-dasharray="2 5" opacity=".55"/>`);
    }
  });
  svg.push("</svg>");
  byId("reading-staff").innerHTML = svg.join("");
}
function makeReadingPhrase(count) {
  const scale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
  let index = Math.floor(Math.random() * 9);
  const result = [scale[index]];
  while (result.length < count) {
    const step = Math.floor(Math.random() * 5) - 2;
    index = clamp(index + step, 0, scale.length - 1);
    result.push(scale[index]);
  }
  if (byId("level-select").value === "advanced" && Math.random() < 0.55) {
    const position = Math.floor(Math.random() * result.length);
    const original = result[position];
    const candidate = original + (Math.random() < 0.5 ? 1 : -1);
    if (candidate >= KEYBOARD_LOW && candidate <= KEYBOARD_HIGH) result[position] = candidate;
  }
  return result;
}
function newReadingQuestion() {
  readingAnswered = false;
  readingInput = [];
  const level = byId("level-select").value;
  const count = readingMode === "note" ? 1 : level === "beginner" ? 3 : level === "intermediate" ? 4 : 5;
  readingNotes = makeReadingPhrase(count);
  renderStaff(readingNotes);
  const levelText = level === "advanced" ? "СЛУЧАЙНЫЕ ЗНАКИ" : "ДО МАЖОР";
  byId("reading-level-label").textContent = readingMode === "note"
    ? `СКРИПИЧЕСКИЙ КЛЮЧ · ${levelText}`
    : `МЕЛОДИЯ · ${count} ${count === 5 ? "НОТ" : "НОТЫ"} · ${levelText}`;
  byId("reading-check").hidden = readingMode !== "note";
  byId("reading-check").disabled = true;
  setFeedback(byId("reading-feedback"), "Посмотри на ноту и найди её на клавиатуре.");
  updateReadingPrompt();
  refreshKeyboardHighlights();
}
function updateReadingPrompt() {
  if (readingMode === "note") {
    byId("reading-prompt").textContent = readingInput.length
      ? `Выбрано: ${midiToFullLabel(readingInput[0])}. Нажми «Проверить» или выбери другую клавишу.`
      : "Выбери ноту на клавиатуре ниже.";
  } else {
    byId("reading-prompt").textContent = `Сыграй мелодию по порядку: ${readingInput.length} из ${noteCountLabel(readingNotes.length)}.`;
  }
}
function gradeReading() {
  if (readingAnswered || readingInput.length !== readingNotes.length) return;
  readingAnswered = true;
  const correct = readingNotes.every((midi, index) => midi === readingInput[index]);
  const expectedText = readingNotes.map(midiToLabel).join(" · ");
  const actualText = readingInput.map(midiToLabel).join(" · ");
  const detail = correct
    ? `Верно: ${expectedText}.`
    : `Ожидалось ${expectedText}; сыграно ${actualText}.`;
  setFeedback(byId("reading-feedback"), correct
    ? `Верно! ${readingNotes.map(midiToFullLabel).join(" → ")}.`
    : `Почти. Правильный ответ: ${readingNotes.map(midiToFullLabel).join(" → ")}.`, correct ? "correct" : "incorrect");
  byId("reading-prompt").textContent = correct ? "Отлично! Смотри на нотный стан и читай дальше." : "Ошибка — это подсказка. Посмотри, на какой линии или между какими линиями была нота.";
  byId("reading-check").disabled = true;
  recordResult(readingMode === "note" ? "Чтение нот" : "Чтение мелодии", correct, detail, expectedText, actualText);
}

function optionsFor(correct, pool, count = 4) {
  return shuffle([correct, ...shuffle(pool.filter((option) => option.id !== correct.id)).slice(0, count - 1)]);
}
function createEarQuestion() {
  earAnswered = false;
  const mode = byId("ear-mode").value;
  const level = byId("level-select").value;
  const options = [];
  if (mode === "interval") {
    const allowed = level === "beginner" ? INTERVALS.filter((item) => [3, 4, 7].includes(item.semitones))
      : level === "intermediate" ? INTERVALS.filter((item) => [2, 3, 4, 5, 7, 8, 9, 12].includes(item.semitones)) : INTERVALS;
    const correct = randomItem(allowed);
    earQuestion = { mode, root: 60 + Math.floor(Math.random() * 9), correct, choices: optionsFor(correct, allowed) };
    byId("ear-category").textContent = "ИНТЕРВАЛ · 2 НОТЫ";
    byId("ear-prompt").textContent = "Какое расстояние между двумя звуками?";
    options.push(...earQuestion.choices.map((item) => ({ id: item.id, label: item.name })));
  } else if (mode === "chord") {
    const allowed = level === "beginner" ? CHORD_TYPES.slice(0, 2)
      : level === "intermediate" ? CHORD_TYPES.slice(0, 4) : CHORD_TYPES;
    const correct = randomItem(allowed);
    earQuestion = { mode, root: 60 + Math.floor(Math.random() * 8), correct, choices: optionsFor(correct, allowed) };
    byId("ear-category").textContent = "АККОРД · НОТЫ ВМЕСТЕ";
    byId("ear-prompt").textContent = "Какая окраска у этого аккорда?";
    options.push(...earQuestion.choices.map((item) => ({ id: item.id, label: item.short })));
  } else {
    const pitchPool = level === "beginner" ? [0, 2, 4, 5, 7, 9, 11] : Array.from({ length: 12 }, (_, pc) => pc);
    const correctPc = randomItem(pitchPool);
    const correct = { id: String(correctPc), label: PC_NAMES[correctPc] };
    const pool = pitchPool.map((pc) => ({ id: String(pc), label: PC_NAMES[pc] }));
    const choices = optionsFor(correct, pool);
    earQuestion = { mode, midi: 60 + correctPc, correct, choices };
    byId("ear-category").textContent = "ВЫСОТА · ОДНА НОТА";
    byId("ear-prompt").textContent = "Какую ноту ты услышала? Выбери её название.";
    options.push(...choices.map((item) => ({ id: item.id, label: `${item.label} · ${PC_RU[Number(item.id)]}` })));
  }
  byId("ear-options").innerHTML = options.map((option) => `<button class="answer-option" type="button" data-ear-choice="${escapeHTML(option.id)}">${escapeHTML(option.label)}</button>`).join("");
  byId("ear-options").classList.toggle("few-options", options.length < 4);
  setFeedback(byId("ear-feedback"), "Совет: напой услышанное, прежде чем выбирать.");
}
function playEarQuestion() {
  if (!earQuestion) return;
  try {
    if (earQuestion.mode === "interval") AudioEngine.playSequence([earQuestion.root, earQuestion.root + earQuestion.correct.semitones], 0.58, 0.48);
    else if (earQuestion.mode === "chord") AudioEngine.playChord(earQuestion.correct.offsets.map((offset) => earQuestion.root + offset));
    else AudioEngine.playNote(earQuestion.midi, 0, 0.9, 0.2);
  } catch (error) {
    setFeedback(byId("ear-feedback"), "В этом браузере звук недоступен. Попробуй открыть сайт в актуальном Chrome, Edge, Firefox или Safari.", "incorrect");
  }
}
function chooseEarAnswer(button) {
  if (earAnswered || !earQuestion) return;
  earAnswered = true;
  const answerId = button.dataset.earChoice;
  const correct = answerId === earQuestion.correct.id;
  $$("[data-ear-choice]").forEach((option) => {
    option.disabled = true;
    if (option.dataset.earChoice === earQuestion.correct.id) option.classList.add("correct");
    else if (option === button) option.classList.add("incorrect");
  });
  const expected = earQuestion.mode === "interval" ? earQuestion.correct.name
    : earQuestion.mode === "chord" ? earQuestion.correct.name
      : `${PC_NAMES[Number(earQuestion.correct.id)]} (${PC_RU[Number(earQuestion.correct.id)]})`;
  const actual = button.textContent.trim();
  setFeedback(byId("ear-feedback"), correct ? `Точно! Это ${expected.toLowerCase()}.` : `Здесь был ответ: ${expected.toLowerCase()}. Послушай пример ещё раз.`, correct ? "correct" : "incorrect");
  recordResult(earQuestion.mode === "interval" ? "Слух: интервалы" : earQuestion.mode === "chord" ? "Слух: аккорды" : "Слух: высота нот", correct,
    correct ? `Верно: ${expected}.` : `Ожидалось: ${expected}; выбран ответ: ${actual}.`, expected, actual);
}

function createChordQuestion() {
  const level = byId("level-select").value;
  const pool = level === "beginner" ? CHORD_TYPES.slice(0, 2)
    : level === "intermediate" ? CHORD_TYPES.slice(0, 4) : CHORD_TYPES;
  const type = randomItem(pool);
  const rootPool = level === "beginner" ? [0, 2, 4, 5, 7, 9] : Array.from({ length: 12 }, (_, pc) => pc);
  const root = randomItem(rootPool);
  chordQuestion = { root, type, pcs: type.offsets.map((offset) => mod(root + offset)) };
  chordPicks = new Map();
  chordAnswered = false;
  byId("chord-target").textContent = `Собери: ${pcToLabel(root)} · ${type.name.toLowerCase()}`;
  byId("chord-hint").textContent = type.offsets.length === 3
    ? "Трезвучие состоит из первой, третьей и пятой ступеней. Порядок нот не важен."
    : "Септаккорд состоит из четырёх разных ступеней. Порядок нот не важен.";
  setFeedback(byId("chord-feedback"), "Прослушай пример или попробуй собрать аккорд сама.");
  byId("chord-check").disabled = false;
  updateChordPicked();
  refreshKeyboardHighlights();
}
function updateChordPicked() {
  const selected = [...chordPicks.keys()].sort((a, b) => a - b);
  byId("chord-picked").textContent = selected.length ? selected.map(pcToLabel).join(" · ") : "пока ничего";
}
function gradeChord() {
  if (chordAnswered || !chordQuestion) return;
  chordAnswered = true;
  const selected = [...chordPicks.keys()].sort((a, b) => a - b);
  const expected = [...chordQuestion.pcs].sort((a, b) => a - b);
  const correct = selected.length === expected.length && expected.every((pc, index) => selected[index] === pc);
  const expectedText = expected.map((pc) => PC_NAMES[pc]).join("–");
  const actualText = selected.length ? selected.map((pc) => PC_NAMES[pc]).join("–") : "ничего";
  setFeedback(byId("chord-feedback"), correct
    ? `Собрано! ${expected.map(pcToLabel).join(" · ")}.`
    : `Пока не совпало. В этом аккорде: ${expected.map(pcToLabel).join(" · ")}.`, correct ? "correct" : "incorrect");
  byId("chord-check").disabled = true;
  recordResult("Построение аккордов", correct,
    correct ? `Верно собран аккорд ${chordQuestion.type.name}: ${expectedText}.` : `Ожидалось ${chordQuestion.type.name}: ${expectedText}; выбрано: ${actualText}.`, expectedText, actualText);
}

const RHYTHMS = [
  { name: "Четверти", hits: [0, 2, 4, 6] },
  { name: "Восьмые ноты", hits: [0, 1, 2, 3, 4, 5, 6, 7] },
  { name: "Четверти и паузы", hits: [0, 2, 5, 6] },
  { name: "Ритм с синкопой", hits: [0, 3, 4, 7] },
  { name: "Разный шаг", hits: [0, 1, 4, 6, 7] },
];
function newRhythmQuestion() {
  if (rhythmRun) stopRhythmRun();
  const level = byId("level-select").value;
  const rhythmPool = level === "beginner" ? RHYTHMS.slice(0, 3)
    : level === "intermediate" ? RHYTHMS.slice(0, 4) : RHYTHMS;
  rhythmQuestion = randomItem(rhythmPool);
  byId("rhythm-pattern-label").textContent = `4/4 · ${rhythmQuestion.name.toUpperCase()}`;
  byId("rhythm-count").textContent = "Готова?";
  byId("rhythm-tap").disabled = true;
  renderRhythmGrid(false, new Set(), new Set());
  setFeedback(byId("rhythm-feedback"), "Сначала послушай. Потом повтори рисунок в такт метронома.");
}
function renderRhythmGrid(showTarget = false, heard = new Set(), tapMarks = new Set()) {
  byId("rhythm-grid").innerHTML = Array.from({ length: 8 }, (_, index) => {
    const label = index % 2 === 0 ? String(index / 2 + 1) : "&";
    const target = showTarget || Boolean(rhythmQuestion && rhythmQuestion.hits.includes(index));
    return `<div class="rhythm-cell${target && showTarget ? " active-target" : ""}${heard.has(index) ? " heard" : ""}${tapMarks.has(index) ? " tap-hit" : ""}" data-rhythm-step="${index}"><span class="rhythm-dot"></span><strong>${label}</strong></div>`;
  }).join("");
}
function showHeardStep(step) {
  if (!rhythmRun) return;
  const heard = new Set(rhythmRun.heard || []);
  heard.add(step);
  rhythmRun.heard = [...heard];
  renderRhythmGrid(rhythmRun.showTargets, new Set(rhythmRun.heard), new Set(rhythmRun.tapMarks || []));
  setTimeout(() => {
    if (!rhythmRun) return;
    renderRhythmGrid(rhythmRun.showTargets, new Set(), new Set(rhythmRun.tapMarks || []));
  }, 180);
}
function playRhythmPreview() {
  if (!rhythmQuestion) newRhythmQuestion();
  const bpm = Number(byId("rhythm-tempo").value);
  const beatMs = 60000 / bpm;
  const now = performance.now();
  const first = now + 220;
  try {
    for (let beat = 0; beat < 4; beat += 1) AudioEngine.playClick((first + beat * beatMs - now) / 1000, beat === 0);
    rhythmQuestion.hits.forEach((step) => AudioEngine.playClick((first + 4 * beatMs + step * beatMs / 2 - now) / 1000, step === 0));
  } catch (error) {
    setFeedback(byId("rhythm-feedback"), "В этом браузере звук недоступен. Попробуй открыть сайт в актуальном браузере.", "incorrect");
    return;
  }
  setFeedback(byId("rhythm-feedback"), "Слушай рисунок после четырёх спокойных долей метронома.");
  const heard = new Set();
  rhythmQuestion.hits.forEach((step) => {
    setTimeout(() => {
      if (rhythmRun) return;
      heard.add(step);
      renderRhythmGrid(false, new Set(heard), new Set());
    }, Math.max(0, first + 4 * beatMs + step * beatMs / 2 - performance.now()));
    setTimeout(() => {
      if (!rhythmRun) renderRhythmGrid(false, new Set(), new Set());
    }, Math.max(0, first + 4 * beatMs + step * beatMs / 2 - performance.now()) + 180);
  });
}
function startRhythmRun() {
  if (!rhythmQuestion || rhythmRun) return;
  const bpm = Number(byId("rhythm-tempo").value);
  const beatMs = 60000 / bpm;
  const now = performance.now();
  const firstCount = now + 650;
  const echoStart = firstCount + beatMs * 4;
  const endAt = echoStart + beatMs * 4;
  rhythmRun = {
    beatMs,
    echoStart,
    endAt,
    taps: [],
    active: false,
    timers: [],
    heard: [],
    tapMarks: [],
    showTargets: false,
  };
  byId("rhythm-start").disabled = true;
  byId("rhythm-listen").disabled = true;
  byId("rhythm-tap").disabled = true;
  byId("rhythm-count").textContent = "Слушай отсчёт…";
  setFeedback(byId("rhythm-feedback"), "Четыре доли отсчёта — потом твой такт. Повтори услышанный рисунок.");
  for (let beat = 0; beat < 8; beat += 1) {
    const at = beat < 4 ? firstCount + beat * beatMs : echoStart + (beat - 4) * beatMs;
    const delay = Math.max(0, at - performance.now()) / 1000;
    try { AudioEngine.playClick(delay, beat % 4 === 0); } catch (error) { /* no audio */ }
  }
  const beginTimer = setTimeout(() => {
    if (!rhythmRun) return;
    rhythmRun.active = true;
    byId("rhythm-tap").disabled = false;
    byId("rhythm-count").textContent = "Твой ход!";
  }, Math.max(0, echoStart - performance.now()));
  const finishTimer = setTimeout(finishRhythmRun, Math.max(0, endAt + 380 - performance.now()));
  rhythmRun.timers.push(beginTimer, finishTimer);
}
function registerRhythmTap() {
  if (!rhythmRun || !rhythmRun.active) return;
  const now = performance.now();
  if (now < rhythmRun.echoStart - 80 || now > rhythmRun.endAt + 180) return;
  rhythmRun.taps.push(now);
  const step = clamp(Math.round((now - rhythmRun.echoStart) / (rhythmRun.beatMs / 2)), 0, 7);
  rhythmRun.tapMarks.push(step);
  byId("rhythm-count").textContent = `${rhythmRun.taps.length} ${rhythmRun.taps.length === 1 ? "удар" : "удара"}`;
  renderRhythmGrid(false, new Set(), new Set(rhythmRun.tapMarks));
  try { AudioEngine.playClick(0, false); } catch (error) { /* no audio */ }
}
function finishRhythmRun() {
  if (!rhythmRun) return;
  const run = rhythmRun;
  run.active = false;
  const expectedTimes = rhythmQuestion.hits.map((step) => run.echoStart + step * run.beatMs / 2);
  const tolerance = Math.min(250, run.beatMs * 0.29);
  const assigned = new Set();
  const offsets = [];
  expectedTimes.forEach((target) => {
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    run.taps.forEach((tap, index) => {
      if (assigned.has(index)) return;
      const distance = Math.abs(tap - target);
      if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
    });
    if (nearestIndex >= 0 && nearestDistance <= tolerance) {
      assigned.add(nearestIndex);
      offsets.push(nearestDistance);
    }
  });
  const hits = offsets.length;
  const extras = run.taps.length - assigned.size;
  const accuracy = hits / Math.max(expectedTimes.length, run.taps.length, 1);
  const correct = accuracy >= 0.75 && extras <= 1;
  const average = offsets.length ? Math.round(offsets.reduce((sum, value) => sum + value, 0) / offsets.length) : 0;
  const tapMarks = new Set(run.tapMarks || []);
  rhythmRun.showTargets = true;
  rhythmRun = null;
  renderRhythmGrid(true, new Set(), tapMarks);
  byId("rhythm-count").textContent = `${hits} / ${expectedTimes.length} попаданий`;
  byId("rhythm-start").disabled = false;
  byId("rhythm-listen").disabled = false;
  byId("rhythm-tap").disabled = true;
  const expected = `попади в ${expectedTimes.length} ударов рисунка «${rhythmQuestion.name}»`;
  const actual = `${run.taps.length} нажатий; попало ${hits}; лишних ${extras}`;
  const message = `${hits} из ${expectedTimes.length} ударов в ритме; ${extras} лишних тапов; среднее отклонение ${average} мс.`;
  setFeedback(byId("rhythm-feedback"), correct ? `Хорошо держишь пульс! ${message}` : `Попробуй ещё раз: ${message}`, correct ? "correct" : "incorrect");
  recordResult("Ритм", correct, message, expected, actual);
}
function stopRhythmRun() {
  if (!rhythmRun) return;
  rhythmRun.timers.forEach(clearTimeout);
  rhythmRun = null;
  byId("rhythm-start").disabled = false;
  byId("rhythm-listen").disabled = false;
  byId("rhythm-tap").disabled = true;
  byId("rhythm-count").textContent = "Готова?";
}

function newMemorySequence() {
  if (memoryPlaybackTimer) clearTimeout(memoryPlaybackTimer);
  memoryPlaybackTimer = null;
  const level = byId("level-select").value;
  const length = level === "beginner" ? 3 : level === "intermediate" ? 4 : 5;
  const range = level === "beginner" ? 8 : 13;
  memorySequence = Array.from({ length }, () => 60 + Math.floor(Math.random() * range));
  memoryInput = [];
  memoryReady = false;
  byId("memory-level").textContent = `${length} ${length === 5 ? "НОТ" : "НОТЫ"}`;
  byId("memory-prompt").textContent = "Нажми «Послушать последовательность», чтобы начать.";
  setFeedback(byId("memory-feedback"), "Все ноты прозвучат по очереди.");
  updateMemorySlots();
  refreshKeyboardHighlights();
}
function playMemorySequence() {
  if (!memorySequence.length) newMemorySequence();
  if (memoryPlaybackTimer) clearTimeout(memoryPlaybackTimer);
  memoryPlaybackTimer = null;
  memoryInput = [];
  memoryReady = false;
  updateMemorySlots();
  try { AudioEngine.playSequence(memorySequence, 0.52, 0.42); }
  catch (error) { setFeedback(byId("memory-feedback"), "В этом браузере звук недоступен.", "incorrect"); return; }
  byId("memory-prompt").textContent = "Слушай внимательно. Сейчас последовательность закончится…";
  const wait = (memorySequence.length - 1) * 520 + 520;
  memoryPlaybackTimer = setTimeout(() => {
    memoryPlaybackTimer = null;
    if (activeKeyboardTask !== "memory") return;
    memoryReady = true;
    byId("memory-prompt").textContent = `Теперь повтори ${noteCountLabel(memorySequence.length)} на клавиатуре.`;
    setFeedback(byId("memory-feedback"), "Начинай, когда будешь готова.");
  }, wait);
}
function updateMemorySlots() {
  byId("memory-slots").innerHTML = memorySequence.map((_, index) => `<span class="memory-slot${memoryInput[index] !== undefined ? " filled" : ""}">${memoryInput[index] !== undefined ? escapeHTML(PC_NAMES[mod(memoryInput[index])]) : "·"}</span>`).join("");
}
function gradeMemory() {
  if (memoryInput.length !== memorySequence.length) return;
  memoryReady = false;
  const correct = memoryInput.every((midi, index) => midi === memorySequence[index]);
  const expected = memorySequence.map(midiToLabel).join(" · ");
  const actual = memoryInput.map(midiToLabel).join(" · ");
  const detail = correct ? `Верно повторено: ${expected}.` : `Ожидалось ${expected}; сыграно ${actual}.`;
  setFeedback(byId("memory-feedback"), correct
    ? `Получилось! ${memorySequence.map(midiToFullLabel).join(" → ")}.`
    : `Почти. Послушай снова: ${memorySequence.map(midiToFullLabel).join(" → ")}.`, correct ? "correct" : "incorrect");
  byId("memory-prompt").textContent = correct ? "Ты точно сохранила мелодию в памяти." : "Сравни движение мелодии и попробуй ещё раз.";
  recordResult("Музыкальная память", correct, detail, expected, actual);
}
function restartMemoryAnswer() {
  memoryInput = [];
  memoryReady = true;
  updateMemorySlots();
  setFeedback(byId("memory-feedback"), "Начни повтор ещё раз — последовательность та же.");
  byId("memory-prompt").textContent = `Повтори ${noteCountLabel(memorySequence.length)} на клавиатуре.`;
  refreshKeyboardHighlights();
}

function recordExerciseResult(entry) {
  return {
    exercise: entry.exercise,
    result: entry.correct ? "correct" : "incorrect",
    detail: entry.detail,
    expected: entry.expected,
    actual: entry.actual,
  };
}
async function sendTelegramReport(entry) {
  if (!telegramEnabled || !appServerStatus?.notificationsReady || !telegramAuthenticated) return;
  try {
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recordExerciseResult(entry)),
      credentials: "same-origin",
    });
    if (response.status === 401) {
      telegramAuthenticated = false;
      appServerStatus.authenticated = false;
      updateTelegramUI();
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) setTelegramStatus("Слишком много сообщений за короткое время. Попробуй чуть позже.", "error");
      else if (data.error) setTelegramStatus(data.error, "error");
    }
  } catch (error) {
    /* Практика не должна ломаться, если сервер уведомлений временно недоступен. */
  }
}
function setTelegramStatus(message, state = "") {
  const status = byId("telegram-status");
  status.textContent = message;
  status.classList.remove("error", "success");
  if (state) status.classList.add(state);
}
function updateTelegramUI() {
  const loginForm = byId("telegram-login-form");
  const toggleRow = byId("telegram-toggle-row");
  const toggle = byId("telegram-enabled");
  telegramAuthenticated = Boolean(appServerStatus?.authenticated);
  if (!appServerStatus) {
    setTelegramStatus("Сервер не обнаружен. Практика работает локально, но для сообщений нужен Node.js-сервер с Telegram-настройками.");
    loginForm.hidden = true;
    toggleRow.hidden = true;
    return;
  }
  if (!appServerStatus.telegramConfigured) {
    setTelegramStatus("Сервер работает, но бот ещё не подключён. Добавь новый токен и chat ID в локальный файл piano/.env.");
    loginForm.hidden = true;
    toggleRow.hidden = true;
    return;
  }
  if (!appServerStatus.passwordConfigured) {
    setTelegramStatus("Для безопасности добавь в .env APP_PASSWORD длиной не менее 12 символов. Без пароля отправка отключена.", "error");
    loginForm.hidden = true;
    toggleRow.hidden = true;
    return;
  }
  if (!telegramAuthenticated) {
    setTelegramStatus("Бот подключён. Войди с личным паролем сервера, чтобы включить отчёты.", "success");
    loginForm.hidden = false;
    toggleRow.hidden = true;
    return;
  }
  setTelegramStatus("Личный бот подключён. Включи переключатель, когда захочешь получать отчёты.", "success");
  loginForm.hidden = true;
  toggleRow.hidden = false;
  toggle.checked = telegramEnabled;
}
async function refreshTelegramStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Сервер не ответил");
    appServerStatus = await response.json();
  } catch (error) {
    appServerStatus = null;
  }
  updateTelegramUI();
}
function openTelegramDialog() {
  const dialog = byId("telegram-dialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  refreshTelegramStatus();
}
async function loginTelegram() {
  const password = byId("telegram-password").value;
  if (!password) {
    setTelegramStatus("Введи пароль из локальных настроек сервера.", "error");
    return;
  }
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "same-origin",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setTelegramStatus(data.error || "Не удалось войти. Проверь пароль и попробуй снова.", "error");
      return;
    }
    byId("telegram-password").value = "";
    appServerStatus = { ...appServerStatus, authenticated: true };
    updateTelegramUI();
  } catch (error) {
    setTelegramStatus("Сервер недоступен. Проверь, что Node.js-приложение запущено.", "error");
  }
}

function showView(requested = null) {
  const requestedName = requested || location.hash.slice(1);
  const name = VIEW_META[requestedName] ? requestedName : "home";
  const meta = VIEW_META[name];
  $$(".view").forEach((view) => { view.hidden = view.id !== `view-${name}`; });
  $$('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === name;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  byId("breadcrumb").textContent = meta.label;
  byId("intro-eyebrow").textContent = meta.eyebrow;
  byId("intro-title").innerHTML = `${escapeHTML(meta.line1)}<br /><em>${escapeHTML(meta.line2)}</em>`;
  byId("intro-text").textContent = meta.text;
  byId("intro-number").textContent = String(Object.keys(VIEW_META).indexOf(name) + 1).padStart(2, "0");
  document.title = `${meta.label} — Ладно: фортепиано`;
  activeKeyboardTask = name === "reading" ? "reading" : name === "chords" ? "chords" : name === "memory" ? "memory" : null;
  if (name !== "memory" && memoryPlaybackTimer) {
    clearTimeout(memoryPlaybackTimer);
    memoryPlaybackTimer = null;
    memoryReady = false;
  }
  if (name !== "rhythm" && rhythmRun) stopRhythmRun();
  refreshKeyboardHighlights();
  if (name === "reading" && !readingNotes.length) newReadingQuestion();
  if (name === "ear" && !earQuestion) createEarQuestion();
  if (name === "chords" && !chordQuestion) createChordQuestion();
  if (name === "rhythm" && !rhythmQuestion) newRhythmQuestion();
  if (name === "memory" && !memorySequence.length) newMemorySequence();
}
function bindNavigation() {
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const name = link.getAttribute("href").slice(1);
      if (!VIEW_META[name]) return;
      event.preventDefault();
      try { if (location.hash !== `#${name}`) history.pushState(null, "", `#${name}`); }
      catch (error) { /* preview iframe may not expose browser history */ }
      showView(name);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  const restore = () => { showView(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  window.addEventListener("hashchange", restore);
  window.addEventListener("popstate", restore);
}

function bindEvents() {
  bindNavigation();
  $$("[data-reading-mode]").forEach((button) => button.addEventListener("click", () => {
    readingMode = button.dataset.readingMode;
    $$("[data-reading-mode]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    newReadingQuestion();
  }));
  byId("reading-new").addEventListener("click", newReadingQuestion);
  byId("reading-clear").addEventListener("click", () => {
    readingInput = [];
    readingAnswered = false;
    byId("reading-check").disabled = true;
    setFeedback(byId("reading-feedback"), "Ответ очищен. Посмотри на нотный стан ещё раз.");
    updateReadingPrompt();
    refreshKeyboardHighlights();
  });
  byId("reading-check").addEventListener("click", gradeReading);
  byId("ear-mode").addEventListener("change", createEarQuestion);
  byId("ear-play").addEventListener("click", playEarQuestion);
  byId("ear-next").addEventListener("click", createEarQuestion);
  byId("ear-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-ear-choice]");
    if (button) chooseEarAnswer(button);
  });
  byId("chord-next").addEventListener("click", createChordQuestion);
  byId("chord-play").addEventListener("click", () => {
    if (!chordQuestion) return;
    try { AudioEngine.playChord(chordQuestion.type.offsets.map((offset) => 60 + chordQuestion.root + offset)); }
    catch (error) { setFeedback(byId("chord-feedback"), "В этом браузере звук недоступен.", "incorrect"); }
  });
  byId("chord-check").addEventListener("click", gradeChord);
  byId("chord-clear").addEventListener("click", () => {
    chordPicks = new Map();
    chordAnswered = false;
    byId("chord-check").disabled = false;
    updateChordPicked();
    setFeedback(byId("chord-feedback"), "Выбор очищен. Собери аккорд заново.");
    refreshKeyboardHighlights();
  });
  byId("rhythm-listen").addEventListener("click", playRhythmPreview);
  byId("rhythm-new").addEventListener("click", newRhythmQuestion);
  byId("rhythm-start").addEventListener("click", startRhythmRun);
  byId("rhythm-tap").addEventListener("click", registerRhythmTap);
  byId("rhythm-tempo").addEventListener("change", () => {
    if (rhythmRun) stopRhythmRun();
  });
  byId("memory-play").addEventListener("click", playMemorySequence);
  byId("memory-new").addEventListener("click", newMemorySequence);
  byId("memory-clear").addEventListener("click", restartMemoryAnswer);
  byId("continue-course").addEventListener("click", () => {
    const lesson = nextLesson();
    try { history.pushState(null, "", "#course"); } catch (error) { /* no-op */ }
    showView("course");
    openLesson(lesson.id);
  });
  byId("open-telegram-settings").addEventListener("click", openTelegramDialog);
  byId("home-telegram-link").addEventListener("click", openTelegramDialog);
  byId("telegram-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    loginTelegram();
  });
  byId("telegram-enabled").addEventListener("change", (event) => {
    telegramEnabled = event.target.checked;
    try { localStorage.setItem(NOTIFICATION_KEY, String(telegramEnabled)); } catch (error) { /* preference is optional */ }
    setTelegramStatus(telegramEnabled ? "Отчёты включены. После проверки каждого упражнения придёт сообщение." : "Отчёты выключены. Прогресс по-прежнему хранится только в браузере.", "success");
  });
  byId("level-select").addEventListener("change", (event) => {
    try { localStorage.setItem("ladno-piano-level-v1", event.target.value); } catch (error) { /* optional */ }
    newReadingQuestion();
    createEarQuestion();
    createChordQuestion();
    newRhythmQuestion();
    newMemorySequence();
  });
  document.addEventListener("click", (event) => {
    const lessonButton = event.target.closest("[data-open-lesson]");
    if (lessonButton) {
      const id = lessonButton.dataset.openLesson;
      if (lessonButton.closest("#home-lesson-grid")) {
        try { history.pushState(null, "", "#course"); } catch (error) { /* no-op */ }
        showView("course");
      }
      openLesson(id);
      return;
    }
    const completeButton = event.target.closest("[data-mark-lesson]");
    if (completeButton) {
      markLessonDone(completeButton.dataset.markLesson);
      return;
    }
    const practiceButton = event.target.closest("[data-lesson-practice]");
    if (practiceButton) {
      const view = practiceButton.dataset.lessonPractice;
      try { history.pushState(null, "", `#${view}`); } catch (error) { /* no-op */ }
      showView(view);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  byId("reset-progress").addEventListener("click", () => {
    if (!window.confirm("Сбросить все сохранённые ответы, серии и отметки об уроках на этом устройстве?")) return;
    progress = EMPTY_PROGRESS();
    saveProgress();
    if (currentLesson) openLesson(currentLesson.id);
  });
  document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !event.repeat && !event.target.closest("input, select, textarea, button")) {
      if (rhythmRun) {
        event.preventDefault();
        registerRhythmTap();
      }
      return;
    }
    const key = event.key.toLowerCase();
    const computerKeys = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";"];
    if (computerKeys.includes(key) && !event.target.closest("input, select, textarea")) {
      const index = computerKeys.indexOf(key);
      const midi = KEYBOARD_LOW + index;
      if (midi <= KEYBOARD_HIGH) {
        event.preventDefault();
        handlePianoInput(midi);
      }
    }
  });
}
function initialiseMIDI() {
  if (!navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess().then((access) => {
    midiAccess = access;
    const attachInputs = () => {
      midiAccess.inputs.forEach((input) => {
        input.onmidimessage = (event) => {
          const [status, note, velocity] = event.data;
          const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
          if (isNoteOn) handlePianoInput(note);
        };
      });
    };
    attachInputs();
    midiAccess.onstatechange = attachInputs;
    byId("audio-status").textContent = midiAccess.inputs.size ? "MIDI-клавиатура подключена" : "Звук готов";
  }).catch(() => { /* MIDI permissions are optional */ });
}
function initialise() {
  loadProgress();
  try { telegramEnabled = localStorage.getItem(NOTIFICATION_KEY) === "true"; } catch (error) { telegramEnabled = false; }
  try {
    const level = localStorage.getItem("ladno-piano-level-v1");
    if (["beginner", "intermediate", "advanced"].includes(level)) byId("level-select").value = level;
  } catch (error) { /* optional */ }
  initialiseKeyboards();
  bindEvents();
  newReadingQuestion();
  createEarQuestion();
  createChordQuestion();
  newRhythmQuestion();
  newMemorySequence();
  renderDashboard();
  if (!storageAvailable) byId("storage-status").textContent = "Хранилище недоступно — прогресс сохранится до закрытия страницы";
  showView();
  refreshTelegramStatus();
  initialiseMIDI();
}
initialise();
