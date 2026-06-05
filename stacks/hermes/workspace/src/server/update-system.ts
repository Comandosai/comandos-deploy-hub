import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

type ProductId = 'workspace' | 'agent'
type InstallKind = 'git' | 'desktop' | 'docker' | 'managed' | 'unknown'
type UpdateState = 'current' | 'available' | 'blocked' | 'unsupported' | 'error'
type UpdateMode =
  | 'git-ff'
  | 'hermes-update'
  | 'desktop-auto-updater'
  | 'docker-manual'
  | 'manual'
  | 'comandos-managed'
type VersionOrder = -1 | 0 | 1 | null

export type ReleaseNoteSection = {
  product: ProductId
  label: string
  from: string | null
  to: string | null
  commits: Array<string>
}

export type ProductUpdateStatus = {
  id: ProductId
  label: string
  installKind: InstallKind
  version: string
  path: string | null
  repoPath: string | null
  branch: string | null
  currentHead: string | null
  latestHead: string | null
  latestVersion: string | null
  updateAvailable: boolean
  canUpdate: boolean
  state: UpdateState
  reason: string | null
  manifestUrl?: string | null
  /**
   * When state is 'blocked' due to a dirty checkout, this lists up to a few
   * paths that are causing the block (modified, staged, or untracked files).
   * Surfaced in the UI so the user can see which files to deal with. See #293.
   */
  blockingFiles?: Array<string>
  updateMode: UpdateMode
}

export type UpdateStatus = {
  ok: true
  checkedAt: number
  checkIntervalMs: number
  products: {
    workspace: ProductUpdateStatus
    agent: ProductUpdateStatus
  }
  updateAvailable: boolean
  pendingReleaseNotes: Array<ReleaseNoteSection>
}

export type ApplyUpdateResult = {
  ok: boolean
  product: ProductId
  output: string
  restartRequired: boolean
  status: ProductUpdateStatus
  releaseNotes: Array<ReleaseNoteSection>
  error?: string
}

type ComandosInstalledState = {
  workspaceVersion?: string
  hermesAgentRef?: string
  hermesAgentVersion?: string
  updatedAt?: string
}

type ManifestProduct = {
  version?: string
  ref?: string
  title?: string
  notes?: Array<string>
}

type ComandosUpdateManifest = {
  schema?: number
  channel?: string
  workspace?: ManifestProduct
  agent?: ManifestProduct
}

type ReadComandosManifestOptions = {
  preferCache?: boolean
  allowRemote?: boolean
}

const DEFAULT_COMANDOS_UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/update-manifest.json'
const DEFAULT_HERMES_AGENT_INSTALLER_URL =
  'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh'
const DEFAULT_UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000
const MIN_UPDATE_CHECK_INTERVAL_MS = 10 * 1000
const MAX_UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const BACKGROUND_MANIFEST_REFRESH_INTERVAL_MS = 60 * 1000
let managedUpdateScriptSyncAttempted = false
let manifestRefreshPromise: Promise<ComandosUpdateManifest | null> | null = null
let manifestRefreshStartedAt = 0

function pendingNotesPath(): string {
  return join(process.cwd(), '.runtime', 'pending-update-release-notes.json')
}

function persistPendingReleaseNotes(sections: Array<ReleaseNoteSection>): void {
  if (!sections.length) return
  const path = pendingNotesPath()
  mkdirSync(join(process.cwd(), '.runtime'), { recursive: true })
  writeFileSync(
    path,
    `${JSON.stringify({ sections, updatedAt: Date.now() }, null, 2)}\n`,
  )
}

function readPendingReleaseNotes(): Array<ReleaseNoteSection> {
  try {
    const raw = JSON.parse(readFileSync(pendingNotesPath(), 'utf8')) as {
      sections?: Array<ReleaseNoteSection>
    }
    return Array.isArray(raw.sections) ? raw.sections : []
  } catch {
    return []
  }
}

export function normalizePendingReleaseNotes(
  sections: Array<ReleaseNoteSection>,
  products: UpdateStatus['products'],
): Array<ReleaseNoteSection> {
  const normalized = sections.flatMap((section) => {
    const product = (products as Partial<Record<string, ProductUpdateStatus>>)[
      section.product
    ]
    if (!product) return []
    const to =
      section.to &&
      product.latestHead &&
      section.to === product.latestHead &&
      product.latestVersion
        ? product.latestVersion
        : section.to
    const next = { ...section, to }
    const expectedTo = product.updateAvailable
      ? product.latestVersion || product.latestHead
      : product.version || product.currentHead
    if (product.updateAvailable) {
      return next.from === product.version && next.to === expectedTo
        ? [next]
        : []
    }
    return next.to === expectedTo ? [next] : []
  })

  const coveredProducts = new Set(normalized.map((section) => section.product))
  for (const product of Object.values(products)) {
    if (!product.updateAvailable || coveredProducts.has(product.id)) continue
    normalized.push({
      product: product.id,
      label: product.label,
      from: product.version || product.currentHead,
      to: product.latestVersion || product.latestHead,
      commits: [],
    })
  }

  return normalized
}

function exec(
  command: string,
  args: Array<string>,
  options: { cwd?: string; timeout?: number; stdio?: 'pipe' | 'ignore' } = {},
): string | null {
  try {
    if (options.stdio === 'ignore') {
      execFileSync(command, args, {
        cwd: options.cwd ?? process.cwd(),
        timeout: options.timeout ?? 8_000,
        stdio: 'ignore',
      })
      return 'ok'
    }
    return (
      execFileSync(command, args, {
        cwd: options.cwd ?? process.cwd(),
        encoding: 'utf8',
        timeout: options.timeout ?? 8_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim() || null
    )
  } catch {
    return null
  }
}

function installedStatePath(): string {
  return (
    process.env.COMANDOS_INSTALLED_STATE ||
    join(process.cwd(), '.runtime', 'comandos-installed.json')
  )
}

function manifestCachePath(): string {
  return (
    process.env.COMANDOS_UPDATE_MANIFEST_CACHE ||
    join(process.cwd(), '.runtime', 'update-manifest-cache.json')
  )
}

function readInstalledState(): ComandosInstalledState {
  try {
    return JSON.parse(
      readFileSync(installedStatePath(), 'utf8'),
    ) as ComandosInstalledState
  } catch {
    return {}
  }
}

function comandosManifestUrl(): string | null {
  const value = (
    process.env.COMANDOS_UPDATE_MANIFEST_URL ||
    DEFAULT_COMANDOS_UPDATE_MANIFEST_URL
  ).trim()
  return value || null
}

export function readUpdateCheckIntervalMs(): number {
  const raw = (
    process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS ||
    process.env.VITE_UPDATE_CHECK_INTERVAL_MS ||
    ''
  ).trim()
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_UPDATE_CHECK_INTERVAL_MS
  return Math.min(
    MAX_UPDATE_CHECK_INTERVAL_MS,
    Math.max(MIN_UPDATE_CHECK_INTERVAL_MS, parsed),
  )
}

function resolveGithubRawBranchUrl(url: string): string {
  const match = url.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
  )
  if (!match) return url

  const [, owner, repo, ref, path] = match
  if (/^[0-9a-f]{40}$/i.test(ref)) return url

  const remoteUrl = `https://github.com/${owner}/${repo}.git`
  const lsRemote = exec('git', ['ls-remote', remoteUrl, ref], {
    timeout: 8_000,
  })
  const lsRemoteSha = lsRemote?.split(/\s+/)[0] ?? null
  if (lsRemoteSha && /^[0-9a-f]{40}$/i.test(lsRemoteSha)) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${lsRemoteSha}/${path}`
  }

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`
  const raw = exec(
    'curl',
    [
      '-fsSL',
      '--max-time',
      '6',
      '-H',
      'Accept: application/vnd.github+json',
      '-H',
      'User-Agent: comandos-workspace-update-check',
      apiUrl,
    ],
    { timeout: 8_000 },
  )

  try {
    const data = raw ? (JSON.parse(raw) as { sha?: unknown }) : null
    const sha = typeof data?.sha === 'string' ? data.sha : null
    return sha && /^[0-9a-f]{40}$/i.test(sha)
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`
      : url
  } catch {
    return url
  }
}

async function fetchTextWithTimeout(
  url: string,
  timeoutMs: number,
  headers: Record<string, string> = {},
): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })
    return response.ok ? await response.text() : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveGithubRawBranchUrlAsync(url: string): Promise<string> {
  const match = url.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
  )
  if (!match) return url

  const [, owner, repo, ref, path] = match
  if (/^[0-9a-f]{40}$/i.test(ref)) return url

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`
  const raw = await fetchTextWithTimeout(apiUrl, 3_000, {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'comandos-workspace-update-check',
  })

  try {
    const data = raw ? (JSON.parse(raw) as { sha?: unknown }) : null
    const sha = typeof data?.sha === 'string' ? data.sha : null
    return sha && /^[0-9a-f]{40}$/i.test(sha)
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`
      : url
  } catch {
    return url
  }
}

function parseComandosManifest(raw: string): ComandosUpdateManifest | null {
  try {
    const manifest = JSON.parse(raw) as unknown
    return manifest !== null && typeof manifest === 'object'
      ? (manifest as ComandosUpdateManifest)
      : null
  } catch {
    return null
  }
}

function readCachedComandosManifest(): ComandosUpdateManifest | null {
  try {
    return parseComandosManifest(readFileSync(manifestCachePath(), 'utf8'))
  } catch {
    return null
  }
}

function writeCachedComandosManifest(manifest: ComandosUpdateManifest): void {
  const target = manifestCachePath()
  const tmpPath = `${target}.tmp.${process.pid}`
  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(tmpPath, `${JSON.stringify(manifest, null, 2)}\n`)
    renameSync(tmpPath, target)
  } catch {
    try {
      unlinkSync(tmpPath)
    } catch {
      // ignore cleanup failures; update status must stay readable
    }
  }
}

export function readComandosManifest(
  options: ReadComandosManifestOptions = {},
): ComandosUpdateManifest | null {
  const allowRemote = options.allowRemote ?? true
  const cached = options.preferCache ? readCachedComandosManifest() : null
  if (cached) return cached

  const url = comandosManifestUrl()
  if (!url) return cached
  try {
    let manifest: ComandosUpdateManifest | null = null
    if (url.startsWith('file://')) {
      manifest = parseComandosManifest(
        readFileSync(url.slice('file://'.length), 'utf8'),
      )
      return manifest || readCachedComandosManifest()
    }
    if (url.startsWith('/')) {
      manifest = parseComandosManifest(readFileSync(url, 'utf8'))
      return manifest || readCachedComandosManifest()
    }
    if (!allowRemote) return readCachedComandosManifest()
    const manifestUrl = resolveGithubRawBranchUrl(url)
    const raw = exec(
      'curl',
      [
        '-fsSL',
        '--max-time',
        '12',
        '-H',
        'Cache-Control: no-cache',
        '-H',
        'Pragma: no-cache',
        manifestUrl,
      ],
      {
        timeout: 15_000,
      },
    )
    manifest = raw ? parseComandosManifest(raw) : null
    if (manifest) {
      writeCachedComandosManifest(manifest)
      return manifest
    }
    return readCachedComandosManifest()
  } catch {
    return readCachedComandosManifest()
  }
}

export async function refreshComandosManifestCache(): Promise<ComandosUpdateManifest | null> {
  const url = comandosManifestUrl()
  if (!url) return null
  try {
    let manifest: ComandosUpdateManifest | null = null
    if (url.startsWith('file://')) {
      manifest = parseComandosManifest(
        readFileSync(url.slice('file://'.length), 'utf8'),
      )
    } else if (url.startsWith('/')) {
      manifest = parseComandosManifest(readFileSync(url, 'utf8'))
    } else {
      const manifestUrl = await resolveGithubRawBranchUrlAsync(url)
      const raw = await fetchTextWithTimeout(manifestUrl, 4_000, {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      })
      manifest = raw ? parseComandosManifest(raw) : null
    }
    if (manifest) writeCachedComandosManifest(manifest)
    return manifest
  } catch {
    return null
  }
}

export function refreshComandosManifestCacheInBackground(): void {
  const url = comandosManifestUrl()
  if (!url) return
  const now = Date.now()
  if (
    manifestRefreshPromise ||
    now - manifestRefreshStartedAt < BACKGROUND_MANIFEST_REFRESH_INTERVAL_MS
  ) {
    return
  }

  manifestRefreshStartedAt = now
  manifestRefreshPromise = refreshComandosManifestCache().finally(() => {
    manifestRefreshPromise = null
  })
}

function isExecutable(path: string | null | undefined): boolean {
  if (!path) return false
  try {
    const stat = statSync(path)
    return stat.isFile() && Boolean(stat.mode & 0o111)
  } catch {
    return false
  }
}

function updateScriptPath(): string | null {
  const value = (process.env.COMANDOS_UPDATE_SCRIPT || '').trim()
  return value || null
}

function managedUpdateTemplatePath(): string | null {
  const manifestUrl = comandosManifestUrl()
  if (!manifestUrl) return null
  const manifestPath = manifestUrl.startsWith('file://')
    ? manifestUrl.slice('file://'.length)
    : manifestUrl

  if (manifestPath.startsWith('/')) {
    return join(
      dirname(manifestPath),
      'templates',
      'update',
      'comandos-update.sh',
    )
  }

  return manifestUrl.replace(
    /\/update-manifest\.json(?:\?.*)?$/,
    '/templates/update/comandos-update.sh',
  )
}

function readManagedUpdateTemplate(): string | null {
  const templatePath = managedUpdateTemplatePath()
  if (!templatePath) return null
  try {
    if (templatePath.startsWith('file://')) {
      return readFileSync(templatePath.slice('file://'.length), 'utf8')
    }
    if (templatePath.startsWith('/')) return readFileSync(templatePath, 'utf8')
    const rawUrl = resolveGithubRawBranchUrl(templatePath)
    return exec(
      'curl',
      [
        '-fsSL',
        '--max-time',
        '6',
        '-H',
        'Cache-Control: no-cache',
        '-H',
        'Pragma: no-cache',
        rawUrl,
      ],
      { timeout: 8_000 },
    )
  } catch {
    return null
  }
}

export function renderManagedUpdateScriptTemplate(
  template: string,
  values: Partial<Record<string, string>> = {},
): string {
  const replacements: Record<string, string> = {
    REMOTE_BASE_DIR: process.env.REMOTE_BASE_DIR || '/opt/comandos/hermes',
    REMOTE_WORKSPACE_DIR: process.env.REMOTE_WORKSPACE_DIR || process.cwd(),
    REMOTE_HERMES_HOME:
      process.env.REMOTE_HERMES_HOME ||
      process.env.HERMES_HOME ||
      join(homedir(), '.hermes'),
    HERMES_AGENT_INSTALLER_URL:
      process.env.HERMES_AGENT_INSTALLER_URL ||
      DEFAULT_HERMES_AGENT_INSTALLER_URL,
    COMANDOS_STACK_REPO_URL:
      process.env.COMANDOS_STACK_REPO_URL ||
      'https://github.com/Comandosai/comandos-deploy-hub.git',
    COMANDOS_STACK_REF: process.env.COMANDOS_STACK_REF || 'main',
    COMANDOS_STACK_PATH: process.env.COMANDOS_STACK_PATH || 'stacks/hermes',
    ...values,
  }
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => {
    return replacements[key] ?? ''
  })
}

function syncManagedUpdateScriptIfNeeded(): void {
  if (managedUpdateScriptSyncAttempted) return
  managedUpdateScriptSyncAttempted = true

  const script = updateScriptPath()
  if (!script) return

  let tmpPath: string | null = null
  try {
    const template = readManagedUpdateTemplate()
    if (!template) return

    const rendered = renderManagedUpdateScriptTemplate(template)
    const current = existsSync(script) ? readFileSync(script, 'utf8') : ''
    if (current === rendered) return

    mkdirSync(dirname(script), { recursive: true })
    tmpPath = `${script}.tmp.${process.pid}`
    writeFileSync(tmpPath, rendered)
    chmodSync(tmpPath, 0o700)
    renameSync(tmpPath, script)
    tmpPath = null
  } catch {
    if (tmpPath) {
      try {
        unlinkSync(tmpPath)
      } catch {
        // ignore cleanup failures; update status must stay readable
      }
    }
  }
}

function parseManagedVersion(
  value: string | null | undefined,
): Array<number> | null {
  if (!value) return null
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+)\.(\d+)\.(\d+)(?:[-._](?:comandos|komandos)\.(\d+))?$/)
  if (!match) return null
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    match[4] ? Number(match[4]) : 0,
  ]
}

export function compareManagedVersions(
  current: string | null | undefined,
  latest: string | null | undefined,
): VersionOrder {
  const currentParts = parseManagedVersion(current)
  const latestParts = parseManagedVersion(latest)
  if (!currentParts || !latestParts) return null
  for (let i = 0; i < latestParts.length; i += 1) {
    if (latestParts[i] > currentParts[i]) return 1
    if (latestParts[i] < currentParts[i]) return -1
  }
  return 0
}

export function versionIsNewer(
  current: string | null | undefined,
  latest: string | null | undefined,
): boolean {
  if (!latest) return false
  const order = compareManagedVersions(current, latest)
  if (order !== null) return order === 1
  return (current || 'unknown') !== latest
}

function readWorkspacePackageVersion(repoPath = process.cwd()): string {
  return pkgVersion(repoPath)
}

function managedWorkspaceStatus(
  manifest: ComandosUpdateManifest,
): ProductUpdateStatus | null {
  const product = manifest.workspace
  if (!product?.version) return null
  const state = readInstalledState()
  const version =
    state.workspaceVersion ||
    process.env.COMANDOS_WORKSPACE_VERSION ||
    readWorkspacePackageVersion()
  const updateAvailable = versionIsNewer(version, product.version)
  const script = updateScriptPath()
  const canUpdate = updateAvailable && isExecutable(script)
  return {
    id: 'workspace',
    label: 'COMANDOS AI Workspace',
    installKind: 'managed',
    version,
    path: process.cwd(),
    repoPath: null,
    branch: null,
    currentHead: null,
    latestHead: product.ref || null,
    latestVersion: product.version,
    updateAvailable,
    canUpdate,
    state: updateAvailable ? (canUpdate ? 'available' : 'blocked') : 'current',
    reason:
      updateAvailable && !canUpdate
        ? 'Скрипт обновления COMANDOS не настроен или не имеет права на запуск.'
        : null,
    manifestUrl: comandosManifestUrl(),
    updateMode: 'comandos-managed',
  }
}

function managedAgentStatus(
  base: ProductUpdateStatus,
  manifest: ComandosUpdateManifest,
): ProductUpdateStatus | null {
  const product = manifest.agent
  if (!product?.version && !product?.ref) return null
  const state = readInstalledState()
  const currentRef =
    state.hermesAgentRef ||
    process.env.COMANDOS_HERMES_AGENT_REF ||
    base.currentHead
  const currentVersion = state.hermesAgentVersion || base.version
  const versionIsNew = versionIsNewer(currentVersion, product.version)
  const refIsNew = Boolean(product.ref && product.ref !== currentRef)
  const updateAvailable = versionIsNew || refIsNew
  const script = updateScriptPath()
  const canUpdate = updateAvailable && isExecutable(script)
  return {
    ...base,
    label: 'Hermes Agent',
    version: currentVersion,
    currentHead: currentRef || base.currentHead,
    latestHead: product.ref || base.latestHead,
    latestVersion: product.version || null,
    updateAvailable,
    canUpdate,
    state: updateAvailable ? (canUpdate ? 'available' : 'blocked') : 'current',
    reason:
      updateAvailable && !canUpdate
        ? 'Скрипт обновления COMANDOS не настроен или не имеет права на запуск.'
        : null,
    manifestUrl: comandosManifestUrl(),
    updateMode: 'comandos-managed',
  }
}

function readManagedAgentBaseStatus(): ProductUpdateStatus {
  const state = readInstalledState()
  return {
    id: 'agent',
    label: 'Hermes Agent',
    installKind: 'managed',
    version: state.hermesAgentVersion || 'unknown',
    path: null,
    repoPath: null,
    branch: null,
    currentHead:
      state.hermesAgentRef || process.env.COMANDOS_HERMES_AGENT_REF || null,
    latestHead: null,
    latestVersion: null,
    updateAvailable: false,
    canUpdate: false,
    state: 'current',
    reason: null,
    updateMode: 'comandos-managed',
  }
}

function execOrThrow(
  command: string,
  args: Array<string>,
  options: { cwd?: string; timeout?: number } = {},
): string {
  return execFileSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    timeout: options.timeout ?? 300_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

function git(args: Array<string>, cwd: string, timeout = 8_000): string | null {
  return exec('git', args, { cwd, timeout })
}

function realGitRepoPath(path: string | null | undefined): string | null {
  if (!path) return null
  try {
    const resolved = realpathSync(path)
    return existsSync(join(resolved, '.git')) ? resolved : null
  } catch {
    return null
  }
}

function pkgVersion(repoPath: string): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(repoPath, 'package.json'), 'utf8'),
    ) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function remoteUrlMatches(
  url: string | null,
  expected: Array<string>,
): boolean {
  if (!url) return false
  const normalized = url
    .toLowerCase()
    .replace(/^git@github\.com:/, 'github.com/')
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
  return expected.some((alias) =>
    normalized.includes(alias.toLowerCase().replace(/\.git$/, '')),
  )
}

function remoteHead(repoPath: string, remote = 'origin'): string | null {
  const url = git(['remote', 'get-url', remote], repoPath)
  if (!url) return null
  const raw = exec('git', ['ls-remote', url, 'HEAD'], {
    cwd: repoPath,
    timeout: 10_000,
  })
  return raw?.split(/\s+/)[0] ?? null
}

function isDirty(repoPath: string): boolean {
  return Boolean(git(['status', '--porcelain'], repoPath))
}

/**
 * Return up to `limit` paths from `git status --porcelain` so the UI can
 * tell the user exactly which files are blocking an update. The shape of
 * each entry is the relative path inside the repo (XY status code stripped).
 */
function listDirtyFiles(repoPath: string, limit = 24): Array<string> {
  const raw = git(['status', '--porcelain'], repoPath)
  if (!raw) return []
  const out: Array<string> = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    // porcelain format: XY <space> path  (path may be quoted with renames)
    const path = line.slice(3).trim()
    if (path) out.push(path)
    if (out.length >= limit) break
  }
  return out
}

function canFastForward(repoPath: string, remoteRef: string): boolean {
  return (
    exec('git', ['merge-base', '--is-ancestor', 'HEAD', remoteRef], {
      cwd: repoPath,
      stdio: 'ignore',
    }) !== null
  )
}

function remoteRefExists(repoPath: string, remoteRef: string): boolean {
  return Boolean(git(['rev-parse', '--verify', remoteRef], repoPath, 10_000))
}

function syncRepoToRemote(repoPath: string, remoteRef: string): string {
  if (!canFastForward(repoPath, remoteRef)) {
    throw new Error(
      `Отказ от обновления ${remoteRef}: ветка не подтягивается напрямую. Сначала сохраните изменения и сверите ветки вручную.`,
    )
  }
  return execOrThrow('git', ['merge', '--ff-only', remoteRef], {
    cwd: repoPath,
    timeout: 60_000,
  })
}

function readCommits(
  repoPath: string,
  from: string | null,
  to: string | null,
): Array<string> {
  if (!from || !to || from === to) return []
  return (
    git(['log', '--pretty=format:%s (%h)', `${from}..${to}`], repoPath, 10_000)
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12) ?? []
  )
}

function workspaceInstallKind(): InstallKind {
  if (
    process.env.HERMES_WORKSPACE_DESKTOP === '1' ||
    process.env.ELECTRON_RUN_AS_NODE
  )
    return 'desktop'
  if (process.env.HERMES_WORKSPACE_DOCKER === '1' || existsSync('/.dockerenv'))
    return 'docker'
  return realGitRepoPath(process.cwd()) ? 'git' : 'unknown'
}

export function readWorkspaceUpdateStatus(
  repoPath = process.cwd(),
): ProductUpdateStatus {
  const installKind = workspaceInstallKind()
  const gitRepo = realGitRepoPath(repoPath)
  const version = pkgVersion(gitRepo ?? repoPath)

  if (installKind === 'desktop') {
    return {
      id: 'workspace',
      label: 'COMANDOS AI Workspace',
      installKind,
      version,
      path: repoPath,
      repoPath: gitRepo,
      branch: null,
      currentHead: null,
      latestHead: null,
      latestVersion: null,
      updateAvailable: false,
      canUpdate: false,
      state: 'unsupported',
      reason:
        'Обновление настольного приложения пока не подключено. Этот режим зарезервирован для DMG/EXE-сборок.',
      updateMode: 'desktop-auto-updater',
    }
  }

  if (installKind === 'docker') {
    return {
      id: 'workspace',
      label: 'COMANDOS AI Workspace',
      installKind,
      version,
      path: repoPath,
      repoPath: gitRepo,
      branch: null,
      currentHead: null,
      latestHead: null,
      latestVersion: null,
      updateAvailable: false,
      canUpdate: false,
      state: 'unsupported',
      reason:
        'Docker-установка обновляется через новый image/tag, а не через изменение запущенного контейнера.',
      updateMode: 'docker-manual',
    }
  }

  if (!gitRepo) {
    return {
      id: 'workspace',
      label: 'COMANDOS AI Workspace',
      installKind: 'unknown',
      version,
      path: repoPath,
      repoPath: null,
      branch: null,
      currentHead: null,
      latestHead: null,
      latestVersion: null,
      updateAvailable: false,
      canUpdate: false,
      state: 'unsupported',
      reason: 'Не удалось определить тип установки Workspace.',
      updateMode: 'manual',
    }
  }

  const remoteUrl = git(['remote', 'get-url', 'origin'], gitRepo)
  const repoMatches = remoteUrlMatches(remoteUrl, [
    'hermes-workspace',
    'outsourc-e/hermes-workspace',
    'hermes_assist_macmini',
    'Comandosai/hermes_assist_macmini',
    'comandos-workspace',
  ])
  if (repoMatches) git(['fetch', 'origin', '--quiet'], gitRepo, 30_000)
  const currentHead = git(['rev-parse', 'HEAD'], gitRepo)
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], gitRepo)
  const supportedBranch = branch === 'main' || branch === 'master'
  const latestHead =
    repoMatches && supportedBranch ? remoteHead(gitRepo, 'origin') : null
  const dirty = isDirty(gitRepo)
  const updateAvailable = Boolean(
    supportedBranch && currentHead && latestHead && currentHead !== latestHead,
  )
  const remoteRef = `origin/${branch || 'main'}`
  const remoteAvailable = updateAvailable
    ? remoteRefExists(gitRepo, remoteRef)
    : true
  const ff = updateAvailable ? canFastForward(gitRepo, remoteRef) : true
  const canUpdate = Boolean(
    repoMatches &&
    supportedBranch &&
    updateAvailable &&
    !dirty &&
    remoteAvailable &&
    ff,
  )

  return {
    id: 'workspace',
    label: 'COMANDOS AI Workspace',
    installKind: 'git',
    version,
    path: repoPath,
    repoPath: gitRepo,
    branch,
    currentHead,
    latestHead,
    latestVersion: null,
    updateAvailable,
    canUpdate,
    state: !repoMatches
      ? 'unsupported'
      : !supportedBranch
        ? 'unsupported'
        : dirty
          ? 'blocked'
          : updateAvailable
            ? remoteAvailable && ff
              ? 'available'
              : 'blocked'
            : 'current',
    reason: !repoMatches
      ? 'Git remote Workspace не похож на репозиторий COMANDOS Workspace.'
      : !supportedBranch
        ? 'Обновление в один клик включено только для веток main/master.'
        : dirty
          ? 'В Workspace есть локальные изменения. Перед обновлением сохраните, уберите или проверьте указанные файлы.'
          : updateAvailable && !remoteAvailable
            ? 'Workspace не смог проверить удалённую ветку обновления.'
            : updateAvailable && !ff
              ? 'Ветка Workspace разошлась с origin. Обновление в один клик поддерживает только прямое подтягивание без конфликта; сначала сделайте backup и ручную сверку.'
              : null,
    blockingFiles: dirty ? listDirtyFiles(gitRepo) : undefined,
    updateMode: 'git-ff',
  }
}

function agentRepoPath(): string | null {
  const candidates = [
    process.env.HERMES_AGENT_REPO,
    join(homedir(), '.hermes', 'hermes-agent'),
    join(homedir(), 'Projects', 'hermes-agent'),
    join(homedir(), 'hermes-agent'),
  ]
  for (const candidate of candidates) {
    const repo = realGitRepoPath(candidate)
    if (repo) return repo
  }
  return null
}

export function readAgentUpdateStatus(): ProductUpdateStatus {
  const repoPath = agentRepoPath()
  const repoHermes = repoPath ? join(repoPath, 'venv', 'bin', 'hermes') : null
  const path =
    repoHermes && existsSync(repoHermes)
      ? repoHermes
      : exec('which', ['hermes'])
  const version =
    (path ? exec(path, ['--version'], { timeout: 10_000 }) : null)?.split(
      '\n',
    )[0] ?? 'unknown'

  if (!repoPath) {
    return {
      id: 'agent',
      label: 'Hermes Agent',
      installKind: 'unknown',
      version,
      path,
      repoPath: null,
      branch: null,
      currentHead: null,
      latestHead: null,
      latestVersion: null,
      updateAvailable: false,
      canUpdate: false,
      state: 'unsupported',
      reason:
        'Git-копия Hermes Agent не найдена. Встроенные настольные установки обновляются через обновление приложения.',
      updateMode: 'manual',
    }
  }

  const remoteUrl = git(['remote', 'get-url', 'origin'], repoPath)
  const repoMatches = remoteUrlMatches(remoteUrl, [
    'hermes-agent',
    'outsourc-e/hermes-agent',
    'NousResearch/hermes-agent',
  ])
  if (repoMatches) git(['fetch', 'origin', '--quiet'], repoPath, 30_000)
  const currentHead = git(['rev-parse', 'HEAD'], repoPath)
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath)
  const latestHead = repoMatches ? remoteHead(repoPath, 'origin') : null
  const remoteRef = repoMatches ? `origin/${branch || 'main'}` : null
  const dirty = isDirty(repoPath)
  const updateAvailable = Boolean(
    currentHead && latestHead && currentHead !== latestHead && remoteRef,
  )
  const remoteAvailable = remoteRef
    ? remoteRefExists(repoPath, remoteRef)
    : false
  const ff = remoteRef ? canFastForward(repoPath, remoteRef) : false
  const canUpdate = Boolean(
    repoMatches && updateAvailable && !dirty && remoteAvailable && ff,
  )

  return {
    id: 'agent',
    label: 'Hermes Agent',
    installKind: 'git',
    version,
    path,
    repoPath,
    branch,
    currentHead,
    latestHead,
    latestVersion: null,
    updateAvailable,
    canUpdate,
    state: !repoMatches
      ? 'unsupported'
      : dirty
        ? 'blocked'
        : updateAvailable && remoteAvailable && ff
          ? 'available'
          : updateAvailable
            ? 'blocked'
            : 'current',
    reason: !repoMatches
      ? 'Git remote Hermes Agent не похож на репозиторий hermes-agent.'
      : dirty
        ? 'В Hermes Agent есть локальные изменения. Перед обновлением сохраните, уберите или проверьте указанные файлы.'
        : updateAvailable && !remoteAvailable
          ? 'Hermes Agent не смог проверить удалённую ветку обновления.'
          : updateAvailable && !ff
            ? 'Ветка Hermes Agent разошлась с origin. Обновление в один клик поддерживает только прямое подтягивание без конфликта; сначала сделайте backup и ручную сверку.'
            : null,
    blockingFiles: dirty ? listDirtyFiles(repoPath) : undefined,
    updateMode: 'hermes-update',
  }
}

export function readUpdateStatus(): UpdateStatus {
  const manifest = readComandosManifest({
    preferCache: true,
    allowRemote: false,
  })
  refreshComandosManifestCacheInBackground()
  const legacyWorkspace = manifest ? null : readWorkspaceUpdateStatus()
  const agentBase = manifest
    ? readManagedAgentBaseStatus()
    : readAgentUpdateStatus()
  const workspace = manifest
    ? managedWorkspaceStatus(manifest) || readWorkspaceUpdateStatus()
    : legacyWorkspace
  const agent = manifest
    ? managedAgentStatus(agentBase, manifest) || agentBase
    : agentBase
  const products = { workspace, agent }
  return {
    ok: true,
    checkedAt: Date.now(),
    checkIntervalMs: readUpdateCheckIntervalMs(),
    products,
    updateAvailable: workspace.updateAvailable || agent.updateAvailable,
    pendingReleaseNotes: normalizePendingReleaseNotes(
      readPendingReleaseNotes(),
      products,
    ),
  }
}

function applyManagedUpdate(
  product: ProductId,
  before: ProductUpdateStatus,
): ApplyUpdateResult {
  const script = updateScriptPath()
  if (!before.canUpdate || !script) {
    return {
      ok: false,
      product,
      output: '',
      restartRequired: false,
      status: before,
      releaseNotes: [],
      error: before.reason || 'Управляемое обновление COMANDOS недоступно.',
    }
  }
  try {
    const output = execOrThrow('bash', [script, product], {
      cwd: process.cwd(),
      timeout: 600_000,
    })
    const after = readUpdateStatus().products[product]
    const releaseNotes = [
      {
        product,
        label: before.label,
        from: before.version || before.currentHead,
        to: before.latestVersion || before.latestHead,
        commits: [],
      },
    ]
    persistPendingReleaseNotes(releaseNotes)
    return {
      ok: true,
      product,
      output,
      restartRequired: true,
      status: after,
      releaseNotes,
    }
  } catch (err) {
    return {
      ok: false,
      product,
      output: '',
      restartRequired: false,
      status: before,
      releaseNotes: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function applyWorkspaceUpdate(): ApplyUpdateResult {
  const manifest = readComandosManifest()
  if (manifest) {
    syncManagedUpdateScriptIfNeeded()
    const managed = managedWorkspaceStatus(manifest)
    if (managed?.updateMode === 'comandos-managed') {
      return applyManagedUpdate('workspace', managed)
    }
  }
  const before = readWorkspaceUpdateStatus()
  if (!before.canUpdate || !before.repoPath || !before.branch) {
    return {
      ok: false,
      product: 'workspace',
      output: '',
      restartRequired: false,
      status: before,
      releaseNotes: [],
      error: before.reason || 'Обновление Workspace недоступно.',
    }
  }
  const output: Array<string> = []
  output.push(
    execOrThrow('git', ['fetch', 'origin'], {
      cwd: before.repoPath,
      timeout: 60_000,
    }),
  )
  const remoteRef = `origin/${before.branch}`
  if (!remoteRefExists(before.repoPath, remoteRef)) {
    const status = readWorkspaceUpdateStatus()
    return {
      ok: false,
      product: 'workspace',
      output: output.filter(Boolean).join('\n'),
      restartRequired: false,
      status,
      releaseNotes: [],
      error: `Не удалось проверить ${remoteRef}.`,
    }
  }
  if (!canFastForward(before.repoPath, remoteRef)) {
    const status = readWorkspaceUpdateStatus()
    return {
      ok: false,
      product: 'workspace',
      output: output.filter(Boolean).join('\n'),
      restartRequired: false,
      status,
      releaseNotes: [],
      error:
        'Ветка Workspace разошлась с origin. Обновление в один клик поддерживает только прямое подтягивание без конфликта; сначала сделайте backup и ручную сверку.',
    }
  }
  output.push(syncRepoToRemote(before.repoPath, remoteRef))
  const after = readWorkspaceUpdateStatus()
  const changedFiles =
    before.currentHead && after.currentHead
      ? (git(
          ['diff', '--name-only', before.currentHead, after.currentHead],
          before.repoPath,
          10_000,
        )
          ?.split('\n')
          .filter(Boolean) ?? [])
      : []
  if (
    changedFiles.some(
      (file) => file === 'package.json' || file === 'pnpm-lock.yaml',
    )
  ) {
    output.push(
      execOrThrow('pnpm', ['install', '--no-frozen-lockfile'], {
        cwd: before.repoPath,
        timeout: 180_000,
      }),
    )
  }
  if (
    changedFiles.some(
      (file) =>
        file.startsWith('src/') ||
        file === 'package.json' ||
        file === 'pnpm-lock.yaml' ||
        file.startsWith('vite') ||
        file.startsWith('tsconfig'),
    )
  ) {
    output.push(
      execOrThrow('pnpm', ['build'], {
        cwd: before.repoPath,
        timeout: 240_000,
      }),
    )
  }
  const releaseNotes = [
    {
      product: 'workspace' as const,
      label: 'COMANDOS AI Workspace',
      from: before.currentHead,
      to: after.currentHead,
      commits: readCommits(
        before.repoPath,
        before.currentHead,
        after.currentHead,
      ),
    },
  ]
  persistPendingReleaseNotes(releaseNotes)
  return {
    ok: true,
    product: 'workspace',
    output: output.filter(Boolean).join('\n'),
    restartRequired: before.currentHead !== after.currentHead,
    status: after,
    releaseNotes,
  }
}

export function applyAgentUpdate(): ApplyUpdateResult {
  const manifest = readComandosManifest()
  if (manifest) {
    syncManagedUpdateScriptIfNeeded()
    const managed = managedAgentStatus(readManagedAgentBaseStatus(), manifest)
    if (managed?.updateMode === 'comandos-managed') {
      return applyManagedUpdate('agent', managed)
    }
  }
  const before = readAgentUpdateStatus()
  if (!before.canUpdate || !before.repoPath) {
    return {
      ok: false,
      product: 'agent',
      output: '',
      restartRequired: false,
      status: before,
      releaseNotes: [],
      error: before.reason || 'Обновление Hermes Agent недоступно.',
    }
  }

  const output: Array<string> = []
  output.push(
    execOrThrow('git', ['fetch', 'origin'], {
      cwd: before.repoPath,
      timeout: 60_000,
    }),
  )
  const remoteRef = `origin/${before.branch || 'main'}`
  if (!remoteRefExists(before.repoPath, remoteRef)) {
    const status = readAgentUpdateStatus()
    return {
      ok: false,
      product: 'agent',
      output: output.filter(Boolean).join('\n'),
      restartRequired: false,
      status,
      releaseNotes: [],
      error: `Не удалось проверить ${remoteRef}.`,
    }
  }
  if (!canFastForward(before.repoPath, remoteRef)) {
    const status = readAgentUpdateStatus()
    return {
      ok: false,
      product: 'agent',
      output: output.filter(Boolean).join('\n'),
      restartRequired: false,
      status,
      releaseNotes: [],
      error:
        'Ветка Hermes Agent разошлась с origin. Обновление в один клик поддерживает только прямое подтягивание без конфликта; сначала сделайте backup и ручную сверку.',
    }
  }
  output.push(syncRepoToRemote(before.repoPath, remoteRef))

  const after = readAgentUpdateStatus()
  const releaseNotes = [
    {
      product: 'agent' as const,
      label: 'Hermes Agent',
      from: before.currentHead,
      to: after.currentHead,
      commits: readCommits(
        before.repoPath,
        before.currentHead,
        after.currentHead,
      ),
    },
  ]
  persistPendingReleaseNotes(releaseNotes)
  return {
    ok: true,
    product: 'agent',
    output: output.filter(Boolean).join('\n'),
    restartRequired: before.currentHead !== after.currentHead,
    status: after,
    releaseNotes,
  }
}
