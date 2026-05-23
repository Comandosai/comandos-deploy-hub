import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import {
  detectByteroverIntegration,
  detectHonchoIntegration,
} from '../../server/integration-detection'
import { detectLocalHermesStatus } from '../../server/local-hermes-status'

export const Route = createFileRoute('/api/integrations')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        return json({
          ok: true,
          checkedAt: Date.now(),
          integrations: {
            localHermes: await detectLocalHermesStatus(),
            honcho: detectHonchoIntegration(),
            byterover: detectByteroverIntegration(),
          },
        })
      },
    },
  },
})
