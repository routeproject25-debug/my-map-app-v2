// server.js
require('dotenv').config();

const express   = require('express');
const basicAuth = require('express-basic-auth');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Збираємо користувачів з env
const users = {};
['1', '2', '3'].forEach(n => {
  const u = process.env['USER' + n];
  const p = process.env['PASS' + n];
  if (u && p) users[u] = p;
});
const hasUsers = Object.keys(users).length > 0;

// Увімкнути basic-auth ТІЛЬКИ якщо є користувачі
if (hasUsers) {
  app.use(basicAuth({
    users,
    challenge: true,
    unauthorizedResponse: () => 'Access denied',
  }));

  // Ручний "вихід": змушує браузер забути креденшали
  app.get('/logout', (req, res) => {
    res.set('WWW-Authenticate', 'Basic realm="logout"');
    return res.status(401).send('Logged out');
  });

  console.log(`🔐 Basic Auth enabled (${Object.keys(users).length} user(s))`);
} else {
  console.log('🟢 Basic Auth disabled (no USER*/PASS* env vars).');
}

// Статика
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// SPA fallback (щоб будь-який маршрут віддавав index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
