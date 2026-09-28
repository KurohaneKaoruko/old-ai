'use strict';
/**
 * web/server.js — 零依赖 HTTP 服务：静态页面 + 对话 API。
 *
 * 路由：
 *   GET  /                     → web/public/index.html
 *   GET  /app.js / /style.css  → 静态资源
 *   GET  /api/algorithms       → 算法目录（id/名称/年份/类别/是否对话型/欢迎语）
 *   POST /api/chat             → { algorithmId, sessionId, text } → { reply, error? }
 *   POST /api/reset            → { sessionId, algorithmId? } 清空会话状态
 *
 * 会话：Map<"sessionId::algorithmId", state>，有状态算法（ELIZA/TaskBot/ScriptNLU 等）
 * 跨消息保持实例。进程重启即清空，属预期行为（无持久化）。
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { ADAPTERS } = require('./panels');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 1_000_000;

const byId = new Map(ADAPTERS.map((a) => [a.id, a]));
const sessions = new Map();

/* ------------------------------------------------------------------ 工具 */

function sessionKey(sessionId, algorithmId) {
  return `${sessionId}::${algorithmId}`;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

/* ------------------------------------------------------------------ 处理器 */

function handleChat(res, body) {
  const { algorithmId, sessionId } = body;
  const text = body.text === undefined || body.text === null ? '' : String(body.text);
  if (typeof algorithmId !== 'string' || !byId.has(algorithmId)) {
    sendJson(res, 400, { error: `unknown algorithmId: ${String(algorithmId)}` });
    return;
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    sendJson(res, 400, { error: 'sessionId must be a non-empty string (<=128 chars)' });
    return;
  }
  const adapter = byId.get(algorithmId);
  const key = sessionKey(sessionId, algorithmId);
  if (!sessions.has(key)) {
    sessions.set(key, adapter.create());
  }
  const state = sessions.get(key);
  try {
    const reply = adapter.handle(state, text);
    sendJson(res, 200, { reply: String(reply), algorithmId });
  } catch (err) {
    // 算法内部抛错转为对话内可见的友好消息，不中断服务
    sendJson(res, 200, { reply: `处理出错：${err.message}`, error: true, algorithmId });
  }
}

function handleRun(res, body) {
  const { algorithmId, sessionId, params } = body;
  if (typeof algorithmId !== 'string' || !byId.has(algorithmId)) {
    sendJson(res, 400, { error: `unknown algorithmId: ${String(algorithmId)}` });
    return;
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    sendJson(res, 400, { error: 'sessionId must be a non-empty string (<=128 chars)' });
    return;
  }
  const adapter = byId.get(algorithmId);
  if (typeof adapter.run !== 'function') {
    sendJson(res, 400, { error: `algorithm ${algorithmId} has no structured panel (use /api/chat)` });
    return;
  }
  const key = sessionKey(sessionId, algorithmId);
  if (!sessions.has(key)) {
    sessions.set(key, adapter.create());
  }
  const state = sessions.get(key);
  try {
    const result = adapter.run(state, params && typeof params === 'object' ? params : {});
    sendJson(res, 200, {
      reply: String(result.reply),
      view: result.view,
      algorithmId
    });
  } catch (err) {
    sendJson(res, 200, { reply: `处理出错：${err.message}`, error: true, algorithmId });
  }
}

function handleReset(res, body) {
  const { sessionId, algorithmId } = body;
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    sendJson(res, 400, { error: 'sessionId must be a non-empty string' });
    return;
  }
  let removed = 0;
  for (const key of sessions.keys()) {
    if (key.startsWith(`${sessionId}::`) && (typeof algorithmId !== 'string' || key.endsWith(`::${algorithmId}`))) {
      sessions.delete(key);
      removed += 1;
    }
  }
  sendJson(res, 200, { ok: true, removed });
}

/* ------------------------------------------------------------------ 服务 */

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/algorithms') {
    sendJson(res, 200, {
      algorithms: ADAPTERS.map(({ id, name, year, category, conversational, intro, ui }) => ({
        id,
        name,
        year,
        category,
        conversational,
        intro,
        ui
      }))
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    readJsonBody(req)
      .then((body) => handleChat(res, body))
      .catch((err) => sendJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run') {
    readJsonBody(req)
      .then((body) => handleRun(res, body))
      .catch((err) => sendJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reset') {
    readJsonBody(req)
      .then((body) => handleReset(res, body))
      .catch((err) => sendJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === 'GET') {
    serveStatic(res, url.pathname);
    return;
  }

  sendJson(res, 405, { error: 'method not allowed' });
});

server.listen(PORT, () => {
  console.log(`AI Lab web UI: http://localhost:${PORT}  (${ADAPTERS.length} algorithms loaded)`);
});
