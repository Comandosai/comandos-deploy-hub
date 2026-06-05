import { describe, expect, it } from 'vitest'
import {
  formatReleaseRef,
  normalizeUpdateError,
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

describe('update center release refs', () => {
  it('does not shorten managed COMANDOS versions', () => {
    expect(formatReleaseRef('2.3.0-comandos.13')).toBe('2.3.0-comandos.13')
    expect(formatReleaseRef('2.3.0-komandos.4')).toBe('2.3.0-komandos.4')
  })

  it('shortens only commit-like hashes', () => {
    expect(formatReleaseRef('96bc5ad1234567890abcdef')).toBe('96bc5ad')
    expect(formatReleaseRef('main')).toBe('main')
    expect(formatReleaseRef(null)).toBe('неизвестно')
  })
})

describe('update center error messages', () => {
  it('turns browser network errors into a Russian recovery hint', () => {
    expect(normalizeUpdateError(new TypeError('Failed to fetch'), 'Workspace'))
      .toMatchInlineSnapshot(
        `"Связь с панелью прервалась во время обновления Workspace. Подождите 30 секунд и обновите страницу; если версия не изменилась, повторите обновление."`,
      )
  })

  it('does not show raw JSON parse errors to the user', () => {
    expect(
      normalizeUpdateError(
        'Unexpected token < in JSON at position 0',
        'Hermes Agent',
      ),
    ).toMatchInlineSnapshot(
      `"Связь с панелью прервалась во время обновления Hermes Agent. Подождите 30 секунд и обновите страницу; если версия не изменилась, повторите обновление."`,
    )
  })

  it('keeps server-provided Russian errors as-is', () => {
    expect(
      normalizeUpdateError(
        'Ветка Workspace разошлась с origin. Сначала сделайте backup.',
        'Workspace',
      ),
    ).toBe('Ветка Workspace разошлась с origin. Сначала сделайте backup.')
  })

  it('hides raw English backend errors behind a generic Russian message', () => {
    expect(normalizeUpdateError('Command failed: git fetch', 'Workspace')).toBe(
      'Обновление Workspace не выполнилось. Проверьте состояние сервера и повторите через минуту.',
    )
  })
})
