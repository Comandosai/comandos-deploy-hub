import { json } from '@tanstack/react-start'

const PROFILE_ERROR_MESSAGES = new Map<string, string>([
  ['Profile name is required', 'Укажите имя профиля.'],
  ['Invalid profile name', 'Некорректное имя профиля.'],
  ['Profile already exists', 'Профиль уже существует.'],
  ['Profile not found', 'Профиль не найден.'],
  [
    'Default profile cannot be modified here',
    'Базовый профиль default нельзя менять здесь.',
  ],
  ['Cannot delete the active profile', 'Активный профиль нельзя удалить.'],
  ['Target profile already exists', 'Профиль с таким именем уже существует.'],
])

export function normalizeProfileError(error: unknown): string | null {
  if (!(error instanceof Error)) return null
  return PROFILE_ERROR_MESSAGES.get(error.message) ?? null
}

export function profileErrorJson(error: unknown, fallback: string) {
  const expectedMessage = normalizeProfileError(error)
  if (expectedMessage) {
    return json({ ok: false, error: expectedMessage })
  }
  return json(
    {
      ok: false,
      error: fallback,
    },
    { status: 500 },
  )
}
