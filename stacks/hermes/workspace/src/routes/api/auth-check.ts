import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  isAuthenticated,
  isPasswordProtectionEnabled,
} from '../../server/auth-middleware'
import { ensureGatewayProbed } from '../../server/gateway-capabilities'
import { getLicenseStatus } from '../../server/license'

export const Route = createFileRoute('/api/auth-check')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let backendReachable = true
        let backendError: string | undefined
        try {
          // Use ensureGatewayProbed() which handles auto-detection across
          // multiple ports (8642, 8643) instead of checking a single
          // hardcoded URL. This was previously a standalone
          // isBackendReachable() that only tried port 8642 and never
          // benefited from the gateway-capabilities auto-detection logic.
          const caps = await ensureGatewayProbed()
          backendReachable = caps.health || caps.chatCompletions || caps.models
          if (!backendReachable) backendError = 'claude_agent_unreachable'
        } catch (error) {
          backendReachable = false
          backendError =
            error instanceof DOMException && error.name === 'AbortError'
              ? 'claude_agent_timeout'
              : 'claude_agent_unreachable'
        }

        const authRequired = isPasswordProtectionEnabled()
        const authenticated = isAuthenticated(request)
        const license = getLicenseStatus()

        return json({
          authenticated,
          authRequired,
          licenseRequired: license.required,
          licenseActivated: license.activated,
          license,
          backendReachable,
          error: backendError,
        })
      },
    },
  },
})
