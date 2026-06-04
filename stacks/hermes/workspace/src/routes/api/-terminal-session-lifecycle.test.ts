import { EventEmitter } from 'node:events'
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
const createTerminalSession = vi.fn()

vi.mock('../../server/terminal-sessions', () => ({
  createTerminalSession,
  getTerminalSession,
}))

async function loadHandlers(modulePath: string) {
  vi.resetModules()
  getTerminalSession.mockReset()
  createTerminalSession.mockReset()
  const mod = await import(modulePath)
  return mod.Route.server.handlers
}

function jsonRequest(
  url: string,
  body: Record<string, unknown>,
  init: Pick<RequestInit, 'signal'> = {},
) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  })
}

function createFakeSession() {
  return {
    id: 'live-session',
    createdAt: Date.now(),
    emitter: new EventEmitter(),
    sendInput: vi.fn(),
    resize: vi.fn(),
    close: vi.fn(),
    markAttached: vi.fn(),
    markDetached: vi.fn(),
  }
}

describe('terminal session lifecycle API', () => {
  it('treats resize for a stale terminal session as a harmless no-op', async () => {
    const handlers = await loadHandlers('./terminal-resize')
    getTerminalSession.mockReturnValue(null)

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
    const handlers = await loadHandlers('./terminal-input')
    getTerminalSession.mockReturnValue(null)

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

  it('removes terminal stream listeners when the PTY closes', async () => {
    const session = createFakeSession()
    const handlers = await loadHandlers('./terminal-stream')
    getTerminalSession.mockReturnValue(session)

    const res = await handlers.POST({
      request: jsonRequest('http://localhost/api/terminal-stream', {
        sessionId: session.id,
      }),
    })

    expect(res.status).toBe(200)
    expect(session.emitter.listenerCount('event')).toBe(1)
    expect(session.emitter.listenerCount('close')).toBe(1)

    session.emitter.emit('close')
    await res.text()

    expect(session.emitter.listenerCount('event')).toBe(0)
    expect(session.emitter.listenerCount('close')).toBe(0)
    expect(session.markDetached).not.toHaveBeenCalled()
  })

  it('removes terminal stream listeners when the request aborts', async () => {
    const session = createFakeSession()
    const abortController = new AbortController()
    const handlers = await loadHandlers('./terminal-stream')
    getTerminalSession.mockReturnValue(session)

    const res = await handlers.POST({
      request: jsonRequest(
        'http://localhost/api/terminal-stream',
        { sessionId: session.id },
        { signal: abortController.signal },
      ),
    })

    expect(res.status).toBe(200)
    expect(session.emitter.listenerCount('event')).toBe(1)
    expect(session.emitter.listenerCount('close')).toBe(1)

    abortController.abort()

    expect(session.emitter.listenerCount('event')).toBe(0)
    expect(session.emitter.listenerCount('close')).toBe(0)
    expect(session.markDetached).toHaveBeenCalledTimes(1)

    await res.body?.cancel().catch(() => undefined)
  })
})
