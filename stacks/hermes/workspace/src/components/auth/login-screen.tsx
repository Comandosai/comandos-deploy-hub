import { useState } from 'react'
import type { FormEvent } from 'react'

export function LoginScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.ok) {
        // Success! Reload to trigger auth check
        window.location.reload()
      } else {
        setError(data.error || 'Неверный пароль')
        setLoading(false)
      }
    } catch (err) {
      setError('Вход не выполнен. Попробуйте ещё раз.')
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
          {/* Logo */}
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

          {/* Title */}
          <h2 className="mb-2 text-center text-lg font-semibold theme-text">
            Вход в Workspace
          </h2>
          <p className="mb-6 text-center text-sm theme-muted">
            Командный центр защищен паролем
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full rounded-lg border px-4 py-2.5 outline-none transition-all theme-card2 theme-border theme-text"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800/60">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="button-primary w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Проверяем...' : 'Продолжить'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs theme-muted">
          Основано на{' '}
          <a
            href="https://github.com/NousResearch/hermes-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="kmd-link transition-colors"
          >
            Hermes Agent
          </a>
        </p>
      </div>
    </div>
  )
}
