require('dotenv').config();

const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Збірка користувачів з .env
const users = {};
if (process.env.USER1 && process.env.PASS1) {
  users[process.env.USER1] = process.env.PASS1;
}
if (process.env.USER2 && process.env.PASS2) {
  users[process.env.USER2] = process.env.PASS2;
}
if (process.env.USER3 && process.env.PASS3) {
  users[process.env.USER3] = process.env.PASS3;
}

// Авторизація для всього сайту
app.use(basicAuth({
  users: users,
  challenge: true,
  unauthorizedResponse: (req) => 'Access denied',
}));

// Видача статичних файлів
app.use(express.static(path.join(__dirname, 'public')));

// Обробка головної сторінки
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
