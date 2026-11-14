/*
 * 12. ТРЕНАЖЁР: АККОРДЫ НА СЛУХ
 *
 * Восемь типов аккордов (трезвучия, увеличенное/уменьшённое, maj7, m7, 7,
 * m7♭5, dim7), два режима — «по очереди» (арпеджио) и «вместе».
 * Статистика по типам, расшифровка прозвучавших нот.
 */
import {
  TRIADS, SEVENTHS, makeChord, findVoicings,
} from "../../core/chords.js";
import { playChord, strum } from "../../core/audio.js";
import { accuracy, weakChords } from "../../core/storage.js";
import { byId } from "../dom.js";
import { createTrainer } from "../trainer.js";
import { recordChord, getProgress, update } from "../state.js";

// Набор для тренажёра: 8 типов, самые узнаваемые.
const TYPES = [
  ...TRIADS.map((type) => ({ ...type, group: "Трезвучия" })),
  ...SEVENTHS.filter((type) => ["maj7", "m7", "dom7", "half", "dim7"].includes(type.id))
    .map((type) => ({ ...type, group: "Септаккорды" })),
];

// Корни для задания: без крайностей, чтобы аккорды звучали в удобной тесситуре.
const ROOT_NAMES = ["C", "D", "E", "F", "G", "A", "Bb"];

const MODES = [
  { id: "broken", label: "По очереди (арпеджио)", play: "broken" },
  { id: "together", label: "Одновременно (аккорд)", play: "together" },
  { id: "strum", label: "Боем по струнам (гитара)", play: "strum" },
];

let trainer = null;

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> СЛУХОВОЙ ТРЕНАЖЁР</div>
          <h2>Аккорды: мажор, минор и всё интереснее</h2>
          <p>Слушай аккорд и определяй его тип. После ответа — расшифровка: какие ноты прозвучали и почему аккорд так называется.</p>
        </div>
        <span class="streak-badge" id="chord-global-streak">серия: 0</span>
      </div>
      <div class="info-strip">
        <span class="chip">мaj7 — светло и «дорого»</span>
        <span class="chip">7 — напряжение, тянет в тонику</span>
        <span class="chip">m7♭5 — тревожно, «полупусто»</span>
        <span class="chip">°7 — максимально неустойчиво</span>
      </div>
    </div>

    <div id="ear-chord-trainer"></div>

    <div class="panel board-panel" style="margin-top:22px">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ПРОГРЕСС</div>
          <h2>Точность по типам аккордов</h2>
          <p>Если какой-то тип проваливается — вернись в разделы 03 и 04 и послушай его отдельно.</p>
        </div>
        <button class="button button-ghost button-small" id="chord-reset-stats" type="button">Сбросить статистику раздела</button>
      </div>
      <div id="chord-stats"></div>
    </div>

    <div class="section-title">
      <div>
        <div class="overline">ШПАРГАЛКА</div>
        <h2>Как отличить <em>на слух.</em></h2>
      </div>
    </div>
    <div class="theory-grid two">
      <article class="lesson-card">
        <h3>Сначала — трезвучие</h3>
        <p>Любой септаккорд начинается с трезвучия. Слушай «низ» аккорда: мажор звучит светло, минор — темнее. Увеличенное трезвучие «выпирает» вверх, уменьшённое — сжимается.</p>
        <div class="plain-block"><b>На пальцах:</b> C (C–E–G), Cm (C–E♭–G), C+ (C–E–G♯), C° (C–E♭–G♭). Разница — в одной ноте.</div>
      </article>
      <article class="lesson-card">
        <h3>Потом — септима</h3>
        <p>Большая септима (maj7) звучит «киношно», малая (7) — «блюзово», уменьшённая (°7) — максимально остро. m7♭5 — «полупустой» аккорд с намёком на тревогу.</p>
        <div class="plain-block"><b>На пальцах:</b> Cmaj7 = C–E–G–B, C7 = C–E–G–B♭. Разница — полутон, а настроение совсем другое.</div>
      </article>
    </div>
  `;

  trainer = createTrainer({
    container: byId("ear-chord-trainer"),
    config: {
      id: "ear-chords",
      overline: "ТРЕНАЖЁР / 12",
      title: "Слушай и определяй аккорд",
      description: "Один вопрос — один ответ. Правильный вариант подсветится, а ниже появится расшифровка нот.",
      answerLabel: "ВЫБЕРИ ТИП АККОРДА",
      settingsSchema: {
        fields: [
          {
            key: "mode", label: "Как звучит", type: "select", value: "together",
            options: MODES.map((mode) => ({ value: mode.id, label: mode.label })),
          },
          {
            key: "instrument", label: "Тембр", type: "select", value: "guitar",
            options: [
              { value: "guitar", label: "Гитара (синтез)" },
              { value: "piano", label: "Пиано (синтез)" },
            ],
          },
          {
            key: "register", label: "Тесситура", type: "select", value: "mid",
            options: [
              { value: "low", label: "Низко (C3–B3)" },
              { value: "mid", label: "Средне (C4)" },
              { value: "high", label: "Высоко (C5)" },
            ],
          },
        ],
        sets: TYPES.map((type) => ({
          id: type.id,
          label: type.symbol || type.short,
          title: type.name,
          default: ["major", "minor", "dom7", "maj7"].includes(type.id),
        })),
      },
      shareText: (session) =>
        `Моя серия в аккордах: ${session.best} подряд! ${session.correct} из ${session.asked} верно. Ладно.`,
    },

    createQuestion(settings) {
      const ids = Object.entries(settings.sets || {}).filter(([, on]) => on).map(([id]) => id);
      const pool = TYPES.filter((type) => ids.includes(type.id));
      if (!pool.length) return null;
      const type = pool[Math.floor(Math.random() * pool.length)];
      const root = ROOT_NAMES[Math.floor(Math.random() * ROOT_NAMES.length)];
      const chord = makeChord(root, type);
      const registerShift = settings.register === "low" ? 0 : settings.register === "high" ? 24 : 12;
      const midis = chord.notes.map((note) => note.midi + registerShift);
      const voicing = findVoicings(chord.notes)[0];
      const mode = MODES.find((item) => item.id === settings.mode) || MODES[1];

      const distractors = TYPES.filter((item) => item.id !== type.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [type, ...distractors]
        .map((item) => ({ value: item.id, label: item.name, sub: item.symbol || "—" }))
        .sort(() => Math.random() - 0.5);

      return {
        chord, type, midis, mode,
        options,
        correct: type.id,
        correctLabel: `${type.name} (${type.symbol || "трезвучие"})`,
        autoPlay: false,
        prompt: `Послушай аккорд (${mode.label.toLowerCase()}) и определи тип.`,
        hint: "Сначала послушай, потом выбери. Расшифровка появится после ответа.",
        play: () => {
          if (mode.play === "broken") {
            playChord([midis[0]], 0.7);
            midis.forEach((midi, index) => {
              setTimeout(() => playChord([midi], 0.6), index * 240);
            });
          } else if (mode.play === "strum" && voicing) {
            strum(voicing.positions.map((p) => p.midi + (registerShift - 12)), 1.8);
          } else {
            playChord(midis, 1.8);
          }
        },
        feedback(correct) {
          return correct
            ? `Верно! ${chord.symbol} — ${type.name}. ${type.description}`
            : `Это ${chord.symbol} — ${type.name}. ${type.description}`;
        },
        explain() {
          return `
            <b>Прозвучали:</b> ${chord.notes.map((note) => `${note.name}`).join(" – ")} (${chord.symbol}).
            <br><b>Формула:</b> ${type.offsets.join(" + ")} полутонов от корня.
            <br><b>На пальцах:</b> ${type.tip}
            <br><b>Типичная ошибка:</b> ${type.mistake}`;
        },
      };
    },

    onAnswer(settings, question, correct) {
      recordChord(question.type.id, correct);
      const badge = byId("chord-global-streak");
      if (badge) badge.textContent = `серия: ${getProgress().streak}`;
    },

    getStats: () => getProgress(),

    renderStats(progress) {
      const box = byId("chord-stats");
      if (!box) return "";
      const rows = TYPES.map((type) => {
        const value = progress.earChords?.[type.id] || { correct: 0, mistakes: 0 };
        const total = value.correct + value.mistakes;
        return { type, ...value, total, accuracy: accuracy(value.correct, value.mistakes) };
      });
      const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
      const totalMistakes = rows.reduce((sum, row) => sum + row.mistakes, 0);
      const weak = weakChords(progress, TYPES, 2);

      box.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-label">Всего ответов</div><div class="stat-value">${totalCorrect + totalMistakes}</div></div>
          <div class="stat-card good"><div class="stat-label">Точность</div><div class="stat-value">${accuracy(totalCorrect, totalMistakes)}<small>%</small></div></div>
          <div class="stat-card bad"><div class="stat-label">Ошибок</div><div class="stat-value">${totalMistakes}</div></div>
          <div class="stat-card"><div class="stat-label">Слабый тип</div><div class="stat-value" style="font-size:15px">${weak[0] ? weak[0].type.symbol || weak[0].type.short : "—"}</div></div>
        </div>
        <div class="table-wrap" style="margin-top:14px">
          <table class="data">
            <thead><tr><th>Аккорд</th><th>Название</th><th class="num">Верно</th><th class="num">Ошибок</th><th class="num">Точность</th></tr></thead>
            <tbody>${rows.map((row) => `
              <tr>
                <td><strong>${row.type.symbol || row.type.short}</strong></td>
                <td>${row.type.name}</td>
                <td class="num">${row.correct}</td>
                <td class="num">${row.mistakes}</td>
                <td class="num">${row.total ? row.accuracy + "%" : "—"}</td>
              </tr>`).join("")}</tbody>
          </table>
        </div>`;
      return `<div class="chip muted">Верно ${totalCorrect} из ${totalCorrect + totalMistakes} за всё время</div>`;
    },
  });

  byId("chord-reset-stats").addEventListener("click", () => {
    if (!window.confirm("Сбросить статистику только по аккордам?")) return;
    update((current) => ({ ...current, earChords: {} }), "reset-section");
    trainer.render();
  });

  trainer.render();
}

export function onShow() {
  const badge = byId("chord-global-streak");
  if (badge) badge.textContent = `серия: ${getProgress().streak}`;
  trainer?.render();
}
