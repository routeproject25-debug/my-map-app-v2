# Cloudflare Worker: Telegram approval endpoint

This Worker exposes a minimal HTTPS endpoint to send Telegram messages without exposing your bot token to the browser.

- Endpoint: POST /send-approval
- Auth: uses Worker secrets TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
- CORS: controlled via ALLOWED_ORIGIN (default "*")

## Deploy (Windows PowerShell)

1) Install CLI and login

```powershell
npm i -g wrangler
wrangler login
```

2) Set secrets (enter values interactively)

```powershell
cd cloudflare-worker
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

3) (Optional) set allowed origins in wrangler.toml

```toml
name = "route-telegram-endpoint"
main = "src/worker.js"
compatibility_date = "2024-10-01"

[vars]
# Allow specific origins (JSON array or comma-separated). Example: prod + localhost
ALLOWED_ORIGINS = "[\"https://my-site.example\",\"http://localhost:3000\"]"
```

4) Deploy

```powershell
wrangler deploy
```

CLI will print a workers.dev URL, for example:

```
https://route-telegram-endpoint.<your-account>.workers.dev
```

5) Use from frontend

Set APP_CONFIG.telegramEndpoint to your Worker URL + "/send-approval", or pass it directly to fetch.

```js
fetch("https://route-telegram-endpoint.<acct>.workers.dev/send-approval", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ routeName, routeId, reviewLink })
});
```