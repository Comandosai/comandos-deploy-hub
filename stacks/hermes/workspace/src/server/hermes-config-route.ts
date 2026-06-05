import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { z } from 'zod'

import { isAuthenticated } from './auth-middleware'
import { ensureGatewayProbed, getCapabilities } from './gateway-capabilities'
import { normalizeHermesConfigState } from './hermes-config-migration'
import {
  applyHermesConfigPatch,
  parseEnvFile,
  readHermesConfigFiles,
  resolveHermesConfigPaths,
  stringifyEnv,
} from './hermes-config-store'
import {
  ensureDiscovery,
  getDiscoveredModels,
  getDiscoveryStatus,
} from './local-provider-discovery'
import { createCapabilityUnavailablePayload } from '@/lib/feature-gates'

type AuthResult = Response | true

const ACTION_MESSAGES: Record<string, string> = {
  'set-default-model': 'Модель по умолчанию обновлена.',
  'set-api-key': 'API-ключ сохранён.',
  'remove-api-key': 'API-ключ удалён.',
  'set-custom-provider': 'Свой провайдер сохранён.',
  'remove-custom-provider': 'Свой провайдер удалён.',
  'remove-provider': 'Провайдер удалён.',
}

const LEGACY_SAVE_MESSAGE = 'Настройки сохранены.'

const PatchActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set-default-model'),
    providerId: z.string().min(1),
    modelId: z.string().min(1),
  }),
  z.object({
    action: z.literal('set-api-key'),
    envKey: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    action: z.literal('remove-api-key'),
    envKey: z.string().min(1),
  }),
  z.object({
    action: z.literal('set-custom-provider'),
    provider: z.object({
      name: z.string().min(1),
      baseUrl: z.string().min(1),
      apiKeyEnv: z.string().optional(),
      apiMode: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal('remove-custom-provider'),
    name: z.string().min(1),
  }),
  z.object({
    action: z.literal('remove-provider'),
    providerId: z.string().min(1),
  }),
])

const LegacyPatchSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  env: z.record(z.string(), z.union([z.string(), z.null()])).optional(),
})

const PathPatchSchema = z.object({
  path: z.string().min(1),
  value: z.unknown(),
})

const RawPatchSchema = z.object({
  raw: z.unknown(),
  reason: z.string().optional(),
})

async function authorize(request: Request): Promise<AuthResult> {
  const result = isAuthenticated(request) as AuthResult
  if (result !== true) return result
  await ensureGatewayProbed()
  return true
}

function unavailablePayload(extra: Record<string, unknown> = {}): Response {
  return Response.json({
    ...createCapabilityUnavailablePayload('config'),
    config: {},
    providers: [],
    customProviders: [],
    activeProvider: '',
    activeModel: '',
    ...extra,
  })
}

export async function handleHermesConfigGet({
  request,
}: {
  request: Request
}): Promise<Response> {
  const auth = await authorize(request)
  if (auth !== true) return auth

  const paths = resolveHermesConfigPaths()
  if (!getCapabilities().config) {
    return unavailablePayload({ paths, claudeHome: paths.hermesHome })
  }

  void Promise.resolve(ensureDiscovery()).catch(() => undefined)
  const files = readHermesConfigFiles(paths)
  const state = normalizeHermesConfigState({
    paths,
    config: files.config,
    env: files.env,
    authProfiles: files.authProfiles,
    localProviders: getDiscoveryStatus(),
    localModels: getDiscoveredModels(),
  })

  // Legacy /api/claude-config consumers read provider.maskedKeys; alias it.
  const providers = state.providers.map((p) => ({
    ...p,
    maskedKeys: p.maskedCredentials,
  }))

  return Response.json({
    ...state,
    providers,
    claudeHome: paths.hermesHome,
  })
}

export async function handleLegacyConfigGet({
  request,
}: {
  request: Request
}): Promise<Response> {
  const auth = await authorize(request)
  if (auth !== true) return auth

  const paths = resolveHermesConfigPaths()
  if (!getCapabilities().config) {
    return unavailablePayload({ paths, claudeHome: paths.hermesHome })
  }

  const files = readHermesConfigFiles(paths)
  return Response.json({
    ok: true,
    payload: files.config,
    config: files.config,
    claudeHome: paths.hermesHome,
  })
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(
        target[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      )
    } else {
      target[key] = value
    }
  }
}

function applyLegacyConfigBody(
  configPath: string,
  updates: Record<string, unknown>,
): void {
  let current: Record<string, unknown> = {}
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = YAML.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      current = parsed as Record<string, unknown>
    }
  } catch {}

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      delete current[key]
      delete updates[key]
    }
  }
  deepMerge(current, updates)
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, YAML.stringify(current), 'utf-8')
}

function assertSafeConfigPath(pathValue: string): Array<string> {
  const segments = pathValue.split('.').filter(Boolean)
  if (segments.length === 0) throw new Error('Пустой путь настройки.')
  for (const segment of segments) {
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
      throw new Error(`Некорректный путь настройки: ${pathValue}`)
    }
  }
  return segments
}

function applyConfigPathValueBody(
  configPath: string,
  pathValue: string,
  value: unknown,
): void {
  let current: Record<string, unknown> = {}
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = YAML.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      current = parsed as Record<string, unknown>
    }
  } catch {}

  const segments = assertSafeConfigPath(pathValue)
  let cursor = current
  for (const segment of segments.slice(0, -1)) {
    const existing = cursor[segment]
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  }

  const leaf = segments[segments.length - 1]
  if (value === null || value === undefined) delete cursor[leaf]
  else cursor[leaf] = value

  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, YAML.stringify(current), 'utf-8')
}

function parseRawConfigPatch(raw: unknown): Record<string, unknown> {
  const parsed = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('raw должен быть JSON-объектом.')
  }
  const updates = parsed as Record<string, unknown>
  if (
    typeof updates.defaultModel === 'string' &&
    updates.defaultModel.trim() &&
    typeof updates.model !== 'string'
  ) {
    updates.model = updates.defaultModel
  }
  return updates
}

function applyLegacyEnvBody(
  envPath: string,
  envUpdates: Record<string, string | null>,
): void {
  let current: Record<string, string> = {}
  try {
    current = parseEnvFile(fs.readFileSync(envPath, 'utf-8'))
  } catch {}

  for (const [key, value] of Object.entries(envUpdates)) {
    if (value === '' || value === null) delete current[key]
    else current[key] = value
  }
  fs.mkdirSync(path.dirname(envPath), { recursive: true })
  fs.writeFileSync(envPath, stringifyEnv(current), 'utf-8')
}

function applyLegacyPatchBody(
  paths: ReturnType<typeof resolveHermesConfigPaths>,
  body: unknown,
):
  | { ok: true; message: string }
  | { ok: false; status: number; error: string } {
  const hasRaw =
    body !== null &&
    typeof body === 'object' &&
    Object.prototype.hasOwnProperty.call(body, 'raw')
  if (hasRaw) {
    const raw = RawPatchSchema.safeParse(body)
    if (!raw.success) {
      return {
        ok: false,
        status: 400,
        error: 'Некорректный raw-патч настройки.',
      }
    }
    try {
      applyLegacyConfigBody(paths.configPath, parseRawConfigPatch(raw.data.raw))
      return { ok: true, message: LEGACY_SAVE_MESSAGE }
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error:
          error instanceof Error
            ? error.message
            : 'Некорректный raw-патч настройки.',
      }
    }
  }

  const hasPath =
    body !== null &&
    typeof body === 'object' &&
    Object.prototype.hasOwnProperty.call(body, 'path')
  if (hasPath) {
    const pathPatch = PathPatchSchema.safeParse(body)
    if (!pathPatch.success) {
      return {
        ok: false,
        status: 400,
        error: 'Некорректный путь настройки.',
      }
    }
    try {
      applyConfigPathValueBody(
        paths.configPath,
        pathPatch.data.path,
        pathPatch.data.value,
      )
      return { ok: true, message: LEGACY_SAVE_MESSAGE }
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error:
          error instanceof Error
            ? error.message
            : 'Некорректный путь настройки.',
      }
    }
  }

  const legacy = LegacyPatchSchema.safeParse(body)
  if (!legacy.success || (!legacy.data.config && !legacy.data.env)) {
    return {
      ok: false,
      status: 400,
      error: 'Некорректный запрос настроек.',
    }
  }

  if (legacy.data.config)
    applyLegacyConfigBody(paths.configPath, legacy.data.config)
  if (legacy.data.env) applyLegacyEnvBody(paths.envPath, legacy.data.env)

  return { ok: true, message: LEGACY_SAVE_MESSAGE }
}

export async function handleLegacyConfigPatch({
  request,
}: {
  request: Request
}): Promise<Response> {
  const auth = await authorize(request)
  if (auth !== true) return auth

  if (!getCapabilities().config) {
    return new Response(
      JSON.stringify(
        createCapabilityUnavailablePayload('config', {
          error: 'Обновление конфигурации недоступно на этом backend.',
        }),
      ),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { ok: false, error: 'Некорректный JSON.' },
      { status: 400 },
    )
  }

  const result = applyLegacyPatchBody(resolveHermesConfigPaths(), body)
  if (!result.ok) {
    return Response.json(
      { ok: false, error: result.error },
      { status: result.status },
    )
  }
  return Response.json({ ok: true, message: result.message })
}

export async function handleHermesConfigPatch({
  request,
}: {
  request: Request
}): Promise<Response> {
  const auth = await authorize(request)
  if (auth !== true) return auth

  if (!getCapabilities().config) {
    return new Response(
      JSON.stringify(
        createCapabilityUnavailablePayload('config', {
          error: 'Обновление конфигурации недоступно на этом backend.',
        }),
      ),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { ok: false, error: 'Некорректный JSON.' },
      { status: 400 },
    )
  }

  const paths = resolveHermesConfigPaths()
  const hasAction =
    body !== null &&
    typeof body === 'object' &&
    typeof (body as { action?: unknown }).action === 'string'

  if (hasAction) {
    const parsed = PatchActionSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          error: 'Некорректное действие настройки.',
          issues: parsed.error.issues,
        },
        { status: 400 },
      )
    }
    const result = applyHermesConfigPatch(paths, parsed.data)
    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error: result.message || 'Не удалось обновить конфигурацию.',
        },
        { status: result.status ?? 400 },
      )
    }
    return Response.json({
      ...result,
      message: result.message || ACTION_MESSAGES[parsed.data.action],
    })
  }

  const legacy = applyLegacyPatchBody(paths, body)
  if (!legacy.ok) {
    return Response.json(
      { ok: false, error: legacy.error },
      { status: legacy.status },
    )
  }

  return Response.json({ ok: true, message: legacy.message })
}
