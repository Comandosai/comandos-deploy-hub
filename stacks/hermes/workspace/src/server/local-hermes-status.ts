import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type LocalHermesServiceStatus = {
  url: string
  available: boolean
  status?: number
  error?: string
}

export type LocalHermesStatus = {
  ok: boolean
  checkedAt: number
  mode: 'single-panel' | 'legacy-dashboard'
  cli: {
    path: string | null
    version: string | null
    available: boolean
  }
  home: {
    path: string
    exists: boolean
    configExists: boolean
    envExists: boolean
    apiServerEnabled: boolean | null
  }
  services: {
    gateway: LocalHermesServiceStatus
    dashboard: LocalHermesServiceStatus
  }
  inventory: {
    profiles: number
    skills: number
    mcpServers: number | null
    cronJobs: number | null
  }
  setupNotes: Array<string>
}

function exec(
  command: string,
  args: Array<string>,
  options: { timeout?: number } = {},
): string | null {
  try {
    return (
      execFileSync(command, args, {
        encoding: 'utf8',
        timeout: options.timeout ?? 5_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || null
    )
  } catch {
    return null
  }
}

function hermesHome(): string {
  return process.env.HERMES_HOME || join(homedir(), '.hermes')
}

function hermesCliPath(): string | null {
  const explicit = process.env.HERMES_CLI_PATH
  if (explicit && existsSync(explicit)) return explicit
  const which = exec('which', ['hermes'])
  return which && existsSync(which) ? which : null
}

function readEnvFlag(path: string, key: string): boolean | null {
  try {
    const raw = readFileSync(path, 'utf8')
    const line = raw
      .split('\n')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${key}=`))
    if (!line) return null
    const value = line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '')
    if (/^(1|true|yes|on)$/i.test(value)) return true
    if (/^(0|false|no|off)$/i.test(value)) return false
    return null
  } catch {
    return null
  }
}

function readProcessFlag(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (value === undefined || value === '') return defaultValue
  if (/^(1|true|yes|on)$/i.test(value)) return true
  if (/^(0|false|no|off)$/i.test(value)) return false
  return defaultValue
}

function countDirs(path: string): number {
  try {
    return readdirSync(path).filter((name) => {
      try {
        return statSync(join(path, name)).isDirectory()
      } catch {
        return false
      }
    }).length
  } catch {
    return 0
  }
}

function countSkillFiles(path: string): number {
  try {
    let count = 0
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name)
      if (entry.isFile() && entry.name === 'SKILL.md') count += 1
      if (entry.isDirectory()) count += countSkillFiles(child)
    }
    return count
  } catch {
    return 0
  }
}

function countJsonArray(path: string): number | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (Array.isArray(parsed)) return parsed.length
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (Array.isArray(obj.jobs)) return obj.jobs.length
      if (Array.isArray(obj.items)) return obj.items.length
    }
    return null
  } catch {
    return null
  }
}

async function probe(url: string, timeoutMs = 1_500): Promise<LocalHermesServiceStatus> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    return { url, available: response.ok, status: response.status }
  } catch (error) {
    return {
      url,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function detectLocalHermesStatus(): Promise<LocalHermesStatus> {
  const home = hermesHome()
  const envPath = join(home, '.env')
  const configPath = join(home, 'config.yaml')
  const cliPath = hermesCliPath()
  const version = cliPath ? exec(cliPath, ['--version'], { timeout: 10_000 }) : null
  const gatewayUrl = process.env.HERMES_API_URL || 'http://127.0.0.1:8642'
  const dashboardUrl = process.env.HERMES_DASHBOARD_URL || 'http://127.0.0.1:9119'
  const singlePanel = readProcessFlag('COMANDOS_SINGLE_PANEL', true)
  const requireDashboard = readProcessFlag('COMANDOS_REQUIRE_HERMES_DASHBOARD', false)
  const effectiveRequireDashboard = requireDashboard || !singlePanel
  const shouldProbeDashboard =
    effectiveRequireDashboard ||
    Boolean(process.env.HERMES_DASHBOARD_URL || process.env.CLAUDE_DASHBOARD_URL)
  const [gateway, dashboard] = await Promise.all([
    probe(`${gatewayUrl.replace(/\/$/, '')}/health`),
    shouldProbeDashboard
      ? probe(`${dashboardUrl.replace(/\/$/, '')}/api/status`)
      : Promise.resolve({
          url: `${dashboardUrl.replace(/\/$/, '')}/api/status`,
          available: false,
          error: 'optional in COMANDOS single-panel mode',
        }),
  ])
  const apiServerEnabled = existsSync(envPath)
    ? readEnvFlag(envPath, 'API_SERVER_ENABLED')
    : null
  const mcpCount = countJsonArray(join(home, 'mcp_servers.json'))
  const cronCount = countJsonArray(join(home, 'cron', 'jobs.json'))
  const setupNotes: Array<string> = []

  if (!gateway.available) {
    if (!cliPath) setupNotes.push('Hermes CLI not found. Set HERMES_CLI_PATH or install hermes in PATH.')
    if (apiServerEnabled !== true) {
      setupNotes.push('Gateway HTTP API is opt-in: set API_SERVER_ENABLED=true in ~/.hermes/.env and restart hermes gateway.')
    }
    setupNotes.push(`Gateway API is not reachable at ${gateway.url}.`)
  }
  if (effectiveRequireDashboard && !dashboard.available) {
    setupNotes.push(`Dashboard API is not reachable at ${dashboard.url}. Start hermes dashboard --no-open.`)
  }

  const ok = Boolean(
    gateway.available &&
      (!effectiveRequireDashboard || dashboard.available),
  )

  return {
    ok,
    checkedAt: Date.now(),
    mode: singlePanel && !effectiveRequireDashboard ? 'single-panel' : 'legacy-dashboard',
    cli: {
      path: cliPath,
      version,
      available: Boolean(cliPath && version),
    },
    home: {
      path: home,
      exists: existsSync(home),
      configExists: existsSync(configPath),
      envExists: existsSync(envPath),
      apiServerEnabled,
    },
    services: { gateway, dashboard },
    inventory: {
      profiles: countDirs(join(home, 'profiles')),
      skills: countSkillFiles(join(home, 'skills')),
      mcpServers: mcpCount,
      cronJobs: cronCount,
    },
    setupNotes,
  }
}
