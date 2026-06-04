export type AgentUsageLine = {
  type: 'progress' | 'text' | 'badge'
  label: string
  used?: number
  limit?: number
  format?: 'percent' | 'dollars' | 'tokens'
  value?: string
  color?: string
  resetsAt?: string
}

export type AgentProviderUsageEntry = {
  provider: string
  displayName: string
  status: 'ok' | 'missing_credentials' | 'auth_expired' | 'error'
  plan?: string
  lines: Array<AgentUsageLine>
}

export type AgentUsageRow = {
  label: string
  pct: number
  resetHint: string | null
}

export function formatUsageResetHint(resetsAt?: string): string | null {
  if (!resetsAt) return null
  const now = Date.now()
  const diff = new Date(resetsAt).getTime() - now
  if (diff <= 0) return null
  const hours = diff / 3_600_000
  if (hours >= 24) {
    const days = Math.ceil(hours / 24)
    return `~${days} дн.`
  }
  return `~${Math.ceil(hours)} ч.`
}

export function formatUsageLabel(label: string): string {
  const normalized = label.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const key = normalized.toLowerCase()
  if (key === 'session' || key === 'sess') return 'Сессия'
  if (key === 'weekly' || key === 'week') return 'Неделя'
  if (key === 'daily' || key === 'day') return 'День'
  if (key === 'monthly' || key === 'month') return 'Месяц'
  if (key === 'context' || key === 'ctx') return 'Контекст'
  if (key === 'tokens') return 'Токены'
  if (key === 'cost') return 'Расход'
  return normalized
}

function hasPositiveProgressLine(line: AgentUsageLine): boolean {
  return (
    line.type === 'progress' &&
    typeof line.used === 'number' &&
    Number.isFinite(line.used) &&
    line.used > 0
  )
}

export function providerHasUsageProgress(
  provider: AgentProviderUsageEntry | null | undefined,
): boolean {
  return Boolean(
    provider?.status === 'ok' && provider.lines.some(hasPositiveProgressLine),
  )
}

export function selectPrimaryUsageProvider(
  providers: Array<AgentProviderUsageEntry>,
  preferred: string | null,
): AgentProviderUsageEntry | null {
  if (preferred) {
    const match = providers.find(
      (provider) =>
        provider.provider === preferred && providerHasUsageProgress(provider),
    )
    if (match) return match
  }
  return providers.find(providerHasUsageProgress) ?? null
}

export function usageRowsFromProvider(
  provider: AgentProviderUsageEntry | null,
): Array<AgentUsageRow> {
  if (!provider) return []
  return provider.lines
    .filter(hasPositiveProgressLine)
    .slice(0, 2)
    .map((line) => ({
      label: formatUsageLabel(line.label),
      pct: Math.min(100, Math.round(line.used as number)),
      resetHint: formatUsageResetHint(line.resetsAt),
    }))
}

export function usageRowsFromProviders(
  providers: Array<AgentProviderUsageEntry>,
  preferred: string | null,
): { rows: Array<AgentUsageRow>; providerLabel: string | null } {
  const primary = selectPrimaryUsageProvider(providers, preferred)
  const rows = usageRowsFromProvider(primary)
  if (!primary || rows.length === 0) {
    return { rows: [], providerLabel: null }
  }
  const name = primary.displayName.split(' ')[0]
  const label = primary.plan ? `${name} ${primary.plan}` : name
  return {
    rows,
    providerLabel: label.length > 14 ? name : label,
  }
}

export function readConfigModelLabel(payload: unknown): string {
  const root =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {}
  const activeProvider =
    typeof root.activeProvider === 'string' ? root.activeProvider.trim() : ''
  const activeModel =
    typeof root.activeModel === 'string' ? root.activeModel.trim() : ''
  const model =
    typeof root.model === 'string'
      ? root.model.trim()
      : typeof root.currentModel === 'string'
        ? root.currentModel.trim()
        : activeModel

  if (!model) return ''
  if (
    !activeProvider ||
    model.toLowerCase().includes(activeProvider.toLowerCase())
  ) {
    return model
  }
  return `${activeProvider} · ${model}`
}
