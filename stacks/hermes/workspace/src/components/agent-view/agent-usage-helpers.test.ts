import { describe, expect, it } from 'vitest'
import {
  readConfigModelLabel,
  selectPrimaryUsageProvider,
  usageRowsFromProviders,
} from './agent-usage-helpers'
import type { AgentProviderUsageEntry } from './agent-usage-helpers'

describe('agent usage helpers', () => {
  const openAiBadgeOnly: AgentProviderUsageEntry = {
    provider: 'openai',
    displayName: 'OpenAI',
    status: 'ok',
    lines: [
      {
        type: 'badge',
        label: 'API key',
        value: 'API-ключ активен',
      },
    ],
  }

  const deepseekProgress: AgentProviderUsageEntry = {
    provider: 'deepseek',
    displayName: 'DeepSeek',
    status: 'ok',
    lines: [
      {
        type: 'progress',
        label: 'Session',
        used: 42,
        resetsAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    ],
  }

  it('does not treat a badge-only provider as usable usage data', () => {
    expect(selectPrimaryUsageProvider([openAiBadgeOnly], null)).toBeNull()
    expect(usageRowsFromProviders([openAiBadgeOnly], null)).toEqual({
      rows: [],
      providerLabel: null,
    })
  })

  it('selects the first provider with real progress data', () => {
    expect(
      selectPrimaryUsageProvider([openAiBadgeOnly, deepseekProgress], null)
        ?.provider,
    ).toBe('deepseek')

    const result = usageRowsFromProviders(
      [openAiBadgeOnly, deepseekProgress],
      null,
    )

    expect(result.providerLabel).toBe('DeepSeek')
    expect(result.rows[0]?.label).toBe('Сессия')
    expect(result.rows[0]?.pct).toBe(42)
  })

  it('formats active provider and model from config payload', () => {
    expect(
      readConfigModelLabel({
        activeProvider: 'deepseek',
        activeModel: 'deepseek-chat',
      }),
    ).toBe('deepseek-chat')

    expect(
      readConfigModelLabel({
        activeProvider: 'custom',
        activeModel: 'gpt-compatible',
      }),
    ).toBe('custom · gpt-compatible')
  })
})
