// server.js
require('dotenv').config();

const express   = require('express');
const basicAuth = require('express-basic-auth');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Basic Auth (опційно) -------------------- */
// Збираємо користувачів з ENV: USER1/PASS1, USER2/PASS2, USER3/PASS3
const users = {};
['1', '2', '3'].forEach(n => {
  const u = process.env['USER' + n];
  const p = process.env['PASS' + n];
  if (u && p) users[u] = p;
});
const hasUsers = Object.keys(users).length > 0;

if (hasUsers) {
  app.use(basicAuth({
    users,
    challenge: true,
    unauthorizedResponse: () => 'Access denied',
  }));

  // Ручний "вихід" для Basic Auth (примушує браузер забути креденшали)
  app.get('/logout', (req, res) => {
    res.set('WWW-Authenticate', 'Basic realm="logout"');
    res.status(401).send('Logged out');
  });

  console.log(`🔐 Basic Auth enabled (${Object.keys(users).length} user(s))`);
} else {
  console.log('🟢 Basic Auth disabled (no USER*/PASS* env vars).');
}

/* -------------------- Healthcheck -------------------- */
app.get('/healthz', (req, res) => res.type('text').send('ok'));

/* -------------------- Статика -------------------- */
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],           // /export -> /export.html, якщо файл є
  index: ['index.html'],          // / -> index.html
  maxAge: '1h',                   // кеш для статичних ресурсів
  setHeaders: (res, filePath) => {
    // HTML не кешуємо агресивно
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

/* -------------------- Явні сторінки -------------------- */
// Якщо зробиш сторінку входу — віддавати її тут:
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/* -------------------- SPA fallback (без "*") -------------------- */
/**
 * Express 5 не любить app.get('*', ...), тому:
 *  - використовуємо regex для всіх GET-запитів
 *  - пропускаємо запити на файли з розширенням (.js/.css/...)
 *  - віддаємо index.html (щоб client-side роутинг працював)
 */
app.get(/.*/, (req, res, next) => {
  if (req.method !== 'GET') return next();
  // якщо шлях має розширення ("/app.js", "/img/logo.png") — це не SPA-роут
  if (path.extname(req.path)) return next();
  // можна проігнорувати API, якщо колись додаси бекенд-ендпоїнти:
  // if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* -------------------- Start -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
