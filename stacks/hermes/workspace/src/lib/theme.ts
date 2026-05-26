export type ThemeId =
  | 'komandos-dark'
  | 'komandos-light'

export const THEMES: Array<{
  id: ThemeId
  label: string
  description: string
  icon: string
}> = [
  {
    id: 'komandos-dark',
    label: 'Командос',
    description: 'Угольный фон, лайм-плитки. Спокойная уверенность.',
    icon: '◆',
  },
]

const STORAGE_KEY = 'komandos-theme'
const LEGACY_STORAGE_KEY = 'claude-theme'
const DEFAULT_THEME: ThemeId = 'komandos-dark'
const THEME_SET = new Set<ThemeId>(THEMES.map((theme) => theme.id))
const LIGHT_THEME_MAP: Record<
  Exclude<ThemeId, `${string}-light`>,
  Extract<ThemeId, `${string}-light`>
> = {
  'komandos-dark': 'komandos-light',
}
const DARK_THEME_MAP: Record<
  Extract<ThemeId, `${string}-light`>,
  Exclude<ThemeId, `${string}-light`>
> = {
  'komandos-light': 'komandos-dark',
}

const LIGHT_THEMES = new Set<ThemeId>([
  'komandos-light',
])

function mapLegacyTheme(value: string | null | undefined): ThemeId | null {
  if (!value) return null
  if (isValidTheme(value) && value !== 'komandos-light') return value
  return 'komandos-dark'
}

export function isValidTheme(
  value: string | null | undefined,
): value is ThemeId {
  return typeof value === 'string' && THEME_SET.has(value as ThemeId)
}

export function isDarkTheme(theme: ThemeId): boolean {
  return !LIGHT_THEMES.has(theme)
}

export function getThemeVariant(
  theme: ThemeId,
  mode: 'light' | 'dark',
): ThemeId {
  if (mode === 'light') {
    return isDarkTheme(theme)
      ? LIGHT_THEME_MAP[theme as keyof typeof LIGHT_THEME_MAP]
      : theme
  }

  return isDarkTheme(theme)
    ? theme
    : DARK_THEME_MAP[theme as keyof typeof DARK_THEME_MAP]
}

export function getTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'komandos-light') {
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME)
    return DEFAULT_THEME
  }
  if (isValidTheme(stored)) return stored

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  const migrated = mapLegacyTheme(legacy)
  if (migrated) {
    localStorage.setItem(STORAGE_KEY, migrated)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return migrated
  }

  if (legacy) {
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }

  return DEFAULT_THEME
}

export function setTheme(theme: ThemeId): void {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.remove('light', 'dark', 'system')
  const nextMode = isDarkTheme(theme) ? 'dark' : 'light'
  root.classList.add(nextMode)
  root.style.setProperty('color-scheme', nextMode)
  localStorage.setItem(STORAGE_KEY, theme)
}
