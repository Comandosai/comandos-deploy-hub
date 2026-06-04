import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(here, '../..')
const stackRoot = resolve(workspaceRoot, '..')

function readLockValue(name: string): string | null {
  const raw = readFileSync(resolve(stackRoot, 'comandos-hermes.lock'), 'utf8')
  const match = raw.match(new RegExp(`^${name}=([^\\n]+)$`, 'm'))
  return match?.[1]?.trim() ?? null
}

describe('COMANDOS version lock', () => {
  it('keeps package, update manifest, and installer lock in sync', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(workspaceRoot, 'package.json'), 'utf8'),
    ) as { version: string }
    const manifest = JSON.parse(
      readFileSync(resolve(stackRoot, 'update-manifest.json'), 'utf8'),
    ) as { workspace: { version: string } }

    expect(readLockValue('COMANDOS_WORKSPACE_VERSION')).toBe(
      packageJson.version,
    )
    expect(manifest.workspace.version).toBe(packageJson.version)
  })
})
