/* ================================================
   🎨 FARMLOG - Компонент навігації
   Інклюдиться на всіх сторінках для єдиної шапки
   ================================================ */

// Генерує HTML шапки з навігацією
function generateAppHeader(currentPage = '') {
  const pages = [
    { id: 'map', url: '/index.html', label: '🗺️ Карта', icon: '🗺️' },
    { id: 'export', url: '/export/', label: '📤 Експорт', icon: '📤' },
    { id: 'calculator', url: '/calculator.html', label: '💰 Калькулятор', icon: '💰' },
    { id: 'stats', url: '/admin/stats.html', label: '📈 Статистика', icon: '📈', roles: ['admin'] },
    { id: 'review', url: '/review.html', label: '👮 Перегляд', icon: '👮', roles: ['admin', 'security'] }
  ];
  
  // Отримуємо дані користувача
  const userRole = window.__userRole || 'guest';
  const additionalRoles = window.__userAdditionalRoles || [];
  const allRoles = [userRole, ...additionalRoles];
  
  // Фільтруємо сторінки за ролями
  const visiblePages = pages.filter(page => {
    if (!page.roles) return true; // без обмежень
    return page.roles.some(role => allRoles.includes(role));
  });
  
  // Роль-емодзі
  const roleEmoji = {
    admin: '👨‍💻',
    logist: '🚛',
    security: '👮🏻‍♂️',
    user: '👤',
    guest: '👤'
  };
  
  const primaryEmoji = roleEmoji[userRole] || '👤';
  const additionalEmojis = additionalRoles.map(r => roleEmoji[r] || '').join('');
  const fullEmoji = primaryEmoji + additionalEmojis;
  
  const roleText = additionalRoles.length > 0 
    ? `${userRole} + ${additionalRoles.join(', ')}` 
    : userRole;
  
  return `
    <header class="app-header">
      <a href="/index.html" class="app-header__brand">
        <svg class="app-header__logo" viewBox="0 0 24 24" fill="none">
          <path d="M3 12h18M12 3v18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <span>FARMLOG</span>
      </a>
      
      <nav class="app-header__nav">
        ${visiblePages.map(page => `
          <a href="${page.url}" class="app-header__link ${currentPage === page.id ? 'active' : ''}">
            ${page.icon} <span>${page.label.replace(/^.+?\s+/, '')}</span>
          </a>
        `).join('')}
      </nav>
      
      <div class="app-header__auth">
        <div class="app-header__user">
          <span>${fullEmoji}</span>
          <span class="app-header__role">${roleText}</span>
        </div>
        <button class="btn btn--sm btn--secondary" onclick="logout()" style="background: rgba(255,255,255,0.2); color: white; border-color: rgba(255,255,255,0.3);">
          Вийти
        </button>
      </div>
    </header>
  `;
}

// Функція виходу (універсальна)
function logout() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut().then(() => {
      location.href = '/login.html';
    });
  } else {
    location.href = '/login.html';
  }
}

// Автоматично вставляє шапку на початку body
function initAppHeader(currentPage = '') {
  // Чекаємо DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => insertHeader(currentPage));
  } else {
    insertHeader(currentPage);
  }
}

function insertHeader(currentPage) {
  const headerHTML = generateAppHeader(currentPage);
  
  // Вставляємо на початок body
  if (document.body.firstChild) {
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
  } else {
    document.body.innerHTML = headerHTML + document.body.innerHTML;
  }
}

// Експорт для використання
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAppHeader, initAppHeader };
}
