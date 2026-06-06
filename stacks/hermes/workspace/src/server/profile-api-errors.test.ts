import { describe, expect, it } from 'vitest'

import { normalizeProfileError } from './profile-api-errors'

describe('normalizeProfileError', () => {
  it('turns expected profile validation errors into Russian user messages', () => {
    expect(normalizeProfileError(new Error('Cannot delete the active profile'))).toBe(
      'Активный профиль нельзя удалить.',
    )
    expect(normalizeProfileError(new Error('Profile not found'))).toBe(
      'Профиль не найден.',
    )
    expect(normalizeProfileError(new Error('Target profile already exists'))).toBe(
      'Профиль с таким именем уже существует.',
    )
  })

  it('leaves unknown errors for server-side 500 handling', () => {
    expect(normalizeProfileError(new Error('disk is gone'))).toBeNull()
    expect(normalizeProfileError('Profile not found')).toBeNull()
  })
})
