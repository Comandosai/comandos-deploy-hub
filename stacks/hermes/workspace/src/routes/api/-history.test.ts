import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: (_path: string) => (opts: any) => opts,
}))

vi.mock('../../server/auth-middleware', () => ({
  isAuthenticated: () => true,
}))

const ensureGatewayProbed = vi.fn()
const getGatewayCapabilities = vi.fn()

vi.mock('../../server/claude-api', () => ({
  SESSIONS_API_UNAVAILABLE_MESSAGE: 'Sessions API unavailable',
  ensureGatewayProbed,
  getGatewayCapabilities,
  getMessages: vi.fn(),
  listSessions: vi.fn(),
  toChatMessage: vi.fn(),
}))

const getLocalSession = vi.fn()
const getLocalMessages = vi.fn()

vi.mock('../../server/local-session-store', () => ({
  getLocalSession,
  getLocalMessages,
}))

async function loadHandlers() {
  vi.resetModules()
  ensureGatewayProbed.mockReset()
  getGatewayCapabilities.mockReset()
  getLocalSession.mockReset()
  getLocalMessages.mockReset()
  const mod = await import('./history')
  return mod.Route.server.handlers
}

describe('GET /api/history', () => {
  it('returns local portable history when the gateway has no sessions API', async () => {
    const handlers = await loadHandlers()
    ensureGatewayProbed.mockResolvedValue(undefined)
    getGatewayCapabilities.mockReturnValue({
      sessions: false,
      dashboard: { available: false },
      enhancedChat: false,
    })
    getLocalSession.mockReturnValue({
      id: 'main',
      title: null,
      model: 'deepseek-chat',
      createdAt: 1,
      updatedAt: 2,
      messageCount: 2,
    })
    getLocalMessages.mockReturnValue([
      {
        id: 'user-1',
        role: 'user',
        content: 'hello',
        timestamp: 1000,
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'hi',
        timestamp: 2000,
      },
    ])

    const res = await handlers.GET({
      request: new Request(
        'http://localhost/api/history?sessionKey=main&friendlyId=main',
      ),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      sessionKey: 'main',
      sessionId: 'main',
      source: 'local',
    })
    expect(body.messages).toHaveLength(2)
    expect(body.messages.map((message: any) => message.role)).toEqual([
      'user',
      'assistant',
    ])
    expect(body.messages[1].content[0].text).toBe('hi')
  })
})
