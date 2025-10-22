function parseAllowedOrigins(env){
  // Support ALLOWED_ORIGINS as JSON array or comma-separated string; fallback to ALLOWED_ORIGIN
  const raw = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '*';
  if (raw === '*') return '*';
  try{
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return new Set(j.map(String));
  }catch(_){ /* not JSON */ }
  return new Set(String(raw).split(',').map(s=>s.trim()).filter(Boolean));
}

function buildCorsHeaders(request, allowed){
  const origin = request.headers.get('Origin') || '';
  const base = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (allowed === '*') return { ...base, 'Access-Control-Allow-Origin': '*' };
  const isAllowed = origin && allowed.has(origin);
  return { ...base, 'Access-Control-Allow-Origin': isAllowed ? origin : 'null' };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowed = parseAllowedOrigins(env);
    const corsHeaders = buildCorsHeaders(request, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname !== '/send-approval') {
      return new Response(JSON.stringify({ ok: true, service: 'telegram-worker' }), {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json', ...corsHeaders, 'Allow': 'POST, OPTIONS' },
      });
    }

    // Enforce origin if a list is configured
    if (allowed !== '*' && corsHeaders['Access-Control-Allow-Origin'] === 'null'){
      return new Response(JSON.stringify({ ok:false, error:'Origin not allowed' }), {
        status: 403,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return new Response(JSON.stringify({ ok: false, error: 'Not configured' }), {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    let body = {};
    try { body = await request.json(); } catch (_) {}

    const routeName = (body?.routeName ? String(body.routeName) : 'Маршрут').slice(0, 200);
    const routeId = (body?.routeId ? String(body.routeId) : '').slice(0, 120);
    const reviewLink = (typeof body?.reviewLink === 'string' && /^https?:\/\//i.test(body.reviewLink)) ? body.reviewLink : '';

    let text = `🚦 Маршрут на погодження:\n${routeName}`;
    if (reviewLink) text += `\n<a href="${reviewLink}">Маршрут</a>`;
    else if (routeId) text += `\nID: ${routeId}`;

    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const params = new URLSearchParams({ chat_id: String(env.TELEGRAM_CHAT_ID), text, parse_mode: 'HTML' });

    const tgResp = await fetch(`${tgUrl}?${params.toString()}`, { method: 'GET' });
    let j = null; try { j = await tgResp.json(); } catch (_) {}

    if (!tgResp.ok || !j || j.ok !== true) {
      return new Response(JSON.stringify({ ok: false, error: 'Telegram API error', status: tgResp.status, body: j }), {
        status: 502,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, message_id: j.result && j.result.message_id }), {
      status: 200,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }
};
