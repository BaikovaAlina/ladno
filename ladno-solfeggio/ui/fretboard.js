/*
 * UI: единый рендер гитарного грифа.
 *
 * Все разделы рисуют гриф одной функцией:
 *
 *   renderFretboard({
 *     container,        // элемент или id
 *     highlighted,      // массив позиций "струна:лад" или [{string, fret, color, label}]
 *     root,             // класс высоты тоники (0..11) — рисуем отдельным цветом
 *     rootPositions,    // явный список позиций корня (если нужно)
 *     colors,           // переопределение цветов: { root, note, selected, mute }
 *     clickable,        // рисовать ли кликабельные кнопки
 *     onNoteClick,      // (position) => …
 *     showAll,          // показывать все ноты или только подсвеченные
 *     names,            // { [pc]: "C#" } — правильные имена вместо стандартных
 *     boxes,            // полупрозрачные области позиций: [{from, to, label}]
 *     selected,         // Set выбранных позиций
 *     questionKey,      // позиция-вопрос: рисуем "?"
 *     fromFret, toFret, // диапазон ладов (по умолчанию 0–15)
 *     status,           // id элемента для подписи нажатой ноты
 *     title,            // aria-label для контейнера
 *   })
 *
 * Гриф — это SVG. Кликабельные ноты — <g role="button" tabindex="0">,
 * поэтому работают и мышью, и с клавиатуры.
 */
import {
  CHROMATIC, LAST_FRET, STRINGS, bestPosition, describePosition, escapeHTML,
  mod, positionsForMidi, prettyNote, writtenNote,
} from "../core/notes.js";
import { playNote } from "../core/audio.js";
import { byId } from "./dom.js";

/*
 * Палитра — CSS-переменные, а не зашитые цвета. Благодаря этому SVG сам
 * перекрашивается при переключении темы, без перерисовки грифа.
 * Значения по умолчанию (fallback) нужны на случай, если переменная не найдена.
 */
const DEFAULT_COLORS = {
  paper: "var(--fb-paper, #efe9d9)",
  paperLine: "var(--fb-paper-line, #e3ddcb)",
  fretLine: "var(--fb-fret, #c2bfaf)",
  stringLine: "var(--fb-string, #b9baaa)",
  nut: "var(--fb-nut, #b6bba7)",
  inlay: "var(--fb-inlay, #dedac8)",
  label: "var(--fb-label, #9aa99b)",
  stringName: "var(--fb-string-name, #69806c)",
  root: "var(--fb-root, #3d6e52)",
  rootText: "var(--fb-root-text, #ffffff)",
  note: "var(--fb-note, #c9ddb5)",
  noteText: "var(--fb-note-text, #365e43)",
  blue: "var(--fb-blue, #c96a4f)",
  blueText: "var(--fb-blue-text, #ffffff)",
  selected: "var(--fb-selected, #eebf8e)",
  selectedText: "var(--fb-selected-text, #5c4433)",
  mute: "var(--fb-mute, #fbfaf4)",
  muteStroke: "var(--fb-mute-stroke, #deddd1)",
  muteText: "var(--fb-mute-text, #a6b0a3)",
  boxFill: "var(--fb-box, rgba(120, 160, 110, 0.13))",
  boxStroke: "var(--fb-box-stroke, rgba(96, 134, 92, 0.5))",
  boxText: "var(--fb-box-text, #6f8a6d)",
};

const NOTE_DISC = 13.2;
const SVG_WIDTH = 1000;
const LEFT = 128;
const FRET_WIDTH = 56;
const TOP = 58;
const STRING_GAP = 35;
const RIGHT = LEFT + FRET_WIDTH * 12;

/*
 * Координаты. Ладовая линия N стоит на границе N-го лада, а нота должна
 * попадать в СЕРЕДИНУ клетки: между линиями N-1 и N. Открытая струна
 * (fret 0) рисуется слева от порожка. Раньше нота уезжала на полклетки
 * вправо и 12-й лад выходил за край viewBox.
 */
function xForFret(fret, fromFret) {
  if (fret === 0) return LEFT - 26;
  return LEFT + (fret - fromFret - 0.5) * FRET_WIDTH;
}

function yForString(stringIndex) {
  return TOP + stringIndex * STRING_GAP;
}

function fretLineX(fret, fromFret) {
  return LEFT + (fret - fromFret) * FRET_WIDTH;
}

/**
 * Главная функция рендера. Возвращает объект с методами:
 *   update(options) — перерисовать с новыми настройками,
 *   getPositions()  — список всех нарисованных позиций.
 */
export function renderFretboard(options = {}) {
  const container = typeof options.container === "string"
    ? byId(options.container)
    : options.container;
  if (!container) return null;

  let current = { ...options };
  let lastState = null;

  function draw(state) {
    lastState = state;
    const colors = { ...DEFAULT_COLORS, ...(state.colors || {}) };
    const fromFret = state.fromFret ?? 0;
    const toFret = Math.min(LAST_FRET, state.toFret ?? 12);
    const frets = toFret - fromFret;
    const width = LEFT + frets * FRET_WIDTH + 26;
    // Если у боксов есть подписи, снизу нужно ещё немного места:
    // подпись живёт внутри рамки, ниже последней струны.
    const boxLabelSpace = (state.boxes || []).some((box) => box && box.label) ? 18 : 0;
    const height = TOP + (STRINGS.length - 1) * STRING_GAP + 52 + boxLabelSpace;

    // Позиции: приводим разные форматы к единому виду.
    const highlightMap = new Map();
    (state.highlighted || []).forEach((item) => {
      if (typeof item === "string") highlightMap.set(item, { kind: "note" });
      else if (item && item.string != null && item.fret != null) {
        highlightMap.set(`${item.string}:${item.fret}`, {
          kind: item.kind || (item.isBlue ? "blue" : item.isRoot ? "root" : "note"),
          label: item.label,
          color: item.color,
        });
      }
    });
    const selected = new Set(state.selected || []);
    const rootPositions = new Set(state.rootPositions || []);
    const names = state.names || {};
    const openStrings = new Set(state.openStrings || []);
    const boxes = (state.boxes || []).filter(Boolean);

    const parts = [];
    parts.push(
      `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="group" ` +
      `aria-label="${escapeHTML(state.title || "Гитарный гриф: первая струна сверху, открытые струны слева")}">`,
    );

    // Корпус грифа.
    parts.push(
      `<rect x="${LEFT}" y="${TOP - 19}" width="${frets * FRET_WIDTH}" height="${(STRINGS.length - 1) * STRING_GAP + 38}" rx="7" fill="${colors.paper}" stroke="${colors.paperLine}"/>`,
    );
    // Порожек (нулевой лад). В окне «с 5-го лада» порожка нет — там просто гриф.
    if (fromFret === 0) {
      parts.push(`<rect x="${LEFT - 4}" y="${TOP - 19}" width="6" height="${(STRINGS.length - 1) * STRING_GAP + 38}" rx="2" fill="${colors.nut}"/>`);
    }

    // Полупрозрачные области боксов — рисуем ПОД нотами.
    boxes.forEach((box, index) => {
      // Бокс охватывает диски с лада `from` по лад `to`: слева — линия
      // перед первым ладом, справа — линия после последнего.
      const boxFrom = Math.max(fromFret, box.from - 1);
      const boxTo = Math.min(toFret + 1, box.to);
      if (boxTo <= boxFrom) return;
      const x = LEFT + (boxFrom - fromFret) * FRET_WIDTH;
      const w = (boxTo - boxFrom) * FRET_WIDTH;
      const y = TOP - 24;
      const h = (STRINGS.length - 1) * STRING_GAP + 48 + (box.label ? 18 : 0);
      parts.push(
        `<rect class="box-zone" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${box.color || colors.boxFill}" stroke="${box.stroke || colors.boxStroke}" stroke-dasharray="5 4"/>`,
      );
      if (box.label) {
        // Подпись — под последней струной, внутри рамки: сверху и по центру
        // она перекрывала бы ноты и номера ладов.
        parts.push(
          `<text class="box-label" x="${x + 8}" y="${y + h - 7}" fill="${box.textColor || colors.boxText}" font-family="Arial, sans-serif" font-size="9.5" font-weight="700">${escapeHTML(box.label)}</text>`,
        );
      }
    });

    /*
     * Точки-маркеры. На гитаре они стоят МЕЖДУ струнами, а не на линии:
     * одиночные — между 3-й и 4-й струной (середина грифа), двойные на
     * 12-м ладу — между 2-3 и 4-5. Радиус небольшой, чтобы кружок не
     * выглядывал из-под нотных дисков.
     */
    // STRING_GAP — расстояние между струнами; между струнами — на 9 px
    // выше, чем «через одну»: так точка не наезжает на линии струн.
    const inlayY = (stringIndex) => TOP + (stringIndex + 0.5) * STRING_GAP - 9;
    [3, 5, 7, 9].forEach((fret) => {
      if (fret >= fromFret && fret <= toFret) {
        const x = xForFret(fret, fromFret);
        parts.push(`<circle class="inlay" cx="${x}" cy="${inlayY(2)}" r="3.2" fill="${colors.inlay}"/>`);
      }
    });
    if (12 >= fromFret && 12 <= toFret) {
      const x = xForFret(12, fromFret);
      parts.push(`<circle class="inlay" cx="${x}" cy="${inlayY(1)}" r="3.2" fill="${colors.inlay}"/>`);
      parts.push(`<circle class="inlay" cx="${x}" cy="${inlayY(3)}" r="3.2" fill="${colors.inlay}"/>`);
    }

    // Ладовые порожки.
    for (let fret = fromFret + 1; fret <= toFret; fret++) {
      const x = fretLineX(fret, fromFret);
      parts.push(`<line x1="${x}" y1="${TOP - 19}" x2="${x}" y2="${TOP + (STRINGS.length - 1) * STRING_GAP + 19}" stroke="${colors.fretLine}" stroke-width="1.8"/>`);
    }

    // Номера ладов сверху.
    for (let fret = fromFret; fret <= toFret; fret++) {
      const x = xForFret(fret, fromFret);
      parts.push(
        `<text x="${x}" y="24" text-anchor="middle" fill="${colors.label}" font-family="Arial, sans-serif" font-size="9.5" font-weight="700">${fret}</text>`,
      );
    }

    const drawnPositions = [];

    // Струны и ноты.
    STRINGS.forEach((string, s) => {
      const y = yForString(s);
      parts.push(
        `<text x="20" y="${y + 4}" text-anchor="middle" fill="${colors.stringName}" font-family="Arial, sans-serif" font-size="11.5" font-weight="700">${string.name}</text>`,
      );
      parts.push(
        `<text x="41" y="${y + 3}" text-anchor="middle" fill="${colors.label}" font-family="Arial, sans-serif" font-size="8.5">${s + 1}</text>`,
      );
      // Чем толще струна, тем толще линия.
      parts.push(
        `<line x1="${LEFT - 22}" y1="${y}" x2="${LEFT + frets * FRET_WIDTH - 1}" y2="${y}" stroke="${colors.stringLine}" stroke-width="${1 + s * 0.24}"/>`,
      );

      for (let fret = fromFret; fret <= toFret; fret++) {
        const key = `${s}:${fret}`;
        const midi = string.midi + fret;
        const pc = mod(midi);
        const highlighted = highlightMap.has(key);
        const isSelected = selected.has(key);
        const isRoot = rootPositions.has(key) || (highlighted && highlightMap.get(key).kind === "root") ||
          (state.root != null && highlighted && pc === state.root);
        const isBlue = highlighted && highlightMap.get(key).kind === "blue";
        const isQuestion = state.questionKey === key;
        const show = state.showAll || highlighted || isSelected || isQuestion || openStrings.has(key);
        const x = xForFret(fret, fromFret);

        if (show) {
          let fill = colors.mute;
          let stroke = colors.muteStroke;
          let textColor = colors.muteText;
          if (highlighted) {
            fill = colors.note;
            stroke = colors.note;
            textColor = colors.noteText;
          }
          if (isBlue) {
            fill = colors.blue;
            stroke = colors.blue;
            textColor = colors.blueText;
          }
          if (isRoot) {
            fill = colors.root;
            stroke = colors.root;
            textColor = colors.rootText;
          }
          if (isSelected) {
            fill = colors.selected;
            stroke = colors.selected;
            textColor = colors.selectedText;
          }
          const custom = highlighted && highlightMap.get(key).color;
          if (custom) {
            fill = custom;
            stroke = custom;
            textColor = "#fff";
          }

          const defaultName = names[pc] || CHROMATIC[pc];
          // hideLabels нужен в упражнениях «найди ноту»: точки кликабельны,
          // но подписи не подсказывают ответ.
          const label = isQuestion
            ? "?"
            : highlighted && highlightMap.get(key).label
              ? highlightMap.get(key).label
              : (state.showAll || highlighted || isSelected) && !state.hideLabels
                ? prettyNote(defaultName)
                : "";
          const aria = isQuestion
            ? `Загаданная нота: ${describePosition({ string: s, fret })}`
            : `${describePosition({ string: s, fret })}, ${writtenNote(defaultName, midi)}`;

          const content =
            `<circle class="note-disc" cx="${x}" cy="${y}" r="${isQuestion ? NOTE_DISC + 1 : NOTE_DISC}" ` +
            `fill="${fill}" stroke="${stroke}" stroke-width="${highlighted || isSelected ? 1 : 1.2}"` +
            `${state.clickable === false ? "" : ""}/>` +
            `<text x="${x}" y="${y + 3.6}" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" ` +
            `font-size="${label.length > 2 ? 8.6 : 10.2}" font-weight="700">${escapeHTML(label)}</text>`;

          if (state.clickable === false) {
            parts.push(`<g>${content}</g>`);
          } else {
            parts.push(
              `<g class="fret-click" role="button" tabindex="0" data-pos="${key}" ` +
              `data-string="${s}" data-fret="${fret}" data-midi="${midi}" ` +
              `aria-label="${escapeHTML(aria)}">${content}</g>`,
            );
          }
          drawnPositions.push({ string: s, fret, midi, pc, key, highlighted, isRoot });
        } else if (state.showGhosts && fret > 0) {
          // Невидимые хитбоксы: гриф «кликается» даже там, где нот не видно.
          parts.push(
            `<g class="fret-click ghost" role="button" tabindex="0" data-pos="${key}" data-string="${s}" data-fret="${fret}" data-midi="${midi}" aria-label="${escapeHTML(describePosition({ string: s, fret }))}">` +
            `<circle cx="${x}" cy="${y}" r="${NOTE_DISC}" fill="transparent"/></g>`,
          );
        }
      }
    });

    // Подпись снизу.
    if (state.footer !== false) {
      parts.push(
        `<text x="20" y="${height - 12}" fill="${colors.label}" font-family="Arial, sans-serif" font-size="8" font-weight="700">СТРУНЫ</text>` +
        `<text x="${LEFT + frets * FRET_WIDTH - 6}" y="${height - 12}" text-anchor="end" fill="${colors.label}" font-family="Arial, sans-serif" font-size="8" font-weight="700">ЛАДЫ ${fromFret}–${toFret}</text>`,
      );
    }
    parts.push("</svg>");

    container.innerHTML = parts.join("");

    // Клики и клавиатура — делегированием на контейнер.
    const activate = (target) => {
      const group = target.closest?.("[data-pos]");
      if (!group || !container.contains(group)) return;
      const string = Number(group.dataset.string);
      const fret = Number(group.dataset.fret);
      const midi = Number(group.dataset.midi);
      const position = { string, fret, midi, pc: mod(midi), key: group.dataset.pos };

      if (state.status && byId(state.status)) {
        const name = names[position.pc] || CHROMATIC[position.pc];
        byId(state.status).textContent = `${writtenNote(name, midi)} · ${describePosition(position)}`;
      }
      if (state.playOnClick !== false && state.audio !== false) {
        playNote(midi, 0.75, 0.7);
      }
      state.onNoteClick?.(position);
    };

    container.onclick = (event) => activate(event.target);
    container.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        activate(event.target);
      }
    };
  }

  draw(current);

  return {
    /** Перерисовать с новыми параметрами (старые сохраняются). */
    update(next = {}) {
      current = { ...current, ...next };
      draw(current);
      return api;
    },
    getPositions: () => lastState?.highlighted || [],
    element: container,
  };
}

/* ------------------------------------------------------------------ */
/*  Готовые обёртки для типовых задач                                 */
/* ------------------------------------------------------------------ */

/** Гамма/пентатоника: подсветка всех нот + корень. */
export function renderScaleBoard(container, {
  root, scale, boxes = [], names = {}, extra = [], status = null, fromFret = 0, toFret = 14, clickable = true, showAll = false,
}) {
  const rootPc = mod(typeof root === "number" ? root : 0);
  const positions = [];
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = fromFret; fret <= toFret; fret++) {
      const midi = STRINGS[string].midi + fret;
      const pc = mod(midi);
      const offset = mod(pc - rootPc);
      if (scale.offsets.includes(offset)) {
        positions.push({ string, fret, kind: offset === 0 ? "root" : "note" });
      }
    }
  }
  extra.forEach((item) => {
    if (!positions.some((p) => p.string === item.string && p.fret === item.fret)) {
      positions.push({ ...item, kind: item.kind || "blue" });
    }
  });
  return renderFretboard({
    container,
    highlighted: positions,
    boxes,
    names,
    status,
    clickable,
    showAll,
  });
}

/** Одна нота на грифе (для упражнений «найди ноту»). */
export function renderSingleNoteBoard(container, midi, { status = null, revealKey = null } = {}) {
  const position = bestPosition(midi);
  return renderFretboard({
    container,
    highlighted: revealKey ? [] : [{ string: position.string, fret: position.fret }],
    questionKey: revealKey,
    showAll: true,
    clickable: true,
    status,
    highlightedKey: revealKey,
  });
}

/** Все позиции конкретной высоты (для подсказок). */
export function positionsOfNote(midi) {
  return positionsForMidi(midi).map((position) => ({
    string: position.string,
    fret: position.fret,
    kind: "note",
  }));
}
