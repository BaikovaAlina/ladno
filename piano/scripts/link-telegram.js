"use strict";

// После отправки /start боту эта утилита находит ваш личный chat ID и записывает его в .env.
// Сам токен не показывается в терминале и не отправляется в репозиторий.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

function readEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const result = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    result[match[1]] = value;
  }
  return result;
}
function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

async function main() {
  const config = readEnvFile();
  const token = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN;
  if (!fs.existsSync(envPath)) {
    return fail("Сначала создай piano/.env из piano/.env.example и добавь туда новый токен бота.");
  }
  if (!token) {
    return fail("В .env не найден TELEGRAM_BOT_TOKEN. Добавь токен нового бота и запусти команду снова.");
  }
  let payload;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=0`);
    payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error("Telegram вернул ошибку");
  } catch (error) {
    return fail("Не удалось прочитать новые сообщения бота. Проверь токен и попробуй позже. Если у бота включён webhook, getUpdates может быть недоступен.");
  }
  const updates = Array.isArray(payload.result) ? payload.result : [];
  const startMessage = updates.reverse().find((update) => {
    const message = update.message || update.edited_message;
    return message && message.chat && message.chat.type === "private" && /^\/start(?:@[A-Za-z0-9_]+)?(?:\s|$)/.test(message.text || "");
  });
  if (!startMessage) {
    return fail("Не найдено личное сообщение /start. Открой нового бота в Telegram, отправь ему /start и запусти эту команду ещё раз.");
  }
  const chatId = String((startMessage.message || startMessage.edited_message).chat.id);
  const original = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const kept = original.split(/\r?\n/).filter((line) => !/^\s*TELEGRAM_CHAT_ID\s*=/.test(line));
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  kept.push(`TELEGRAM_CHAT_ID=${chatId}`, "");
  fs.writeFileSync(envPath, kept.join("\n"), { mode: 0o600 });
  try { fs.chmodSync(envPath, 0o600); } catch (error) { /* Windows may not support POSIX permissions */ }
  console.log("Готово: личный Telegram chat ID записан в .env. Токен не выводился.");
  console.log("Перезапусти Node.js-сервер, чтобы он прочитал обновлённую настройку.");
}

main().catch(() => fail("Не удалось завершить привязку Telegram. Проверь локальную конфигурацию и попробуй снова."));
