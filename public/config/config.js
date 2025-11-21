// /config/config.js
(function () {
  window.APP_CONFIG = Object.freeze({
    firebase: {
      apiKey: "AIzaSyAREP_iNSUZqNFH5RB5PE084b3wNyxaJ6c",
      authDomain: "route-project-ba7c6.firebaseapp.com",
      projectId: "route-project-ba7c6",
  storageBucket: "route-project-ba7c6.appspot.com",
      messagingSenderId: "953368824279",
      appId: "1:953368824279:web:68d28c2fd40292c13ee392",
      measurementId: "G-B6B2JK7BXE"
    },
    mapboxToken: "pk.eyJ1Ijoicm91dGUtcHJvamVjdCIsImEiOiJjbWc2YW92dHQwYXAzMmpyMnk0bXVuaWZmIn0.RCbWRVvqx6q9skCB-rv5pA",
    // Optional: set to your Cloudflare Worker URL + "/send-approval" to send Telegram messages online
    // Example: "https://route-telegram-endpoint.<account>.workers.dev/send-approval"
    telegramEndpoint: "https://route-telegram-endpoint.route-project25.workers.dev/send-approval"
    
    // 🧪 testMode більше не використовується — тепер це налаштування per-user в Firestore (users/{uid}.testMode)
    // Адмін керує цим на сторінці admin.html через перемикач "Тестові дані"
  });
})();
