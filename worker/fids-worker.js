// Cloudflare Worker — Aero Services
//  • GET /?type=arrivals|departures  → proxy FIDS Liège Airport (contourne le CORS)
//  • GET /?params=1                  → lit les paramètres partagés (KV)
//  • PUT /?params=1                  → enregistre les paramètres (mot de passe requis)
//  • GET /?auth=1                    → vérifie le mot de passe des paramètres
// Configuration (tableau de bord Cloudflare) :
//  - Binding KV  : variable PARAMS_KV  → namespace « aeroservices-params »
//  - Secret      : SETTINGS_PASSWORD   → le mot de passe des paramètres
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Settings-Password',
  'Access-Control-Max-Age': '86400'
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS }
  });

function authorised(request, env) {
  const given = request.headers.get('X-Settings-Password') || '';
  const secret = env.SETTINGS_PASSWORD || '';
  if (!secret || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (url.searchParams.has('auth')) {
      if (!env.SETTINGS_PASSWORD) return json({ error: 'SETTINGS_PASSWORD non configuré' }, 501);
      return authorised(request, env) ? json({ ok: true }) : json({ error: 'Mot de passe incorrect' }, 401);
    }

    if (url.searchParams.has('params')) {
      if (!env.PARAMS_KV) return json({ error: 'KV PARAMS_KV non configuré' }, 501);
      if (request.method === 'GET') {
        const v = await env.PARAMS_KV.get('params');
        return new Response(v || 'null', {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS }
        });
      }
      if (request.method === 'PUT') {
        if (!authorised(request, env)) return json({ error: 'Mot de passe incorrect' }, 401);
        const text = await request.text();
        if (text.length > 500000) return json({ error: 'Trop volumineux' }, 413);
        try { const o = JSON.parse(text); if (!o || typeof o !== 'object') throw 0; }
        catch (e) { return json({ error: 'JSON invalide' }, 400); }
        await env.PARAMS_KV.put('params', text);
        return json({ ok: true });
      }
      return json({ error: 'Méthode non autorisée' }, 405);
    }

    const type = url.searchParams.get('type');
    if (type !== 'arrivals' && type !== 'departures')
      return json({ error: 'Paramètre type invalide. Utilise arrivals ou departures.' }, 400);
    try {
      const res = await fetch(`https://fids.liegeairport.com/api/flights/spw/${type}`, {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(`FIDS a répondu ${res.status}`);
      return json(await res.json());
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  }
};
