# 🎨 Система дизайну FARMLOG

Єдиний дизайн для всіх сторінок проекту.

## 📦 Файли системи

- `/public/styles/common.css` - спільні стилі (кольори, кнопки, картки, форми)
- `/public/styles/header.js` - компонент навігаційної шапки

## 🚀 Як використовувати

### 1. Підключити CSS

Додайте в `<head>` кожної сторінки:

```html
<!-- Спільні стилі -->
<link rel="stylesheet" href="/styles/common.css">
```

### 2. Додати шапку (опціонально)

Якщо хочете автоматичну шапку з навігацією:

```html
<!-- Перед закриваючим </body> -->
<script src="/styles/header.js"></script>
<script>
  // Вказати поточну сторінку для підсвічування
  initAppHeader('map'); // 'map' | 'export' | 'calculator' | 'review'
</script>
```

Або вручну вставити HTML шапки:

```html
<header class="app-header">
  <a href="/index.html" class="app-header__brand">
    <svg class="app-header__logo" viewBox="0 0 24 24" fill="none">
      <path d="M3 12h18M12 3v18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    <span>FARMLOG</span>
  </a>
  
  <nav class="app-header__nav">
    <a href="/index.html" class="app-header__link active">🗺️ Карта</a>
    <a href="/export/" class="app-header__link">📤 Експорт</a>
    <a href="/calculator.html" class="app-header__link">💰 Калькулятор</a>
  </nav>
  
  <div class="app-header__auth">
    <div class="app-header__user">
      <span>👨‍💻</span>
      <span class="app-header__role">admin</span>
    </div>
    <button class="btn btn--sm" onclick="logout()">Вийти</button>
  </div>
</header>
```

## 🎨 Доступні компоненти

### Кнопки

```html
<button class="btn btn--primary">Основна</button>
<button class="btn btn--secondary">Другорядна</button>
<button class="btn btn--success">Успіх</button>
<button class="btn btn--danger">Небезпечна</button>
<button class="btn btn--sm">Маленька</button>
<button class="btn btn--lg">Велика</button>
```

### Картки

```html
<div class="card">
  <div class="card__header">
    <h2 class="card__title">Заголовок</h2>
    <p class="card__subtitle">Підзаголовок</p>
  </div>
  <div class="card__body">
    Контент картки
  </div>
</div>
```

### Форми

```html
<div class="form-group">
  <label class="form-label">Назва поля</label>
  <input type="text" class="form-input" placeholder="Введіть значення">
</div>

<div class="form-group">
  <label class="form-label">Виберіть опцію</label>
  <select class="form-select">
    <option>Опція 1</option>
    <option>Опція 2</option>
  </select>
</div>
```

### Badges

```html
<span class="badge badge--primary">Primary</span>
<span class="badge badge--success">Success</span>
<span class="badge badge--warning">Warning</span>
<span class="badge badge--danger">Danger</span>
```

### Alerts

```html
<div class="alert alert--info">Інформаційне повідомлення</div>
<div class="alert alert--success">Успішно виконано!</div>
<div class="alert alert--warning">Попередження</div>
<div class="alert alert--danger">Помилка</div>
```

## 🎨 CSS змінні

```css
:root {
  /* Кольори */
  --primary: #2563eb;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --muted: #6b7280;
  
  /* Відступи */
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  
  /* Закруглення */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  
  /* Тіні */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);
}
```

## 🔧 Утиліти

```html
<!-- Текст -->
<p class="text-center">Центрований текст</p>
<p class="text-muted">Приглушений текст</p>
<p class="text-primary">Синій текст</p>

<!-- Відступи -->
<div class="mt-lg">Margin top</div>
<div class="mb-xl">Margin bottom</div>

<!-- Flex -->
<div class="flex gap-md">Flex з відступами</div>
<div class="flex-between">Flex space-between</div>

<!-- Адаптивність -->
<div class="hide-mobile">Сховано на мобільних</div>
<div class="hide-desktop">Сховано на десктопі</div>
```

## 📱 Адаптивність

Всі компоненти автоматично адаптуються під мобільні пристрої.

Breakpoint: `768px`

## 🎨 Приклад повної сторінки

```html
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <title>Приклад сторінки</title>
  <link rel="stylesheet" href="/styles/common.css">
</head>
<body>
  
  <!-- Контент -->
  <div class="app-container">
    <div class="card">
      <div class="card__header">
        <h1 class="card__title">Заголовок</h1>
      </div>
      
      <div class="form-group">
        <label class="form-label">Поле</label>
        <input type="text" class="form-input">
      </div>
      
      <button class="btn btn--primary">Зберегти</button>
    </div>
  </div>

  <!-- Автоматична шапка -->
  <script src="/styles/header.js"></script>
  <script>initAppHeader('map');</script>
</body>
</html>
```

---

**Створено:** 24 листопада 2025  
**Версія:** 1.0
