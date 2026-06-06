import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { readKnowledgePage } from '../../../server/knowledge-browser'

export const Route = createFileRoute('/api/knowledge/read')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Нужен вход в Workspace' }, { status: 401 })
        }

        const url = new URL(request.url)
        const pathParam = url.searchParams.get('path') || ''

        try {
          const { meta, content, backlinks } = readKnowledgePage(pathParam)
          return json({ page: meta, content, backlinks })
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Не удалось прочитать страницу базы знаний'
          const status =
            /not allowed|outside knowledge root|required|traversal/i.test(
              message,
            )
              ? 400
              : /ENOENT/.test(message)
                ? 404
                : 500
          return json({ error: message }, { status })
        }
      },
    },
  },
})
