import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { detectLocalHermesStatus } from '../../../server/local-hermes-status'

export const Route = createFileRoute('/api/local-hermes/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        return json(await detectLocalHermesStatus())
      },
    },
  },
})
