import { createFileRoute } from '@tanstack/react-router'

import { handleLegacyConfigGet } from '../../server/hermes-config-route'

export const Route = createFileRoute('/api/config-get')({
  server: {
    handlers: {
      GET: handleLegacyConfigGet,
    },
  },
})
