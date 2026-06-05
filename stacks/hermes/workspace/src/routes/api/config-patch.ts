import { createFileRoute } from '@tanstack/react-router'

import { handleLegacyConfigPatch } from '../../server/hermes-config-route'

export const Route = createFileRoute('/api/config-patch')({
  server: {
    handlers: {
      POST: handleLegacyConfigPatch,
      PATCH: handleLegacyConfigPatch,
    },
  },
})
