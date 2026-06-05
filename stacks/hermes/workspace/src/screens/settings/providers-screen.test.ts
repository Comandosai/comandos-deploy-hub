import { describe, expect, it } from 'vitest'

import { buildProviderSummaries } from './providers-screen'

describe('buildProviderSummaries', () => {
  it('does not offer deletion for Hermes Agent-owned providers', () => {
    const summaries = buildProviderSummaries({
      configuredProviders: ['hermes-agent'],
      models: [{ id: 'auto', name: 'auto', provider: 'hermes-agent' }],
    })
    const summary = summaries[0]

    expect(summaries).toHaveLength(1)
    expect(summary.canDelete).toBe(false)
    expect(summary.deleteDisabledReason).toContain('Hermes Agent')
  })

  it('does not offer deletion for OpenAI Codex CLI auth', () => {
    const summaries = buildProviderSummaries({
      configuredProviders: ['openai-codex'],
      models: [],
    })
    const summary = summaries[0]

    expect(summaries).toHaveLength(1)
    expect(summary.canDelete).toBe(false)
    expect(summary.deleteDisabledReason).toContain('codex logout')
  })

  it('does not offer deletion for the active default provider', () => {
    const summaries = buildProviderSummaries({
      configuredProviders: ['deepseek'],
      models: [
        { id: 'deepseek-chat', name: 'deepseek-chat', provider: 'deepseek' },
      ],
      activeProvider: 'deepseek',
    })
    const summary = summaries[0]

    expect(summaries).toHaveLength(1)
    expect(summary.canDelete).toBe(false)
    expect(summary.deleteDisabledReason).toContain('другую модель')
  })

  it('offers deletion for an inactive API-key provider', () => {
    const summaries = buildProviderSummaries({
      configuredProviders: ['openrouter'],
      models: [],
      activeProvider: 'deepseek',
    })
    const summary = summaries[0]

    expect(summaries).toHaveLength(1)
    expect(summary.canDelete).toBe(true)
    expect(summary.deleteDisabledReason).toBeUndefined()
  })
})
