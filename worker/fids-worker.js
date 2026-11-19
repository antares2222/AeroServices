// Proxy FIDS Liège Airport — Cloudflare Worker (remplace la fonction Netlify)
// Appel : https://<ton-worker>.workers.dev/?type=arrivals|departures
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const type = new URL(request.url).searchParams.get('type');
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
