export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { endpoint, ...params } = req.query;

  // Whitelist allowed endpoints to prevent abuse
  const allowedEndpoints = ['current.json', 'forecast.json', 'search.json', 'astronomy.json'];
  if (!endpoint || !allowedEndpoints.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid or missing endpoint parameter' });
  }

  try {
    const url = new URL(`https://api.weatherapi.com/v1/${endpoint}`);
    url.searchParams.set('key', apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }

    const fetchOptions = {
      method: req.method,
      headers: {
        'Accept': 'application/json',
      },
    };

    const response = await fetch(url.toString(), fetchOptions);

    // For HEAD requests, just return the status
    if (req.method === 'HEAD') {
      return res.status(response.status).end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: 'Failed to fetch from weather API' });
  }
}
