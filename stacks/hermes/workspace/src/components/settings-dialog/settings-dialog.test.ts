import { describe, expect, it } from 'vitest'
import { getProviderClickAction } from './settings-dialog'

describe('getProviderClickAction', () => {
  it('starts OAuth only for providers with real OAuth support', () => {
    expect(
      getProviderClickAction({
        providerId: 'nous',
        authType: 'oauth',
        hasKey: true,
      }),
    ).toBe('oauth')
  })

  it('opens CLI setup for OpenAI Codex when Codex CLI auth is missing', () => {
    expect(
      getProviderClickAction({
        providerId: 'openai-codex',
        authType: 'cli_token',
        hasKey: false,
      }),
    ).toBe('cli')
  })

  it('selects OpenAI Codex when Codex CLI auth is present', () => {
    expect(
      getProviderClickAction({
        providerId: 'openai-codex',
        authType: 'cli_token',
        hasKey: true,
      }),
    ).toBe('select')
  })
})
