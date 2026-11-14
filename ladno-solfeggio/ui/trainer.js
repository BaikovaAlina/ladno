/*
 * UI: единый компонент «Тренажёр».
 *
 * Один и тот же сценарий используется в разделах 11 и 12 (и в других, где
 * нужен опрос): настройки → сессия → фидбек → статистика.
 *
 * Компонент не знает, что за вопросы: он получает `createQuestion(settings)`
 * и `renderQuestion(question)` — а прогресс и статистику ведёт `record`.
 *
 * Жизненный цикл:
 *   const trainer = createTrainer({ container, config, createQuestion, play, ... });
 *   trainer.render();      // рисует настройки и сессию
 *   trainer.start();       // начать новую сессию
 *   trainer.destroy();     // отписаться, остановить таймеры
 */
import { answerButtons, byId, el, fillSelect, makeOptions, setFeedback } from "./dom.js";
import { copyText, toast } from "./state.js";
import { accuracy } from "../core/storage.js";

/**
 * @param {object} options
 * @param {HTMLElement|string} options.container
 * @param {object} options.config
 *        { id, title, description, settingsSchema, answerLabel }
 * @param {(settings) => object} options.createQuestion
 *        Возвращает вопрос: { prompt, options: [{value,label}], correct,
 *        explanation(correct) → html, play() }
 * @param {(settings, question, correct, answer) => void} options.onAnswer
 * @param {() => object} options.getStats  — данные для блока статистики
 * @param {(stats) => string} options.renderStats — html статистики
 */
export function createTrainer(options) {
  const container = typeof options.container === "string"
    ? byId(options.container)
    : options.container;
  if (!container) throw new Error("Тренажёр: контейнер не найден");

  const { config } = options;
  let settings = { ...defaultSettings(config.settingsSchema) };
  let question = null;
  let answered = false;
  let session = { asked: 0, correct: 0, streak: 0, best: 0 };
  let destroyed = false;

  /* ---------------- разметка ---------------- */

  container.innerHTML = `
    <div class="trainer" id="${config.id}">
      <div class="trainer-head">
        <div>
          <div class="overline"><span class="tiny-dot"></span> ${config.overline || "ТРЕНАЖЁР"}</div>
          <h3>${config.title}</h3>
          <p>${config.description}</p>
        </div>
        <span class="streak-badge" data-streak>серия: 0</span>
      </div>

      <div class="trainer-setup" data-setup>
        <div class="field-row" data-setup-fields></div>
        <div class="inline-sets" data-sets></div>
        <div class="button-row" style="margin-top:14px">
          <button class="button button-dark" type="button" data-start>Начать сессию <span>↗</span></button>
          <button class="button button-ghost" type="button" data-share>Поделиться результатом</button>
        </div>
      </div>

      <div class="trainer-session" data-session hidden>
        <div class="field-row" style="align-items:center;justify-content:space-between">
          <button class="listen-button" type="button" data-play>
            <span>▶ Слушать</span>
            <small data-play-hint>одна попытка</small>
          </button>
          <div class="button-row">
            <button class="button button-ghost button-small" type="button" data-replay disabled>Слушать ещё раз</button>
            <button class="button button-ghost button-small" type="button" data-skip>Пропустить</button>
            <button class="button button-ghost button-small" type="button" data-stop>Завершить</button>
          </div>
        </div>
        <p class="task-prompt" data-prompt>Нажми «Слушать», чтобы услышать задание.</p>
        <div class="trainer-answers">
          <div class="field-caption" data-answer-label>${config.answerLabel || "ВЫБЕРИ ОТВЕТ"}</div>
          <div class="answer-row" data-answers></div>
          <p class="feedback" data-feedback>Сначала послушай задание, затем выбери ответ.</p>
        </div>
        <div class="decoded" data-decoded hidden></div>
        <div class="field-row" style="margin-top:12px;justify-content:space-between">
          <div class="chip muted">Вопрос <b data-count>1</b> · верно <b data-correct>0</b> из <b data-total>0</b></div>
          <button class="button button-dark button-small" type="button" data-next disabled>Дальше <span>↗</span></button>
        </div>
      </div>

      <div class="stat-tables" data-stats></div>
    </div>
  `;

  const q = (selector) => container.querySelector(selector);
  const refs = {
    setup: q("[data-setup]"),
    fields: q("[data-setup-fields]"),
    sets: q("[data-sets]"),
    session: q("[data-session]"),
    play: q("[data-play]"),
    playHint: q("[data-play-hint]"),
    replay: q("[data-replay]"),
    skip: q("[data-skip]"),
    stop: q("[data-stop]"),
    prompt: q("[data-prompt]"),
    answers: q("[data-answers]"),
    feedback: q("[data-feedback]"),
    decoded: q("[data-decoded]"),
    next: q("[data-next]"),
    count: q("[data-count]"),
    correct: q("[data-correct]"),
    total: q("[data-total]"),
    stats: q("[data-stats]"),
    streak: q("[data-streak]"),
    start: q("[data-start]"),
    share: q("[data-share]"),
    answerLabel: q("[data-answer-label]"),
  };

  /* ---------------- настройки ---------------- */

  function defaultSettings(schema) {
    const result = {};
    (schema.fields || []).forEach((field) => {
      result[field.key] = field.value ?? field.options?.[0]?.value;
    });
    const sets = schema.sets || [];
    if (sets.length) {
      result.sets = Object.fromEntries(sets.map((set) => [set.id, set.default !== false]));
    }
    return result;
  }

  function renderSetup() {
    refs.fields.innerHTML = "";
    (config.settingsSchema.fields || []).forEach((field) => {
      if (field.type === "select") {
        const label = el("label", { text: field.label });
        const select = el("select", { "data-key": field.key });
        fillSelect(select, field.options, settings[field.key]);
        select.addEventListener("change", () => {
          settings[field.key] = select.value;
          options.onSettingsChange?.(settings);
          renderStats();
        });
        label.append(select);
        refs.fields.append(label);
      } else if (field.type === "range") {
        const label = el("label", { text: `${field.label}: ${settings[field.key]}` });
        const input = el("input", {
          type: "range", min: field.min, max: field.max, step: field.step || 1,
          value: settings[field.key], "data-key": field.key,
        });
        input.addEventListener("input", () => {
          settings[field.key] = Number(input.value);
          label.firstChild.textContent = `${field.label}: ${settings[field.key]}`;
        });
        label.append(input);
        refs.fields.append(label);
      }
    });

    refs.sets.innerHTML = "";
    (config.settingsSchema.sets || []).forEach((set) => {
      const button = el("button", {
        type: "button", class: "set-toggle",
        "aria-pressed": String(settings.sets[set.id] !== false),
        text: set.label,
        title: set.title || "",
      });
      button.addEventListener("click", () => {
        const active = settings.sets[set.id] !== false;
        // Не даём выключить всё: нужен хотя бы один набор.
        const activeCount = Object.values(settings.sets).filter(Boolean).length;
        if (active && activeCount === 1) {
          setFeedback(refs.feedback, "Оставь хотя бы один вариант — иначе не из чего выбирать.", "error");
          refs.feedback.hidden = false;
          return;
        }
        settings.sets[set.id] = !active;
        button.setAttribute("aria-pressed", String(!active));
        button.classList.toggle("active", !active);
        options.onSettingsChange?.(settings);
        renderStats();
      });
      button.classList.toggle("active", settings.sets[set.id] !== false);
      refs.sets.append(button);
    });
  }

  /* ---------------- сессия ---------------- */

  function start() {
    session = { asked: 0, correct: 0, streak: 0, best: 0 };
    refs.setup.hidden = true;
    refs.session.hidden = false;
    refs.feedback.hidden = false;
    nextQuestion();
    updateCounter();
  }

  function stop() {
    refs.setup.hidden = false;
    refs.session.hidden = true;
    question = null;
    renderStats();
    options.onStop?.();
  }

  function updateCounter() {
    refs.count.textContent = String(session.asked + 1);
    refs.correct.textContent = String(session.correct);
    refs.total.textContent = String(session.asked);
    refs.streak.textContent = `серия: ${session.streak}`;
  }

  function nextQuestion() {
    if (destroyed) return;
    answered = false;
    question = options.createQuestion(settings);
    if (!question) {
      setFeedback(refs.feedback, "Не удалось собрать вопрос: проверь настройки.", "error");
      return;
    }
    refs.prompt.innerHTML = question.prompt || "Послушай и выбери ответ.";
    refs.decoded.hidden = true;
    refs.decoded.innerHTML = "";
    refs.feedback.textContent = question.hint || "Сначала послушай задание, затем выбери ответ.";
    refs.feedback.className = "feedback";
    refs.replay.disabled = true;
    refs.next.disabled = true;
    refs.answers.innerHTML = "";

    const choices = makeOptions(
      question.options.find((item) => String(item.value) === String(question.correct)),
      question.options,
      question.optionCount || Math.min(4, question.options.length),
    );
    answerButtons(refs.answers, choices, question.correct, (correct, item) => {
      onAnswer(correct, item);
    });
    updateCounter();
    if (question.autoPlay) playCurrent();
  }

  function playCurrent({ replay = false } = {}) {
    if (!question) return;
    question.play?.({ replay, settings });
    if (replay) {
      refs.replay.disabled = false;
    } else {
      // Первое прослушивание разрешает повтор.
      setTimeout(() => { if (!answered) refs.replay.disabled = false; }, 300);
    }
    refs.play.classList.add("playing");
    clearTimeout(playCurrent.timer);
    playCurrent.timer = setTimeout(() => refs.play.classList.remove("playing"), 1200);
  }

  function onAnswer(correct, item) {
    if (answered) return;
    answered = true;
    session.asked += 1;
    if (correct) {
      session.correct += 1;
      session.streak += 1;
      session.best = Math.max(session.best, session.streak);
    } else {
      session.streak = 0;
    }
    refs.replay.disabled = false;
    refs.next.disabled = false;
    refs.feedback.className = "feedback " + (correct ? "success" : "error");
    refs.feedback.textContent = question.feedback?.(correct, item) ||
      (correct ? "Верно!" : "Пока не то — послушай ещё раз и запомни краску.");
    if (question.explain) {
      refs.decoded.hidden = false;
      refs.decoded.innerHTML = question.explain(correct, item);
    }
    options.onAnswer?.(settings, question, correct, item);
    updateCounter();
    renderStats();
    refs.next.focus({ preventScroll: true });
  }

  /* ---------------- статистика ---------------- */

  function renderStats() {
    if (destroyed) return;
    refs.stats.innerHTML = options.renderStats?.(options.getStats(settings), settings, session) || "";
    refs.streak.textContent = `серия: ${session.streak}`;
  }

  /* ---------------- события ---------------- */

  refs.start.addEventListener("click", start);
  refs.play.addEventListener("click", () => playCurrent());
  refs.replay.addEventListener("click", () => playCurrent({ replay: true }));
  refs.next.addEventListener("click", nextQuestion);
  refs.skip.addEventListener("click", () => {
    if (!answered && question) {
      answered = true;
      refs.answers.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
        if (button.dataset.value === String(question.correct)) button.classList.add("correct");
      });
      refs.feedback.className = "feedback";
      refs.feedback.textContent = `Пропущено. Правильный ответ: ${question.correctLabel || ""}`;
      refs.next.disabled = false;
    } else {
      nextQuestion();
    }
  });
  refs.stop.addEventListener("click", stop);
  refs.share.addEventListener("click", async () => {
    const text = config.shareText?.(session) ||
      `Моя серия в тренажёре «${config.title}»: ${session.best} подряд, ${session.correct} из ${session.asked} верно! Учусь по «Ладно».`;
    const ok = await copyText(text);
    toast(ok ? "Результат скопирован — можно поделиться." : text);
  });

  // Перерисовка грифа и другие обновления при смене темы.
  const themeObserver = new MutationObserver(() => {
    if (document.documentElement.dataset.theme) options.onThemeChange?.();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  renderSetup();
  renderStats();

  return {
    element: container,
    start,
    stop,
    render: () => { renderSetup(); renderStats(); },
    destroy() {
      destroyed = true;
      themeObserver.disconnect();
      clearTimeout(playCurrent.timer);
    },
    get session() { return session; },
    get settings() { return settings; },
  };
}

/** Готовая разметка строки статистики: «12 из 18 · 67%». */
export function statCell(correct, mistakes) {
  const total = correct + mistakes;
  if (!total) return `<span class="empty">—</span>`;
  const percent = accuracy(correct, mistakes);
  const className = percent < 50 ? "low" : percent < 75 ? "mid" : "";
  return `<span>${correct}/${total}</span>
    <div class="accuracy-bar ${className}"><span style="width:${percent}%"></span></div>
    <span style="font-size:10px;color:var(--muted)">${percent}%</span>`;
}

/** Мини-таблица «интервал × режим» для раздела 11. */
export function intervalStatsTable(rows, modes) {
  const head = modes.map((mode) => `<th class="num">${mode.short}</th>`).join("");
  const body = rows.map((row) => {
    const cells = modes.map((mode) => {
      const value = row.modes[mode.id];
      return `<td class="num">${value.total ? statCell(value.correct, value.mistakes) : `<span class="empty">—</span>`}</td>`;
    }).join("");
    return `<tr><td><strong>${row.short}</strong><br><span style="font-size:10px;color:var(--muted)">${row.name}</span></td>${cells}</tr>`;
  }).join("");
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Интервал</th>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}
