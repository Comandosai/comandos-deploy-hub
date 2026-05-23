import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getLicenseStatus } from '../../server/license'

export const Route = createFileRoute('/api/license-check')({
  server: {
    handlers: {
      GET: async () => json(getLicenseStatus()),
    },
  },
})
