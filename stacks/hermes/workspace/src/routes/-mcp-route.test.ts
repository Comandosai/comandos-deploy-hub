import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('/mcp route', () => {
  it('renders the MCP screen even when runtime MCP is unavailable', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/mcp.tsx'), 'utf8')

    expect(source).toContain('<McpScreen />')
    expect(source).not.toContain('BackendUnavailableState')
    expect(source).not.toContain("useFeatureAvailable('mcp')")
    expect(source).not.toContain("useFeatureAvailable('mcpFallback')")
  })
})
