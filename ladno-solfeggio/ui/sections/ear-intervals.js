/*
 * 11. ТРЕНАЖЁР СЛУХА: ИНТЕРВАЛЫ
 *
 * Все 12 интервалов, четыре режима звучания, настройки диапазона и темпа,
 * статистика «интервал × режим» и топ слабых мест.
 *
 * Вся работа со статистикой — через ui/trainer.js и core/storage.js,
 * чтобы формат данных не расходился между разделами.
 */
import { INTERVALS } from "../../core/chords.js";
import { semiText } from "../../core/notes.js";
import { playIntervalAudio, setInstrument } from "../../core/audio.js";
import { accuracy, intervalTable, weakIntervals } from "../../core/storage.js";
import { byId } from "../dom.js";
import { createTrainer, intervalStatsTable } from "../trainer.js";
import { recordInterval, getProgress, update } from "../state.js";

// Режимы звучания.
const MODES = [
  { id: "up", short: "↑ вверх", label: "Восходящий (снизу вверх)", play: "up" },
  { id: "down", short: "↓ вниз", label: "Нисходящий (сверху вниз)", play: "down" },
  { id: "harm", short: "◍ гарм.", label: "Гармонический (вместе)", play: "together" },
  { id: "round", short: "↔ туда-обр.", label: "Мелодический «туда-обратно»", play: "round" },
];

let trainer = null;

export function mount(container) {
  container.innerHTML = `
    <div class="panel board-panel">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> СЛУХОВОЙ ТРЕНАЖЁР</div>
          <h2>Интервалы: настройки и сессия</h2>
          <p>Выбери набор интервалов, режим звучания, темп и тембр. Статистика копится отдельно по каждому интервалу и режиму.</p>
        </div>
        <span class="streak-badge" id="ear-global-streak">серия: 0</span>
      </div>

      <ul class="melody-tips" style="margin:12px 0 0;padding-left:16px;color:var(--muted);font-size:11.5px;line-height:1.8">
        <li><b>Как учиться:</b> начни с трёх интервалов (ч.5, б.3, м.3) в режиме «вверх». Дойди до 80% — добавляй следующий.</li>
        <li><b>Не угадывай:</b> лучше нажать «Слушать ещё раз», чем случайный ответ. Ошибка без сомнения не учит ничему.</li>
        <li><b>Пой или напевай:</b> интервал запоминается через движение голоса, а не через название.</li>
      </ul>
    </div>

    <div id="ear-interval-trainer"></div>

    <div class="panel board-panel" style="margin-top:22px">
      <div class="panel-heading">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ПРОГРЕСС</div>
          <h2>Слабые места и полная таблица</h2>
          <p>Обновляется после каждого ответа. Пустые клетки — ещё не было попыток.</p>
        </div>
        <button class="button button-ghost button-small" id="ear-reset-stats" type="button">Сбросить статистику раздела</button>
      </div>
      <div class="stat-tables" id="ear-weak"></div>
      <div class="stat-tables" id="ear-table"></div>
      <p class="notation-note">Сброс касается только интервалов. Общий сброс всего прогресса — в подвале страницы.</p>
    </div>
  `;

  trainer = createTrainer({
    container: byId("ear-interval-trainer"),
    config: {
      id: "ear-intervals",
      overline: "ТРЕНАЖЁР / 11",
      title: "Слушай и выбирай интервал",
      description: "Одна попытка — один ответ. «Слушать ещё раз» не считается ошибкой.",
      answerLabel: "ВЫБЕРИ ИНТЕРВАЛ",
      settingsSchema: {
        fields: [
          {
            key: "mode", label: "Режим звучания", type: "select",
            value: "up",
            options: MODES.map((mode) => ({ value: mode.id, label: mode.label })),
          },
          {
            key: "tempo", label: "Пауза между нотами", type: "select",
            value: "0.75",
            options: [
              { value: "1.1", label: "Медленно (1.1 с)" },
              { value: "0.75", label: "Средне (0.75 с)" },
              { value: "0.45", label: "Быстро (0.45 с)" },
            ],
          },
          {
            key: "instrument", label: "Тембр", type: "select",
            value: "guitar",
            options: [
              { value: "guitar", label: "Гитара (синтез)" },
              { value: "piano", label: "Пиано (синтез)" },
            ],
          },
          {
            key: "range", label: "Диапазон первой ноты", type: "select",
            value: "mid",
            options: [
              { value: "low", label: "Низкий (C3–B3)" },
              { value: "mid", label: "Средний (C3–B4)" },
              { value: "high", label: "Высокий (C4–B4)" },
            ],
          },
          {
            key: "direction", label: "Режимы в сессии", type: "select",
            value: "selected",
            options: [
              { value: "selected", label: "Только выбранный режим" },
              { value: "mixed", label: "Смешивать все 4 режима" },
            ],
          },
        ],
        sets: [
          { id: "m2", label: "м.2", default: false },
          { id: "M2", label: "б.2", default: true },
          { id: "m3", label: "м.3", default: true },
          { id: "M3", label: "б.3", default: true },
          { id: "P4", label: "ч.4", default: true },
          { id: "TT", label: "тритон", default: false },
          { id: "P5", label: "ч.5", default: true },
          { id: "m6", label: "м.6", default: false },
          { id: "M6", label: "б.6", default: false },
          { id: "m7", label: "м.7", default: false },
          { id: "M7", label: "б.7", default: false },
          { id: "P8", label: "ч.8", default: true },
        ],
      },
      shareText: (session) =>
        `Моя серия в интервалах: ${session.best} подряд! ${session.correct} из ${session.asked} верно. Учусь по «Ладно».`,
    },

    // Вопрос собирается из выбранных интервалов и режима.
    createQuestion(settings) {
      const ids = Object.entries(settings.sets || {}).filter(([, on]) => on).map(([id]) => id);
      const pool = INTERVALS.filter((item) => ids.includes(item.id));
      if (!pool.length) return null;
      const interval = pool[Math.floor(Math.random() * pool.length)];
      const mode = settings.direction === "mixed"
        ? MODES[Math.floor(Math.random() * MODES.length)]
        : MODES.find((item) => item.id === settings.mode) || MODES[0];
      const ranges = {
        low: [48, 59],
        mid: [48, 71],
        high: [60, 71],
      };
      const [min, max] = ranges[settings.range] || ranges.mid;
      const lowMidi = min + Math.floor(Math.random() * Math.max(1, max - min + 1));
      const highMidi = lowMidi + interval.semitones;

      // Варианты ответа: правильный + 3 «похожих» из выбранного пула,
      // чтобы не подсказывать ответ размером списка.
      const distractors = pool.filter((item) => item.id !== interval.id);
      const fallback = INTERVALS.filter((item) => !ids.includes(item.id));
      const candidates = distractors.length >= 3 ? distractors : [...distractors, ...fallback];
      const picked = [];
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      while (picked.length < 3 && shuffled.length) picked.push(shuffled.shift());

      const options = [interval, ...picked].map((item) => ({
        value: item.id,
        label: item.short,
        sub: item.name.replace(/^(Малая|Большая|Чистая|Тритон \(увел\.|Тритон)/, (match) => match),
      }));

      return {
        interval, mode, lowMidi, highMidi,
        options: [...options].sort(() => Math.random() - 0.5),
        correct: interval.id,
        correctLabel: `${interval.short} — ${interval.name}`,
        autoPlay: false,
        prompt: `Послушай интервал${settings.direction === "mixed" ? "" : " (" + mode.label.toLowerCase() + ")"} и выбери его.`,
        hint: "Нажми «Слушать», затем выбери вариант. Можно слушать повторно — это не ошибка.",
        play: () => {
          playIntervalAudio(lowMidi, highMidi, mode.play, Number(settings.tempo) || 0.75);
          ensureInstrument(settings.instrument);
        },
        feedback(correct) {
          return correct
            ? `Верно! ${interval.short} — ${interval.name}, ${semiText(interval.semitones)}. ${interval.character}`
            : `Это ${interval.short} — ${interval.name}, ${semiText(interval.semitones)}. ${interval.tip}`;
        },
        explain(correct) {
          const nameOf = (midi) => {
            const names = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
            return names[midi % 12];
          };
          return `
            <b>Расшифровка:</b> ${nameOf(lowMidi)} → ${nameOf(highMidi)} · ${semiText(interval.semitones)} · режим «${mode.label}».
            <br><b>Характер:</b> ${interval.character}
            <br><b>На пальцах:</b> ${interval.tip}
            <br><b>Типичная ошибка:</b> ${interval.mistake}
            ${correct ? "" : `<br><b>Запомни:</b> ${interval.feel} — это ключевая краска этого интервала.`}`;
        },
      };
    },

    onAnswer(settings, question, correct) {
      // Один ответ = одна запись в статистику «интервал × режим».
      recordInterval(question.interval.id, question.mode.id, correct);
      updateGlobalStreak();
    },

    getStats() {
      return getProgress();
    },

    renderStats(progress, settings) {
      const ids = Object.entries(settings.sets || {}).filter(([, on]) => on).map(([id]) => id);
      const selected = INTERVALS.filter((item) => ids.includes(item.id));
      const rows = intervalTable(progress, selected.length ? selected : INTERVALS, MODES);
      const weak = weakIntervals(progress, INTERVALS, 2);
      const totalCorrect = INTERVALS.reduce((sum, interval) => {
        const modes = Object.values(progress.earIntervals?.[interval.id] || {});
        return sum + modes.reduce((acc, item) => acc + (item.correct || 0), 0);
      }, 0);
      const totalMistakes = INTERVALS.reduce((sum, interval) => {
        const modes = Object.values(progress.earIntervals?.[interval.id] || {});
        return sum + modes.reduce((acc, item) => acc + (item.mistakes || 0), 0);
      }, 0);
      const percent = accuracy(totalCorrect, totalMistakes);

      // Побочный эффект: рисуем большие блоки в отдельные контейнеры страницы.
      const weakBox = byId("ear-weak");
      const tableBox = byId("ear-table");
      if (weakBox) {
        weakBox.innerHTML = `
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-label">Всего ответов</div><div class="stat-value">${totalCorrect + totalMistakes}</div></div>
            <div class="stat-card good"><div class="stat-label">Верно</div><div class="stat-value">${totalCorrect}<small> (${percent}%)</small></div></div>
            <div class="stat-card bad"><div class="stat-label">Ошибок</div><div class="stat-value">${totalMistakes}</div></div>
            <div class="stat-card"><div class="stat-label">Лучшая серия</div><div class="stat-value">${progress.bestStreak}</div></div>
          </div>
          <div class="weak-list">
            ${weak.length ? weak.map((item) => `
              <div class="weak-item">
                <span><b>${item.interval.short}</b> · ${item.interval.name} <span style="color:var(--muted);font-size:10px">(${item.total} попыток)</span></span>
                <span class="weak-acc ${item.accuracy >= 75 ? "good" : ""}">${item.accuracy}%</span>
              </div>`).join("")
              : `<p style="margin:0;color:var(--muted);font-size:11px">Слабых мест пока нет: нужно минимум 2 попытки по интервалу.</p>`}
          </div>`;
      }
      if (tableBox) {
        tableBox.innerHTML = `
          <h3 style="margin:6px 0 8px;font-size:13px">Таблица: интервал × режим</h3>
          ${intervalStatsTable(rows, MODES)}
          <p class="notation-note">Всего по выбранным интервалам: ${totalCorrect} верно, ${totalMistakes} ошибок.</p>`;
      }
      return `<div class="chip muted">Сессия: ${trainer?.session.correct || 0} из ${trainer?.session.asked || 0} · точность ${accuracy(totalCorrect, totalMistakes)}% за всё время</div>`;
    },

    onStop() {
      updateGlobalStreak();
    },
  });

  byId("ear-reset-stats").addEventListener("click", () => {
    if (!window.confirm("Сбросить статистику только по интервалам?")) return;
    resetIntervalStats();
  });

  trainer.render();
  updateGlobalStreak();
}

function ensureInstrument(instrument) {
  // Тембр меняется через общий модуль звука; вызывать часто безопасно.
  setInstrument(instrument);
}

function updateGlobalStreak() {
  const progress = getProgress();
  const badge = byId("ear-global-streak");
  if (badge) badge.textContent = `серия: ${progress.streak}`;
}

function resetIntervalStats() {
  update((current) => ({ ...current, earIntervals: {} }), "reset-section");
  trainer?.render();
}
