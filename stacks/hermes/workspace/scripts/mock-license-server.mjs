import { createServer } from 'node:http'

const port = Number(process.env.PORT || 8787)
const validKeys = new Set(
  (process.env.COMANDOS_MOCK_LICENSE_KEYS || 'COMANDOS-DEMO-KEY-123')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
)

const server = createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
    return
  }

  let raw = ''
  for await (const chunk of req) raw += chunk

  let body = {}
  try {
    body = JSON.parse(raw || '{}')
  } catch {
    // handled below
  }

  const key = String(body.licenseKey || '').trim()
  if (!validKeys.has(key)) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, valid: false, error: 'License key is invalid' }))
    return
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      ok: true,
      valid: true,
      activationId: `mock-${Date.now()}`,
      licensedTo: 'COMANDOS mock customer',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  )
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Mock COMANDOS license server: http://127.0.0.1:${port}`)
  console.log(`Valid keys: ${Array.from(validKeys).join(', ')}`)
})
