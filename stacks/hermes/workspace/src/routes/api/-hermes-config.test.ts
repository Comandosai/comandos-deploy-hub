import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: (_path: string) => (opts: any) => opts,
}))

vi.mock('../../server/auth-middleware', () => ({
  isAuthenticated: () => true,
}))

vi.mock('../../server/gateway-capabilities', () => ({
  ensureGatewayProbed: vi.fn(),
  getCapabilities: () => ({ config: true }),
}))

vi.mock('../../server/local-provider-discovery', () => ({
  ensureDiscovery: vi.fn(),
  getDiscoveryStatus: () => [],
  getDiscoveredModels: () => [],
}))

let tmpHome = ''
const originalEnv: Record<string, string | undefined> = {}

function setEnv(key: string, value: string | undefined) {
  if (!(key in originalEnv)) originalEnv[key] = process.env[key]
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-config-route-'))
  setEnv('HERMES_HOME', tmpHome)
  setEnv('CLAUDE_HOME', undefined)
  vi.resetModules()
})

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  for (const key of Object.keys(originalEnv)) delete originalEnv[key]
  fs.rmSync(tmpHome, { recursive: true, force: true })
})

async function loadHandlers(modulePath: string) {
  const mod: {
    Route: {
      server: { handlers: Record<string, (input: any) => Promise<Response>> }
    }
  } = await import(modulePath)
  return mod.Route.server.handlers
}

describe('canonical /api/hermes-config route', () => {
  it('GET returns normalized provider state with paths and active provider', async () => {
    fs.writeFileSync(
      path.join(tmpHome, 'config.yaml'),
      'provider: openrouter\nmodel: auto\n',
      'utf-8',
    )
    fs.writeFileSync(
      path.join(tmpHome, '.env'),
      'OPENROUTER_API_KEY=fake-active-openrouter\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.GET({
      request: new Request('http://localhost/api/hermes-config'),
    })
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.activeProvider).toBe('openrouter')
    expect(body.activeModel).toBe('auto')
    expect(body.paths.hermesHome).toBe(tmpHome)
    const openrouter = body.providers.find((p: any) => p.id === 'openrouter')
    expect(openrouter.configured).toBe(true)
    expect(openrouter.isDefault).toBe(true)
  })

  it('GET returns configured providers without waiting for local port discovery', async () => {
    const discovery = await import('../../server/local-provider-discovery')
    vi.mocked(discovery.ensureDiscovery).mockImplementation(
      () => new Promise(() => undefined),
    )
    fs.writeFileSync(
      path.join(tmpHome, 'config.yaml'),
      'provider: deepseek\nmodel: deepseek-chat\n',
      'utf-8',
    )
    fs.writeFileSync(
      path.join(tmpHome, '.env'),
      'DEEPSEEK_API_KEY=fake-active-deepseek\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./hermes-config')
    const result = await Promise.race([
      handlers
        .GET({
          request: new Request('http://localhost/api/hermes-config'),
        })
        .then(async (res) => {
          const body = await res.json()
          return body.activeProvider === 'deepseek' ? 'returned' : 'wrong'
        }),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('timed-out'), 25),
      ),
    ])

    expect(result).toBe('returned')
    vi.mocked(discovery.ensureDiscovery).mockReset()
  })

  it('PATCH dispatches set-default-model and returns the action message', async () => {
    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'set-default-model',
          providerId: 'openrouter',
          modelId: 'auto',
        }),
      }),
    })
    const body = await res.json()

    expect(body).toMatchObject({
      ok: true,
      message: 'Модель по умолчанию обновлена.',
    })
    expect(fs.readFileSync(path.join(tmpHome, 'config.yaml'), 'utf-8')).toMatch(
      /provider: openrouter/,
    )
  })

  it('PATCH legacy { config } body deep-merges and preserves siblings', async () => {
    fs.writeFileSync(
      path.join(tmpHome, 'config.yaml'),
      'memory:\n  user_profile_enabled: true\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./hermes-config')
    await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({ config: { memory: { memory_enabled: true } } }),
      }),
    })

    const onDisk = fs.readFileSync(path.join(tmpHome, 'config.yaml'), 'utf-8')
    expect(onDisk).toContain('memory_enabled: true')
    expect(onDisk).toContain('user_profile_enabled: true')
  })

  it('PATCH rejects malformed action bodies with 400', async () => {
    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'set-default-model' }),
      }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH remove-provider refuses to remove the active provider', async () => {
    fs.writeFileSync(
      path.join(tmpHome, 'config.yaml'),
      'provider: openrouter\nmodel: auto\n',
      'utf-8',
    )
    fs.writeFileSync(
      path.join(tmpHome, '.env'),
      'OPENROUTER_API_KEY=fake-active-openrouter\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'remove-provider',
          providerId: 'openrouter',
        }),
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('Сначала выберите другую модель')
    expect(fs.readFileSync(path.join(tmpHome, '.env'), 'utf-8')).toContain(
      'OPENROUTER_API_KEY=fake-active-openrouter',
    )
  })

  it('PATCH remove-provider removes inactive env keys and config auth profiles', async () => {
    fs.writeFileSync(
      path.join(tmpHome, 'config.yaml'),
      [
        'provider: deepseek',
        'model: deepseek-chat',
        'auth:',
        '  profiles:',
        '    openrouter:default:',
        '      provider: openrouter',
        '      apiKey: fake-config-openrouter',
        '    deepseek:default:',
        '      provider: deepseek',
        '      apiKey: fake-config-deepseek',
        '',
      ].join('\n'),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(tmpHome, '.env'),
      'OPENROUTER_API_KEY=fake-env-openrouter\nDEEPSEEK_API_KEY=fake-env-deepseek\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'remove-provider',
          providerId: 'openrouter',
        }),
      }),
    })
    const body = await res.json()
    const configOnDisk = fs.readFileSync(
      path.join(tmpHome, 'config.yaml'),
      'utf-8',
    )
    const envOnDisk = fs.readFileSync(path.join(tmpHome, '.env'), 'utf-8')

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(configOnDisk).not.toContain('openrouter')
    expect(configOnDisk).toContain('deepseek:default')
    expect(envOnDisk).not.toContain('OPENROUTER_API_KEY')
    expect(envOnDisk).toContain('DEEPSEEK_API_KEY=fake-env-deepseek')
  })

  it('PATCH remove-provider explains CLI providers instead of pretending to delete them', async () => {
    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'remove-provider',
          providerId: 'openai-codex',
        }),
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('codex logout')
  })

  it('PATCH returns 503 when the gateway capability is unavailable', async () => {
    vi.doMock('../../server/gateway-capabilities', () => ({
      ensureGatewayProbed: vi.fn(),
      getCapabilities: () => ({ config: false }),
    }))
    const handlers = await loadHandlers('./hermes-config')
    const res = await handlers.PATCH({
      request: new Request('http://localhost/api/hermes-config', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'set-api-key',
          envKey: 'X',
          value: 'y',
        }),
      }),
    })
    expect(res.status).toBe(503)
    vi.doUnmock('../../server/gateway-capabilities')
  })
})

describe('legacy config-get/config-patch compatibility routes', () => {
  it('GET /api/config-get returns JSON config payload for old settings clients', async () => {
    fs.writeFileSync(
      path.join(tmpHome, 'config.yaml'),
      'model:\n  default: deepseek-chat\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./config-get')
    const res = await handlers.GET({
      request: new Request('http://localhost/api/config-get'),
    })
    const body = await res.json()

    expect(res.headers.get('content-type')).toContain('application/json')
    expect(body.ok).toBe(true)
    expect(body.payload.model.default).toBe('deepseek-chat')
  })

  it('POST /api/config-patch saves dotted path updates from settings controls', async () => {
    const handlers = await loadHandlers('./config-patch')
    const res = await handlers.POST({
      request: new Request('http://localhost/api/config-patch', {
        method: 'POST',
        body: JSON.stringify({
          path: 'agents.defaults.contextTokens',
          value: 32000,
        }),
      }),
    })
    const body = await res.json()
    const onDisk = fs.readFileSync(path.join(tmpHome, 'config.yaml'), 'utf-8')

    expect(body).toMatchObject({ ok: true, message: 'Настройки сохранены.' })
    expect(onDisk).toContain('agents:')
    expect(onDisk).toContain('contextTokens: 32000')
  })

  it('POST /api/config-patch saves raw JSON patches from provider wizard', async () => {
    const handlers = await loadHandlers('./config-patch')
    const res = await handlers.POST({
      request: new Request('http://localhost/api/config-patch', {
        method: 'POST',
        body: JSON.stringify({
          raw: JSON.stringify({
            auth: {
              profiles: {
                'deepseek:default': {
                  provider: 'deepseek',
                  apiKey: 'fake-deepseek-key',
                },
              },
            },
          }),
          reason: 'test provider wizard patch',
        }),
      }),
    })
    const body = await res.json()
    const onDisk = fs.readFileSync(path.join(tmpHome, 'config.yaml'), 'utf-8')

    expect(body).toMatchObject({ ok: true, message: 'Настройки сохранены.' })
    expect(onDisk).toContain('deepseek:default')
    expect(onDisk).toContain('provider: deepseek')
  })
})

describe('legacy /api/claude-config alias', () => {
  it('GET aliases provider.maskedCredentials to provider.maskedKeys for the legacy /settings page', async () => {
    fs.writeFileSync(
      path.join(tmpHome, '.env'),
      'OPENROUTER_API_KEY=sk-test-1234\n',
      'utf-8',
    )

    const handlers = await loadHandlers('./claude-config')
    const res = await handlers.GET({
      request: new Request('http://localhost/api/claude-config'),
    })
    const body = await res.json()
    const openrouter = body.providers.find((p: any) => p.id === 'openrouter')

    expect(openrouter.maskedKeys).toEqual(openrouter.maskedCredentials)
    expect(openrouter.maskedKeys.OPENROUTER_API_KEY).toBeTruthy()
  })
})
