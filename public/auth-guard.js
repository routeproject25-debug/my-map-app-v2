<!-- auth-guard.js -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script>
  // 1) Firebase init (без дубляжу)
  (function initFirebase(){
    const cfg = {
      apiKey: "AIzaSyDjDBZkmy-skuDEQF8-AkRma7yw6TugoQc",
      authDomain: "my-map-app-58312.firebaseapp.com",
      projectId: "my-map-app-58312",
      storageBucket: "my-map-app-58312.firebasestorage.app",
      messagingSenderId: "53260611353",
      appId: "1:53260611353:web:f25e120996ad8305405f88",
      measurementId: "G-9LRX1FLTKL"
    };
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
  })();

  // 2) Приховуємо сторінку, поки не зрозуміло стан логіна (щоб не блимало)123
  (function hideUntilAuthed(){
    if (!document.getElementById('authGate')) {
      const s = document.createElement('style');
      s.id = 'authGate';
      s.textContent = 'body{visibility:hidden}';
      document.head.appendChild(s);
    }
  })();

  // 3) Перевірка аутентифікації + редирект на /login.html
  (function guard(){
    const auth = firebase.auth();
    auth.onAuthStateChanged(u => {
      const gate = document.getElementById('authGate');
      if (!u) {
        const here = location.pathname + location.search + location.hash;
        location.replace('/login.html?next=' + encodeURIComponent(here));
      } else {
        if (gate) gate.remove();
        // Експортуємо глобальний logout для кнопок "Вийти"
        window.appLogout = async () => {
          try { await auth.signOut(); } finally { location.replace('/login.html'); }
        };
      }
    });
  })();
</script>
