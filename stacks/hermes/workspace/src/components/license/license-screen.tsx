import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthStatus } from '@/lib/claude-auth'

type LicenseScreenProps = {
  status?: AuthStatus['license']
}

function initialError(status?: AuthStatus['license']): string {
  if (!status?.message || status.status === 'missing') return ''
  return status.message
}

export function LicenseScreen({ status }: LicenseScreenProps) {
  const [licenseKey, setLicenseKey] = useState('')
  const [error, setError] = useState(() => initialError(status))
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }

      if (!res.ok || !data.ok) {
        setError(data.error || 'Лицензионный ключ не валиден')
        setLoading(false)
        return
      }

      window.location.reload()
    } catch {
      setError('Не удалось проверить лицензию. Попробуйте ещё раз.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 theme-bg">
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl px-8 py-10 theme-card theme-border theme-shadow-2"
          style={{ borderWidth: 1, borderStyle: 'solid' }}
        >
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2.5">
              <img
                src="/komandos/logo-mark.png"
                alt="COMANDOS AI"
                className="size-9 rounded-xl"
              />
              <h1 className="text-2xl font-bold tracking-tight theme-text">
                COMANDOS AI
              </h1>
            </div>
          </div>

          <h2 className="mb-2 text-center text-lg font-semibold theme-text">
            Активация Workspace
          </h2>
          <p className="mb-6 text-center text-sm theme-muted">
            Введите лицензионный ключ для доступа к панели
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value)}
              placeholder="Лицензионный ключ"
              className="w-full rounded-lg border px-4 py-2.5 outline-none transition-all theme-card2 theme-border theme-text"
              disabled={loading}
              autoFocus
              autoComplete="off"
            />

            {error ? (
              <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800/60">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !licenseKey.trim()}
              className="button-primary w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Проверяем...' : 'Активировать'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs theme-muted">
            Проверка выполняется через сервер лицензий COMANDOS.
          </p>
        </div>
      </div>
    </div>
  )
}
