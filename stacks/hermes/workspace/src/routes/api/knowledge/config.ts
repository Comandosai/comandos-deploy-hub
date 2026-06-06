import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  readKnowledgeBaseConfig,
  writeKnowledgeBaseConfig,
} from '../../../server/knowledge-config'
import type { KnowledgeBaseConfig } from '../../../server/knowledge-config'

export const Route = createFileRoute('/api/knowledge/config')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Нужен вход в Workspace' }, { status: 401 })
        }
        try {
          return json({ config: readKnowledgeBaseConfig() })
        } catch (error) {
          return json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Не удалось прочитать настройки базы знаний',
            },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Нужен вход в Workspace' }, { status: 401 })
        }
        try {
          const body = (await request.json()) as Partial<KnowledgeBaseConfig>
          const current = readKnowledgeBaseConfig()
          const next: KnowledgeBaseConfig = {
            source: body.source ?? current.source,
          }
          writeKnowledgeBaseConfig(next)
          return json({ config: next })
        } catch (error) {
          return json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Не удалось сохранить настройки базы знаний',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
