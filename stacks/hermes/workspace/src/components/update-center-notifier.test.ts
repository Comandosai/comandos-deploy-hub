import { describe, expect, it } from 'vitest'
import {
  parseUpdateDismissal,
  serializeUpdateDismissal,
} from './update-center-notifier'

describe('update center dismissal', () => {
  it('keeps a dismissal only while it has not expired', () => {
    const now = 1_000
    const raw = serializeUpdateDismissal('workspace:2.3.0-comandos.11', now)

    expect(parseUpdateDismissal(raw, now + 60_000)).toBe(
      'workspace:2.3.0-comandos.11',
    )
    expect(parseUpdateDismissal(raw, now + 25 * 60 * 60 * 1000)).toBeNull()
  })

  it('does not preserve legacy permanent dismissals', () => {
    expect(
      parseUpdateDismissal('workspace:2.3.0-comandos.11', Date.now()),
    ).toBeNull()
  })
})
