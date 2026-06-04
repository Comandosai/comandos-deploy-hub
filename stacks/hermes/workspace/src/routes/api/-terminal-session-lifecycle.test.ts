import { describe, expect, it, vi } from 'vitest'
import type * as RateLimitModule from '../../server/rate-limit'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: (_path: string) => (opts: any) => opts,
}))

vi.mock('../../server/auth-middleware', () => ({
  requireLocalOrAuth: () => true,
}))

vi.mock('../../server/rate-limit', async () => {
  const actual = await vi.importActual<typeof RateLimitModule>(
    '../../server/rate-limit',
  )
  return {
    ...actual,
    requireJsonContentType: () => null,
  }
})

const getTerminalSession = vi.fn()

vi.mock('../../server/terminal-sessions', () => ({
  getTerminalSession,
}))

async function loadHandlers(modulePath: string) {
  vi.resetModules()
  getTerminalSession.mockReset()
  const mod = await import(modulePath)
  return mod.Route.server.handlers
}

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('terminal session lifecycle API', () => {
  it('treats resize for a stale terminal session as a harmless no-op', async () => {
    getTerminalSession.mockReturnValue(null)
    const handlers = await loadHandlers('./terminal-resize')

    const res = await handlers.POST({
      request: jsonRequest('http://localhost/api/terminal-resize', {
        sessionId: 'closed-session',
        cols: 120,
        rows: 32,
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, attached: false })
  })

  it('treats input for a stale terminal session as a soft no-op', async () => {
    getTerminalSession.mockReturnValue(null)
    const handlers = await loadHandlers('./terminal-input')

    const res = await handlers.POST({
      request: jsonRequest('http://localhost/api/terminal-input', {
        sessionId: 'closed-session',
        data: 'ls\n',
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: false, attached: false })
  })
})
