/*
 * ui/staff.js — отрисовка нотного стана через VexFlow 4.2 (CDN)
 * с полноценным автономным SVG-резервом при отсутствии сети.
 * Поддерживает одиночные ноты, гаммы (с умной постановкой бекара ♮ после альтерации),
 * многозвучные аккорды и режим гитарной октавной транспозиции (+12 полутонов в записи).
 */

import {
  LETTERS,
  parseNote,
  prettyNote,
  writtenOctave,
  escapeHTML,
} from "../data/notes.js";

function resolveTarget(container) {
  if (!container) return null;
  return typeof container === "string"
    ? document.getElementById(container)
    : container;
}

export function renderStaff(container, notes, chord = false, options = {}) {
  const target = resolveTarget(container);
  if (!target || !Array.isArray(notes) || !notes.length) return;
  target.innerHTML = "";

  const octaveTranspose = options.guitarTransposition ? 12 : 0;
  const width = options.width || (notes.length === 1 ? 360 : 700);
  const height = options.height || 195;

  const V = window.Vex && (window.Vex.Flow || window.Vex);
  if (V && V.Renderer && V.StaveNote) {
    try {
      const renderer = new V.Renderer(target, V.Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();
      const stave = new V.Stave(8, 22, width - 16);
      stave.addClef(options.guitarTransposition ? "treble" : "treble");
      if (options.timeSignature) {
        stave.addTimeSignature(options.timeSignature);
      }
      stave.setContext(context).draw();

      // Отслеживаем случайные знаки в такте, чтобы ставить бекар ♮ (например, Eb -> E♮ в блюзовой гамме).
      const activeAccidentals = {};

      function buildVexNote(group, customDuration = null) {
        const dur = customDuration || (chord ? "w" : group[0]?.duration || "q");
        const keys = group.map((note) => {
          const parsed = parseNote(note.name);
          const oct = writtenOctave(note.name, note.midi + octaveTranspose);
          return `${parsed.letter.toLowerCase()}${parsed.accidental}/${oct}`;
        });
        const tickable = new V.StaveNote({
          clef: "treble",
          keys,
          duration: dur,
        });

        group.forEach((note, index) => {
          const parsed = parseNote(note.name);
          const oct = writtenOctave(note.name, note.midi + octaveTranspose);
          const lineKey = `${parsed.letter}/${oct}`;
          const prevAcc = activeAccidentals[lineKey] || "";
          if (parsed.accidental) {
            tickable.addModifier(new V.Accidental(parsed.accidental), index);
            activeAccidentals[lineKey] = parsed.accidental;
          } else if (prevAcc !== "") {
            tickable.addModifier(new V.Accidental("n"), index);
            activeAccidentals[lineKey] = "";
          }
        });
        return tickable;
      }

      const tickables = chord
        ? [buildVexNote(notes, "w")]
        : notes.map((n) => buildVexNote([n], n.duration || "q"));

      // Используем мягкий голос (setStrict(false)), чтобы такты разной длины (5, 6, 8 нот) рисовались без ошибки переполнения.
      if (V.Voice && V.Formatter) {
        const voice = new V.Voice({
          num_beats: Math.max(1, tickables.length),
          beat_value: 4,
        }).setStrict(false);
        voice.addTickables(tickables);
        new V.Formatter().joinVoices([voice]).format([voice], width - 85);
        voice.draw(context, stave);
      } else {
        V.Formatter.FormatAndDraw(context, stave, tickables);
      }

      const svg = target.querySelector("svg");
      if (svg) {
        svg.classList.add("staff-svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("aria-hidden", "true");
        svg.style.width = "100%";
        svg.style.height = "auto";
      }
      return;
    } catch (error) {
      console.warn("VexFlow: переключение на резервный SVG-стан:", error);
      target.innerHTML = "";
    }
  }

  renderFallbackStaff(target, notes, chord, {
    width,
    height: 175,
    octaveTranspose,
  });
}

export function renderFallbackStaff(target, notes, chord, opts = {}) {
  const width = opts.width || 700;
  const height = opts.height || 175;
  const octaveTranspose = opts.octaveTranspose || 0;
  const bottom = 95;
  const strokeMain = "var(--staff-ink, #304c39)";
  const strokeLine = "var(--staff-line, #9da89b)";

  const parts = [
    `<svg class="staff-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`,
  ];

  for (let i = 0; i < 5; i++) {
    parts.push(
      `<line x1="12" x2="${width - 12}" y1="${55 + i * 10}" y2="${55 + i * 10}" stroke="${strokeLine}" stroke-width="1.1"/>`,
    );
  }
  parts.push(
    `<text x="22" y="99" fill="${strokeMain}" font-family="Georgia, serif" font-size="54">𝄞</text>`,
  );

  const prevAccByLine = {};
  notes.forEach((note, i) => {
    const parsed = parseNote(note.name);
    const octave = writtenOctave(note.name, note.midi + octaveTranspose);
    const index = octave * 7 + LETTERS.indexOf(parsed.letter);
    const y = bottom - (index - (4 * 7 + 2)) * 5;
    const usableW = Math.max(120, width - 140);
    const x = chord
      ? Math.min(220, width / 2) + (i % 2) * 3
      : notes.length === 1
        ? width / 2 + 12
        : 98 + i * (usableW / Math.max(1, notes.length - 1));

    for (let ledger = 105; ledger <= y; ledger += 10) {
      parts.push(
        `<line x1="${x - 12}" x2="${x + 12}" y1="${ledger}" y2="${ledger}" stroke="${strokeMain}" stroke-width="1.1"/>`,
      );
    }
    for (let ledger = 45; ledger >= y; ledger -= 10) {
      parts.push(
        `<line x1="${x - 12}" x2="${x + 12}" y1="${ledger}" y2="${ledger}" stroke="${strokeMain}" stroke-width="1.1"/>`,
      );
    }

    const lineKey = `${parsed.letter}/${octave}`;
    let accDisplay = "";
    if (parsed.accidental) {
      accDisplay = prettyNote(parsed.accidental);
      prevAccByLine[lineKey] = parsed.accidental;
    } else if (prevAccByLine[lineKey]) {
      accDisplay = "♮";
      prevAccByLine[lineKey] = "";
    }

    if (accDisplay) {
      parts.push(
        `<text x="${x - 14}" y="${y + 5}" text-anchor="end" fill="${strokeMain}" font-family="Georgia, serif" font-size="16">${escapeHTML(accDisplay)}</text>`,
      );
    }

    parts.push(
      `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="4.6" transform="rotate(-15 ${x} ${y})" fill="${chord ? "var(--white, #fafbf7)" : strokeMain}" stroke="${strokeMain}" stroke-width="1.5"/>`,
    );
    if (!chord) {
      parts.push(
        `<line x1="${x + 6}" y1="${y}" x2="${x + 6}" y2="${y - 31}" stroke="${strokeMain}" stroke-width="1.4"/>`,
      );
    }
  });

  parts.push("</svg>");
  target.innerHTML = parts.join("");
}
