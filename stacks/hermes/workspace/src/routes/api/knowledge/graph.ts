import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { buildKnowledgeGraph } from '../../../server/knowledge-browser'

export const Route = createFileRoute('/api/knowledge/graph')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Нужен вход в Workspace' }, { status: 401 })
        }

        try {
          return json(buildKnowledgeGraph())
        } catch (error) {
          return json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Не удалось построить граф базы знаний',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
