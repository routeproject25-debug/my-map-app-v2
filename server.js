require('dotenv').config();  // Завантажує змінні середовища

const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

//app.use(basicAuth({
//  users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASSWORD },
//  challenge: true,
//}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
