// Proxy FIDS Liège Airport — évite le blocage CORS
// Appelé depuis index.html via /.netlify/functions/fids?type=arrivals|departures

export async function handler(event) {
  const type = event.queryStringParameters?.type;
  if (type !== 'arrivals' && type !== 'departures') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Paramètre type invalide. Utilise arrivals ou departures.' })
    };
  }

  const fidsUrl = `https://fids.liegeairport.com/api/flights/spw/${type}`;

  try {
    const res = await fetch(fidsUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`FIDS a répondu ${res.status}`);
    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
}
