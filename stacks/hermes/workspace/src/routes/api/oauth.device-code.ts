import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'

const BodySchema = z.object({
  provider: z.string().min(1),
})

const PROVIDER_LABELS: Record<string, string> = {
  nous: 'Nous Portal',
  'openai-codex': 'OpenAI Codex',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  minimax: 'MiniMax',
}

export function getOAuthDeviceCodeUnsupportedMessage(provider: string): string {
  const normalizedProvider = provider.trim().toLowerCase()
  if (normalizedProvider === 'openai-codex') {
    return 'OpenAI Codex не подключается через OAuth в панели. Выполните codex login на сервере, затем вернитесь в настройки и нажмите «Проверить».'
  }

  const label =
    PROVIDER_LABELS[normalizedProvider] || provider.trim() || 'этого провайдера'
  return `OAuth-подключение для ${label} пока не реализовано в панели. Используйте API-ключ, локальный сервер или настройку через терминал.`
}

export function getUnsupportedOAuthDeviceCodeResponse(provider: string) {
  return {
    ok: false,
    unsupported: true,
    error: getOAuthDeviceCodeUnsupportedMessage(provider),
  }
}

export const Route = createFileRoute('/api/oauth/device-code')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return json(
            { error: 'Некорректный JSON в запросе.' },
            { status: 400 },
          )
        }

        const parsed = BodySchema.safeParse(body)
        if (!parsed.success) {
          return json(
            { error: 'Не указан провайдер для OAuth-входа.' },
            { status: 400 },
          )
        }

        const { provider } = parsed.data

        if (provider === 'nous') {
          try {
            const res = await fetch(
              'https://portal.nousresearch.com/api/oauth/device/code',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'client_id=claude-cli',
              },
            )
            const data = await res.json()
            if (!res.ok) {
              return json(
                {
                  error:
                    data.error || 'Не удалось получить код входа Nous Portal.',
                },
                { status: res.status },
              )
            }
            return json(data)
          } catch (err) {
            return json(
              {
                error:
                  err instanceof Error
                    ? `Не удалось подключиться к Nous Portal: ${err.message}`
                    : 'Не удалось подключиться к Nous Portal.',
              },
              { status: 500 },
            )
          }
        }

        return json(getUnsupportedOAuthDeviceCodeResponse(provider))
      },
    },
  },
})
