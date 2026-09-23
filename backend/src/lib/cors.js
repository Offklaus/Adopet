/** Libera CORS só para as origens configuradas (CORS_ORIGIN). */
export function applyCors(req, res, allowedOrigins) {
  const origin = req.headers.origin
  if (!origin || !allowedOrigins.includes(origin)) return

  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '600')
}
