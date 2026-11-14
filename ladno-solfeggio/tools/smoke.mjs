/*
 * Автотест в jsdom: собирает приложение esbuild'ом в один скрипт,
 * поднимает index.html в jsdom, имитирует клики и проверяет, что все
 * 14 разделов монтируются без исключений.
 *
 * Запуск: node tools/smoke.mjs (нужны jsdom и esbuild в /tmp/node_modules)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * Зависимости ищем рядом с проектом (npm i), затем в /tmp/node_modules —
 * там их ставит песочница. Если не нашлись нигде, честно говорим, что
 * установить, вместо невнятной ошибки require.
 */
const deps = [join(root, "package.json"), "/tmp/node_modules/package.json"]
  .map((base) => {
    try {
      return createRequire(base);
    } catch (error) {
      return null;
    }
  })
  .filter(Boolean);
function load(name) {
  for (const requireFrom of deps) {
    try {
      return requireFrom(name);
    } catch (error) {
      /* пробуем следующее место */
    }
  }
  console.error(
    `Не найден пакет «${name}». Установи зависимости для проверок:\n` +
    "  npm install            # jsdom и esbuild из devDependencies\n" +
    "или\n  npm i --prefix /tmp jsdom esbuild",
  );
  process.exit(1);
}
const { JSDOM, VirtualConsole } = load("jsdom");
const esbuild = load("esbuild");

const result = esbuild.buildSync({
  entryPoints: [join(root, "app.js")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2020",
  logLevel: "warning",
  loader: { ".js": "js" },
});
const bundle = result.outputFiles[0].text;

const html = readFileSync(join(root, "index.html"), "utf8")
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<link rel="stylesheet"[^>]*>/, "");

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push("jsdomError: " + error.message + "\n" + (error.detail?.stack || error.stack)));
virtualConsole.on("error", (...args) => errors.push("console.error: " + args.map((a) => (a && a.stack) ? a.stack : String(a)).join("\n")));
virtualConsole.on("warn", (...args) => errors.push("console.warn: " + args.join(" ")));

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;

// Мини-полифилы того, чего нет в jsdom.
window.AudioContext = class {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; this.state = "running"; }
  resume() { return Promise.resolve(); }
  createOscillator() { return { type: "", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 }, connect() {} }; }
  createBiquadFilter() { return { type: "", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
};
window.scrollTo = () => {};
window.confirm = () => true;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));

window.addEventListener("error", (event) => {
  errors.push("window.error: " + (event.error?.stack || event.message));
});
window.eval(bundle);

const document = window.document;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const click = (selector, scope = document) => {
  const node = scope.querySelector(selector);
  if (!node) throw new Error("Не найден элемент: " + selector);
  node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  return node;
};

const sections = [...document.querySelectorAll("[data-nav]")].map((a) => a.dataset.nav);

async function run() {
  await sleep(50);
  for (const section of sections) {
    const link = document.querySelector(`[data-nav="${section}"]`);
    link.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(80);
    const view = document.getElementById("view-" + section);
    const rendered = view && view.innerHTML.trim().length > 200;
    console.log(`${rendered ? "✓" : "✗"} раздел ${section}: ${view ? view.innerHTML.length : 0} символов разметки`);
    if (!rendered) throw new Error("Раздел не отрисовался: " + section);
  }

  // Проверяем ключевые кнопки в нескольких разделах.
  const exercises = [
    ["notes", "#notes-next"],
    ["notes", "#notes-find-next"],
    ["intervals", "#interval-build-next"],
    ["intervals", "#ear-next"],
    ["triads", "#triad-next"],
    ["triads", "#triad-check"],
    ["sevenths", "#seventh-next"],
    ["scales", "#scale-quiz-random"],
    ["scales", "#scale-check"],
    ["keys", "#key-next"],
    ["harmony", "#harmony-next"],
    ["harmony", "#blues-play"],
    ["composition", "#composition-regenerate"],
    ["composition", "#composition-save"],
    ["pentatonic", "#pent-find-next"],
    ["pentatonic", "#pent-ear-next"],
    ["pentatonic", "#pent-box-next"],
    ["pentatonic", "#pent-box-check"],
    ["blues", "#blues-note-next"],
    ["blues", "#blues-build-next"],
    ["blues", "#blues-quiz-check"],
    ["ear-intervals", "[data-start]"],
    ["ear-chords", "[data-start]"],
    ["rhythm", "#tap-start"],
    ["rhythm", "#meter-next"],
    ["notation", "#notation-start"],
  ];

  for (const [section, selector] of exercises) {
    document.querySelector(`[data-nav="${section}"]`).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(60);
    const view = document.getElementById("view-" + section);
    try {
      click(selector, view);
      await sleep(30);
      console.log(`✓ ${section} → ${selector}`);
    } catch (error) {
      console.log(`✗ ${section} → ${selector}: ${error.message}`);
      throw error;
    }
  }

  // Клики по грифу и ответы в тренажёре интервалов.
  document.querySelector('[data-nav="pentatonic"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(60);
  const discs = document.querySelectorAll('#view-pentatonic [data-pos]');
  console.log(`✓ гриф пентатоники: ${discs.length} кликабельных позиций`);
  if (discs.length < 50) throw new Error("Слишком мало позиций на грифе");

  document.querySelector('[data-nav="ear-intervals"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(60);
  click("#ear-interval-trainer [data-start]");
  await sleep(50);
  const listen = document.querySelector("#ear-interval-trainer [data-play]");
  listen.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  const answers = document.querySelectorAll("#ear-interval-trainer .answer");
  console.log(`✓ тренажёр интервалов: ${answers.length} вариантов ответа`);
  answers[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  const next = document.querySelector("#ear-interval-trainer [data-next]");
  if (!next || next.disabled) throw new Error("Кнопка «Дальше» не активна после ответа");
  next.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  console.log("✓ тренажёр интервалов: переход к следующему вопросу");

  // Тема и сохранение.
  document.getElementById("theme-toggle").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(30);
  const theme = document.documentElement.dataset.theme;
  if (theme !== "dark") throw new Error("Тема не переключилась");
  console.log("✓ тёмная тема включается");

  const stored = window.localStorage.getItem("ladno.progress.v2");
  if (!stored) throw new Error("Прогресс не записался");
  const parsed = JSON.parse(stored);
  console.log(`✓ localStorage: version=${parsed.version}, посещено разделов=${Object.keys(parsed.course.visited).length}, ответов=${parsed.correct + parsed.mistakes}`);

  // Сброс прогресса.
  click("#reset-progress");
  await sleep(30);
  console.log("✓ кнопка сброса прогресса отработала без ошибок");

  if (errors.length) {
    console.log("\nПредупреждения/ошибки в консоли:");
    errors.slice(0, 40).forEach((line) => console.log("  · " + line));
  } else {
    console.log("\nКонсоль чистая: ошибок и предупреждений нет.");
  }
}

run()
  .then(() => {
    console.log("\nИТОГ: смоук-тест пройден.");
    process.exit(errors.some((e) => e.startsWith("jsdomError")) ? 1 : 0);
  })
  .catch((error) => {
    console.error("\nИТОГ: тест упал:", error);
    if (errors.length) errors.slice(0, 40).forEach((line) => console.log("  · " + line));
    process.exit(1);
  });
