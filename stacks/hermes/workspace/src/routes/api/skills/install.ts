import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  BEARER_TOKEN,
  CLAUDE_API,
  COMANDOS_SINGLE_PANEL,
  ensureGatewayProbed,
} from '../../../server/gateway-capabilities'

function authHeaders(): Record<string, string> {
  return BEARER_TOKEN ? { Authorization: `Bearer ${BEARER_TOKEN}` } : {}
}

const SKILL_INSTALL_MANAGED_REASON =
  'Установка навыков из панели в этой сборке пока недоступна. Добавьте навык вручную на сервере в ~/.hermes/skills и обновите страницу.'

async function readGatewayJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return { ok: response.ok }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return {
      ok: false,
      error: response.ok
        ? 'Сервер навыков вернул нечитаемый ответ.'
        : `Сервер навыков вернул нечитаемую ошибку (${response.status}).`,
    }
  }
}

export const Route = createFileRoute('/api/skills/install')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const body = (await request.json()) as {
            skillId?: string
            identifier?: string
            category?: string
            force?: boolean
          }
          const identifier =
            (body.identifier || body.skillId || '').trim()
          if (!identifier) {
            return json(
              { ok: false, error: 'Укажите навык для установки.' },
              { status: 400 },
            )
          }

          const capabilities = await ensureGatewayProbed()
          if (capabilities.dashboard.available || COMANDOS_SINGLE_PANEL) {
            return json(
              {
                ok: false,
                error: SKILL_INSTALL_MANAGED_REASON,
              },
              { status: 501 },
            )
          }

          const response = await fetch(`${CLAUDE_API}/api/skills/install`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
            },
            body: JSON.stringify({
              identifier,
              category: body.category || '',
              force: Boolean(body.force),
            }),
            signal: AbortSignal.timeout(120_000),
          })

          const result = await readGatewayJson(response)
          return json(result, { status: response.status })
        } catch (error) {
          return json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Не удалось установить навык.',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
