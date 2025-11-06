// Cloud Functions
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
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

// Approve/Reject route (server-side, role: admin|security)
exports.approveRoute = onRequest({ cors: true }, async (req, res) => {
  try{
    if (req.method !== 'POST'){
      res.set('Allow','POST');
      return res.status(405).json({ ok:false, error:'Method Not Allowed' });
    }

    const auth = await verifyAuth(req);
    const { role } = await getUserAccess(auth.uid);
    const isReviewer = role === 'admin' || role === 'security';
    if (!isReviewer) return res.status(403).json({ ok:false, error:'forbidden' });

    const body = req.body || {};
    const id = String(body.id || '').trim();
    const decision = String(body.decision || '').toLowerCase(); // 'approved' | 'rejected'
    const comment = (body.comment == null) ? null : String(body.comment || '');
    if (!id) return res.status(400).json({ ok:false, error:'Missing id' });
    if (!['approved','rejected'].includes(decision)) return res.status(400).json({ ok:false, error:'Invalid decision' });

    const db = admin.firestore();
    const ref = db.collection('routes').doc(id);
    const nowIso = new Date().toISOString();
    const payload = {
      approval: {
        status: decision,
        decisionAt: nowIso,
        decidedByUid: auth.uid,
        decidedByEmail: auth.email || null,
        comment: decision === 'rejected' ? (comment || '') : null
      },
      updatedAt: nowIso
    };
    await ref.set(payload, { merge:true });
    return res.json({ ok:true, id, status: decision });
  }catch(e){
    const code = e && e.code ? String(e.code) : undefined;
    if (code === 'unauthenticated') return res.status(401).json({ ok:false, error:'unauthenticated' });
    return res.status(500).json({ ok:false, error: String(e && e.message || e) });
  }
});

// Delete user (admin only): remove Firestore user doc, optional Auth user, and roles doc
exports.deleteUser = onRequest({ cors: true }, async (req, res) => {
  try{
    if (req.method !== 'POST'){
      res.set('Allow','POST');
      return res.status(405).json({ ok:false, error:'Method Not Allowed' });
    }

    const authInfo = await verifyAuth(req);
    const { role } = await getUserAccess(authInfo.uid);
    if (role !== 'admin') return res.status(403).json({ ok:false, error:'forbidden' });

    const body = req.body || {};
    const uid = String(body.uid || '').trim();
    const alsoAuth = !!body.deleteAuth;
    if (!uid) return res.status(400).json({ ok:false, error:'Missing uid' });
    if (uid === authInfo.uid) return res.status(400).json({ ok:false, error:'cannot-delete-self' });

    const db = admin.firestore();
    const batch = db.batch();
    const uref = db.collection('users').doc(uid);
    batch.delete(uref);
    const rref = db.collection('roles').doc(uid);
    batch.delete(rref);
    const audit = db.collection('audit').doc();
    batch.set(audit, { type:'user_delete', targetUid: uid, by: authInfo.uid, at: new Date().toISOString(), via:'function' });
    await batch.commit();

    let authDeleted = false;
    if (alsoAuth){
      try { await admin.auth().deleteUser(uid); authDeleted = true; }
      catch(e){ /* swallow; still consider ok for Firestore */ }
    }
    return res.json({ ok:true, uid, authDeleted });
  }catch(e){
    const code = e && e.code ? String(e.code) : undefined;
    if (code === 'unauthenticated') return res.status(401).json({ ok:false, error:'unauthenticated' });
    return res.status(500).json({ ok:false, error: String(e && e.message || e) });
  }
});

// (setUserDisabled removed as per request)

// =====================
// ROUTE AUDIT LOG (Слід подій по маршрутах)
// Записуємо у collection "route_logs" окремі записи для створення/оновлення/видалення
// Логи зберігаються навіть після видалення маршруту (окрема колекція, не під-документ)
// =====================

function pickTrackedFields(d){
  // Вибираємо ключові поля для журналу
  if (!d || typeof d !== 'object') return {};
  const out = {
    routeKey: d.routeKey || '',
    hub: d.hub || '',
    fromCode: d.fromCode || '',
    toCode: d.toCode || '',
    fromName: d.fromName || d.fromLabel || '',
    toName: d.toName || d.toLabel || '',
    routeType: d.routeType || '',
    distance_km: (typeof d.distance_km === 'number') ? d.distance_km : null,
    logisticName: d.logisticName || '',
    logisticId: d.logisticId || '',
    status: (d.approval && (d.approval.status ?? d.approval.result ?? d.approval.decision)) || d.approvalStatus || d.approved || d.status || '',
    // для контексту
    updatedAt: d.updatedAt || null
  };
  return out;
}

function getActor(d){
  const a = {};
  if (d && typeof d === 'object'){
    // Клієнт може зберігати ці поля під час будь-якої зміни
    a.updatedByUid = d.updatedByUid || d.lastEditedByUid || d.editorUid || null;
    a.updatedByEmail = d.updatedByEmail || d.lastEditedByEmail || d.editorEmail || null;
    // Погодження/відхилення з нашої функції approveRoute
    a.decidedByUid = d.decidedByUid || (d.approval && d.approval.decidedByUid) || null;
    a.decidedByEmail = d.decidedByEmail || (d.approval && d.approval.decidedByEmail) || null;
  }
  return a;
}

function diffFields(prev, next){
  const changes = [];
  const keys = new Set([...Object.keys(prev||{}), ...Object.keys(next||{})]);
  for (const k of keys){
    const was = prev ? prev[k] : undefined;
    const now = next ? next[k] : undefined;
    const eq = (was === now) || (was == null && now == null);
    if (!eq){
      // гарно відформатувати числа
      const pretty = v => (typeof v === 'number' && Number.isFinite(v)) ? v : (v ?? '');
      changes.push({ field: k, was: pretty(was), now: pretty(now) });
    }
  }
  return changes;
}

async function writeRouteLog(db, routeId, type, data){
  const payload = Object.assign({
    routeId,
    type,               // 'created' | 'updated' | 'deleted'
    ts: new Date().toISOString(),
  }, data || {});
  await db.collection('route_logs').add(payload);
}

exports.routeLogOnCreate = onDocumentCreated('routes/{id}', async (event) => {
  const db = admin.firestore();
  const id = event.params.id;
  const after = event.data ? (event.data.data ? event.data.data() : event.data()) : {};
  const next = pickTrackedFields(after);
  const actor = getActor(after);
  await writeRouteLog(db, id, 'created', { ...next, actor });
});

exports.routeLogOnUpdate = onDocumentUpdated('routes/{id}', async (event) => {
  const db = admin.firestore();
  const id = event.params.id;
  const before = event.data && event.data.before ? event.data.before.data() : {};
  const after  = event.data && event.data.after  ? event.data.after.data()  : {};
  const prev = pickTrackedFields(before);
  const next = pickTrackedFields(after);
  const changes = diffFields(prev, next).filter(c => c.field !== 'updatedAt');
  if (!changes.length) return; // нічого суттєвого
  const actor = getActor(after);
  const routeKey = next.routeKey || prev.routeKey || '';
  await writeRouteLog(db, id, 'updated', { routeKey, changes, actor });
});

exports.routeLogOnDelete = onDocumentDeleted('routes/{id}', async (event) => {
  const db = admin.firestore();
  const id = event.params.id;
  const before = event.data ? (event.data.data ? event.data.data() : event.data()) : {};
  const prev = pickTrackedFields(before);
  const actor = getActor(before);
  await writeRouteLog(db, id, 'deleted', { routeKey: prev.routeKey || '', actor });
});
