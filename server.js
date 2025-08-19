// server.js
require('dotenv').config();

const express   = require('express');
const basicAuth = require('express-basic-auth');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Basic Auth (опційно) -------------------- */
// USER1/PASS1, USER2/PASS2, USER3/PASS3
const users = {};
['1','2','3'].forEach(n => {
  const u = process.env['USER' + n];
  const p = process.env['PASS' + n];
  if (u && p) users[u] = p;
});
if (Object.keys(users).length) {
  app.use(basicAuth({ users, challenge: true, unauthorizedResponse: ()=>'Access denied' }));
  app.get('/logout', (_req, res) => {
    res.set('WWW-Authenticate', 'Basic realm="logout"');
    res.status(401).send('Logged out');
  });
  console.log(`🔐 Basic Auth enabled (${Object.keys(users).length} user(s))`);
} else {
  console.log('🟢 Basic Auth disabled (no USER*/PASS* env vars).');
}

/* -------------------- Healthcheck -------------------- */
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

/* -------------------- Статика -------------------- */
// ВАЖЛИВО: index:false — щоб "/" не віддавав public/index.html
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  extensions: ['html'],
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

/* -------------------- Явні сторінки -------------------- */
// 1) Стартова — логін
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
);

// 2) Карта (старий index.html)
app.get(['/map', '/index', '/index.html'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// 3) Експорт / Імпорт
app.get(['/export', '/export/'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'export', 'index.html'))
);
app.get(['/import', '/import/'], (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'import', 'index.html'))
);

// 4) За замовчуванням — на логін (щоб випадкові URL не підхоплювали карту)
app.get('*', (_req, res) => res.redirect('/'));

/* -------------------- Start -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
