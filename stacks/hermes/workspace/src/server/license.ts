import { createHash, randomBytes } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type LicenseStatus = {
  required: boolean
  activated: boolean
  status: 'disabled' | 'active' | 'missing' | 'expired' | 'invalid'
  message?: string
  activationId?: string
  licensedTo?: string
  expiresAt?: string
  lastCheckedAt?: string
}

type StoredActivation = {
  activationId: string
  licenseKeyHash: string
  licensedTo?: string
  expiresAt?: string
  activatedAt: string
  lastCheckedAt: string
}

type LicenseServerResponse = {
  ok?: boolean
  valid?: boolean
  activationId?: string
  licensedTo?: string
  expiresAt?: string
  message?: string
  error?: string
}

function hermesHome(): string {
  return process.env.HERMES_HOME ?? process.env.CLAUDE_HOME ?? join(homedir(), '.hermes')
}

function activationPath(): string {
  return join(hermesHome(), 'workspace-license.json')
}

function instancePath(): string {
  return join(hermesHome(), 'workspace-instance-id')
}

function truthyEnv(name: string): boolean {
  const value = (process.env[name] || '').trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

export function isLicenseRequired(): boolean {
  return truthyEnv('COMANDOS_LICENSE_REQUIRED')
}

function hashLicenseKey(key: string): string {
  return createHash('sha256').update(key.trim(), 'utf8').digest('hex')
}

function ensurePrivateFile(path: string): void {
  try {
    chmodSync(path, 0o600)
  } catch {
    // best effort on non-POSIX systems
  }
}

function readStoredActivation(): StoredActivation | null {
  try {
    const raw = readFileSync(activationPath(), 'utf8')
    const parsed = JSON.parse(raw) as StoredActivation
    if (!parsed || typeof parsed.activationId !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredActivation(activation: StoredActivation): void {
  const file = activationPath()
  const dir = dirname(file)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  writeFileSync(file, JSON.stringify(activation, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  })
  ensurePrivateFile(file)
}

export function getWorkspaceInstanceId(): string {
  const file = instancePath()
  try {
    const existing = readFileSync(file, 'utf8').trim()
    if (existing) return existing
  } catch {
    // create below
  }

  const dir = dirname(file)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  const next = `comandos-${randomBytes(16).toString('hex')}`
  writeFileSync(file, `${next}\n`, { encoding: 'utf8', mode: 0o600 })
  ensurePrivateFile(file)
  return next
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  const time = Date.parse(expiresAt)
  if (!Number.isFinite(time)) return false
  return time <= Date.now()
}

export function getLicenseStatus(): LicenseStatus {
  if (!isLicenseRequired()) {
    return { required: false, activated: true, status: 'disabled' }
  }

  const activation = readStoredActivation()
  if (!activation) {
    return {
      required: true,
      activated: false,
      status: 'missing',
      message: 'License key required',
    }
  }

  if (isExpired(activation.expiresAt)) {
    return {
      required: true,
      activated: false,
      status: 'expired',
      message: 'License key expired',
      activationId: activation.activationId,
      licensedTo: activation.licensedTo,
      expiresAt: activation.expiresAt,
      lastCheckedAt: activation.lastCheckedAt,
    }
  }

  return {
    required: true,
    activated: true,
    status: 'active',
    activationId: activation.activationId,
    licensedTo: activation.licensedTo,
    expiresAt: activation.expiresAt,
    lastCheckedAt: activation.lastCheckedAt,
  }
}

function devKeys(): Set<string> {
  return new Set(
    (process.env.COMANDOS_LICENSE_DEV_KEYS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

async function validateWithLicenseServer(
  licenseKey: string,
): Promise<LicenseServerResponse> {
  const serverUrl = (process.env.COMANDOS_LICENSE_SERVER_URL || '').trim()
  if (!serverUrl) {
    const allowed = devKeys()
    if (allowed.has(licenseKey.trim())) {
      return {
        ok: true,
        valid: true,
        activationId: `dev-${hashLicenseKey(licenseKey).slice(0, 12)}`,
        licensedTo: 'COMANDOS dev license',
      }
    }

    return {
      ok: false,
      valid: false,
      error: 'License server is not configured',
    }
  }

  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseKey: licenseKey.trim(),
      product: 'comandos-hermes-workspace',
      instanceId: getWorkspaceInstanceId(),
    }),
    signal: AbortSignal.timeout(8_000),
  })

  const payload = (await response.json().catch(() => ({}))) as LicenseServerResponse
  if (!response.ok) {
    return {
      ok: false,
      valid: false,
      error: payload.error || payload.message || `License server returned ${response.status}`,
    }
  }

  return payload
}

export async function activateLicense(
  licenseKey: string,
): Promise<{ ok: boolean; status: LicenseStatus; error?: string }> {
  const key = licenseKey.trim()
  if (!key) {
    return {
      ok: false,
      error: 'License key is required',
      status: getLicenseStatus(),
    }
  }

  if (!isLicenseRequired()) {
    return {
      ok: true,
      status: { required: false, activated: true, status: 'disabled' },
    }
  }

  const result = await validateWithLicenseServer(key)
  const valid = result.ok === true || result.valid === true
  if (!valid) {
    return {
      ok: false,
      error: result.error || result.message || 'License key is invalid',
      status: {
        required: true,
        activated: false,
        status: 'invalid',
        message: result.error || result.message || 'License key is invalid',
      },
    }
  }

  const now = new Date().toISOString()
  const activation: StoredActivation = {
    activationId: result.activationId || `act-${hashLicenseKey(`${key}:${now}`).slice(0, 16)}`,
    licenseKeyHash: hashLicenseKey(key),
    licensedTo: result.licensedTo,
    expiresAt: result.expiresAt,
    activatedAt: now,
    lastCheckedAt: now,
  }
  writeStoredActivation(activation)

  return { ok: true, status: getLicenseStatus() }
}
