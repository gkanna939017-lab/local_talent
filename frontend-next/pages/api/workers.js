// Simple API route that proxies to legacy API if configured, else returns sample data
export default async function handler(req, res) {
  const legacy = process.env.LEGACY_API_URL
  if (legacy) {
    try {
      const url = new URL(req.url, legacy)
      const proxyRes = await fetch(url.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      })
      const data = await proxyRes.json()
      res.status(proxyRes.status).json(data)
      return
    } catch (err) {
      console.error('Proxy error', err)
    }
  }

  // Fallback sample data
  if (req.method === 'GET') {
    res.status(200).json({workers:[{id:1,name:'Alice',exp:5,profession:'plumber'}]})
    return
  }

  if (req.method === 'POST') {
    res.status(201).json({ok:true})
    return
  }

  res.setHeader('Allow', 'GET,POST')
  res.status(405).end('Method Not Allowed')
}
