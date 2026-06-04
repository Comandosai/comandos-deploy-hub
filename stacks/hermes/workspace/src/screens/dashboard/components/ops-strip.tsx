import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { DashboardOverview } from '@/server/dashboard-aggregator'

function formatPulse(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  const diff = Date.now() - ms
  if (diff < 0) return 'только что'
  if (diff < 60_000) return '<1 мин'
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} мин`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} ч`
  return `${Math.round(diff / 86_400_000)} дн`
}

const PLATFORM_GLYPH: Record<string, string> = {
  api_server: '🌐',
  telegram: '✈️',
  discord: '🎮',
  whatsapp: '🟢',
  slack: '💼',
  signal: '🔵',
  matrix: '#',
  nostr: '⚡',
  imessage: '💬',
  bluebubbles: '🫧',
  mattermost: '🔷',
  feishu: '🪶',
  line: '💚',
  zalo: '⭐',
  twitch: '🎬',
  qqbot: '🐧',
  msteams: '🟦',
  irc: '#',
}

const STATE_TONE: Record<string, string> = {
  connected: 'var(--theme-success)',
  running: 'var(--theme-success)',
  ok: 'var(--theme-success)',
  connecting: 'var(--theme-warning)',
  starting: 'var(--theme-warning)',
  error: 'var(--theme-danger)',
  disconnected: 'var(--theme-danger)',
  failed: 'var(--theme-danger)',
}

function platformTone(state: string): string {
  return STATE_TONE[state.toLowerCase()] ?? 'var(--theme-muted)'
}

function formatNextRun(iso: string | null): {
  text: string
  tone: string
} {
  if (!iso) return { text: 'нет расписания', tone: 'var(--theme-muted)' }
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return { text: 'нет расписания', tone: 'var(--theme-muted)' }
  const diff = ms - Date.now()
  if (diff < -7 * 86_400_000) {
    return { text: 'устарело', tone: 'var(--theme-muted)' }
  }
  if (diff < 0) return { text: 'просрочено', tone: 'var(--theme-warning)' }
  if (diff < 60_000) return { text: '<1 мин', tone: 'var(--theme-text)' }
  if (diff < 3_600_000)
    return { text: `${Math.round(diff / 60_000)} мин`, tone: 'var(--theme-text)' }
  if (diff < 86_400_000)
    return { text: `${Math.round(diff / 3_600_000)} ч`, tone: 'var(--theme-text)' }
  return { text: `${Math.round(diff / 86_400_000)} дн`, tone: 'var(--theme-text)' }
}

/**
 * Consolidated operations strip — the "10-second status read" the
 * dashboard spec calls for. Replaces three separate stacked rows
 * (system status, cron summary, platforms grid) with one tight
 * horizontal bar that surfaces gateway state, version drift, cron
 * pulse, and platform pills in a single line.
 *
 * Renders nothing if there is no status (overview hasn't loaded /
 * gateway is unreachable) so the dashboard does not flash an empty
 * frame on first paint.
 */
export function OpsStrip({
  status,
  cron,
  platforms,
}: {
  status: DashboardOverview['status']
  cron: DashboardOverview['cron']
  platforms: DashboardOverview['platforms']
}) {
  const navigate = useNavigate()
  if (!status) return null

  const ok =
    status.gatewayState === 'running' ||
    status.gatewayState === 'connected' ||
    status.gatewayState === 'ok'

  const drift =
    status.configVersion !== null &&
    status.latestConfigVersion !== null &&
    status.latestConfigVersion > status.configVersion
      ? status.latestConfigVersion - status.configVersion
      : 0

  const next = cron ? formatNextRun(cron.nextRunAt) : null

  return (
    <div
      className="flex flex-col gap-2 rounded-md border bg-[var(--theme-card)]/50 px-3 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      {/* Gateway block: state + version + active agents */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-1.5 w-1.5 rounded-full',
              ok ? 'animate-pulse' : '',
            )}
            style={{
              background: ok
                ? 'var(--theme-success)'
                : 'var(--theme-warning)',
            }}
          />
          <span
            className="font-mono uppercase tracking-[0.15em]"
            style={{ color: 'var(--theme-muted)' }}
          >
            {ok ? 'шлюз' : `шлюз ${status.gatewayState}`}
          </span>
        </span>
        {status.version ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.1em]"
            style={{ color: 'var(--theme-muted)' }}
          >
            v{status.version}
          </span>
        ) : null}
        <span
          className="font-mono uppercase tracking-[0.15em]"
          style={{ color: 'var(--theme-muted)' }}
        >
          · активных запусков: {status.activeAgents}
        </span>
        {status.lastHeartbeatAt ? (
          <span
            className="font-mono text-[9px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--theme-muted)' }}
            title={`Последний сигнал шлюза: ${status.lastHeartbeatAt}`}
          >
            · сигнал {formatPulse(status.lastHeartbeatAt)}
          </span>
        ) : null}
        {status.restartRequested ? (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em]"
            style={{
              background:
                'color-mix(in srgb, var(--theme-warning) 15%, transparent)',
              color: 'var(--theme-warning)',
              border:
                '1px solid color-mix(in srgb, var(--theme-warning) 35%, transparent)',
            }}
          >
            ждёт перезапуск
          </span>
        ) : null}
        {drift > 0 ? (
          <button
            type="button"
            onClick={() => navigate({ to: '/settings', search: {} })}
            className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors hover:bg-[var(--theme-card)]/80"
            style={{
              background:
                'color-mix(in srgb, var(--theme-warning) 12%, transparent)',
              color: 'var(--theme-warning)',
              border:
                '1px solid color-mix(in srgb, var(--theme-warning) 30%, transparent)',
            }}
            title={`Локальная конфигурация v${status.configVersion} · свежая v${status.latestConfigVersion}`}
          >
            расхождение конфигурации: {drift}
          </button>
        ) : null}
      </div>

      {/* Platform pills + cron next-run */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {platforms.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {platforms.map((platform) => (
              <span
                key={platform.name}
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: platformTone(platform.state),
                }}
                title={
                  platform.errorMessage
                    ? `${platform.name}: ${platform.errorMessage}`
                    : `${platform.name} · ${platform.state}`
                }
              >
                <span aria-hidden>
                  {PLATFORM_GLYPH[platform.name] ?? '🔌'}
                </span>
                {platform.name.replace('_', ' ')}
              </span>
            ))}
          </div>
        ) : null}

        {cron ? (() => {
          const isStale = next?.text === 'устарело'
          const isWarn = next?.text === 'просрочено' || isStale
          return (
            <button
              type="button"
              onClick={() => navigate({ to: '/jobs' })}
              className="inline-flex items-center gap-2 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:bg-[var(--theme-card)]/80"
              style={{
                borderColor: isWarn
                  ? 'color-mix(in srgb, var(--theme-warning) 35%, transparent)'
                  : 'var(--theme-border)',
                background: isWarn
                  ? 'color-mix(in srgb, var(--theme-warning) 10%, transparent)'
                  : 'transparent',
                color: 'var(--theme-muted)',
              }}
              title={
                isStale
                  ? 'Следующий запуск задания просрочен больше чем на 7 дней'
                  : 'Открыть задания по расписанию'
              }
            >
              <span>расписание</span>
              <span style={{ color: 'var(--theme-text)' }}>{cron.total}</span>
              {cron.paused > 0 ? (
                <span style={{ color: 'var(--theme-warning)' }}>
                  · пауза: {cron.paused}
                </span>
              ) : null}
              {cron.running > 0 ? (
                <span style={{ color: 'var(--theme-success)' }}>
                  · работает: {cron.running}
                </span>
              ) : null}
              {next ? (
                <span style={{ color: next.tone }}>· {next.text}</span>
              ) : null}
            </button>
          )
        })() : null}
      </div>
    </div>
  )
}
