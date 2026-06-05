import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activateLicense } from '../../../server/license'
import { Route } from './activate'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: any) => opts,
}))

vi.mock('../../../server/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  rateLimit: () => true,
  rateLimitResponse: () => Response.json({ ok: false }, { status: 429 }),
  requireJsonContentType: () => null,
}))

vi.mock('../../../server/license', () => ({
  activateLicense: vi.fn(),
  normalizeLicenseError: (message: string) => message,
}))

const mockActivateLicense = vi.mocked(activateLicense)

function post(body: unknown): Request {
  return new Request('http://localhost/api/license/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postHandler() {
  return Route.server.handlers.POST as (input: {
    request: Request
  }) => Promise<Response>
}

describe('POST /api/license/activate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok:false with HTTP 200 for handled activation refusal', async () => {
    mockActivateLicense.mockResolvedValue({
      ok: false,
      error: 'Лицензия не найдена или отклонена сервером.',
      status: {
        required: true,
        activated: false,
        status: 'invalid',
        message: 'Лицензия не найдена или отклонена сервером.',
      },
    })

    const response = await postHandler()({
      request: post({ licenseKey: 'COMANDOS-INVALID-QA-0000' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Лицензия не найдена или отклонена сервером.')
  })

  it('still rejects malformed activation requests', async () => {
    const response = await postHandler()({
      request: post({ licenseKey: '' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
  })
})
