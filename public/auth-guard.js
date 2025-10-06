// /js/auth-guard.js
(function () {
  // 1) Ховаємо сторінку, поки не зрозуміло стан логіна (без «блимання»)
  if (!document.getElementById('authGate')) {
    const s = document.createElement('style');
    s.id = 'authGate';
    s.textContent = 'body{visibility:hidden}';
    document.head.appendChild(s);
  }

  // 2) Ініціалізація Firebase з /config/config.js (без дублювань і без хардкоду)
  const tryInit = () => {
    const cfg = window.APP_CONFIG && window.APP_CONFIG.firebase;
    if (!cfg) {
      console.error('[auth-guard] APP_CONFIG.firebase не знайдено. Підключіть /config/config.js перед /js/auth-guard.js');
      return false;
    }
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
      return true;
    } catch (e) {
      // якщо вже ініціалізовано — ок
      if (firebase.apps && firebase.apps.length) return true;
      console.error('[auth-guard] init error:', e);
      return false;
    }
  };

  if (!tryInit()) return;

  // 3) Перевірка аутентифікації + редирект на /login.html
  const auth = firebase.auth();
  auth.onAuthStateChanged(u => {
    const gate = document.getElementById('authGate');
    if (!u) {
      const here = location.pathname + location.search + location.hash;
      location.replace('/login.html?next=' + encodeURIComponent(here));
      return;
    }
    if (gate) gate.remove();

    // Глобальний logout для кнопок «Вийти»
    window.appLogout = async () => {
      try { await auth.signOut(); }
      finally { location.replace('/login.html'); }
    };
  });
})();
