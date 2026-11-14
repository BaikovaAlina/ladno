/*
 * UI: нотный стан.
 *
 * Основной рендерер — VexFlow 4 с CDN. Если CDN недоступен (или VexFlow
 * не смог отрисовать), включается собственный SVG-стан: он рисует те же
 * ноты, ключ и добавочные линейки, поэтому сайт остаётся рабочим офлайн.
 *
 * Важная договорённость: на стане показывается РЕАЛЬНАЯ высота звучания,
 * а не запись «октавой выше», как в гитарных нотах. Это сделано осознанно:
 * ученик видит ту ноту, которую нашёл на грифе.
 */
import { LETTERS, escapeHTML, parseNote, prettyNote, writtenOctave } from "../core/notes.js";
import { byId } from "./dom.js";

const VEX = () => globalThis.Vex?.Flow || globalThis.Vex || null;

/**
 * Нарисовать ноты.
 * notes: [{ midi, name }] или MIDI-числа (тогда имя берём по классу высоты).
 * options:
 *   chord     — рисовать одной «стопкой» (аккорд);
 *   durations — массив длительностей ("q", "w", "8", "h") или одна строка;
 *   clef      — "treble" (по умолчанию);
 *   height    — высота SVG;
 *   showClef  — рисовать ключ (по умолчанию да).
 */
export function renderStaff(container, notes = [], options = {}) {
  const target = typeof container === "string" ? byId(container) : container;
  if (!target) return null;
  const list = notes.map((note) =>
    typeof note === "number"
      ? { midi: note, name: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][note % 12] }
      : note,
  );
  target.innerHTML = "";

  if (VEX()) {
    try {
      drawVexFlow(target, list, options);
      fitStaff(target, options);
      return target;
    } catch (error) {
      console.warn("VexFlow не смог отрисовать стан, используем запасной SVG.", error);
      target.innerHTML = "";
    }
  }
  drawFallbackStaff(target, list, options);
  fitStaff(target, options);
  return target;
}

/**
 * Подгоняем стан под ширину колонки.
 *
 * Раньше SVG растягивался на всю ширину (`width:100%`), и короткий пример
 * из одной ноты превращался в гигантскую картинку высотой в пол-экрана.
 * Теперь считаем размер из viewBox: высота не больше maxHeight (по
 * умолчанию 200), ширина — по пропорции, по центру.
 */
function fitStaff(target, options = {}) {
  const svg = target.querySelector("svg");
  if (!svg) return;
  const box = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  const ratio = box.length === 4 && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : 1.8;
  const maxHeight = options.maxHeight || 200;
  const available = target.clientWidth || 640;
  const width = Math.max(240, Math.min(available, maxHeight * ratio));
  const height = Math.round(width / ratio);
  svg.style.width = `${Math.round(width)}px`;
  svg.style.height = `${height}px`;
  svg.style.maxWidth = "100%";
  svg.style.margin = "0 auto";
  svg.style.display = "block";
  svg.style.overflow = "visible";
}

/* ------------------------------------------------------------------ */
/*  VexFlow                                                            */
/* ------------------------------------------------------------------ */

function drawVexFlow(target, notes, options) {
  const V = VEX();
  const { Renderer, Stave, StaveNote, Accidental, Formatter } = V;
  const chord = !!options.chord;
  const showClef = options.showClef !== false;
  const durations = options.durations || (options.duration ? [options.duration] : null);
  // Ширина по числу нот, но не меньше 320: одна нота рядом с ключом
  // занимает примерно 200 px, остальное — воздух. Он нужен, чтобы такт
  // не сжимался в узкую колонку.
  const width = Math.max(320, 74 + Math.max(notes.length, 1) * 62 + (showClef ? 40 : 0));
  const height = options.height || 200;

  const renderer = new Renderer(target, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont("Arial", 11);

  const stave = new Stave(8, 26, width - 16);
  if (showClef) stave.addClef(options.clef || "treble");
  if (options.timeSignature) stave.addTimeSignature(options.timeSignature);
  stave.setContext(context).draw();

  const vexNotes = chord
    ? [makeVexChord(V, notes, durations?.[0] || "w")]
    : notes.map((note, index) => makeVexNote(V, note, durations?.[index] || options.duration || "q"));

  if (chord) {
    // Для аккорда нужен такт достаточной ширины, чтобы ноты не слипались.
    Formatter.FormatAndDraw(context, stave, vexNotes, { autoBeam: false });
  } else {
    Formatter.FormatAndDraw(context, stave, vexNotes, { autoBeam: false });
  }

  const svg = target.querySelector("svg");
  if (svg) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", options.ariaLabel || "Нотный пример");
    // VexFlow пишет width/height атрибутами — убираем их: размеры задаст
    // fitStaff(), иначе стан растягивается на всю ширину колонки.
    svg.removeAttribute("width");
    svg.removeAttribute("height");
  }
}

function makeVexNote(V, note, duration) {
  const octave = writtenOctave(note.name, note.midi);
  const staveNote = new V.StaveNote({
    clef: "treble",
    keys: [`${note.name[0].toLowerCase()}/${octave}`],
    duration: String(duration),
    auto_stem: true,
  });
  const accidental = parseNote(note.name).accidental;
  if (accidental) staveNote.addModifier(new V.Accidental(accidental), 0);
  if (duration.includes("r")) staveNote.setStyle?.({ fillStyle: "transparent", strokeStyle: "transparent" });
  return staveNote;
}

function makeVexChord(V, notes, duration) {
  const keys = notes.map((note) => `${note.name[0].toLowerCase()}/${writtenOctave(note.name, note.midi)}`);
  const staveNote = new V.StaveNote({
    clef: "treble",
    keys,
    duration: String(duration),
    auto_stem: true,
  });
  notes.forEach((note, index) => {
    const accidental = parseNote(note.name).accidental;
    if (accidental) staveNote.addModifier(new V.Accidental(accidental), index);
  });
  return staveNote;
}

/* ------------------------------------------------------------------ */
/*  Запасной SVG                                                       */
/* ------------------------------------------------------------------ */

// Позиция ноты на стане: считаем «шаги» от E4 (нижняя линейка) вверх.
// E4 = 0, F4 = 1, … B4 = 4, C5 = 5 … Каждый шаг — половина межлинейного
// расстояния (5px при расстоянии между линейками 10px).
const STAFF_BOTTOM_LINE = "E4";
const BOTTOM_LINE_INDEX = 4 * 7 + LETTERS.indexOf("E"); // октава 4, буква E

function staffStep(name, midi) {
  const note = parseNote(name);
  const octave = writtenOctave(name, midi);
  return octave * 7 + LETTERS.indexOf(note.letter) - BOTTOM_LINE_INDEX;
}

/**
 * Скрипичный ключ контуром: завиток обвивает вторую линейку снизу (соль).
 * Координаты заданы для межлинейного расстояния 20 и масштабируются.
 */
function trebleClefPath(x, solLineY, lineGap) {
  const k = lineGap / 20;
  return (
    `<g class="clef" transform="translate(${x} ${solLineY}) scale(${k})" ` +
    `fill="none" stroke="currentColor" stroke-opacity="0.82" stroke-width="5.2" ` +
    `stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M2 30 C2 0, 2 -60, 2 -102 C14 -108, 28 -94, 18 -78 ` +
    `C4 -56, -22 -46, -26 -18 C-30 8, -4 20, 6 2 C14 -12, 0 -26, -12 -20"/>` +
    `<path d="M2 30 C2 42, -10 46, -16 38"/>` +
    `</g>`
  );
}

/**
 * Рисуем стан вручную: пять линеек, скрипичный ключ, ноты с добавочными
 * линейками. Функция экспортируется, её же использует режим «без CDN».
 */
export function drawFallbackStaff(target, notes, options = {}) {
  const chord = !!options.chord;
  const showClef = options.showClef !== false;
  const width = options.width || Math.max(340, 110 + Math.max(notes.length, 1) * (chord ? 0 : 66));
  const height = options.height || 176;
  const lineGap = 11;
  const bottomY = 106;
  const staffLeft = showClef ? 62 : 16;
  const staffRight = width - 12;
  const stepHeight = lineGap / 2;

  const yForStep = (step) => bottomY - step * stepHeight;
  const parts = [
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHTML(options.ariaLabel || "Нотный пример")}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent"/>`,
  ];

  // Пять линеек.
  for (let i = 0; i < 5; i++) {
    const y = bottomY - i * lineGap;
    parts.push(`<line x1="${staffLeft}" x2="${staffRight}" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity="0.42" stroke-width="1"/>`);
  }

  if (showClef) {
    // Скрипичный ключ рисуем контуром. Символ «𝄞» есть не в каждом шрифте:
    // на некоторых системах вместо него получается пустой прямоугольник.
    parts.push(trebleClefPath(staffLeft - 28, bottomY - lineGap, lineGap));
  }

  const positions = chord
    ? [{ notes, x: staffLeft + (staffRight - staffLeft) / 2 + 20 }]
    : notes.map((note, index) => ({
        notes: [note],
        x: notes.length === 1
          ? staffLeft + (staffRight - staffLeft) / 2
          : staffLeft + 34 + index * ((staffRight - staffLeft - 50) / Math.max(1, notes.length - 1)),
      }));

  positions.forEach((group) => {
    const steps = group.notes.map((note) => staffStep(note.name, note.midi));

    // Добавочные линейки.
    const uniqueSteps = [...new Set(steps)];
    uniqueSteps.forEach((step) => {
      if (step <= -2) {
        for (let s = -2; s >= step; s -= 2) {
          if (s % 2 === 0) {
            const y = yForStep(s);
            parts.push(`<line x1="${group.x - 15}" x2="${group.x + 15}" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity="0.45" stroke-width="1"/>`);
          }
        }
      }
      if (step >= 10) {
        for (let s = 10; s <= step; s += 2) {
          const y = yForStep(s);
          parts.push(`<line x1="${group.x - 15}" x2="${group.x + 15}" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity="0.45" stroke-width="1"/>`);
        }
      }
    });

    group.notes.forEach((note, index) => {
      const step = steps[index];
      const y = yForStep(step);
      const accidental = parseNote(note.name).accidental;
      if (accidental) {
        parts.push(
          `<text x="${group.x - 17}" y="${y + 5}" text-anchor="end" fill="currentColor" fill-opacity="0.85" font-family="Georgia, serif" font-size="15">${escapeHTML(prettyNote(accidental))}</text>`,
        );
      }
      parts.push(
        `<ellipse cx="${group.x}" cy="${y}" rx="6.4" ry="4.6" transform="rotate(-18 ${group.x} ${y})" fill="currentColor" fill-opacity="0.9"/>`,
      );
    });

    // Штиль: у верхних нот — вниз, у нижних — вверх, как в настоящей записи.
    const stemUp = Math.max(...steps) < 4;
    const stemX = group.x + (stemUp ? 6 : -6);
    const topY = yForStep(Math.max(...steps));
    const bottomY = yForStep(Math.min(...steps));
    const stemFrom = stemUp ? bottomY : topY;
    const stemTo = stemUp ? topY - 30 : bottomY + 30;
    parts.push(`<line x1="${stemX}" x2="${stemX}" y1="${stemFrom}" y2="${stemTo}" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.4"/>`);
  });

  parts.push("</svg>");
  target.innerHTML = parts.join("");
  return target;
}

/* ------------------------------------------------------------------ */
/*  Помощники                                                          */
/* ------------------------------------------------------------------ */

/** Гамма на стане: каждая нота — четверть. */
export const renderScaleStaff = (container, notes, options = {}) =>
  renderStaff(container, notes, { ...options, durations: notes.map(() => "q") });

/** Аккорд «стопкой». */
export const renderChordStaff = (container, notes, options = {}) =>
  renderStaff(container, notes, { ...options, chord: true, duration: options.duration || "w" });

/** Одна нота — для чтения с листа. */
export const renderNoteStaff = (container, note, options = {}) =>
  renderStaff(container, [note], { ...options, duration: "w" });

/** Ключевые знаки / размер для теории: рисуем пустой такт. */
export function renderEmptyStaff(container, options = {}) {
  return renderStaff(container, [], { ...options, showClef: true });
}
