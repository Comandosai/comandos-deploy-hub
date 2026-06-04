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

const SKILL_UNINSTALL_MANAGED_REASON =
  'Удаление навыков из панели в этой сборке пока недоступно. Удалите навык вручную на сервере из ~/.hermes/skills и обновите страницу.'

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

export const Route = createFileRoute('/api/skills/uninstall')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const body = (await request.json()) as {
            skillId?: string
            name?: string
          }
          const name = (body.name || body.skillId || '').trim()
          if (!name) {
            return json(
              { ok: false, error: 'Укажите навык для удаления.' },
              { status: 400 },
            )
          }

          const capabilities = await ensureGatewayProbed()
          if (capabilities.dashboard.available || COMANDOS_SINGLE_PANEL) {
            return json(
              {
                ok: false,
                error: SKILL_UNINSTALL_MANAGED_REASON,
              },
              { status: 501 },
            )
          }

          const response = await fetch(`${CLAUDE_API}/api/skills/uninstall`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
            },
            body: JSON.stringify({ name }),
            signal: AbortSignal.timeout(30_000),
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
                  : 'Не удалось удалить навык.',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
