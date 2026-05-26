import { describe, expect, it } from 'vitest'
import { LOCALE_LABELS, setLocale, t, type LocaleId } from './i18n'

function withLocale<T>(locale: LocaleId, fn: () => T): T {
  const originalWindow = globalThis.window
  const originalNavigator = globalThis.navigator
  const store = new Map<string, string>([['hermes-workspace-locale', locale]])
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {},
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { language: 'en-US' },
  })
  try {
    return fn()
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    })
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    })
  }
}

describe('i18n translations', () => {
  it('forces Russian labels when another locale was stored', () => {
    withLocale('zh', () => {
      expect(t('nav.dashboard')).toBe('Панель')
      expect(t('nav.profiles')).toBe('Профили')
    })
  })

  it('uses Russian labels instead of falling back to English', () => {
    withLocale('ru', () => {
      expect(t('nav.dashboard')).toBe('Панель')
      expect(t('settings.language')).toBe('Язык')
    })
  })

  it('keeps setLocale locked to Russian for the COMANDOS build', () => {
    withLocale('ja', () => {
      setLocale('en')
      expect(t('nav.dashboard')).toBe('Панель')
      expect(t('settings.language')).toBe('Язык')
    })
  })

  it('exposes readable locale labels for contributor-targeted languages', () => {
    expect(LOCALE_LABELS.zh).toBe('中文（简体）')
    expect(LOCALE_LABELS.ru).toBe('Русский')
  })
})
