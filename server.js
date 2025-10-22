// server.js
require('dotenv').config();

const express   = require('express');
const basicAuth = require('express-basic-auth');
const path      = require('path');
const fs        = require('fs');

// fetch polyfill for Node < 18
const _fetch = (typeof fetch !== 'undefined') ? fetch : (
  (...args) => import('node-fetch').then(({default: f}) => f(...args))
);

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '1mb' }));

// Public healthcheck (до будь-якої автентифікації)
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

// Basic Auth (опційно через USER1/PASS1, USER2/PASS2, USER3/PASS3 у env)
const users = {};
['1','2','3'].forEach(n => {
  const u = process.env['USER' + n];
  const p = process.env['PASS' + n];
  if (u && p) users[u] = p;
});
if (Object.keys(users).length) {
  app.use(basicAuth({ users, challenge: true, unauthorizedResponse: ()=>'Access denied' }));
  // ручний "вихід" для Basic Auth
  app.get('/logout', (_req, res) => {
    res.set('WWW-Authenticate','Basic realm="logout"');
    res.status(401).send('Logged out');
  });
  console.log(`🔐 Basic Auth enabled (${Object.keys(users).length} user(s))`);
} else {
  console.log('🟢 Basic Auth disabled (no USER*/PASS* env vars).');
}

// (healthz вже оголошено вище, до Basic Auth)

// статика (НЕ віддавати index.html на "/")
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  extensions: ['html'],
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ===== Tilesets API (керування public/config/tilesets.json) =====
const TILESETS_PATH = path.join(__dirname, 'public', 'config', 'tilesets.json');

function validateTilesetsPayload(payload){
  const errors = [];
  if (!Array.isArray(payload)) return ['Очікується масив tilesets'];
  if (payload.length > 2000) errors.push('Занадто багато елементів (>2000)');
  const reKey = /^[a-zA-Z0-9_-]{1,40}$/;
  payload.forEach((t, i) => {
    if (typeof t !== 'object' || t === null) { errors.push(`Елемент[${i}] не є об'єктом`); return; }
    if (!t.key || typeof t.key !== 'string' || !reKey.test(t.key)) errors.push(`Елемент[${i}].key обов'язковий (латиниця/цифри/_/- до 40)`);
    if (!t.url || typeof t.url !== 'string' || !t.url.startsWith('mapbox://')) errors.push(`Елемент[${i}].url має починатися з mapbox://`);
    if (!t.layer || typeof t.layer !== 'string' || !t.layer.trim()) errors.push(`Елемент[${i}].layer обов'язковий`);
    if (!('enabled' in t) || typeof t.enabled !== 'boolean') errors.push(`Елемент[${i}].enabled має бути boolean`);
    if ('hubs' in t){
      if (!Array.isArray(t.hubs)) errors.push(`Елемент[${i}].hubs має бути масивом рядків`);
      else if (t.hubs.some(h => typeof h !== 'string' || !h.trim())) errors.push(`Елемент[${i}].hubs містить невалідні значення`);
    }
  });
  return errors;
}

app.get('/api/tilesets', (_req, res) => {
  try {
    const raw = fs.readFileSync(TILESETS_PATH, 'utf8');
    const data = JSON.parse(raw);
    return res.json({ tilesets: Array.isArray(data) ? data : (data.tilesets || []) });
  } catch (e){
    const msg = `Не вдалося прочитати tilesets.json: ${e.message}`;
    console.error(msg);
    return res.status(500).json({ error: msg });
  }
});

app.put('/api/tilesets', (req, res) => {
  const body = req.body;
  const tiles = Array.isArray(body) ? body : body && body.tilesets;
  if (!tiles) return res.status(400).json({ error: 'Очікується масив або обʼєкт { tilesets: [] }' });
  const errs = validateTilesetsPayload(tiles);
  if (errs.length) return res.status(400).json({ error: 'Валідація не пройдена', details: errs });
  try {
    const backupPath = TILESETS_PATH + '.bak';
    try { fs.copyFileSync(TILESETS_PATH, backupPath); } catch { /* ignore if missing */ }
    fs.writeFileSync(TILESETS_PATH, JSON.stringify(tiles, null, 2), 'utf8');
    return res.json({ ok: true });
  } catch (e){
    const msg = `Не вдалося записати tilesets.json: ${e.message}`;
    console.error(msg);
    return res.status(500).json({ error: msg });
  }
});

// Опціонально: перелік tilesets з Mapbox акаунта через секретний токен із .env
app.get('/api/mapbox/tilesets', async (req, res) => {
  // allow overriding owner via query (?owner=USERNAME) for troubleshooting
  const qOwner = (req.query.owner || '').toString().trim();
  const owner = qOwner || process.env.MAPBOX_OWNER || 'route-project';
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || '';
  if (!token){
    return res.status(200).json({ tilesets: [], note: 'Встановіть MAPBOX_ACCESS_TOKEN у .env для отримання списку tilesets' });
  }
  const url = `https://api.mapbox.com/tilesets/v1/${encodeURIComponent(owner)}`;
  try{
    const r = await _fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok){
      const text = await r.text().catch(()=> '');
      let hint = '';
      const tokenPrefix = (token || '').slice(0,3);
      if (r.status === 401) {
        hint = tokenPrefix !== 'sk.'
          ? 'Використовується не секретний токен. Створіть Secret токен (починається з sk.) без обмежень URL/IP.'
          : 'Токен відхилено. Переконайтесь, що немає URL/IP/Resources обмежень і власник правильний.';
      }
      if (r.status === 403) hint = 'Недостатньо прав. Додайте scopes tilesets:list і tilesets:read для токена або перевірте MAPBOX_OWNER';
      if (/Direct access not allowed/i.test(text)) hint = 'Токен має URL/IP/Resource-обмеження. Створіть Secret токен БЕЗ URL та IP restrictions і з tilesets:list + tilesets:read.';
      return res.status(502).json({ error: `Mapbox API ${r.status}`, owner, hint, body: text });
    }
    const j = await r.json();
    // Уніфікуємо відповідь: масив обʼєктів з id, description, type, created
    const list = Array.isArray(j) ? j : (Array.isArray(j.tilesets) ? j.tilesets : []);
    return res.json({ tilesets: list });
  } catch(e){
    return res.status(502).json({ error: 'Помилка запиту до Mapbox', message: String(e && e.message || e) });
  }
});

// Debug env (safe): показує лише owner і чи заданий токен (без розкриття)
app.get('/api/debug/env', (_req, res) => {
  const owner = process.env.MAPBOX_OWNER || 'route-project';
  const hasToken = !!(process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN);
  const tokenPrefix = (process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || '').slice(0,3);
  res.json({ owner, hasToken, tokenPrefix });
});

// Telegram: безпечна відправка повідомлення про погодження маршруту
app.post('/api/telegram/send-approval', async (req, res) => {
  try{
    const token  = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '';
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID || '';
    if (!token || !chatId){
      return res.status(200).json({ ok: false, error: 'Telegram не налаштовано (зазначте TELEGRAM_BOT_TOKEN і TELEGRAM_CHAT_ID у .env)' });
    }

    const body = req.body || {};
    const routeName = (body.routeName ? String(body.routeName) : 'Маршрут').slice(0, 200);
    const routeId   = (body.routeId ? String(body.routeId) : '').slice(0, 120);
    const reviewLink = (body.reviewLink && typeof body.reviewLink === 'string' && body.reviewLink.startsWith('http'))
      ? body.reviewLink
      : '';

    // Формуємо HTML-повідомлення
    let text = `🚦 Маршрут на погодження:\n${routeName}`;
    if (reviewLink) text += `\n<a href="${reviewLink}">Маршрут</a>`;
    else if (routeId) text += `\nID: ${routeId}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const params = new URLSearchParams({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    });

    const r = await _fetch(`${url}?${params.toString()}`);
    const j = await r.json().catch(()=>({}));
    if (!r.ok || !j || j.ok !== true){
      return res.status(502).json({ ok:false, error: 'Telegram API error', status: r.status, body: j });
    }
    return res.json({ ok: true, message_id: j.result && j.result.message_id });
  } catch(e){
    return res.status(502).json({ ok:false, error: String(e && e.message || e) });
  }
});

// явні сторінки
app.get(['/', '/login', '/login.html'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
);
app.get(['/index', '/index.html', '/map'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);
app.get(['/admin/tilesets', '/admin/tilesets.html'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin', 'tilesets.html'))
);
app.get(['/export', '/export/'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'export', 'index.html'))
);
app.get(['/import', '/import/'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'import', 'index.html'))
);

// fallback без зірочки: GET без розширення -> на логін
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (path.extname(req.path)) return next();
  return res.redirect('/');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
