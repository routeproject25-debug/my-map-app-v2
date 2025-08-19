// server.js
require('dotenv').config();

const express   = require('express');
const basicAuth = require('express-basic-auth');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---- Basic Auth (опційно через USER*/PASS* у env) ---- */
const users = {};
['1','2','3'].forEach(n => {
  const u = process.env['USER' + n];
  const p = process.env['PASS' + n];
  if (u && p) users[u] = p;
});
if (Object.keys(users).length) {
  app.use(basicAuth({ users, challenge: true, unauthorizedResponse: ()=>'Access denied' }));
  app.get('/logout', (_req, res) => {
    res.set('WWW-Authenticate','Basic realm="logout"');
    res.status(401).send('Logged out');
  });
  console.log(`🔐 Basic Auth enabled (${Object.keys(users).length} user(s))`);
} else {
  console.log('🟢 Basic Auth disabled (no USER*/PASS* env vars).');
}

/* ---- Health ---- */
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

/* ---- Статика: НЕ віддавати index.html на "/" ---- */
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  extensions: ['html'],
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

/* ---- Явні сторінки ---- */
// Логін — стартова
app.get(['/', '/login', '/login.html'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
);
// Карта
app.get(['/index', '/index.html', '/map'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);
// Експорт / Імпорт
app.get(['/export', '/export/'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'export', 'index.html'))
);
app.get(['/import', '/import/'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'import', 'index.html'))
);

/* ---- Фолбек без зірочки ---- */
// Якщо це GET без розширення — просто відправ на логін
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (path.extname(req.path)) return next(); // файли пропускаємо
  return res.redirect('/');
});

/* ---- Start ---- */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
