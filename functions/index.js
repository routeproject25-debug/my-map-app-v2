// Cloud Function to send Telegram approval message without exposing secrets
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// Declare secrets (must be set via `firebase functions:secrets:set ...`)
const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = defineSecret('TELEGRAM_CHAT_ID');

exports.telegramSendApproval = onRequest({ cors: true, secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID] }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const token = TELEGRAM_BOT_TOKEN.value() || '';
    const chatId = TELEGRAM_CHAT_ID.value() || '';
    if (!token || !chatId) {
      return res.status(200).json({ ok: false, error: 'Telegram not configured' });
    }

    const body = req.body || {};
    const routeName = (body.routeName ? String(body.routeName) : 'Маршрут').slice(0, 200);
    const routeId = (body.routeId ? String(body.routeId) : '').slice(0, 120);
    const reviewLink = (body.reviewLink && typeof body.reviewLink === 'string' && body.reviewLink.startsWith('http'))
      ? body.reviewLink
      : '';

    let text = `🚦 Маршрут на погодження:\n${routeName}`;
    if (reviewLink) text += `\n<a href="${reviewLink}">Маршрут</a>`;
    else if (routeId) text += `\nID: ${routeId}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const params = new URLSearchParams({ chat_id: chatId, text, parse_mode: 'HTML' });

    const r = await fetch(`${url}?${params.toString()}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j || j.ok !== true) {
      return res.status(502).json({ ok: false, error: 'Telegram API error', status: r.status, body: j });
    }
    return res.json({ ok: true, message_id: j.result && j.result.message_id });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String((e && e.message) || e) });
  }
});
