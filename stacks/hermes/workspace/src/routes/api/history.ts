import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  SESSIONS_API_UNAVAILABLE_MESSAGE,
  ensureGatewayProbed,
  getGatewayCapabilities,
  getMessages,
  listSessions,
  toChatMessage,
} from '../../server/claude-api'
import {
  resolveMainChatSessionId,
  resolveSessionKey,
  shouldBindMainToPortableSession,
} from '../../server/session-utils'
import { getLocalMessages, getLocalSession } from '../../server/local-session-store'
import { isAuthenticated } from '@/server/auth-middleware'

function localHistoryPayload(sessionKey: string, limit: number) {
  const localSession = getLocalSession(sessionKey)
  if (!localSession) return null

  const localMessages = getLocalMessages(sessionKey)
  const boundedMessages =
    limit > 0 ? localMessages.slice(-limit) : localMessages

  return {
    sessionKey,
    sessionId: sessionKey,
    source: 'local',
    messages: boundedMessages.map((m, index) => ({
      id: m.id,
      role: m.role,
      content: [{ type: 'text', text: m.content }],
      text: m.content,
      timestamp: m.timestamp,
      createdAt: new Date(m.timestamp).toISOString(),
      sessionKey,
      historyIndex: index,
      __historyIndex: index,
    })),
  }
}

export const Route = createFileRoute('/api/history')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        await ensureGatewayProbed()
        const capabilities = getGatewayCapabilities()
        try {
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get('limit') || '200')
          const rawSessionKey = url.searchParams.get('sessionKey')?.trim()
          const friendlyId = url.searchParams.get('friendlyId')?.trim()
          let { sessionKey } = await resolveSessionKey({
            rawSessionKey,
            friendlyId,
            defaultKey: 'main',
          })
          // Portable/local chats still persist messages in the workspace
          // process even when the gateway does not expose a sessions API.
          // Return that local history instead of making the UI think the new
          // chat is empty after the first message.
          if (!capabilities.sessions) {
            if (sessionKey === 'new') {
              return json({
                sessionKey: 'new',
                sessionId: 'new',
                messages: [],
              })
            }

            const localHistory = localHistoryPayload(sessionKey, limit)
            if (localHistory) return json(localHistory)

            return json({
              sessionKey: 'new',
              sessionId: 'new',
              messages: [],
              source: 'unavailable',
              message: SESSIONS_API_UNAVAILABLE_MESSAGE,
            })
          }

          const pinPortableMain = shouldBindMainToPortableSession({
            sessionKey,
            dashboardAvailable: capabilities.dashboard.available,
            enhancedChat: capabilities.enhancedChat,
          })
          // Keep /chat/new empty until the first message creates a real session.
          if (sessionKey === 'new') {
            return json({
              sessionKey: 'new',
              sessionId: 'new',
              messages: [],
            })
          }
          // "main" doesn't exist in Claude — resolve it to the user's real
          // main chat session. We prefer (in order):
          //   1. The most recent session with a real human-set title
          //      (label !== id, e.g. "hows everything"). This is what users
          //      actually mean by "main".
          //   2. The most recent non-internal session with messages.
          // Cron + Operations per-agent sessions are skipped so the
          // orchestrator chat doesn't latch onto runtime junk.
          if (sessionKey === 'main' && !pinPortableMain) {
            try {
              const sessions = await listSessions(30, 0)
              const candidate = resolveMainChatSessionId(sessions)
              if (candidate) {
                sessionKey = candidate
              } else {
                return json({
                  sessionKey: 'new',
                  sessionId: 'new',
                  messages: [],
                })
              }
            } catch {
              return json({ sessionKey: 'new', sessionId: 'new', messages: [] })
            }
          }

          if (pinPortableMain) {
            const localHistory = localHistoryPayload('main', limit)
            return json(
              localHistory ?? {
                sessionKey: 'main',
                sessionId: 'main',
                source: 'local',
                messages: [],
              },
            )
          }
          let messages: Awaited<ReturnType<typeof getMessages>> = []
          try {
            messages = await getMessages(sessionKey)
          } catch {
            messages = []
          }

          // Fallback to local session store for portable/local model sessions
          if (messages.length === 0) {
            const localHistory = localHistoryPayload(sessionKey, limit)
            if (localHistory) return json(localHistory)
          }

          const boundedMessages = limit > 0 ? messages.slice(-limit) : messages

          return json({
            sessionKey,
            sessionId: sessionKey,
            messages: boundedMessages.map((message, index) =>
              toChatMessage(message, { historyIndex: index }),
            ),
          })
        } catch (err) {
          return json(
            {
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
