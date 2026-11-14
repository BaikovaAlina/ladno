/*
 * UI: состояние приложения.
 *
 * Здесь хранится:
 *  - единственный объект прогресса (localStorage ladno.progress.v2);
 *  - маршрут (какой раздел открыт) — обычный hash, работает без сервера;
 *  - тема, тембр, уведомления и общая плашка серии.
 *
 * Подписка простая: subscribe(listener) вызывается после каждого изменения.
 */
import {
  accuracy, courseProgress, emptyProgress, clearProgress, loadProgress, markVisited,
  recordAnswer, recordChordAnswer, recordIntervalAnswer, saveProgress, shareText, statsFor,
} from "../core/storage.js";
import { setInstrument } from "../core/audio.js";
import { $$, byId } from "./dom.js";

/* ------------------------------------------------------------------ */
/*  Описание разделов курса                                           */
/* ------------------------------------------------------------------ */

export const SECTIONS = [
  {
    id: "notes", no: "01", group: "ОСНОВЫ", label: "Ноты и октавы",
    eyebrow: "01 / САМОЕ НАЧАЛО",
    title1: "Музыка начинается", title2: "с одной ноты.",
    text: "Разберёмся в нотах, найдём их на грифе и услышим, как они звучат. Всё по порядку, без сложных слов.",
    chips: ["12 звуков", "октавы", "гриф"],
  },
  {
    id: "intervals", no: "02", group: "ОСНОВЫ", label: "Интервалы",
    eyebrow: "02 / МЕЖДУ НОТАМИ",
    title1: "Расстояние, которое", title2: "можно услышать.",
    text: "Две ноты — уже интервал. Научимся измерять его в полутонах и узнавать на слух.",
    chips: ["12 интервалов", "обращения", "составные"],
  },
  {
    id: "triads", no: "03", group: "ОСНОВЫ", label: "Трезвучия",
    eyebrow: "03 / ПЕРВЫЕ АККОРДЫ",
    title1: "Три ноты.", title2: "Много чувств.",
    text: "Построим трезвучия по терциям, найдём обращения и соберём первые аккорды на грифе.",
    chips: ["4 типа", "обращения", "аппликатуры"],
  },
  {
    id: "sevenths", no: "04", group: "ОСНОВЫ", label: "Септаккорды",
    eyebrow: "04 / НОВАЯ КРАСКА",
    title1: "Добавь ноту —", title2: "измени настроение.",
    text: "От мягкого maj7 до напряжённого G7, который хочет вернуться домой. Все обращения — на грифе.",
    chips: ["6 типов", "все обращения", "4-я и 5-я струны"],
  },
  {
    id: "scales", no: "05", group: "ГАРМОНИЯ", label: "Гаммы и лады",
    eyebrow: "05 / КАРТА ЗВУКОВ",
    title1: "Найди свой", title2: "музыкальный цвет.",
    text: "Мажор, все виды минора, гармонический мажор и семь ладов. Для каждой гаммы — три позиции на грифе.",
    chips: ["16 гамм", "3 позиции", "нотный стан"],
  },
  {
    id: "keys", no: "06", group: "ГАРМОНИЯ", label: "Квинтовый круг",
    eyebrow: "06 / ВСЁ СВЯЗАНО",
    title1: "У тональностей", title2: "тоже есть соседи.",
    text: "Ключевые знаки, аккорды тональности с функциями и готовые пути модуляции.",
    chips: ["15 тональностей", "I–vii°", "модуляции"],
  },
  {
    id: "harmony", no: "07", group: "ГАРМОНИЯ", label: "Гармония",
    eyebrow: "07 / АККОРДЫ ВМЕСТЕ",
    title1: "Пусть аккорды", title2: "расскажут историю.",
    text: "Девять прогрессий с подсказками по мелодии: от трёх аккордов до джазовой каденции и блюза.",
    chips: ["9 прогрессий", "мелодические ходы", "12 тактов"],
  },
  {
    id: "composition", no: "08", group: "ГАРМОНИЯ", label: "Композиция",
    eyebrow: "08 / ВРЕМЯ СОЗДАВАТЬ",
    title1: "Из нескольких нот", title2: "рождается музыка.",
    text: "Собери мотив, выбери ритм, сохрани его в браузере и скачай как JSON — чтобы вернуться.",
    chips: ["16 долей", "ритм", "экспорт JSON"],
  },
  {
    id: "pentatonic", no: "09", group: "ГЛУБЖЕ", label: "Пентатоника",
    eyebrow: "09 / ПЯТЬ НОТ",
    title1: "Пять нот,", title2: "которые всегда звучат.",
    text: "Минорная и мажорная пентатоника, пять боксов на грифе, легато и бенды — и три упражнения.",
    chips: ["5 боксов", "2 типа", "3 упражнения"],
  },
  {
    id: "blues", no: "10", group: "ГЛУБЖЕ", label: "Блюзовые гаммы",
    eyebrow: "10 / БЛЮЗОВЫЙ ЗВУК",
    title1: "Одна нота", title2: "делает блюз.",
    text: "Блюзовая нота ♭5, мажорная и минорная блюзовая гамма, 12 тактов в A и E и три упражнения.",
    chips: ["♭5", "12 тактов", "3 упражнения"],
  },
  {
    id: "ear-intervals", no: "11", group: "ТРЕНИРОВКА", label: "Слух: интервалы",
    eyebrow: "11 / ТРЕНАЖЁР СЛУХА",
    title1: "Узнавай интервалы", title2: "с закрытыми глазами.",
    text: "Все 12 интервалов в четырёх режимах, настройки диапазона, темпа и тембра. Статистика по каждому интервалу.",
    chips: ["12 интервалов", "4 режима", "статистика"],
  },
  {
    id: "ear-chords", no: "12", group: "ТРЕНИРОВКА", label: "Слух: аккорды",
    eyebrow: "12 / ТРЕНАЖЁР АККОРДОВ",
    title1: "Мажор или минор?", title2: "Теперь — на слух.",
    text: "Восемь типов аккордов, последовательное и одновременное звучание, расшифровка прозвучавших нот.",
    chips: ["8 типов", "2 режима", "расшифровка"],
  },
  {
    id: "rhythm", no: "13", group: "ТРЕНИРОВКА", label: "Ритм и грув",
    eyebrow: "13 / РИТМ",
    title1: "Ритм — это", title2: "тоже мелодия.",
    text: "Длительности, размеры 4/4, 3/4 и 6/8, метроном, синтезированные ударные и «Хлопни ритм».",
    chips: ["метроном", "ударные", "хлопни ритм"],
  },
  {
    id: "notation", no: "14", group: "ТРЕНИРОВКА", label: "Чтение с листа",
    eyebrow: "14 / НОТНАЯ ЗАПИСЬ",
    title1: "Стан — это", title2: "карта грифа.",
    text: "Скрипичный ключ, октавная транспозиция гитары, паузы — и игра на 30 секунд с рекордом.",
    chips: ["VexFlow", "30 секунд", "рекорд"],
  },
];

export const SECTION_IDS = SECTIONS.map((section) => section.id);
export const getSection = (id) => SECTIONS.find((section) => section.id === id) || SECTIONS[0];

/* ------------------------------------------------------------------ */
/*  Прогресс и подписки                                               */
/* ------------------------------------------------------------------ */

let progress = loadProgress();
let storageWorks = true;
const listeners = new Set();

export const getProgress = () => progress;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(event = "change") {
  listeners.forEach((listener) => {
    try {
      listener(progress, event);
    } catch (error) {
      console.warn("Ошибка подписчика состояния", error);
    }
  });
  renderGlobals();
}

/** Изменить прогресс: fn получает копию и возвращает новую версию. */
export function update(mutator, event = "change") {
  progress = mutator(progress) || progress;
  storageWorks = saveProgress(progress);
  notify(event);
  return progress;
}

export function resetAllProgress() {
  clearProgress();
  progress = emptyProgress();
  progress.settings = {
    ...progress.settings,
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  };
  saveProgress(progress);
  notify("reset");
}

/** Записать простой ответ упражнения. */
export function record(key, isCorrect) {
  update((current) => recordAnswer(current, key, isCorrect).progress, "answer");
}

/** Записать ответ в тренажёре интервалов. */
export function recordInterval(intervalId, mode, isCorrect) {
  update((current) => recordIntervalAnswer(current, intervalId, mode, isCorrect).progress, "answer");
}

/** Записать ответ в тренажёре аккордов. */
export function recordChord(typeId, isCorrect) {
  update((current) => recordChordAnswer(current, typeId, isCorrect).progress, "answer");
}

export const getStats = (key) => statsFor(progress, key);

/* ------------------------------------------------------------------ */
/*  Глобальные элементы интерфейса                                    */
/* ------------------------------------------------------------------ */

export function setTheme(theme, persist = true) {
  const value = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = value;
  const button = byId("theme-toggle");
  if (button) {
    button.textContent = value === "dark" ? "☾" : "☀";
    button.setAttribute("aria-label", value === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
    button.title = button.getAttribute("aria-label");
  }
  if (persist) {
    // Тему храним без полной перерисовки: SVG-гриф и стан сами
    // перекрашиваются через CSS-переменные.
    progress = { ...progress, settings: { ...progress.settings, theme: value } };
    storageWorks = saveProgress(progress);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", value === "dark" ? "#141a17" : "#f7f7f1");
}

export function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

let toastTimer = null;
export function toast(message, kind = "") {
  let node = byId("toast");
  if (!node) {
    node = document.createElement("div");
    node.id = "toast";
    node.className = "toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    document.body.append(node);
  }
  node.textContent = message;
  node.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
}

/** Копирование в буфер: с запасным вариантом для старых браузеров. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Браузер мог запретить доступ — пробуем старый способ ниже.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch (error) {
    return false;
  }
}

export async function shareResult(exerciseKey = null) {
  const text = shareText(progress, exerciseKey);
  const copied = await copyText(text);
  toast(copied ? "Скопировано! Вставь в чат или соцсеть." : text, copied ? "" : "");
  return copied;
}

/** Обновить плашку серии, прогресс курса и все [data-stats]. */
export function renderGlobals() {
  const streak = byId("top-streak");
  if (streak) streak.textContent = String(progress.streak);
  const best = byId("top-best");
  if (best) best.textContent = `лучшая ${progress.bestStreak}`;

  const course = courseProgress(progress, SECTION_IDS);
  $$("[data-course-percent]").forEach((node) => {
    node.textContent = `${course.visited} / ${course.total}`;
  });
  $$("[data-course-bar]").forEach((node) => {
    node.style.width = `${course.percent}%`;
  });

  $$("[data-stats]").forEach((node) => {
    const key = node.dataset.stats;
    const stats = statsFor(progress, key);
    const total = stats.correct + stats.mistakes;
    node.textContent = total
      ? `✓ ${stats.streak} подряд · ${accuracy(stats.correct, stats.mistakes)}% (${total})`
      : "пока без ответов";
  });

  const storage = byId("storage-status");
  if (storage) {
    storage.textContent = storageWorks
      ? "Прогресс хранится в этом браузере"
      : "Сохранение недоступно — прогресс только до закрытия страницы";
  }

  // Тембр из настроек применяем один раз при загрузке и при смене.
  setInstrument(progress.settings.instrument);
}

/* ------------------------------------------------------------------ */
/*  Маршрутизация                                                     */
/* ------------------------------------------------------------------ */

let activeSection = null;
const mounted = new Map();
const sectionHooks = new Map(); // id → { onShow, onHide }

export const getActiveSection = () => activeSection;

/**
 * Зарегистрировать раздел: mount(container) вызывается один раз,
 * onShow — при каждом открытии, чтобы обновить статистику и вид.
 */
export function registerSection(id, { mount, onShow, onHide } = {}) {
  sectionHooks.set(id, { mount, onShow, onHide });
}

export function navigate(id, { replace = false } = {}) {
  const target = getSection(id).id;
  try {
    if (location.hash !== "#" + target) {
      if (replace) history.replaceState(null, "", "#" + target);
      else history.pushState(null, "", "#" + target);
    }
  } catch (error) {
    // В изолированном iframe история может быть недоступна — просто переключаем вид.
  }
  showSection(target);
}

export function showSection(id) {
  const section = getSection(id);
  const hooks = sectionHooks.get(section.id);
  const container = byId("view-" + section.id);

  if (activeSection && activeSection !== section.id) {
    try { sectionHooks.get(activeSection)?.onHide?.(); } catch (error) { /* раздел уже скрыт */ }
  }

  $$(".view").forEach((view) => {
    view.hidden = view.id !== "view-" + section.id;
  });

  if (container && hooks && !mounted.has(section.id)) {
    container.innerHTML = "";
    hooks.mount?.(container);
    mounted.set(section.id, true);
  }

  activeSection = section.id;
  byId("breadcrumb").textContent = section.label;
  byId("intro-eyebrow").textContent = section.eyebrow;
  byId("intro-title").innerHTML = `${section.title1}<br><em>${section.title2}</em>`;
  byId("intro-text").textContent = section.text;
  byId("intro-number").textContent = section.no;
  byId("intro-chips").innerHTML = section.chips
    .map((chip) => `<span class="chip muted">${chip}</span>`)
    .join("");
  document.title = `${section.label} — Ладно. Сольфеджио`;

  $$("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === section.id;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  // Мобильное меню-скролл: прокручиваем активную ссылку в видимую область.
  const activeLink = document.querySelector(`[data-nav="${section.id}"]`);
  if (activeLink && activeLink.scrollIntoView && window.innerWidth <= 860) {
    activeLink.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  update((current) => markVisited(current, section.id), "navigate");
  hooks?.onShow?.();
}

/** Инициализация: тема, маршрут, кнопки верхней панели. */
export function initState() {
  setInstrument(progress.settings.instrument);
  setTheme(progress.settings.theme, false);
  renderGlobals();

  const themeButton = byId("theme-toggle");
  themeButton?.addEventListener("click", () => toggleTheme());

  const shareButton = byId("share-button");
  shareButton?.addEventListener("click", () => shareResult());

  window.addEventListener("hashchange", () => showSection(location.hash.slice(1) || "notes"));
  window.addEventListener("popstate", () => showSection(location.hash.slice(1) || "notes"));

  $$('a[data-nav]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      navigate(link.dataset.nav);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}
