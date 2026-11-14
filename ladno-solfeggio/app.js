/*
 * ЛАДНО. СОЛЬФЕДЖИО — точка входа.
 *
 * Никакой сборки: браузер загружает модуль, модуль подключает разделы
 * по требованию. Так первый экран открывается без задержек даже на
 * телефоне и не зависит от VexFlow/Tone.js на CDN.
 *
 * Порядок инициализации:
 *  1) состояние, тема, маршрут (ui/state.js);
 *  2) ленивая регистрация разделов;
 *  3) открытие текущего раздела (из hash или сохранённого).
 */
import { byId } from "./ui/dom.js";
import {
  initState, registerSection, resetAllProgress, showSection, toast, getProgress,
} from "./ui/state.js";
import { audioStatus, unlockAudio } from "./core/audio.js";

/*
 * Разделы подключаются через dynamic import. Это обычные ES-модули
 * с относительными путями — их можно открыть и с диска, и с сервера.
 */
const SECTIONS = {
  notes: () => import("./ui/sections/notes.js"),
  intervals: () => import("./ui/sections/intervals.js"),
  triads: () => import("./ui/sections/triads.js"),
  sevenths: () => import("./ui/sections/sevenths.js"),
  scales: () => import("./ui/sections/scales.js"),
  keys: () => import("./ui/sections/keys.js"),
  harmony: () => import("./ui/sections/harmony.js"),
  composition: () => import("./ui/sections/composition.js"),
  pentatonic: () => import("./ui/sections/pentatonic.js"),
  blues: () => import("./ui/sections/blues.js"),
  "ear-intervals": () => import("./ui/sections/ear-intervals.js"),
  "ear-chords": () => import("./ui/sections/ear-chords.js"),
  rhythm: () => import("./ui/sections/rhythm.js"),
  notation: () => import("./ui/sections/notation.js"),
};

// Каждый раздел получает mount/onShow: rендер и обновление при показе.
Object.entries(SECTIONS).forEach(([id, loader]) => {
  const cache = { module: null };
  registerSection(id, {
    async mount(container) {
      try {
        const module = await loader();
        cache.module = module;
        module.mount(container);
      } catch (error) {
        console.error(`Раздел «${id}» не загрузился`, error);
        container.innerHTML = `
          <div class="panel board-panel">
            <h2>Этот раздел не загрузился</h2>
            <p>Проверь консоль браузера. Чаще всего дело в том, что файл открыт по протоколу
            <code>file://</code>: браузеры ограничивают ES-модули на локальных файлах.
            Запусти локальный сервер, например <code>python3 -m http.server</code>,
            и открой <code>http://localhost:8000</code>.</p>
            <p style="color:var(--muted);font-size:11px">Текст ошибки: ${String(error?.message || error)}</p>
          </div>`;
      }
    },
    onShow() {
      cache.module?.onShow?.();
    },
  });
});

// Горячие клавиши: переключение темы и возврат к навигации.
function bindShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.target.matches?.("input, textarea, select")) return;
    if (event.key === "t" && !event.metaKey && !event.ctrlKey) {
      import("./ui/state.js").then(({ toggleTheme }) => toggleTheme());
    }
  });
}

function bindFooter() {
  const button = byId("reset-progress");
  button?.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Сбросить весь прогресс: серии, статистику тренажёров, рекорды и сохранённые мотивы?",
    );
    if (!confirmed) return;
    resetAllProgress();
    toast("Прогресс сброшен. Начинаем заново — это нормально.");
    // Перезагружаем страницу: так гарантированно сбрасываются поля и задания
    // во всех разделах, включая уже смонтированные.
    setTimeout(() => window.location.reload(), 600);
  });
}

function showAudioStatus() {
  const check = () => {
    const label = byId("audio-status");
    if (!label) return;
    if (globalThis.Tone) {
      label.textContent = "Звук: Tone.js";
    } else {
      label.textContent = "Звук: Web Audio";
    }
  };
  check();
  // CDN-скрипты с defer могут загрузиться позже модуля — проверим ещё раз.
  window.addEventListener("load", check);
  setTimeout(check, 2500);
}

function bindAudioUnlock() {
  // Один раз на первое действие пользователя: инициализируем Tone.js
  // (или запасной Web Audio) и больше не трогаем контекст без нужды.
  const unlock = () => {
    unlockAudio().then((ready) => {
      if (ready) {
        const label = byId("audio-status");
        if (label) label.textContent = "Звук готов";
      }
    });
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true, passive: true });
  document.addEventListener("keydown", unlock, { once: true });
}

function bindAudioFeedback() {
  // Индикатор «звук играет»: подсвечиваем волну на время нот.
  const indicator = byId("audio-indicator");
  if (!indicator) return;
  document.addEventListener("pointerdown", () => {
    indicator.classList.add("listening");
    clearTimeout(indicator._timer);
    indicator._timer = setTimeout(() => indicator.classList.remove("listening"), 700);
  }, { passive: true });
}

function start() {
  initState();
  showAudioStatus();
  bindFooter();
  bindShortcuts();
  bindAudioFeedback();
  bindAudioUnlock();

  const requested = location.hash.slice(1);
  const fallback = getProgress().course?.last || "notes";
  const startSection = SECTIONS[requested] ? requested : (SECTIONS[fallback] ? fallback : "notes");

  // Первый раздел монтируем сразу, остальные — по клику.
  showSection(startSection);
  if (location.hash !== "#" + startSection) {
    try {
      history.replaceState(null, "", "#" + startSection);
    } catch (error) {
      // В изолированном фрейме история может быть недоступна — просто продолжаем.
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}

// Диагностика для разработки: состояние звука доступно в консоли.
window.ladno = { audioStatus, getProgress };
