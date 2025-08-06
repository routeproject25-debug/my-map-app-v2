require('dotenv').config();

const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Базова авторизація для всього сайту
app.use(basicAuth({
  users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASSWORD },
  challenge: true,           // Показувати браузеру форму логіну
  unauthorizedResponse: (req) => 'Невірний логін або пароль'
}));

// Роздача статичних файлів з папки public
app.use(express.static(path.join(__dirname, 'public')));

// Якщо зайти просто на корінь, віддаємо index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запускаємо сервер
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
