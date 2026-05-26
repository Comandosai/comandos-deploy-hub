import { describe, expect, it } from 'vitest'
import {
  compareManagedVersions,
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
})
