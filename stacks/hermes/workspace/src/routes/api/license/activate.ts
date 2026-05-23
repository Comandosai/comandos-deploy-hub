import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'
import { activateLicense } from '../../../server/license'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
} from '../../../server/rate-limit'

const ActivateLicenseSchema = z.object({
  licenseKey: z.string().min(1).max(512),
})

export const Route = createFileRoute('/api/license/activate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        const ip = getClientIp(request)
        if (!rateLimit(`license:${ip}`, 10, 60_000)) {
          return rateLimitResponse()
        }

        const raw = await request.json().catch(() => ({}))
        const parsed = ActivateLicenseSchema.safeParse(raw)
        if (!parsed.success) {
          return json(
            { ok: false, error: 'Invalid request' },
            { status: 400 },
          )
        }

        const result = await activateLicense(parsed.data.licenseKey).catch(
          (error: unknown) => ({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : 'License activation failed',
          }),
        )

        if (!result.ok) {
          return json(result, { status: 401 })
        }

        return json(result)
      },
    },
  },
})
