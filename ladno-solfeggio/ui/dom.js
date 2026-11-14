/*
 * UI: маленькие помощники для DOM.
 * Без библиотек: шаблонные строки + querySelector. Все тексты, которые
 * приходят из данных, проходят через escapeHTML — на всякий случай.
 */
import { escapeHTML } from "../core/notes.js";

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/** Создать элемент с атрибутами и детьми. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : value);
  });
  [].concat(children).forEach((child) => {
    if (child == null) return;
    node.append(child.nodeType ? child : document.createTextNode(child));
  });
  return node;
}

export const html = (strings, ...values) =>
  strings.reduce(
    (result, part, index) => result + part + (index < values.length ? String(values[index] ?? "") : ""),
    "",
  );

/** Вставить разметку в контейнер (строка или элемент). */
export function mount(container, markup) {
  const node = typeof container === "string" ? document.getElementById(container) : container;
  if (!node) return null;
  if (typeof markup === "string") node.innerHTML = markup;
  else {
    node.innerHTML = "";
    node.append(markup);
  }
  return node;
}

export const byId = (id) => document.getElementById(id);

/** Включить класс на время анимации. */
export function pulse(node, className = "animate-in", duration = 450) {
  if (!node) return;
  node.classList.remove(className);
  // reflow, чтобы анимация перезапустилась
  void node.offsetWidth;
  node.classList.add(className);
  setTimeout(() => node.classList.remove(className), duration);
}

/** Заполнить select вариантами. */
export function fillSelect(select, entries, selected = null) {
  if (!select) return;
  const target = typeof select === "string" ? byId(select) : select;
  target.innerHTML = entries
    .map((item) => `<option value="${escapeHTML(item.value)}">${escapeHTML(item.label)}</option>`)
    .join("");
  if (selected != null) target.value = selected;
}

/** Кнопки-переключатели: data-атрибут + значение. */
export function setSwitch(selector, attr, value) {
  $$(selector).forEach((button) => {
    const active = button.getAttribute(attr) === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

/** Ответы-кнопки с мгновенным фидбеком. Возвращает элементы. */
export function answerButtons(container, options, correctValue, callback) {
  const node = typeof container === "string" ? byId(container) : container;
  if (!node) return [];
  node.innerHTML = "";
  const buttons = options.map((item) => {
    const button = el("button", {
      type: "button",
      class: "answer",
      "data-value": String(item.value),
      html: escapeHTML(item.label) + (item.sub ? `<span class="answer-sub">${escapeHTML(item.sub)}</span>` : ""),
    });
    button.addEventListener("click", () => {
      if (node.dataset.locked === "1") return;
      node.dataset.locked = "1";
      const correct = String(item.value) === String(correctValue);
      [...node.children].forEach((child) => {
        child.disabled = true;
        if (child.dataset.value === String(correctValue)) child.classList.add("correct");
      });
      if (!correct) button.classList.add("wrong");
      callback(correct, item, button);
    });
    node.append(button);
    return button;
  });
  node.dataset.locked = "0";
  return buttons;
}

/** Сбросить «замок» контейнера ответов перед новым заданием. */
export function unlockAnswers(container) {
  const node = typeof container === "string" ? byId(container) : container;
  if (node) node.dataset.locked = "0";
}

/** Собрать варианты: правильный + случайные из пула. */
export function makeOptions(correct, pool, count = 4) {
  const rest = pool.filter((item) => String(item.value) !== String(correct.value));
  const shuffled = [...rest].sort(() => Math.random() - 0.5).slice(0, Math.max(0, count - 1));
  return [...shuffled, correct].sort(() => Math.random() - 0.5);
}

/** Плавно обновить текст фидбека. */
export function setFeedback(id, text, state = "") {
  const node = typeof id === "string" ? byId(id) : id;
  if (!node) return;
  node.textContent = text;
  node.className = "feedback" + (state ? " " + state : "");
  pulse(node, "pop", 380);
}
