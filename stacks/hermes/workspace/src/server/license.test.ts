import { describe, expect, it } from 'vitest'
import { normalizeLicenseError } from './license'

describe('license error messages', () => {
  it('shows user-facing Russian messages for common activation failures', () => {
    expect(normalizeLicenseError('License key required')).toBe(
      'Введите лицензионный ключ.',
    )
    expect(normalizeLicenseError('License key is invalid')).toBe(
      'Лицензия не найдена или отклонена сервером.',
    )
    expect(normalizeLicenseError('License server is not configured')).toBe(
      'Сервер лицензий не настроен. Проверьте COMANDOS_LICENSE_SERVER_URL.',
    )
    expect(normalizeLicenseError('License server returned 500')).toBe(
      'Сервер лицензий вернул ошибку 500. Проверьте адрес сервера и ключ.',
    )
  })
})
