// Cloud Functions
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Initialize Admin SDK once
try { admin.initializeApp(); } catch (_) {}

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

// Helper: verify Firebase ID token from Authorization: Bearer <token>
async function verifyAuth(req){
  const h = req.get('authorization') || req.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.*)$/i);
  if (!m) throw Object.assign(new Error('Missing bearer token'), { code: 'unauthenticated' });
  const token = m[1];
  try { return await admin.auth().verifyIdToken(token); }
  catch(e){ throw Object.assign(new Error('Invalid token'), { code:'unauthenticated' }); }
}

// Helper: get role and hubs for user
async function getUserAccess(uid){
  const snap = await admin.firestore().collection('users').doc(uid).get();
  const d = snap.exists ? (snap.data() || {}) : {};
  const role = String(d.role || 'user').toLowerCase();
  let hubs = [];
  if (Array.isArray(d.allowedHubs) && d.allowedHubs.length) hubs = d.allowedHubs;
  else if (Array.isArray(d.hubs) && d.hubs.length) hubs = d.hubs;
  else if (typeof d.hub === 'string' && d.hub.trim()) hubs = [d.hub.trim()];
  else if (typeof d.hubAccess === 'string' && d.hubAccess.trim()) hubs = [d.hubAccess.trim()];
  return { role, hubs };
}

function firstLetter(str){
  const s = String(str || '').trim();
  if (!s) return 'X';
  const re = /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]/u;
  for (const ch of s){ if (re.test(ch)) return ch.toUpperCase(); }
  return 'X';
}
function randomDigits(len=10){
  let out = '';
  for (let i=0;i<len;i++){ out += Math.floor(Math.random()*10).toString(); }
  return out;
}

// Server-side save route (fallback when client gets permission-denied)
exports.saveRoute = onRequest({ cors: true }, async (req, res) => {
  try{
    if (req.method !== 'POST'){
      res.set('Allow','POST');
      return res.status(405).json({ ok:false, error:'Method Not Allowed' });
    }

    const auth = await verifyAuth(req);
    const { role, hubs } = await getUserAccess(auth.uid);
    const isAdmin = role === 'admin' || role === 'security';
    const isLogist = role === 'logist';
    if (!isAdmin && !isLogist) return res.status(403).json({ ok:false, error:'forbidden' });

    const body = req.body || {};
    const id   = String(body.id || '').trim();
    if (!id) return res.status(400).json({ ok:false, error:'Missing id' });
    const data = body.data && typeof body.data === 'object' ? body.data : {};

    // Basic shape guard
    const fromCode = String(data.fromCode || '');
    const toCode   = String(data.toCode || '');
    const routeType= String(data.routeType || '');
    if (!fromCode || !toCode || !routeType) return res.status(400).json({ ok:false, error:'Invalid route fields' });

    // Hub access check
    const hub = (data.hub == null ? null : String(data.hub));
    const allHubs = !Array.isArray(hubs) || hubs.length === 0;
    if (!allHubs){ if (!(typeof hub === 'string' && hub && hubs.includes(hub))) return res.status(403).json({ ok:false, error:'hub forbidden' }); }

    // Route key: keep existing or generate local
    const db = admin.firestore();
    const routeRef = db.collection('routes').doc(id);
    const prev = await routeRef.get();
    let routeKey = (prev.exists && prev.data().routeKey) ? String(prev.data().routeKey) : null;
    if (!routeKey){
      const fromName = String(data.fromLabel || data.fromName || '');
      const toName   = String(data.toLabel   || data.toName   || '');
      const prefix   = firstLetter(fromName) + firstLetter(toName);
      routeKey = `${prefix}-${randomDigits(10)}`;
    }

    const merged = Object.assign({}, data, { routeKey, updatedAt: new Date().toISOString() });
    await routeRef.set(merged, { merge:true });
    return res.json({ ok:true, id, routeKey });
  }catch(e){
    const code = e && e.code ? String(e.code) : undefined;
    if (code === 'unauthenticated') return res.status(401).json({ ok:false, error:'unauthenticated' });
    return res.status(500).json({ ok:false, error: String(e && e.message || e) });
  }
});
