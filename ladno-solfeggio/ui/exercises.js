/*
 * UI: строительные блоки для упражнений.
 *
 * Здесь собраны повторяющиеся сценарии, чтобы разделы не дублировали код:
 *  - exerciseCard — разметка блока «Твоя очередь»;
 *  - quickQuiz — опрос с кнопками и фидбеком;
 *  - noteFinder — «найди ноту на грифе» (клик по грифу);
 *  - countdown — таймер для «30 секунд»;
 *  - buildNotePool — набор нот для заданий.
 */
import { STRINGS, bestPosition, midiOctave, mod, prettyNote, CHROMATIC } from "../core/notes.js";
import { answerButtons, byId, setFeedback, unlockAnswers } from "./dom.js";
import { accuracy } from "../core/storage.js";
import { toast } from "./state.js";

/** Разметка блока упражнения. */
export function exerciseCard({
  id, number, title, description, statsKey, boardId = null, statusId = null,
  body = "", actions = "", hint = "", extra = "",
}) {
  const board = boardId
    ? `<div class="fret-scroll exercise-board"><div id="${boardId}" class="fretboard" aria-label="${title}"></div></div>
       ${statusId ? `<div class="quiz-status" id="${statusId}" aria-live="polite">Нажми на ноту ♫</div>` : ""}`
    : "";
  return `<div class="exercise" id="${id}">
    <div class="exercise-heading">
      <div>
        <div class="overline"><span class="tiny-dot"></span> ТВОЯ ОЧЕРЕДЬ / ${number}</div>
        <h2>${title}</h2>
        <p>${description}</p>
      </div>
      <span class="exercise-stats" data-stats="${statsKey}"></span>
    </div>
    ${hint ? `<p class="task-hint">${hint}</p>` : ""}
    ${extra}
    ${board}
    ${body}
    <div class="exercise-bottom">${actions}</div>
  </div>`;
}

/**
 * Быстрый опрос: вопрос → варианты → фидбек.
 * Возвращает объект с methods: ask(), reset().
 */
export function quickQuiz({
  answersId, feedbackId, nextId = null, getQuestion, onResult,
  optionCount = 4, playQuestion = null,
}) {
  const answers = byId(answersId);
  const feedback = byId(feedbackId);
  let current = null;

  function ask() {
    current = getQuestion();
    if (!current) return;
    unlockAnswers(answers);
    if (feedback) setFeedback(feedbackId, current.hint || "Выбери один из вариантов.");
    answerButtons(answers, current.options, current.correct, (correct, item) => {
      onResult?.(correct, current, item);
      if (feedback) {
        setFeedback(
          feedbackId,
          correct ? current.successText || "Верно!" : current.failText || `Не совсем. Правильный ответ: ${current.correctLabel}.`,
          correct ? "success" : "error",
        );
      }
    });
    if (current.options.length <= optionCount) {
      // Меньше вариантов, чем нужно — значит, набор намеренно узкий.
    }
    playQuestion?.(current);
    return current;
  }

  return { ask, get current() { return current; } };
}

/**
 * «Найди ноту на грифе»: пользователь кликает по ладу, мы сравниваем высоту.
 * Используется в разделах «Ноты» и «Чтение с листа».
 */
export function noteFinder({
  boardRenderer, answerFeedbackId, statsKey, onCorrect, promptId,
  octaveAware = false, maxAttempts = 1,
}) {
  let target = null;
  let answered = false;

  function start(midi) {
    target = midi;
    answered = false;
  }

  function check(position) {
    if (answered || target == null) return null;
    const correct = octaveAware
      ? position.midi === target
      : mod(position.midi) === mod(target);
    answered = true;
    const name = CHROMATIC[mod(target)];
    setFeedback(
      answerFeedbackId,
      correct
        ? `Верно! ${prettyNote(name)}${octaveAware ? midiOctave(target) : ""}.`
        : `Не совсем. Правильный ответ: ${prettyNote(name)} — ${bestPosition(target) ? `${bestPosition(target).string + 1}-я струна, ${bestPosition(target).fret}-й лад` : "другая позиция"}.`,
      correct ? "success" : "error",
    );
    onCorrect?.(correct, position);
    return correct;
  }

  return { start, check, get answered() { return answered; }, get target() { return target; } };
}

/**
 * Обратный отсчёт на N секунд. onTick(secondsLeft), onFinish().
 * Умеет останавливаться и запускаться заново.
 */
export function countdown(seconds, { onTick, onFinish } = {}) {
  let remaining = seconds;
  let timer = null;
  let running = false;
  let startedAt = 0;

  function tick() {
    if (!running) return;
    const elapsed = (performance.now() - startedAt) / 1000;
    remaining = Math.max(0, seconds - elapsed);
    onTick?.(remaining, elapsed);
    if (remaining <= 0) {
      stop();
      onFinish?.();
    }
  }

  function start() {
    stop();
    running = true;
    startedAt = performance.now();
    remaining = seconds;
    onTick?.(remaining, 0);
    timer = setInterval(tick, 100);
  }

  function stop() {
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop, get running() { return running; }, get remaining() { return remaining; } };
}

/**
 * Пул нот для заданий «определи ноту»: диапазон октав и струн.
 * Возвращает [{ string, fret, midi, key }].
 */
export function buildNotePool({ minFret = 0, maxFret = 12, strings = [0, 1, 2, 3, 4, 5] } = {}) {
  const pool = [];
  strings.forEach((stringIndex) => {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const midi = STRINGS[stringIndex].midi + fret;
      pool.push({
        string: stringIndex,
        fret,
        midi,
        pc: mod(midi),
        key: `${stringIndex}:${fret}`,
      });
    }
  });
  return pool;
}

/** Случайная позиция из пула, без повтора предыдущей. */
export function pickPosition(pool, previousKey = null) {
  const filtered = pool.filter((item) => item.key !== previousKey);
  const list = filtered.length ? filtered : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/** Сообщение о рекорде + конфетти-подобная подсветка. */
export function celebrate(recordKey, value, label, container) {
  const bestKey = recordKey;
  const best = Number(localStorage.getItem(bestKey) || 0);
  if (value > best) {
    localStorage.setItem(bestKey, String(value));
    toast(`Новый рекорд: ${label} — ${value}!`);
    if (container) {
      container.classList.remove("flash-good");
      void container.offsetWidth;
      container.classList.add("flash-good");
    }
    return true;
  }
  return false;
}

/** Короткая сводка точности для фидбека. */
export const accuracyText = (correct, total) => {
  if (!total) return "";
  const percent = Math.round((correct / total) * 100);
  return `${correct} из ${total} · ${percent}%`;
};

/** Кнопки «Проверить / Заново / Случайное» — единый вид. */
export function exerciseActions({ checkId, checkLabel = "Проверить", extra = "" }) {
  return `<div>
      <button class="button button-dark" id="${checkId}" type="button">${checkLabel} <span>↗</span></button>
      <p class="feedback" id="${checkId}-feedback" aria-live="polite">Выбери ноты на грифе.</p>
    </div>
    <div class="button-row">${extra}</div>`;
}

export { accuracy };
