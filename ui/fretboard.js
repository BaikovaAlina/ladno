/*
 * ui/fretboard.js — единый SVG-компонент гитарного грифа.
 * Экспортирует функцию renderFretboard({ container, highlighted, root, colors, clickable, onNoteClick, ... }),
 * которую используют все 14 разделов учебника: от знакомства с нотами до 5 боксов пентатоники,
 * блюзовых нот, обращений септаккордов и чтения с листа.
 */

import {
  STRINGS,
  CHROMATIC,
  mod,
  parseNote,
  prettyNote,
  writtenNote,
  describePosition,
  escapeHTML,
} from "../data/notes.js";

let audioPlayCallback = null;

export function setFretboardAudioPlayer(fn) {
  audioPlayCallback = fn;
}

function resolveContainer(container) {
  if (!container) return null;
  return typeof container === "string"
    ? document.getElementById(container)
    : container;
}

function normalizeHighlightPredicate(highlighted) {
  if (!highlighted) return () => false;
  if (typeof highlighted === "function") return highlighted;
  if (Array.isArray(highlighted) || highlighted instanceof Set) {
    const items = [...highlighted];
    const pcs = new Set();
    const keys = new Set();
    items.forEach((item) => {
      if (typeof item === "number") pcs.add(mod(item));
      else if (typeof item === "string" && item.includes(":")) keys.add(item);
      else if (item && typeof item === "object" && item.key) keys.add(item.key);
    });
    return (pos) => keys.has(pos.key) || pcs.has(pos.pc);
  }
  if (typeof highlighted === "object") {
    const pcs = new Set((highlighted.pcs || []).map((n) => mod(n)));
    const keys = new Set(highlighted.positions || []);
    const fn = highlighted.filter || null;
    return (pos) =>
      keys.has(pos.key) || pcs.has(pos.pc) || (fn ? fn(pos) : false);
  }
  return () => false;
}

function normalizeRootPredicate(root) {
  if (root == null) return () => false;
  if (typeof root === "number") {
    const targetPc = mod(root);
    return (pos) => pos.pc === targetPc;
  }
  if (typeof root === "string") {
    if (root.includes(":")) {
      return (pos) => pos.key === root;
    }
    try {
      const targetPc = parseNote(root).pc;
      return (pos) => pos.pc === targetPc;
    } catch (_) {
      return () => false;
    }
  }
  if (Array.isArray(root) || root instanceof Set) {
    const set = new Set([...root]);
    return (pos) => set.has(pos.key) || set.has(pos.pc);
  }
  return () => false;
}

function normalizeBluePredicate(blueNotes) {
  if (!blueNotes) return () => false;
  if (typeof blueNotes === "number") {
    const pc = mod(blueNotes);
    return (pos) => pos.pc === pc;
  }
  if (Array.isArray(blueNotes) || blueNotes instanceof Set) {
    const pcs = new Set();
    const keys = new Set();
    [...blueNotes].forEach((item) => {
      if (typeof item === "number") pcs.add(mod(item));
      else if (typeof item === "string" && item.includes(":")) keys.add(item);
      else if (item && typeof item === "object" && item.key) keys.add(item.key);
    });
    return (pos) => keys.has(pos.key) || pcs.has(pos.pc);
  }
  return () => false;
}

export function renderFretboard({
  container,
  highlighted = null,
  root = null,
  colors = {},
  clickable = true,
  onNoteClick = null,
  maxFret = 12,
  showAll = false,
  selected = null,
  blueNotes = null,
  boxes = [],
  names = {},
  fingerMap = null,
  questionKey = null,
  correctKeys = null,
  wrongKeys = null,
  statusId = null,
  muteSound = false,
} = {}) {
  const el = resolveContainer(container);
  if (!el) return;

  const previousFocus = el.contains(document.activeElement)
    ? document.activeElement.getAttribute("data-pos")
    : null;

  const isHighlighted = normalizeHighlightPredicate(highlighted);
  const isRootMatch = normalizeRootPredicate(root);
  const isBlueMatch = normalizeBluePredicate(blueNotes);
  const selectedSet = selected ? new Set([...selected]) : new Set();
  const correctSet = correctKeys ? new Set([...correctKeys]) : new Set();
  const wrongSet = wrongKeys ? new Set([...wrongKeys]) : new Set();

  const palette = {
    idleFill: "var(--fb-idle-fill, #fbfaf4)",
    idleStroke: "var(--fb-idle-stroke, #deddd1)",
    idleText: "var(--fb-idle-text, #8d998a)",
    noteFill: "var(--fb-note-fill, #c9ddb5)",
    noteStroke: "var(--fb-note-stroke, #a9c690)",
    noteText: "var(--fb-note-text, #284b34)",
    rootFill: "var(--fb-root-fill, #376b53)",
    rootStroke: "var(--fb-root-stroke, #2b5642)",
    rootText: "var(--fb-root-text, #ffffff)",
    blueFill: "var(--fb-blue-fill, #c84b31)",
    blueStroke: "var(--fb-blue-stroke, #a33822)",
    blueText: "#ffffff",
    selectedFill: "var(--fb-selected-fill, #eebf8e)",
    selectedStroke: "var(--fb-selected-stroke, #d69c63)",
    selectedText: "#4c3422",
    correctFill: "#4d8b55",
    correctStroke: "#386b3f",
    wrongFill: "#c95b46",
    wrongStroke: "#a4412f",
    ...colors,
  };

  const x0 = 136;
  const fretWidth = maxFret > 12 ? 60 : 69;
  const top = 60;
  const gap = 36;
  const boardHeight = 218;
  const right = x0 + maxFret * fretWidth;
  const svgWidth = right + 34;
  const svgHeight = 294;

  const fretCenterX = (fret) =>
    fret === 0 ? x0 - 34 : x0 + (fret - 0.5) * fretWidth;

  const fretBoxLeft = (fret) =>
    fret === 0 ? x0 - 52 : x0 + (fret - 1) * fretWidth + 3;

  const fretBoxRight = (fret) =>
    fret === 0 ? x0 - 14 : x0 + fret * fretWidth - 3;

  const parts = [
    `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Гитарный гриф: 1-я струна сверху, лады 0–${maxFret}">`,
    `<rect x="${x0}" y="40" width="${maxFret * fretWidth}" height="${boardHeight}" rx="8" fill="var(--fb-wood, #efe9d9)" stroke="var(--fb-wood-border, #e3ddcb)"/>`,
    `<rect x="${x0 - 3.5}" y="40" width="7" height="${boardHeight}" rx="2" fill="var(--fb-nut, #b6bba7)"/>`,
  ];

  // Маркеры ладов (точки на 3, 5, 7, 9, 12, 15 ладах)
  [3, 5, 7, 9, 15]
    .filter((f) => f <= maxFret)
    .forEach((fret) => {
      parts.push(
        `<circle cx="${x0 + (fret - 0.5) * fretWidth}" cy="149" r="5" fill="var(--fb-inlay, #dcd7c4)"/>`,
      );
    });
  if (maxFret >= 12) {
    [113, 185].forEach((y) => {
      parts.push(
        `<circle cx="${x0 + 11.5 * fretWidth}" cy="${y}" r="5" fill="var(--fb-inlay, #dcd7c4)"/>`,
      );
    });
  }

  // Ладовые порожки
  for (let fret = 1; fret <= maxFret; fret++) {
    const x = x0 + fret * fretWidth;
    parts.push(
      `<line x1="${x}" y1="40" x2="${x}" y2="${40 + boardHeight}" stroke="var(--fb-fret, #c2bfaf)" stroke-width="${fret === 12 ? 2.6 : 1.8}"/>`,
    );
  }

  // Полупрозрачные области боксов / позиций / обращений (поверх дерева, но под струнами и нотами)
  if (Array.isArray(boxes) && boxes.length) {
    boxes.forEach((box, idx) => {
      const bx1 = fretBoxLeft(Math.max(0, box.minFret));
      const bx2 = fretBoxRight(Math.min(maxFret, box.maxFret));
      const bw = Math.max(28, bx2 - bx1);
      const col = box.color || "#376b53";
      const fillOpacity = box.active ? "0.20" : "0.10";
      const strokeOpacity = box.active ? "0.82" : "0.45";
      const badgeY = idx % 2 === 0 ? 35 : 274;
      parts.push(
        `<g class="fb-box-overlay" aria-hidden="true">`,
        `<rect x="${bx1}" y="44" width="${bw}" height="${boardHeight - 8}" rx="9" fill="${col}" fill-opacity="${fillOpacity}" stroke="${col}" stroke-opacity="${strokeOpacity}" stroke-width="${box.active ? 2 : 1.2}" stroke-dasharray="${box.active ? "none" : "4 3"}"/>`,
        box.label
          ? `<text x="${bx1 + bw / 2}" y="${badgeY}" text-anchor="middle" fill="${col}" font-family="Inter, Arial, sans-serif" font-size="9.5" font-weight="800">${escapeHTML(box.label)}</text>`
          : "",
        `</g>`,
      );
    });
  }

  // Номера ладов сверху
  for (let fret = 0; fret <= maxFret; fret++) {
    const x = fretCenterX(fret);
    parts.push(
      `<text x="${x}" y="22" text-anchor="middle" fill="var(--fb-label, #94a395)" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="700">${fret}</text>`,
    );
  }

  // Струны и интерактивные кружки нот
  STRINGS.forEach((string, s) => {
    const y = top + s * gap;
    parts.push(
      `<text x="28" y="${y + 4}" text-anchor="middle" fill="var(--fb-string-name, #647c67)" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700">${string.name}</text>`,
      `<text x="50" y="${y + 3}" text-anchor="middle" fill="var(--fb-label, #a8b4a6)" font-family="Inter, Arial, sans-serif" font-size="9">${s + 1}</text>`,
      `<line x1="66" y1="${y}" x2="${right}" y2="${y}" stroke="var(--fb-string, #b7b8a8)" stroke-width="${1 + s * 0.24}"/>`,
    );

    for (let fret = 0; fret <= maxFret; fret++) {
      const x = fretCenterX(fret);
      const midi = string.midi + fret;
      const pc = mod(midi);
      const key = `${s}:${fret}`;
      const pitchName = names[pc] || CHROMATIC[pc];
      const position = { string: s, fret, midi, pc, key, name: pitchName };

      const isBlue = isBlueMatch(position);
      const active = isHighlighted(position) || isBlue;
      const chosen = selectedSet.has(key);
      const isQuestion = questionKey === key;
      const isCorrectMark = correctSet.has(key);
      const isWrongMark = wrongSet.has(key);
      const visible =
        showAll ||
        active ||
        chosen ||
        isQuestion ||
        isCorrectMark ||
        isWrongMark;
      const isRoot = (active || showAll) && active && isRootMatch(position);

      let fill = palette.idleFill;
      let stroke = palette.idleStroke;
      let text = palette.idleText;

      if (active) {
        fill = palette.noteFill;
        stroke = palette.noteStroke;
        text = palette.noteText;
      }
      if (isBlue) {
        fill = palette.blueFill;
        stroke = palette.blueStroke;
        text = palette.blueText;
      }
      if (isRoot || isQuestion) {
        fill = palette.rootFill;
        stroke = palette.rootStroke;
        text = palette.rootText;
      }
      if (chosen) {
        fill = palette.selectedFill;
        stroke = palette.selectedStroke;
        text = palette.selectedText;
      }
      if (isCorrectMark) {
        fill = palette.correctFill;
        stroke = palette.correctStroke;
        text = "#ffffff";
      }
      if (isWrongMark) {
        fill = palette.wrongFill;
        stroke = palette.wrongStroke;
        text = "#ffffff";
      }
      if (colors.positionColors && colors.positionColors[key]) {
        fill = colors.positionColors[key];
        stroke = colors.positionColors[key];
        text = "#ffffff";
      }
      if (!visible) {
        fill = "transparent";
        stroke = "transparent";
        text = "transparent";
      }

      const fingerBadge = fingerMap && fingerMap[key] ? fingerMap[key] : null;
      const label = isQuestion ? "?" : prettyNote(pitchName);
      const aria = isQuestion
        ? `Загаданная нота: ${describePosition(position)}`
        : `${describePosition(position)}, ${writtenNote(pitchName, midi)}${isBlue ? ", блюзовая нота" : ""}`;

      const radius = isRoot || isBlue || isQuestion ? 14.5 : 13.8;
      parts.push(
        `<g class="${clickable ? "fret-click" : "fret-static"}" ${
          clickable ? 'role="button" tabindex="0"' : ""
        } data-pos="${key}" aria-label="${escapeHTML(aria)}">`,
        `<circle class="note-disc" cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`,
        `<text x="${x}" y="${y + 3.8}" text-anchor="middle" fill="${text}" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="${label.length > 2 ? 8.8 : 10.4}">${escapeHTML(label)}</text>`,
        fingerBadge && visible
          ? `<circle cx="${x + 11}" cy="${y - 10}" r="6.2" fill="var(--fb-finger-bg, #243b2f)"/><text x="${x + 11}" y="${y - 7.5}" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="7.5" font-weight="800">${escapeHTML(fingerBadge)}</text>`
          : "",
        `</g>`,
      );
    }
  });

  parts.push(
    `<text x="30" y="284" text-anchor="middle" fill="var(--fb-label, #a3b0a1)" font-family="Inter, Arial, sans-serif" font-size="8" font-weight="700">СТРУНЫ</text>`,
    `<text x="${right}" y="284" text-anchor="end" fill="var(--fb-label, #a3b0a1)" font-family="Inter, Arial, sans-serif" font-size="8" font-weight="700">ЛАДЫ 0–${maxFret}</text>`,
    `</svg>`,
  );

  el.innerHTML = parts.join("");

  if (!clickable) {
    el.onclick = null;
    el.onkeydown = null;
    return;
  }

  function handleActivate(target, event) {
    const group = target.closest("[data-pos]");
    if (!group || !el.contains(group)) return;
    const [s, f] = group.dataset.pos.split(":").map(Number);
    const midi = STRINGS[s].midi + f;
    const pc = mod(midi);
    const name = names[pc] || CHROMATIC[pc];
    const position = {
      string: s,
      fret: f,
      midi,
      pc,
      key: group.dataset.pos,
      name,
    };

    if (statusId) {
      const statusEl = document.getElementById(statusId);
      if (statusEl) {
        statusEl.textContent = `${writtenNote(name, midi)} · ${describePosition(position)}`;
      }
    }

    if (!muteSound && audioPlayCallback) {
      audioPlayCallback(midi);
    }

    if (onNoteClick) {
      onNoteClick(position, event);
    }
  }

  el.onclick = (event) => handleActivate(event.target, event);
  el.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate(event.target, event);
    }
  };

  if (previousFocus) {
    const replacement = el.querySelector(`[data-pos="${previousFocus}"]`);
    if (replacement) replacement.focus({ preventScroll: true });
  }
}
