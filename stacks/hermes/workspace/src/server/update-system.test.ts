import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  compareManagedVersions,
  normalizePendingReleaseNotes,
  readComandosManifest,
  readUpdateCheckIntervalMs,
  readUpdateStatus,
  remoteUrlMatches,
  renderManagedUpdateScriptTemplate,
  versionIsNewer,
} from './update-system'
import type { ProductUpdateStatus } from './update-system'

describe('update-system helpers', () => {
  const workspaceProduct: ProductUpdateStatus = {
    id: 'workspace',
    label: 'COMANDOS AI Workspace',
    installKind: 'unknown',
    version: '2.3.0-comandos.15',
    path: null,
    repoPath: null,
    branch: null,
    currentHead: null,
    latestHead: 'main',
    latestVersion: '2.3.0-comandos.15',
    updateAvailable: false,
    canUpdate: false,
    state: 'current',
    reason: null,
    updateMode: 'comandos-managed',
  }

  const agentProduct: ProductUpdateStatus = {
    ...workspaceProduct,
    id: 'agent',
    label: 'Hermes Agent',
    version: 'Hermes Agent v0.14.0',
    latestHead: 'agent-ref',
    latestVersion: 'Hermes Agent v0.14.0',
  }

  it('matches GitHub URL forms against expected repo aliases', () => {
    expect(
      remoteUrlMatches('https://github.com/outsourc-e/hermes-workspace.git', [
        'outsourc-e/hermes-workspace',
      ]),
    ).toBe(true)
    expect(
      remoteUrlMatches('git@github.com:NousResearch/hermes-agent.git', [
        'hermes-agent',
      ]),
    ).toBe(true)
    expect(
      remoteUrlMatches('https://github.com/example/other.git', [
        'hermes-workspace',
      ]),
    ).toBe(false)
  })

  it('compares managed COMANDOS versions without offering downgrades', () => {
    expect(compareManagedVersions('2.3.0-komandos.4', '2.3.0-comandos.4')).toBe(
      0,
    )
    expect(versionIsNewer('2.3.0-comandos.4', '2.3.0-comandos.3')).toBe(false)
    expect(versionIsNewer('2.3.0-komandos.4', '2.3.0-comandos.5')).toBe(true)
    expect(versionIsNewer('2.3.0-comandos.4', '2.3.0-comandos.4')).toBe(false)
  })

  it('reads update polling interval from runtime env with safe bounds', () => {
    const previousComandos = process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS
    const previousVite = process.env.VITE_UPDATE_CHECK_INTERVAL_MS
    try {
      process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS = '60000'
      delete process.env.VITE_UPDATE_CHECK_INTERVAL_MS
      expect(readUpdateCheckIntervalMs()).toBe(60_000)

      process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS = '1000'
      expect(readUpdateCheckIntervalMs()).toBe(10_000)

      process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS = String(
        48 * 60 * 60 * 1000,
      )
      expect(readUpdateCheckIntervalMs()).toBe(24 * 60 * 60 * 1000)

      delete process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS
      process.env.VITE_UPDATE_CHECK_INTERVAL_MS = '120000'
      expect(readUpdateCheckIntervalMs()).toBe(120_000)
    } finally {
      if (previousComandos === undefined) {
        delete process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS
      } else {
        process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS = previousComandos
      }
      if (previousVite === undefined) {
        delete process.env.VITE_UPDATE_CHECK_INTERVAL_MS
      } else {
        process.env.VITE_UPDATE_CHECK_INTERVAL_MS = previousVite
      }
    }
  })

  it('renders managed update script placeholders', () => {
    const rendered = renderManagedUpdateScriptTemplate(
      [
        'REMOTE_BASE_DIR="{{REMOTE_BASE_DIR}}"',
        'REMOTE_WORKSPACE_DIR="{{REMOTE_WORKSPACE_DIR}}"',
        'REMOTE_HERMES_HOME="{{REMOTE_HERMES_HOME}}"',
        'HERMES_AGENT_INSTALLER_URL="{{HERMES_AGENT_INSTALLER_URL}}"',
        'COMANDOS_STACK_REPO_URL="{{COMANDOS_STACK_REPO_URL}}"',
        'COMANDOS_STACK_REF="{{COMANDOS_STACK_REF}}"',
        'COMANDOS_STACK_PATH="{{COMANDOS_STACK_PATH}}"',
      ].join('\n'),
      {
        REMOTE_BASE_DIR: '/opt/test/hermes',
        REMOTE_WORKSPACE_DIR: '/opt/test/hermes/workspace',
        REMOTE_HERMES_HOME: '/home/hermes/.hermes',
        HERMES_AGENT_INSTALLER_URL: 'https://example.test/install.sh',
        COMANDOS_STACK_REPO_URL:
          'https://github.com/Comandosai/comandos-deploy-hub.git',
        COMANDOS_STACK_REF: 'main',
        COMANDOS_STACK_PATH: 'stacks/hermes',
      },
    )

    expect(rendered).toContain('REMOTE_BASE_DIR="/opt/test/hermes"')
    expect(rendered).toContain(
      'REMOTE_WORKSPACE_DIR="/opt/test/hermes/workspace"',
    )
    expect(rendered).toContain('REMOTE_HERMES_HOME="/home/hermes/.hermes"')
    expect(rendered).not.toContain('{{')
  })

  it('falls back to cached COMANDOS manifest when remote manifest is unavailable', () => {
    const previousUrl = process.env.COMANDOS_UPDATE_MANIFEST_URL
    const previousCache = process.env.COMANDOS_UPDATE_MANIFEST_CACHE
    const dir = mkdtempSync(join(tmpdir(), 'comandos-manifest-cache-'))
    const cachePath = join(dir, 'manifest-cache.json')
    try {
      writeFileSync(
        cachePath,
        JSON.stringify({
          schema: 1,
          workspace: { version: '2.3.0-comandos.61', ref: 'main' },
          agent: { version: 'Hermes Agent v0.14.0', ref: 'agent-ref' },
        }),
      )
      process.env.COMANDOS_UPDATE_MANIFEST_URL =
        'http://127.0.0.1:9/update-manifest.json'
      process.env.COMANDOS_UPDATE_MANIFEST_CACHE = cachePath

      expect(readComandosManifest()?.workspace?.version).toBe(
        '2.3.0-comandos.61',
      )
    } finally {
      if (previousUrl === undefined) {
        delete process.env.COMANDOS_UPDATE_MANIFEST_URL
      } else {
        process.env.COMANDOS_UPDATE_MANIFEST_URL = previousUrl
      }
      if (previousCache === undefined) {
        delete process.env.COMANDOS_UPDATE_MANIFEST_CACHE
      } else {
        process.env.COMANDOS_UPDATE_MANIFEST_CACHE = previousCache
      }
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns cached update status before refreshing the remote manifest', async () => {
    const previousUrl = process.env.COMANDOS_UPDATE_MANIFEST_URL
    const previousCache = process.env.COMANDOS_UPDATE_MANIFEST_CACHE
    const previousState = process.env.COMANDOS_INSTALLED_STATE
    const previousVersion = process.env.COMANDOS_WORKSPACE_VERSION
    const previousAgentRepo = process.env.HERMES_AGENT_REPO
    const previousFetch = globalThis.fetch
    const dir = mkdtempSync(join(tmpdir(), 'comandos-update-status-cache-'))
    const cachePath = join(dir, 'manifest-cache.json')
    const statePath = join(dir, 'installed.json')
    const agentRepo = join(dir, 'agent-repo')
    let resolveFetch: ((response: Response) => void) | null = null

    try {
      mkdirSync(agentRepo)
      execFileSync('git', ['init'], { cwd: agentRepo, stdio: 'ignore' })
      execFileSync(
        'git',
        [
          'remote',
          'add',
          'origin',
          'https://192.0.2.1/NousResearch/hermes-agent.git',
        ],
        { cwd: agentRepo, stdio: 'ignore' },
      )
      writeFileSync(
        cachePath,
        JSON.stringify({
          schema: 1,
          workspace: { version: '2.3.0-comandos.64', ref: 'main' },
          agent: { version: 'Hermes Agent v0.14.0', ref: 'agent-ref' },
        }),
      )
      writeFileSync(
        statePath,
        JSON.stringify({
          workspaceVersion: '2.3.0-comandos.63',
          hermesAgentVersion: '',
          hermesAgentRef: 'agent-ref',
        }),
      )
      process.env.COMANDOS_UPDATE_MANIFEST_URL =
        'https://example.test/update-manifest.json'
      process.env.COMANDOS_UPDATE_MANIFEST_CACHE = cachePath
      process.env.COMANDOS_INSTALLED_STATE = statePath
      process.env.HERMES_AGENT_REPO = agentRepo
      delete process.env.COMANDOS_WORKSPACE_VERSION
      globalThis.fetch = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve
          }),
      )

      const startedAt = Date.now()
      const status = readUpdateStatus()
      expect(Date.now() - startedAt).toBeLessThan(1_000)
      expect(status.products.workspace.installKind).toBe('managed')
      expect(status.products.workspace.version).toBe('2.3.0-comandos.63')
      expect(status.products.workspace.latestVersion).toBe('2.3.0-comandos.64')
      expect(status.products.workspace.updateAvailable).toBe(true)
      expect(status.products.agent.installKind).toBe('managed')
      expect(status.products.agent.version).toBe('Hermes Agent v0.14.0')
      expect(status.products.agent.updateAvailable).toBe(false)

      await Promise.resolve()
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      resolveFetch?.(
        new Response(
          JSON.stringify({
            schema: 1,
            workspace: { version: '2.3.0-comandos.65', ref: 'main' },
            agent: { version: 'Hermes Agent v0.14.0', ref: 'agent-ref' },
          }),
          { status: 200 },
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(
        readComandosManifest({ preferCache: true })?.workspace?.version,
      ).toBe('2.3.0-comandos.65')
    } finally {
      if (previousUrl === undefined) {
        delete process.env.COMANDOS_UPDATE_MANIFEST_URL
      } else {
        process.env.COMANDOS_UPDATE_MANIFEST_URL = previousUrl
      }
      if (previousCache === undefined) {
        delete process.env.COMANDOS_UPDATE_MANIFEST_CACHE
      } else {
        process.env.COMANDOS_UPDATE_MANIFEST_CACHE = previousCache
      }
      if (previousState === undefined) {
        delete process.env.COMANDOS_INSTALLED_STATE
      } else {
        process.env.COMANDOS_INSTALLED_STATE = previousState
      }
      if (previousVersion === undefined) {
        delete process.env.COMANDOS_WORKSPACE_VERSION
      } else {
        process.env.COMANDOS_WORKSPACE_VERSION = previousVersion
      }
      if (previousAgentRepo === undefined) {
        delete process.env.HERMES_AGENT_REPO
      } else {
        process.env.HERMES_AGENT_REPO = previousAgentRepo
      }
      globalThis.fetch = previousFetch
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('keeps managed update script able to seed the manifest cache', () => {
    const template = readFileSync(
      join(process.cwd(), '..', 'templates', 'update', 'comandos-update.sh'),
      'utf8',
    )

    expect(template).toContain('cache_update_manifest()')
    expect(template).toContain('.runtime/update-manifest-cache.json')
    expect(template).toContain('cache_update_manifest')
  })

  it('normalizes managed release notes from branch ref to version', () => {
    expect(
      normalizePendingReleaseNotes(
        [
          {
            product: 'workspace',
            label: 'COMANDOS AI Workspace',
            from: '2.3.0-comandos.13',
            to: 'main',
            commits: [],
          },
        ],
        {
          workspace: workspaceProduct,
          agent: agentProduct,
        },
      ),
    ).toEqual([
      {
        product: 'workspace',
        label: 'COMANDOS AI Workspace',
        from: '2.3.0-comandos.13',
        to: '2.3.0-comandos.15',
        commits: [],
      },
    ])
  })

  it('drops stale managed release notes and synthesizes the current available update', () => {
    const availableWorkspace: ProductUpdateStatus = {
      ...workspaceProduct,
      version: '2.3.0-comandos.20',
      latestVersion: '2.3.0-comandos.22',
      updateAvailable: true,
      canUpdate: true,
      state: 'available',
    }

    expect(
      normalizePendingReleaseNotes(
        [
          {
            product: 'workspace',
            label: 'COMANDOS AI Workspace',
            from: '2.3.0-comandos.19',
            to: '2.3.0-comandos.20',
            commits: [],
          },
        ],
        {
          workspace: availableWorkspace,
          agent: agentProduct,
        },
      ),
    ).toEqual([
      {
        product: 'workspace',
        label: 'COMANDOS AI Workspace',
        from: '2.3.0-comandos.20',
        to: '2.3.0-comandos.22',
        commits: [],
      },
    ])
  })

  it('ignores stale release notes for unknown products', () => {
    expect(
      normalizePendingReleaseNotes(
        [
          {
            product: 'unknown-product',
            label: 'Unknown product',
            from: 'old',
            to: 'new',
            commits: [],
          },
        ] as unknown as Parameters<typeof normalizePendingReleaseNotes>[0],
        {
          workspace: workspaceProduct,
          agent: agentProduct,
        },
      ),
    ).toEqual([])
  })
})
