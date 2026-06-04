import { describe, expect, it } from 'vitest'
import {
  compareManagedVersions,
  readUpdateCheckIntervalMs,
  remoteUrlMatches,
  versionIsNewer,
} from './update-system'

describe('update-system helpers', () => {
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
    expect(
      compareManagedVersions('2.3.0-komandos.4', '2.3.0-comandos.4'),
    ).toBe(0)
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

      process.env.COMANDOS_UPDATE_CHECK_INTERVAL_MS = String(48 * 60 * 60 * 1000)
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
})
