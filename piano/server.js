"use strict";

// Same-origin static site + small, opt-in Telegram notification endpoint.
// Secrets are read from piano/.env or the hosting environment, never from the browser.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const MAX_BODY_BYTES = 8 * 1024;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const REPORT_RATE_LIMIT = 20;
const REPORT_RATE_WINDOW_MS = 60 * 1000;

function readDotEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  const source = fs.readFileSync(file, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1].startsWith("#")) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
readDotEnv();

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || "").trim();
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const PASSWORD_CONFIGURED = APP_PASSWORD.length >= 12;
const TELEGRAM_CONFIGURED = Boolean(BOT_TOKEN && CHAT_ID);
const NOTIFICATIONS_READY = TELEGRAM_CONFIGURED && PASSWORD_CONFIGURED;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const sessions = new Map();
const reportWindows = new Map();
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

function json(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}
function requestOriginIsSame(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers["x-forwarded-host"];
    const expectedHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || request.headers.host || "").split(",")[0].trim();
    return Boolean(expectedHost) && originHost === expectedHost;
  } catch (error) {
    return false;
  }
}
function getSession(request) {
  const cookieHeader = request.headers.cookie || "";
  const match = /(?:^|;\s*)piano_session=([A-Za-z0-9_-]+)/.exec(cookieHeader);
  if (!match) return null;
  const record = sessions.get(match[1]);
  if (!record || record.expiresAt < Date.now()) {
    sessions.delete(match[1]);
    return null;
  }
  return { token: match[1], ...record };
}
function safeText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
async function readJson(request) {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const error = new Error("Ожидался JSON-запрос.");
    error.statusCode = 415;
    throw error;
  }
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new Error("Запрос слишком большой.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    const parseError = new Error("Не удалось прочитать запрос.");
    parseError.statusCode = 400;
    throw parseError;
  }
}
function timingSafePasswordCheck(candidate) {
  const expected = Buffer.from(APP_PASSWORD, "utf8");
  const actual = Buffer.from(String(candidate || ""), "utf8");
  if (!expected.length || expected.length !== actual.length) {
    // Keep the comparison path similar for short or missing attempts.
    crypto.timingSafeEqual(expected.length ? expected : Buffer.alloc(1), Buffer.alloc(expected.length ? expected.length : 1));
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}
function reportRateAllowed(sessionToken) {
  const now = Date.now();
  const current = reportWindows.get(sessionToken);
  if (!current || now - current.startAt >= REPORT_RATE_WINDOW_MS) {
    reportWindows.set(sessionToken, { startAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= REPORT_RATE_LIMIT;
}
async function sendTelegramMessage(text) {
  if (!NOTIFICATIONS_READY) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const result = await response.json().catch(() => null);
    return Boolean(result && result.ok);
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
function formatReport(report) {
  const exercise = safeText(report.exercise, 80) || "Упражнение";
  const detail = safeText(report.detail, 180);
  const expected = safeText(report.expected, 90);
  const actual = safeText(report.actual, 90);
  const correct = report.result === "correct";
  const when = new Date().toLocaleString("ru-RU", { timeZone: process.env.TZ || "Europe/Zurich" });
  const lines = [
    "🎹 Ладно · практика фортепиано",
    `Упражнение: ${exercise}`,
    `Результат: ${correct ? "✅ верно" : "🟠 была ошибка"}`,
  ];
  if (detail) lines.push(`Подробности: ${detail}`);
  if (!correct && expected) lines.push(`Ожидалось: ${expected}`);
  if (!correct && actual) lines.push(`Ответ: ${actual}`);
  lines.push(`Время: ${when}`);
  return lines.join("\n").slice(0, 950);
}
async function handleApi(request, response, pathname) {
  if (pathname === "/api/status" && request.method === "GET") {
    const session = getSession(request);
    return json(response, 200, {
      backend: true,
      telegramConfigured: TELEGRAM_CONFIGURED,
      passwordConfigured: PASSWORD_CONFIGURED,
      notificationsReady: NOTIFICATIONS_READY,
      authenticated: Boolean(session),
    });
  }

  if (!requestOriginIsSame(request)) {
    return json(response, 403, { error: "Запрос отклонён: другой источник." });
  }

  if (pathname === "/api/login" && request.method === "POST") {
    if (!NOTIFICATIONS_READY) return json(response, 503, { error: "Telegram и пароль доступа ещё не настроены на сервере." });
    const body = await readJson(request);
    if (!timingSafePasswordCheck(body.password)) {
      return json(response, 401, { error: "Пароль не подошёл. Проверь его в локальном файле .env." });
    }
    const token = crypto.randomBytes(32).toString("base64url");
    sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
    const cookie = [
      `piano_session=${token}`,
      "HttpOnly",
      "SameSite=Strict",
      "Path=/",
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (process.env.NODE_ENV === "production") cookie.push("Secure");
    return json(response, 200, { authenticated: true }, { "Set-Cookie": cookie.join("; ") });
  }

  if (pathname === "/api/report" && request.method === "POST") {
    if (!NOTIFICATIONS_READY) return json(response, 503, { error: "Telegram-уведомления не настроены на сервере." });
    const session = getSession(request);
    if (!session) return json(response, 401, { error: "Войди в личный режим, чтобы отправлять отчёты." });
    if (!reportRateAllowed(session.token)) return json(response, 429, { error: "Слишком много отчётов за минуту. Попробуй позже." });
    const body = await readJson(request);
    if (!body || typeof body !== "object" || !["correct", "incorrect"].includes(body.result)) {
      return json(response, 400, { error: "Не удалось проверить результат упражнения." });
    }
    const message = formatReport(body);
    const sent = await sendTelegramMessage(message);
    if (!sent) return json(response, 502, { error: "Не удалось отправить сообщение в Telegram. Проверь токен и chat ID на сервере." });
    return json(response, 200, { sent: true });
  }

  return json(response, 404, { error: "API-маршрут не найден." });
}
async function serveStatic(request, response, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch (error) { response.writeHead(400); response.end("Bad request"); return; }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  // Only public frontend files are served; never expose .env, setup scripts, or server.js.
  if (!["index.html", "style.css", "app.js"].includes(relative)) {
    response.writeHead(404, { "X-Content-Type-Options": "nosniff" });
    response.end("Not found");
    return;
  }
  const filePath = path.resolve(ROOT, relative);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403, { "X-Content-Type-Options": "nosniff" });
    response.end("Forbidden");
    return;
  }
  let stat;
  try { stat = await fs.promises.stat(filePath); }
  catch (error) { response.writeHead(404, { "X-Content-Type-Options": "nosniff" }); response.end("Not found"); return; }
  if (!stat.isFile()) { response.writeHead(404); response.end("Not found"); return; }
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  if (request.method === "HEAD") return response.end();
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname; }
  catch (error) { response.writeHead(400); response.end("Bad request"); return; }
  if (pathname.startsWith("/api/")) {
    handleApi(request, response, pathname).catch((error) => {
      const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
      json(response, statusCode, { error: statusCode >= 500 ? "Внутренняя ошибка сервера." : error.message });
    });
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }
  serveStatic(request, response, pathname).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end("Internal server error");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Ладно — фортепиано доступно на http://${HOST}:${PORT}`);
  if (!NOTIFICATIONS_READY) console.log("Telegram-уведомления отключены: проверь TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID и APP_PASSWORD в .env.");
  else console.log("Telegram-настройки найдены; отчёты включаются вручную в приложении после входа.");
});
process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
