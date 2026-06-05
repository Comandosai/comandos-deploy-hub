import { beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyPassword } from '../../server/auth-middleware'
import { Route } from './auth'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: any) => opts,
}))

vi.mock('../../server/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  rateLimit: () => true,
  rateLimitResponse: () => Response.json({ ok: false }, { status: 429 }),
  requireJsonContentType: () => null,
}))

vi.mock('../../server/auth-middleware', () => ({
  createSessionCookie: () => 'claude-auth=test-token; Path=/; HttpOnly',
  generateSessionToken: () => 'test-token',
  isPasswordProtectionEnabled: () => true,
  storeSessionToken: vi.fn(),
  verifyPassword: vi.fn(),
}))

const mockVerifyPassword = vi.mocked(verifyPassword)

function post(password: string): Request {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

function postHandler() {
  return Route.server.handlers.POST as (input: {
    request: Request
  }) => Promise<Response>
}

describe('POST /api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a handled Russian refusal for a wrong password', async () => {
    mockVerifyPassword.mockReturnValue(false)

    const response = await postHandler()({
      request: post('wrong-password'),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: false, error: 'Неверный пароль.' })
  })

  it('keeps successful login behavior unchanged', async () => {
    mockVerifyPassword.mockReturnValue(true)

    const response = await postHandler()({
      request: post('correct-password'),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(response.headers.get('set-cookie')).toContain('claude-auth=')
  })
})
