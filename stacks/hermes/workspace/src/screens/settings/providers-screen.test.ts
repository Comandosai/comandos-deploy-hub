import { describe, expect, it } from 'vitest'

import {
  buildProviderSummaries,
  parseModelProvider,
  readPrimaryModelConfig,
} from './providers-screen'

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

  it('uses Hermes config providers when the models endpoint has no data yet', () => {
    const summaries = buildProviderSummaries({
      models: [],
      configuredProviders: [],
      activeProvider: 'deepseek',
      providerStates: [
        {
          id: 'deepseek',
          name: 'DeepSeek',
          configured: true,
          authenticated: true,
          available: true,
          isDefault: true,
          models: [{ id: 'deepseek-chat', name: 'deepseek-chat' }],
        },
        {
          id: 'openrouter',
          name: 'OpenRouter',
          configured: false,
          authenticated: false,
          available: false,
          isDefault: false,
          models: [],
        },
      ],
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      id: 'deepseek',
      name: 'DeepSeek',
      modelCount: 1,
      status: 'active',
      canDelete: false,
    })
  })

  it('shows an available local provider from Hermes config without marking every catalog provider connected', () => {
    const summaries = buildProviderSummaries({
      models: [],
      configuredProviders: [],
      providerStates: [
        {
          id: 'ollama',
          name: 'Ollama',
          configured: false,
          authenticated: false,
          available: true,
          isDefault: false,
          models: [{ id: 'qwen2.5:7b', name: 'qwen2.5:7b' }],
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          configured: false,
          authenticated: false,
          available: false,
          isDefault: false,
          models: [],
        },
      ],
    })

    expect(summaries.map((summary) => summary.id)).toEqual(['ollama'])
    expect(summaries[0].canDelete).toBe(false)
    expect(summaries[0].deleteDisabledReason).toContain('Локальный провайдер')
  })
})

describe('model provider form config', () => {
  it('preserves DeepSeek instead of silently saving it as custom', () => {
    const config = {
      provider: 'deepseek',
      model: 'deepseek-chat',
    } as Parameters<typeof readPrimaryModelConfig>[0]
    const draft = readPrimaryModelConfig(config)

    expect(draft.provider).toBe('deepseek')
    expect(draft.model).toBe('deepseek-chat')
  })

  it('preserves unknown provider ids instead of destroying existing config', () => {
    expect(parseModelProvider('internal-vllm')).toBe('internal-vllm')
  })
})
