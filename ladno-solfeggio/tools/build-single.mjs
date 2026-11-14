/*
 * Сборка однофайловой версии: ladno-single.html.
 *
 * Зачем: ES-модули не работают с диска (file://), а иногда хочется просто
 * открыть сайт двойным щелчком, без сервера. Этот скрипт вшивает CSS и все
 * модули (через esbuild) в один HTML-файл. Обычная версия сайта при этом
 * не меняется и по-прежнему не требует сборки.
 *
 * Запуск: node tools/build-single.mjs
 * Требуется esbuild (npm i -D esbuild или node_modules в /tmp).
 * CDN-скрипты VexFlow и Tone.js остаются внешними: без интернета сайт
 * работает на запасном SVG-стане и Web Audio.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// esbuild ищем рядом с проектом, затем в /tmp (там его ставит песочница).
const require = createRequire(join(root, "package.json"));
let esbuild;
for (const candidate of [root, "/tmp"]) {
  try {
    esbuild = createRequire(join(candidate, "package.json"))("esbuild");
    break;
  } catch (error) {
    esbuild = null;
  }
}
if (!esbuild) {
  console.error("Не найден esbuild. Установи его: npm i -D esbuild");
  process.exit(1);
}

const bundle = esbuild.buildSync({
  entryPoints: [join(root, "app.js")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2020",
  charset: "utf8",
  legalComments: "none",
  logLevel: "warning",
}).outputFiles[0].text;

const css = readFileSync(join(root, "style.css"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");

// Внешние <script> (CDN) не блокируют страницу: подключаем их асинхронно,
// уже после того как вшитый код нарисовал интерфейс. Без сети сайт работает
// на запасном SVG-стане и Web Audio.
const cdnUrls = [...html.matchAll(/<script\b[^>]*\bsrc="((?:https?:)?\/\/[^"]+)"[^>]*>\s*<\/script>/g)]
  .map((match) => match[1]);
const cdnLoader = `<script>
      (function () {
        var sources = ${JSON.stringify(cdnUrls)};
        sources.forEach(function (src) {
          var tag = document.createElement("script");
          tag.src = src;
          tag.async = true;
          document.head.appendChild(tag);
        });
      })();
    </script>`;

const inlineCss = `<style>\n${css}\n    </style>`;
const inlineJs = `<script>\n${bundle.replace(/<\/script>/gi, "<\\/script>")}\n    </script>`;

let single = html
  .replace(/<link rel="stylesheet"[^>]*>/, inlineCss)
  .replace(/<script\b[^>]*\bsrc="(https?:)?\/\/[^"]+"[^>]*>\s*<\/script>/g, "")
  .replace(/<script type="module"[^>]*><\/script>/, inlineJs);

single = single.replace("</body>", `    ${cdnLoader}\n  </body>`);

// Небольшая пометка в подвале, чтобы было видно, что это однофайловая сборка.
single = single.replace(
  "</body>",
  `    <script>document.documentElement.dataset.single = "1";</script>\n  </body>`,
);

const target = join(root, "ladno-single.html");
writeFileSync(target, single, "utf8");
const kb = Math.round(Buffer.byteLength(single, "utf8") / 1024);
console.log(`Готово: ${target} (${kb} КБ). Открывается двойным щелчком, без сервера.`);
if (!existsSync(target)) process.exit(1);
