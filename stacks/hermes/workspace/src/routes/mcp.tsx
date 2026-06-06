import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { McpScreen } from '@/screens/mcp/mcp-screen'

export const Route = createFileRoute('/mcp')({
  ssr: false,
  component: McpRoute,
})

function McpRoute() {
  usePageTitle('MCP-серверы')
  return <McpScreen />
}
