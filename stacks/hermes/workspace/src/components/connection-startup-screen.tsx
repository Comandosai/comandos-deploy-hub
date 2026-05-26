import { useEffect, useRef, useState } from 'react'
import type { AuthStatus } from '@/lib/claude-auth'
import { writeTextToClipboard } from '@/lib/clipboard'
import { fetchClaudeAuthStatus } from '@/lib/claude-auth'

const POLL_INTERVAL_MS = 2_000
const FAILURE_REVEAL_MS = 5_000
// Fire one silent auto-start attempt this many ms after we still can't connect.
const AUTO_START_DELAY_MS = 4_000

type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'macos'
  if (ua.includes('linux')) return 'linux'
  return 'unknown'
}

function getSetupSteps(
  platform: Platform,
): Array<{ title: string; command: string; note?: string }> {
  return [
    {
      title: 'Подключите OpenAI-совместимый сервер',
      command: 'Set HERMES_API_URL to your backend base URL',
      note: 'Переносимый чат работает с любым сервером, где есть /v1/chat/completions: Ollama, LiteLLM, vLLM и другие.',
    },
    {
      title: 'Опционально установите Hermes Agent локально',
      command:
        'curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash',
      note: 'Vanilla hermes-agent открывает sessions, skills, memory, jobs и config автоматически.',
    },
    {
      title: 'Настройте агента',
      command: 'hermes setup',
      note: 'Выберите providers один раз; Hermes Agent сохранит конфиг в ~/.hermes.',
    },
    {
      title: 'Запустите gateway',
      command: 'hermes gateway run',
      note: 'HTTP API для Workspace поднимется на :8642.',
    },
  ]
}

type Props = { onConnected: (status: AuthStatus) => void }

declare global {
  interface Window {
    __dismissSplash?: () => void
  }
}

export function ConnectionStartupScreen({ onConnected }: Props) {
  const [showFailureState, setShowFailureState] = useState(false)
  const [serverStarting, setServerStarting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverLog, setServerLog] = useState<Array<string>>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [showManual, setShowManual] = useState(false)

  const platform = useRef<Platform>(detectPlatform())
  const steps = getSetupSteps(platform.current)

  const onConnectedRef = useRef(onConnected)
  useEffect(() => {
    onConnectedRef.current = onConnected
  }, [onConnected])

  const isDone = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismiss = window.__dismissSplash
    if (!dismiss) return
    const timer = setTimeout(() => dismiss(), 60)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    isDone.current = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let autoStartTimer: ReturnType<typeof setTimeout> | null = null
    let autoStartFired = false

    const failureTimer = setTimeout(() => {
      if (!isDone.current) {
        setShowFailureState(true)
      }
    }, FAILURE_REVEAL_MS)

    // After a short grace period, fire /api/start-claude once silently.
    // If hermes-agent is installed and just not running, this brings it back
    // up without making the user click anything. The polling loop will see it.
    const fireSilentAutoStart = async () => {
      if (autoStartFired || isDone.current) return
      autoStartFired = true
      try {
        const res = await fetch('/api/start-claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) return
        const data = (await res.json()) as { ok?: boolean; message?: string }
        if (res.ok && data.ok) {
          // surface a one-line note so users see what happened if they're
          // looking at the failure panel
          setServerLog([
            String(
              data.message ||
                'Hermes Agent gateway запущен автоматически — переподключаюсь…',
            ),
          ])
        }
      } catch {
        // silent: manual auto-start button stays available
      }
    }
    autoStartTimer = setTimeout(() => {
      void fireSilentAutoStart()
    }, AUTO_START_DELAY_MS)

    const tryConnect = async () => {
      try {
        const status = await fetchClaudeAuthStatus()
        if (isDone.current) return
        isDone.current = true
        clearTimeout(failureTimer)
        clearTimeout(autoStartTimer)
        if (pollTimer) clearTimeout(pollTimer)
        onConnectedRef.current(status)
      } catch {
        if (isDone.current) return
        pollTimer = setTimeout(tryConnect, POLL_INTERVAL_MS)
      }
    }

    void tryConnect()

    return () => {
      isDone.current = true
      if (pollTimer) clearTimeout(pollTimer)
      clearTimeout(autoStartTimer)
      clearTimeout(failureTimer)
    }
  }, [])

  useEffect(() => {
    if (copiedIdx === null) return
    const timer = setTimeout(() => setCopiedIdx(null), 2_000)
    return () => clearTimeout(timer)
  }, [copiedIdx])

  const handleCopy = async (text: string, idx: number) => {
    try {
      await writeTextToClipboard(text)
      setCopiedIdx(idx)
    } catch {
      /* clipboard not available */
    }
  }

  const handleAutoStart = async () => {
    setServerStarting(true)
    setServerError(null)
    setServerLog(['Ищу hermes-agent...'])
    try {
      const res = await fetch('/api/start-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const msg = `Неожиданный ответ (${res.status})`
        setServerLog([`Ошибка: ${msg}`])
        setServerError(msg)
        setServerStarting(false)
        return
      }

      const data = (await res.json()) as Record<string, unknown>
      if (res.ok && data.ok) {
        setServerLog([
          String(data.message || 'Запущено, жду подключение...'),
        ])
        setServerStarting(false)
        return
      }

      const msg = String(data.error || 'hermes-agent не найден')
      const hint = data.hint ? String(data.hint) : ''
      setServerLog([`Ошибка: ${msg}`])
      if (hint) setServerLog((prev) => [...prev, `Подсказка: ${hint}`])
      setServerError(msg)
      setServerStarting(false)
      // Показываем ручные шаги, если автостарт не сработал.
      setShowManual(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setServerLog([`Не удалось: ${msg}`])
      setServerError(msg)
      setServerStarting(false)
      setShowManual(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-6 py-10"
      style={{
        background:
          'radial-gradient(circle at top, color-mix(in srgb, var(--theme-accent) 10%, transparent), transparent 34%), var(--theme-bg)',
        color: 'var(--theme-text)',
        fontFamily: 'Raleway, Inter, system-ui, sans-serif',
      }}
    >
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <img
          src="/komandos/logo-mark.png"
          alt="COMANDOS AI"
          className="mb-5 h-20 w-20 rounded-2xl object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        />

        <p className="kmd-eyebrow mb-3">COMANDOS AI Workspace</p>
        <h1 className="text-[2rem] font-semibold tracking-tight">
          Командный центр запускается
        </h1>

        {/* Connecting spinner */}
        <div
          className={[
            'mt-4 flex items-center gap-3 text-sm transition-opacity duration-300',
            showFailureState ? 'opacity-0 h-0' : 'opacity-100',
          ].join(' ')}
          aria-hidden={showFailureState}
        >
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--theme-border)] border-t-[color:var(--theme-accent)]" />
          <span style={{ color: 'var(--theme-muted)' }}>Подключаю сервер...</span>
        </div>

        {/* Failure state — setup guide */}
        <div
          className={[
            'w-full overflow-hidden transition-all duration-500 ease-out',
            showFailureState
              ? 'mt-6 max-h-[60rem] translate-y-0 opacity-100'
              : 'max-h-0 translate-y-2 opacity-0',
          ].join(' ')}
        >
          <div className="w-full rounded-xl border p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}>
            <p className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
              Добро пожаловать в COMANDOS AI Workspace
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--theme-muted)' }}>
              Workspace работает с любым OpenAI-совместимым сервером. Шлюз Hermes
              Agent даёт расширенные возможности автоматически, когда он доступен.
            </p>

            {/* Auto-start section */}
            <div className="mt-5">
              <button
                type="button"
                disabled={serverStarting}
                onClick={handleAutoStart}
                className={[
                  'w-full rounded-xl px-5 py-3 text-sm font-semibold transition',
                  serverStarting
                    ? 'cursor-not-allowed opacity-60'
                    : 'button-primary',
                ].join(' ')}
              >
                {serverStarting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
                    Проверяю...
                  </span>
                ) : (
                  'Автостарт Hermes Agent Gateway'
                )}
              </button>

              {/* Server log */}
              {serverLog.length > 0 ? (
                <div
                  className={[
                    'mt-3 rounded-xl border p-3',
                    serverError
                      ? 'border-red-500/20 bg-red-950/30'
                      : 'border-emerald-500/20 bg-emerald-950/30',
                  ].join(' ')}
                >
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-white/70">
                    {serverLog.join('\n')}
                  </pre>
                </div>
              ) : null}
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: 'var(--theme-border)' }} />
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="text-xs font-medium transition"
                style={{ color: 'var(--theme-muted)' }}
              >
                {showManual ? 'Скрыть' : 'Показать'} ручную настройку
              </button>
              <div className="h-px flex-1" style={{ background: 'var(--theme-border)' }} />
            </div>

            {/* Manual setup steps */}
            <div
              className={[
                'overflow-hidden transition-all duration-300',
                showManual ? 'max-h-[40rem] opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
            >
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border p-4"
                    style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'color-mix(in srgb, var(--theme-accent) 18%, transparent)', color: 'var(--theme-accent)' }}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {step.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(step.command, idx)}
                        className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition"
                        style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}
                      >
                        {copiedIdx === idx ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-lg p-3 font-mono text-xs leading-5" style={{ background: 'var(--theme-card2)', color: 'var(--theme-text)' }}>
                      <code>{step.command}</code>
                    </pre>
                    {step.note ? (
                      <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>{step.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Env var hint */}
              <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card2)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                  Направьте{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">
                    HERMES_API_URL
                  </code>{' '}
                  на любой OpenAI-совместимый сервер:
                </p>
                <pre className="mt-2 overflow-x-auto font-mono text-xs" style={{ color: 'var(--theme-muted)' }}>
                  HERMES_API_URL=http://your-server:8642 pnpm dev
                </pre>
              </div>
            </div>
          </div>
        </div>

        {!showFailureState ? (
          <p className="mt-6 text-xs" style={{ color: 'var(--theme-muted)' }}>
            Экран обновится автоматически, когда совместимый сервер ответит
          </p>
        ) : null}
      </div>
    </div>
  )
}
