import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckmarkCircle02Icon,
  CloudIcon,
  Delete02Icon,
  Link01Icon,
  MessageMultiple01Icon,
  Mic01Icon,
  Notification03Icon,
  PaintBoardIcon,
  Settings02Icon,
  SourceCodeSquareIcon,
  SparklesIcon,
  UserIcon,
  VolumeHighIcon,
} from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import type * as React from 'react'
import type { LoaderStyle } from '@/hooks/use-chat-settings'
import type { BrailleSpinnerPreset } from '@/components/ui/braille-spinner'
import type { ThemeId } from '@/lib/theme'
import type { SettingsNavId } from '@/components/settings/settings-sidebar'
import { GROQ_STT_MODELS, STT_PROVIDER_OPTIONS } from '@/lib/stt-config'
import {
  SETTINGS_NAV_ITEMS,
  SettingsMobilePills,
  SettingsSidebar,
} from '@/components/settings/settings-sidebar'
import { usePageTitle } from '@/hooks/use-page-title'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/hooks/use-settings'
import { LOCALE_LABELS } from '@/lib/i18n'
import { THEMES, getTheme, isDarkTheme, setTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
  getChatProfileDisplayName,
  useChatSettingsStore,
} from '@/hooks/use-chat-settings'
import { UserAvatar } from '@/components/avatars'
import { Input } from '@/components/ui/input'
import { LogoLoader } from '@/components/logo-loader'
import { BrailleSpinner } from '@/components/ui/braille-spinner'
import { ThreeDotsSpinner } from '@/components/ui/three-dots-spinner'
// useWorkspaceStore removed — hamburger eliminated on mobile

const VALID_SECTION_IDS: ReadonlyArray<SettingsNavId> = SETTINGS_NAV_ITEMS.map(
  (item) => item.id,
)

export const Route = createFileRoute('/settings/')({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>,
  ): { section?: SettingsNavId } => {
    const raw = typeof search.section === 'string' ? search.section : undefined
    if (raw && (VALID_SECTION_IDS as ReadonlyArray<string>).includes(raw)) {
      return { section: raw as SettingsNavId }
    }
    return {}
  },
  component: SettingsRoute,
})

function PageThemeSwatch({
  colors,
}: {
  colors: {
    bg: string
    panel: string
    border: string
    accent: string
    text: string
  }
}) {
  return (
    <div
      className="flex h-10 w-full overflow-hidden rounded-md border"
      style={{ borderColor: colors.border, backgroundColor: colors.bg }}
    >
      <div
        className="flex h-full w-4 flex-col gap-0.5 p-0.5"
        style={{ backgroundColor: colors.panel }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 w-full rounded-sm"
            style={{ backgroundColor: colors.border }}
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-1">
        <div
          className="h-1.5 w-3/4 rounded"
          style={{ backgroundColor: colors.text, opacity: 0.8 }}
        />
        <div
          className="h-1 w-1/2 rounded"
          style={{ backgroundColor: colors.text, opacity: 0.3 }}
        />
        <div
          className="mt-0.5 h-1.5 w-6 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
      </div>
    </div>
  )
}

const THEME_PREVIEWS: Record<
  ThemeId,
  { bg: string; panel: string; border: string; accent: string; text: string }
> = {
  'komandos-dark': {
    bg: '#0B0B0C',
    panel: '#1F1B16',
    border: 'rgba(217,252,103,0.22)',
    accent: '#D9FC67',
    text: '#F4EFE3',
  },
  'komandos-light': {
    bg: '#F4EFE3',
    panel: '#FFFBF1',
    border: 'rgba(31,27,22,0.18)',
    accent: '#1F1B16',
    text: '#1F1B16',
  },
}

function WorkspaceThemePicker() {
  const { updateSettings } = useSettings()
  const [current, setCurrent] = useState<ThemeId>(() => getTheme())

  function applyWorkspaceTheme(id: ThemeId) {
    setTheme(id)
    updateSettings({ theme: isDarkTheme(id) ? 'dark' : 'light' })
    setCurrent(id)
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
      {THEMES.map((t) => {
        const isActive = current === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => applyWorkspaceTheme(t.id)}
            className={cn(
              'flex min-h-[112px] flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-all',
              isActive
                ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-subtle)] text-[var(--theme-text)] shadow-sm'
                : 'border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text)] hover:-translate-y-0.5 hover:bg-[var(--theme-card2)]',
            )}
          >
            <PageThemeSwatch colors={THEME_PREVIEWS[t.id]} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{t.icon}</span>
              <span className="text-xs font-semibold">{t.label}</span>
              {isActive && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-[var(--theme-accent)]">
                  Активна
                </span>
              )}
            </div>
            <p className="text-[10px] leading-tight text-[var(--theme-muted)]">
              {t.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

type SectionProps = {
  title: string
  description: string
  icon: React.ComponentProps<typeof HugeiconsIcon>['icon']
  children: React.ReactNode
}

function SettingsSection({ title, description, icon, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-primary-200 bg-primary-50/80 p-4 shadow-sm backdrop-blur-xl md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-primary-200 bg-primary-100/70">
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-medium text-primary-900 text-balance">
            {title}
          </h2>
          <p className="text-sm text-primary-600 text-pretty">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

type RowProps = {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsRow({ label, description, children }: RowProps) {
  return (
    <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary-900 text-balance">
          {label}
        </p>
        {description ? (
          <p className="text-xs text-primary-600 text-pretty">{description}</p>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-2 md:w-auto md:justify-end">
        {children}
      </div>
    </div>
  )
}

type SettingsSectionId = SettingsNavId

function SettingsRoute() {
  usePageTitle('Настройки')
  const { settings, updateSettings } = useSettings()

  // Phase 4.2: Fetch models for preferred model dropdowns
  const [availableModels, setAvailableModels] = useState<
    Array<{ id: string; label: string }>
  >([])
  const [modelsError, setModelsError] = useState(false)

  useEffect(() => {
    async function fetchModels() {
      setModelsError(false)
      try {
        const res = await fetch('/api/models')
        if (!res.ok) {
          setModelsError(true)
          return
        }
        const data = await res.json()
        const models = Array.isArray(data.models) ? data.models : []
        setAvailableModels(
          models.map((m: any) => ({
            id: m.id || '',
            label: m.id?.split('/').pop() || m.id || '',
          })),
        )
      } catch {
        setModelsError(true)
      }
    }
    void fetchModels()
  }, [])

  const { section } = Route.useSearch()
  const activeSection: SettingsSectionId = section ?? 'claude'

  return (
    <div className="min-h-screen bg-surface text-primary-900">
      <div className="pointer-events-none fixed inset-0 bg-radial from-primary-400/20 via-transparent to-transparent" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-primary-100/25 via-transparent to-primary-300/20" />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 pb-24 sm:px-6 md:flex-row md:gap-6 md:pb-8 lg:pt-8">
        <SettingsSidebar activeId={activeSection} />

        <SettingsMobilePills activeId={activeSection} />

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* -- Connection ------------------ */}
          {activeSection === 'connection' && <ConnectionSection />}

          {/* ── Hermes Agent ──────────────────────────────────── */}
          {activeSection === 'claude' && (
            <ClaudeConfigSection activeView="claude" />
          )}
          {activeSection === 'agent' && (
            <ClaudeConfigSection activeView="agent" />
          )}
          {activeSection === 'routing' && (
            <ClaudeConfigSection activeView="routing" />
          )}
          {activeSection === 'voice' && (
            <ClaudeConfigSection activeView="voice" />
          )}
          {activeSection === 'display' && (
            <ClaudeConfigSection activeView="display" />
          )}

          {/* ── Appearance ──────────────────────────────────────── */}
          {activeSection === 'appearance' && (
            <>
              <SettingsSection
                title="Тема"
                description="Выберите тему и цветовой акцент Workspace."
                icon={PaintBoardIcon}
              >
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-primary-900">
                      Тема интерфейса
                    </p>
                    <p className="text-xs text-primary-600 text-pretty">
                      Доступны светлый и тёмный варианты оформления.
                    </p>
                  </div>
                  <WorkspaceThemePicker />
                </div>
              </SettingsSection>
            </>
          )}

          {/* ── Chat ────────────────────────────────────────────── */}
          {activeSection === 'chat' && <ChatDisplaySection />}

          {/* ── Editor ──────────────────────────────────────────── */}
          {activeSection === ('editor' as SettingsSectionId) && (
            <SettingsSection
              title="Редактор"
              description="Настройки редактора файлов."
              icon={SourceCodeSquareIcon}
            >
              <SettingsRow
                label="Размер шрифта"
                description="Размер шрифта редактора от 12 до 20."
              >
                <div className="flex w-full items-center gap-2 md:max-w-xs">
                  <input
                    type="range"
                    min={12}
                    max={20}
                    value={settings.editorFontSize}
                    onChange={(e) =>
                      updateSettings({ editorFontSize: Number(e.target.value) })
                    }
                    className="w-full accent-primary-900 dark:accent-primary-400"
                    aria-label={`Размер шрифта редактора: ${settings.editorFontSize} пикселей`}
                    aria-valuemin={12}
                    aria-valuemax={20}
                    aria-valuenow={settings.editorFontSize}
                  />
                  <span className="w-12 text-right text-sm tabular-nums text-primary-700">
                    {settings.editorFontSize}px
                  </span>
                </div>
              </SettingsRow>
              <SettingsRow
                label="Перенос строк"
                description="Переносить длинные строки в редакторе."
              >
                <Switch
                  checked={settings.editorWordWrap}
                  onCheckedChange={(checked) =>
                    updateSettings({ editorWordWrap: checked })
                  }
                  aria-label="Перенос строк"
                />
              </SettingsRow>
              <SettingsRow
                label="Миникарта"
                description="Показывать миникарту файла в редакторе."
              >
                <Switch
                  checked={settings.editorMinimap}
                  onCheckedChange={(checked) =>
                    updateSettings({ editorMinimap: checked })
                  }
                  aria-label="Показывать миникарту"
                />
              </SettingsRow>
            </SettingsSection>
          )}

          {/* ── Notifications ───────────────────────────────────── */}
          {activeSection === ('language' as SettingsSectionId) && (
            <SettingsSection
              title="Язык"
              description="В этой сборке Workspace интерфейс работает на русском языке."
              icon={Settings02Icon}
            >
              <SettingsRow
                label="Язык интерфейса"
                description="Другие языки пока отключены, чтобы не показывать пользователю неготовый перевод."
              >
                <select
                  value="ru"
                  disabled
                  aria-label="Язык интерфейса: русский"
                  className="h-9 w-full cursor-not-allowed rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 opacity-80 outline-none md:max-w-xs"
                >
                  <option value="ru">{LOCALE_LABELS.ru}</option>
                </select>
              </SettingsRow>
            </SettingsSection>
          )}

          {activeSection === 'notifications' && (
            <>
              <SettingsSection
                title="Сигналы"
                description="Настройки уведомлений и предупреждений по расходу."
                icon={Notification03Icon}
              >
                <SettingsRow
                  label="Включить сигналы"
                  description="Показывать системные уведомления и предупреждения по расходу."
                >
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ notificationsEnabled: checked })
                    }
                    aria-label="Включить сигналы"
                  />
                </SettingsRow>
                <SettingsRow
                  label="Порог расхода"
                  description="Показывать предупреждение при расходе от 50% до 100%."
                >
                  <div className="flex w-full items-center gap-2 md:max-w-xs">
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={settings.usageThreshold}
                      onChange={(e) =>
                        updateSettings({
                          usageThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary-900 dark:accent-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!settings.notificationsEnabled}
                      aria-label={`Порог расхода: ${settings.usageThreshold} процентов`}
                      aria-valuemin={50}
                      aria-valuemax={100}
                      aria-valuenow={settings.usageThreshold}
                    />
                    <span className="w-12 text-right text-sm tabular-nums text-primary-700">
                      {settings.usageThreshold}%
                    </span>
                  </div>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Умные подсказки"
                description="Подсказки по выбору модели для баланса цены и качества."
                icon={Settings02Icon}
              >
                <SettingsRow
                  label="Включить умные подсказки"
                  description="Предлагать более дешёвые модели для простых задач и более сильные для сложных."
                >
                  <Switch
                    checked={settings.smartSuggestionsEnabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ smartSuggestionsEnabled: checked })
                    }
                    aria-label="Включить умные подсказки"
                  />
                </SettingsRow>
                <SettingsRow
                  label="Бюджетная модель"
                  description="Модель для дешёвых подсказок. Оставьте пустым для автоопределения."
                >
                  <select
                    value={settings.preferredBudgetModel}
                    onChange={(e) =>
                      updateSettings({ preferredBudgetModel: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500 md:max-w-xs"
                    aria-label="Бюджетная модель"
                  >
                    <option value="">Автоопределение</option>
                    {modelsError && (
                      <option disabled>Не удалось загрузить модели</option>
                    )}
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </SettingsRow>
                <SettingsRow
                  label="Сильная модель"
                  description="Модель для подсказок на сложные задачи. Оставьте пустым для автоопределения."
                >
                  <select
                    value={settings.preferredPremiumModel}
                    onChange={(e) =>
                      updateSettings({ preferredPremiumModel: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500 md:max-w-xs"
                    aria-label="Сильная модель"
                  >
                    <option value="">Автоопределение</option>
                    {modelsError && (
                      <option disabled>Не удалось загрузить модели</option>
                    )}
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </SettingsRow>
                <SettingsRow
                  label="Предлагать только дешевле"
                  description="Не предлагать усиление модели, только более дешёвые варианты."
                >
                  <Switch
                    checked={settings.onlySuggestCheaper}
                    onCheckedChange={(checked) =>
                      updateSettings({ onlySuggestCheaper: checked })
                    }
                    aria-label="Предлагать только более дешёвые модели"
                  />
                </SettingsRow>
              </SettingsSection>
            </>
          )}

          <footer className="mt-auto pt-4">
            <div className="flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50/70 p-3 text-sm text-primary-600 backdrop-blur-sm">
              <HugeiconsIcon
                icon={Settings02Icon}
                size={20}
                strokeWidth={1.5}
              />
              <span className="text-pretty">
                Изменения сохраняются автоматически в этом браузере.
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ── Profile Section ─────────────────────────────────────────────────────

const PROFILE_IMAGE_MAX_DIMENSION = 128
const PROFILE_IMAGE_MAX_FILE_SIZE = 10 * 1024 * 1024

function _ProfileSection() {
  const { settings: chatSettings, updateSettings: updateChatSettings } =
    useChatSettingsStore()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileProcessing, setProfileProcessing] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const displayName = getChatProfileDisplayName(chatSettings.displayName)

  function handleNameChange(value: string) {
    if (value.length > 50) {
      setNameError('Имя слишком длинное: максимум 50 символов')
      return
    }
    setNameError(null)
    updateChatSettings({ displayName: value })
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileError('Этот тип файла не поддерживается.')
      return
    }
    if (file.size > PROFILE_IMAGE_MAX_FILE_SIZE) {
      setProfileError('Изображение слишком большое: максимум 10 МБ.')
      return
    }
    setProfileError(null)
    setProfileProcessing(true)
    try {
      const url = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('Не удалось загрузить изображение'))
        i.src = url
      })
      const max = PROFILE_IMAGE_MAX_DIMENSION
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      updateChatSettings({ avatarDataUrl: canvas.toDataURL(outputType, 0.82) })
    } catch {
      setProfileError('Не удалось обработать изображение.')
    } finally {
      setProfileProcessing(false)
    }
  }

  return (
    <SettingsSection
      title="Профиль"
      description="Имя и аватар, которые видны в чате."
      icon={UserIcon}
    >
      <div className="flex items-center gap-4">
        <UserAvatar
          size={56}
          src={chatSettings.avatarDataUrl}
          alt={displayName}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-900">{displayName}</p>
          <p className="text-xs text-primary-500">
            Показывается в боковом меню и сообщениях чата.
          </p>
        </div>
      </div>
      <SettingsRow label="Имя" description="Оставьте пустым, чтобы использовать значение по умолчанию.">
        <div className="w-full md:max-w-xs">
          <Input
            value={chatSettings.displayName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Пользователь"
            className="h-9 w-full"
            maxLength={50}
            aria-label="Имя"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'profile-name-error' : undefined}
          />
          {nameError && (
            <p
              id="profile-name-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {nameError}
            </p>
          )}
        </div>
      </SettingsRow>
      <SettingsRow
        label="Аватар"
        description="Уменьшается до 128×128 и хранится локально."
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={profileProcessing}
                aria-label="Загрузить аватар"
                className="block w-full cursor-pointer text-xs text-primary-700 dark:text-gray-300 md:max-w-xs file:mr-2 file:cursor-pointer file:rounded-md file:border file:border-primary-200 dark:file:border-gray-600 file:bg-primary-100 dark:file:bg-gray-700 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-primary-900 dark:file:text-gray-100 file:transition-colors hover:file:bg-primary-200 dark:hover:file:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateChatSettings({ avatarDataUrl: null })}
              disabled={!chatSettings.avatarDataUrl || profileProcessing}
            >
              Удалить
            </Button>
          </div>
          {profileError && (
            <p className="text-xs text-red-600" role="alert">
              {profileError}
            </p>
          )}
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}

// ── Chat Display Section ────────────────────────────────────────────────

function ChatDisplaySection() {
  const { settings: chatSettings, updateSettings: updateChatSettings } =
    useChatSettingsStore()
  const { settings, updateSettings } = useSettings()

  return (
    <>
      <SettingsSection
        title="Отображение чата"
        description="Что показывать в сообщениях чата."
        icon={MessageMultiple01Icon}
      >
        <SettingsRow
          label="Показывать инструменты"
          description="Показывать детали вызовов инструментов, когда агент ими пользуется."
        >
          <Switch
            checked={chatSettings.showToolMessages}
            onCheckedChange={(checked) =>
              updateChatSettings({ showToolMessages: checked })
            }
            aria-label="Показывать сообщения инструментов"
          />
        </SettingsRow>
        <SettingsRow
          label="Показывать рассуждения"
          description="Показывать ход рассуждения модели, если он доступен."
        >
          <Switch
            checked={chatSettings.showReasoningBlocks}
            onCheckedChange={(checked) =>
              updateChatSettings({ showReasoningBlocks: checked })
            }
            aria-label="Показывать блоки рассуждений"
          />
        </SettingsRow>
        <SettingsRow
          label="Звук после ответа"
          description="Воспроизводить короткий звук, когда агент закончил отвечать."
        >
          <Switch
            checked={chatSettings.soundOnChatComplete}
            onCheckedChange={(checked) =>
              updateChatSettings({ soundOnChatComplete: checked })
            }
            aria-label="Звук после ответа"
          />
        </SettingsRow>
        <SettingsRow
          label="Поведение Enter"
          description={
            chatSettings.enterBehavior === 'newline'
              ? 'Enter добавляет новую строку. Для отправки используйте ⌘/Ctrl+Enter.'
              : 'Enter отправляет сообщение. Для новой строки используйте Shift+Enter.'
          }
        >
          <Switch
            checked={chatSettings.enterBehavior === 'newline'}
            onCheckedChange={(checked) =>
              updateChatSettings({
                enterBehavior: checked ? 'newline' : 'send',
              })
            }
            aria-label="Enter добавляет новую строку вместо отправки"
          />
        </SettingsRow>
        <SettingsRow
          label="Ширина сообщений"
          description="Максимальная ширина колонки сообщений на больших экранах."
        >
          <select
            value={chatSettings.chatWidth}
            onChange={(e) =>
              updateChatSettings({
                chatWidth: e.target.value as 'comfortable' | 'wide' | 'full',
              })
            }
            className="h-8 rounded-md border border-primary-200 bg-primary-50 px-2 text-sm text-primary-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400"
            aria-label="Ширина сообщений"
          >
            <option value="comfortable">Удобная (900px)</option>
            <option value="wide">Широкая (1200px)</option>
            <option value="full">На всю ширину</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Раскрывать меню при наведении"
          description={
            chatSettings.sidebarHoverExpand
              ? 'Свернутое меню временно раскрывается при наведении.'
              : 'Свернутое меню остаётся узким. Откройте его кнопкой.'
          }
        >
          <Switch
            checked={chatSettings.sidebarHoverExpand}
            onCheckedChange={(checked) =>
              updateChatSettings({ sidebarHoverExpand: checked })
            }
            aria-label="Раскрывать меню при наведении"
          />
        </SettingsRow>
        <SettingsRow
          label="Показывать расход"
          description="Показывать плавающий индикатор провайдера и расхода в чате. По умолчанию выключено."
        >
          <Switch
            checked={settings.showUsageMeter}
            onCheckedChange={(checked) =>
              updateSettings({ showUsageMeter: checked })
            }
            aria-label="Показывать расход"
          />
        </SettingsRow>
      </SettingsSection>
      {/* Mobile Navigation removed — not relevant for COMANDOS AI Workspace */}
    </>
  )
}

// ── Loader Style Section ────────────────────────────────────────────────

type LoaderStyleOption = { value: LoaderStyle; label: string }

const LOADER_STYLES: Array<LoaderStyleOption> = [
  { value: 'dots', label: 'Точки' },
  { value: 'braille-claude', label: 'Claude' },
  { value: 'braille-orbit', label: 'Орбита' },
  { value: 'braille-breathe', label: 'Дыхание' },
  { value: 'braille-pulse', label: 'Пульс' },
  { value: 'braille-wave', label: 'Волна' },
  { value: 'lobster', label: 'Мягкий пульс' },
  { value: 'logo', label: 'Логотип' },
]

function getPreset(style: LoaderStyle): BrailleSpinnerPreset | null {
  const map: Record<string, BrailleSpinnerPreset> = {
    'braille-claude': 'claude',
    'braille-orbit': 'orbit',
    'braille-breathe': 'breathe',
    'braille-pulse': 'pulse',
    'braille-wave': 'wave',
  }
  return map[style] ?? null
}

function LoaderPreview({ style }: { style: LoaderStyle }) {
  if (style === 'dots') return <ThreeDotsSpinner />
  if (style === 'lobster')
    return <span className="inline-block text-sm animate-pulse">🦞</span>
  if (style === 'logo') return <LogoLoader />
  const preset = getPreset(style)
  return preset ? (
    <BrailleSpinner
      preset={preset}
      size={16}
      speed={120}
      className="text-primary-500"
    />
  ) : (
    <ThreeDotsSpinner />
  )
}

function _LoaderStyleSection() {
  const { settings: chatSettings, updateSettings: updateChatSettings } =
    useChatSettingsStore()

  return (
    <SettingsSection
      title="Анимация загрузки"
      description="Анимация, пока ассистент отвечает."
      icon={Settings02Icon}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOADER_STYLES.map((option) => {
          const active = chatSettings.loaderStyle === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateChatSettings({ loaderStyle: option.value })}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-2 transition-colors',
                active
                  ? 'border-primary-500 bg-primary-200/60 text-primary-900'
                  : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100',
              )}
              aria-pressed={active}
            >
              <span className="flex h-5 items-center justify-center">
                <LoaderPreview style={option.value} />
              </span>
              <span className="text-[11px] font-medium text-center leading-4">
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </SettingsSection>
  )
}

// ── Hermes Agent Configuration ──────────────────────────────────────

type ClaudeProvider = {
  id: string
  name: string
  authType: string
  envKeys: Array<string>
  configured: boolean
  maskedKeys: Record<string, string>
}

type ClaudeConfigData = {
  config: Record<string, unknown>
  providers: Array<ClaudeProvider>
  activeProvider: string
  activeModel: string
  claudeHome: string
}

const CLAUDE_API =
  process.env.HERMES_API_URL ||
  process.env.CLAUDE_API_URL ||
  'http://127.0.0.1:8642'

type AvailableModelsResponse = {
  provider: string
  models: Array<{ id: string; description: string }>
  providers: Array<{ id: string; label: string; authenticated: boolean }>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Best-effort URL for an OpenAI-compatible stack: manifest/custom block,
 * custom_providers row matching the active provider (case-insensitive), then
 * top-level base_url (used by named providers like ECLIPSE + remote Ollama).
 */
function resolveCustomBaseUrlFromConfig(
  config: Record<string, unknown>,
  activeProvider: string,
): string {
  const providersConfig = config.providers as Record<string, unknown> | undefined
  const customBlock = (providersConfig?.manifest || providersConfig?.custom) as
    | Record<string, unknown>
    | undefined
  let url = typeof customBlock?.base_url === 'string' ? customBlock.base_url.trim() : ''
  if (!url && Array.isArray(config.custom_providers)) {
    const aid = activeProvider.trim().toLowerCase()
    for (const e of config.custom_providers) {
      if (!e || typeof e !== 'object' || Array.isArray(e)) continue
      const rec = e as Record<string, unknown>
      const name = String(rec.name ?? '').trim().toLowerCase()
      if (name && name === aid && typeof rec.base_url === 'string') {
        url = rec.base_url.trim()
        break
      }
    }
  }
  if (!url && typeof config.base_url === 'string') {
    const top = config.base_url.trim()
    if (top) url = top
  }
  return url
}

function readFallbackInputsFromConfig(config: Record<string, unknown>): {
  provider: string
  model: string
  baseUrl: string
} {
  const fb = config.fallback_model
  if (!fb || typeof fb !== 'object' || Array.isArray(fb)) {
    return { provider: '', model: '', baseUrl: '' }
  }
  const o = fb as Record<string, unknown>
  return {
    provider: typeof o.provider === 'string' ? o.provider : '',
    model: typeof o.model === 'string' ? o.model : '',
    baseUrl: typeof o.base_url === 'string' ? o.base_url : '',
  }
}

function normalizeCustomProviderEntry(
  entry: Record<string, unknown>,
): {
  name: string
  title: string
  base_url: string
  api_key?: string
  api_mode?: string
} {
  const name = typeof entry.name === 'string' ? entry.name.trim() : ''
  const title = typeof entry.title === 'string' ? entry.title.trim() : ''
  const base_url = typeof entry.base_url === 'string' ? entry.base_url.trim() : ''
  const api_key = typeof entry.api_key === 'string' ? entry.api_key : undefined
  const api_mode = typeof entry.api_mode === 'string' ? entry.api_mode : undefined
  return { name, title, base_url, api_key, api_mode }
}

function urlNormForDedupe(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '')
}

/** True if this name or base URL already appears in custom_providers. */
function entryCoveredByCustomProviderList(
  name: string,
  baseUrl: string,
  list: Array<Record<string, unknown>>,
): boolean {
  const n = name.trim().toLowerCase()
  const u = baseUrl.trim() ? urlNormForDedupe(baseUrl) : ''
  for (const raw of list) {
    const e = normalizeCustomProviderEntry(raw)
    const en = e.name.toLowerCase()
    const eu = e.base_url ? urlNormForDedupe(e.base_url) : ''
    if (n && en && n === en) return true
    if (u && eu && u === eu) return true
  }
  return false
}

function readManifestBlockBaseUrl(config: Record<string, unknown>): string {
  const providersConfig = config.providers as Record<string, unknown> | undefined
  const customBlock = (providersConfig?.manifest || providersConfig?.custom) as
    | Record<string, unknown>
    | undefined
  return typeof customBlock?.base_url === 'string' ? customBlock.base_url.trim() : ''
}

function deriveCustomProviderNameFromBaseUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/[^a-zA-Z0-9-]+/g, '-')
    return host ? `ep-${host}` : 'custom-endpoint'
  } catch {
    return 'custom-endpoint'
  }
}

/** e.g. Qwen3.6.Eclipse from model filename + URL hostname first label */
function suggestCustomProviderTitle(model: string, baseUrl: string): string {
  let modelPart = (model || '').trim()
  const lastSeg = modelPart.includes('/') ? modelPart.split('/').pop() || modelPart : modelPart
  modelPart = (lastSeg || 'model').replace(/\.gguf$/i, '')
  const dashIdx = modelPart.indexOf('-')
  if (dashIdx > 0) modelPart = modelPart.slice(0, dashIdx)
  modelPart = modelPart.replace(/[^a-zA-Z0-9.]/g, '') || 'Model'
  let hostPart = 'Host'
  try {
    const h = new URL(baseUrl.trim()).hostname
    hostPart = h.split('.')[0] || h
  } catch {
    /* keep Host */
  }
  const capHost = hostPart
    ? hostPart.charAt(0).toUpperCase() + hostPart.slice(1).toLowerCase()
    : 'Host'
  return `${modelPart}.${capHost}`
}

function slugifyCustomProviderId(title: string, baseUrl: string): string {
  const t = title.trim()
  if (t) {
    let s = t
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    if (s.length > 56) s = s.slice(0, 56)
    if (s) return s
  }
  return deriveCustomProviderNameFromBaseUrl(baseUrl || 'http://127.0.0.1')
}

function mergeModelForManifestSave(
  config: Record<string, unknown>,
  modelInputTrimmed: string,
): Record<string, unknown> {
  const existing = config.model
  if (typeof existing === 'object' && existing !== null && !Array.isArray(existing)) {
    const o = { ...(existing as Record<string, unknown>) }
    o.provider = 'manifest'
    if (typeof o.default !== 'string' || !o.default.trim()) {
      if (modelInputTrimmed) o.default = modelInputTrimmed
    }
    return o
  }
  if (typeof existing === 'string' && existing.trim()) {
    return { default: existing.trim(), provider: 'manifest' }
  }
  if (modelInputTrimmed) {
    return { default: modelInputTrimmed, provider: 'manifest' }
  }
  return { provider: 'manifest' }
}

function ClaudeConfigSection({
  activeView = 'claude',
}: {
  activeView?: 'claude' | 'agent' | 'routing' | 'voice' | 'display'
}) {
  const [data, setData] = useState<ClaudeConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [modelInput, setModelInput] = useState('')
  const [providerInput, setProviderInput] = useState('')
  const [baseUrlInput, setBaseUrlInput] = useState('')
  const [customApiKey, setCustomApiKey] = useState('')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [editingCustomKey, setEditingCustomKey] = useState(false)
  const [editingCustomBaseUrl, setEditingCustomBaseUrl] = useState(false)
  const [addCpTitle, setAddCpTitle] = useState('')
  const [addCpProviderId, setAddCpProviderId] = useState('')
  const [addCpBaseUrl, setAddCpBaseUrl] = useState('')
  const [addCpYamlKey, setAddCpYamlKey] = useState('')
  const [fallbackProviderInput, setFallbackProviderInput] = useState('')
  const [fallbackModelInput, setFallbackModelInput] = useState('')
  const [fallbackBaseUrlInput, setFallbackBaseUrlInput] = useState('')
  const [showFallbackRow, setShowFallbackRow] = useState(false)

  const [availableProviders, setAvailableProviders] = useState<
    Array<{ id: string; label: string; authenticated: boolean }>
  >([])
  const [availableModels, setAvailableModels] = useState<
    Array<{ id: string; description: string }>
  >([])
  const [loadingModels, setLoadingModels] = useState(false)

  const syncInputsFromData = useCallback((configData: ClaudeConfigData) => {
    const cfg = configData.config
    setModelInput(configData.activeModel || '')
    setProviderInput(configData.activeProvider || '')
    setBaseUrlInput((cfg.base_url as string) || '')
    const fb = readFallbackInputsFromConfig(cfg)
    setFallbackProviderInput(fb.provider)
    setFallbackModelInput(fb.model)
    setFallbackBaseUrlInput(fb.baseUrl)
    setShowFallbackRow(Boolean(fb.provider || fb.model || fb.baseUrl))

    setCustomBaseUrl(readManifestBlockBaseUrl(cfg))
  }, [])

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/claude-config')
    const configData = (await res.json()) as ClaudeConfigData
    setData(configData)
    syncInputsFromData(configData)
    return configData
  }, [syncInputsFromData])

  const fetchModelsForProvider = useCallback(async (provider: string) => {
    if (!provider) {
      setAvailableModels([])
      return
    }
    setLoadingModels(true)
    try {
      const res = await fetch(
        `/api/claude-proxy/api/available-models?provider=${encodeURIComponent(provider)}`,
      )
      if (res.ok) {
        const result = (await res.json()) as AvailableModelsResponse
        setAvailableModels(result.models)
        if (result.providers.length > 0) setAvailableProviders(result.providers)
      }
    } catch {
      // ignore
    }
    setLoadingModels(false)
  }, [])

  useEffect(() => {
    fetchConfig()
      .then((configData) => {
        setLoading(false)
        if (configData.activeProvider) {
          void fetchModelsForProvider(configData.activeProvider)
        }
      })
      .catch(() => setLoading(false))
  }, [fetchConfig, fetchModelsForProvider])

  const saveConfig = async (updates: {
    config?: Record<string, unknown>
    env?: Record<string, string | null>
  }) => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/claude-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const result = (await res.json()) as { message?: string }
      setSaveMessage(result.message && result.message !== 'Saved' ? result.message : 'Сохранено')
      const refreshData = await fetchConfig()
      if (refreshData.activeProvider) {
        void fetchModelsForProvider(refreshData.activeProvider)
      }
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage('Не удалось сохранить')
    }
    setSaving(false)
  }

  const selectClassName =
    'h-9 w-full rounded-lg border border-primary-200 bg-primary-50 px-3 text-sm text-primary-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 md:max-w-sm'

  const readNumber = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const readBoolean = (value: unknown, fallback: boolean) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value === 'true'
    return fallback
  }

  const saveNumberField = (
    section: string,
    field: string,
    rawValue: string,
    fallback: number,
  ) => {
    const value = rawValue === '' ? fallback : Number(rawValue)
    if (!Number.isFinite(value)) return
    void saveConfig({ config: { [section]: { [field]: value } } })
  }

  if (loading) {
    return (
      <SettingsSection
        title="Hermes Agent"
        description="Загружаю конфигурацию..."
        icon={Settings02Icon}
      >
        <div
          className="h-20 animate-pulse rounded-lg"
          style={{ backgroundColor: 'var(--theme-panel)' }}
        />
      </SettingsSection>
    )
  }

  if (!data) {
    return (
      <SettingsSection
        title="Hermes Agent"
        description="Не удалось загрузить конфигурацию Hermes."
        icon={Settings02Icon}
      >
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
          Проверьте, что Hermes Agent запущен на localhost:8642
        </p>
      </SettingsSection>
    )
  }

  const memoryConfig = asRecord(data.config.memory)
  const terminalConfig = asRecord(data.config.terminal)
  const displayConfig = asRecord(data.config.display)
  const agentConfig = asRecord(data.config.agent)
  const smartRouting = asRecord(data.config.smart_model_routing)
  const ttsConfig = asRecord(data.config.tts)
  const sttConfig = asRecord(data.config.stt)
  const customProviders = Array.isArray(data.config.custom_providers)
    ? (data.config.custom_providers as Array<Record<string, unknown>>)
    : []

  const resolvedCustomBaseUrl = resolveCustomBaseUrlFromConfig(
    data.config,
    data.activeProvider,
  )
  const customProviderCatalogEntry = data.providers.find((p) => p.id === 'custom')
  const customApiKeyConfigured = Boolean(customProviderCatalogEntry?.configured)
  const customEndpointConfigured =
    customApiKeyConfigured || Boolean(resolvedCustomBaseUrl)

  const manifestBlockOnlyUrl = readManifestBlockBaseUrl(data.config)
  const primaryConfigBaseUrl =
    typeof data.config.base_url === 'string' ? data.config.base_url.trim() : ''
  const primaryConfigProvider = (data.activeProvider || '').trim()

  const extraPrimaryNotInList =
    primaryConfigProvider &&
    primaryConfigBaseUrl &&
    !entryCoveredByCustomProviderList(
      primaryConfigProvider,
      primaryConfigBaseUrl,
      customProviders,
    )
      ? { name: primaryConfigProvider, base_url: primaryConfigBaseUrl }
      : null

  const extraManifestNotInList =
    manifestBlockOnlyUrl &&
    !entryCoveredByCustomProviderList('', manifestBlockOnlyUrl, customProviders) &&
    urlNormForDedupe(manifestBlockOnlyUrl) !==
      urlNormForDedupe(primaryConfigBaseUrl || '') &&
    !(
      extraPrimaryNotInList &&
      urlNormForDedupe(manifestBlockOnlyUrl) ===
        urlNormForDedupe(extraPrimaryNotInList.base_url)
    )
      ? { base_url: manifestBlockOnlyUrl }
      : null

  function persistCustomProviderRow(
    name: string,
    base_url: string,
    opts?: { title?: string; yamlApiKey?: string },
  ) {
    const n = name.trim()
    const u = base_url.trim()
    if (!n || !u) {
      setSaveMessage('Чтобы сохранить строку, нужны provider id и базовый URL.')
      setTimeout(() => setSaveMessage(null), 4000)
      return
    }
    const others = customProviders.filter((e) => String(e.name ?? '').trim() !== n)
    const prev = customProviders.find((e) => String(e.name ?? '').trim() === n)
    const api_mode =
      prev && typeof prev.api_mode === 'string' && prev.api_mode
        ? prev.api_mode
        : 'chat_completions'

    let rowApi: string | undefined
    if (opts && 'yamlApiKey' in opts) {
      const trimmed = opts.yamlApiKey?.trim() ?? ''
      rowApi = trimmed || undefined
    } else if (prev && typeof prev.api_key === 'string' && prev.api_key) {
      rowApi = prev.api_key
    } else if (n === 'ollama' || n === 'atomic-chat') {
      rowApi = n
    }

    const row: Record<string, unknown> = { name: n, base_url: u, api_mode }
    if (opts?.title?.trim()) row.title = opts.title.trim()
    else if (prev && typeof prev.title === 'string' && prev.title.trim()) {
      row.title = prev.title.trim()
    }
    if (rowApi) row.api_key = rowApi

    void saveConfig({
      config: {
        custom_providers: [row, ...others],
      },
    })
  }

  function submitAddCustomProviderForm() {
    const title = addCpTitle.trim()
    const url = addCpBaseUrl.trim()
    if (!title) {
      setSaveMessage('Добавьте название, чтобы потом узнать этот адрес, например Qwen3.6.Eclipse.')
      setTimeout(() => setSaveMessage(null), 4000)
      return
    }
    if (!url) {
      setSaveMessage('Базовый URL обязателен.')
      setTimeout(() => setSaveMessage(null), 4000)
      return
    }
    const id = addCpProviderId.trim() || slugifyCustomProviderId(title, url)
    persistCustomProviderRow(id, url, {
      title,
      yamlApiKey: addCpYamlKey,
    })
    setAddCpTitle('')
    setAddCpProviderId('')
    setAddCpBaseUrl('')
    setAddCpYamlKey('')
  }

  function saveCurrentToCustomProvidersList() {
    if (!providerInput.trim() || !baseUrlInput.trim()) {
      setSaveMessage('Заполните провайдера и базовый URL в блоке модели, затем повторите.')
      setTimeout(() => setSaveMessage(null), 4000)
      return
    }
    const bu = baseUrlInput.trim()
    persistCustomProviderRow(providerInput.trim(), bu, {
      title: suggestCustomProviderTitle(modelInput, bu),
    })
  }

  function applyCustomProviderFromList(entry: Record<string, unknown>) {
    const n = normalizeCustomProviderEntry(entry)
    if (!n.name) return
    setProviderInput(n.name)
    setBaseUrlInput(n.base_url)
    void fetchModelsForProvider(n.name)
  }

  function removeCustomProviderAt(index: number) {
    const next = customProviders.filter((_, i) => i !== index)
    void saveConfig({ config: { custom_providers: next } })
  }

  const ttsProvider = (ttsConfig.provider as string) || 'edge'
  const ttsEdge = asRecord(ttsConfig.edge)
  const ttsElevenLabs = asRecord(ttsConfig.elevenlabs)
  const ttsOpenAi = asRecord(ttsConfig.openai)
  const sttProvider = (sttConfig.provider as string) || 'local'
  const sttLocal = asRecord(sttConfig.local)
  const sttGroq = asRecord(sttConfig.groq)

  const manifestBaseUrlOnly = readManifestBlockBaseUrl(data.config)

  const renderClaudeOverview = () => (
    <>
      <SettingsSection
        title="Модель и провайдер"
        description="Настройте основную модель для Hermes Agent."
        icon={SourceCodeSquareIcon}
      >
        <SettingsRow
          label="Провайдер"
          description="Выберите сервис, через который агент будет обращаться к модели."
        >
          <div className="flex w-full max-w-sm gap-2">
            {availableProviders.length > 0 ? (
              <select
                value={providerInput}
                onChange={(e) => {
                  const newProvider = e.target.value
                  setProviderInput(newProvider)
                  setModelInput('')
                  void fetchModelsForProvider(newProvider)
                }}
                className={selectClassName}
              >
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.authenticated ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={providerInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProviderInput(e.target.value)
                }
                placeholder="например: ollama, anthropic, openai-codex"
                className="flex-1"
              />
            )}
          </div>
        </SettingsRow>
        <SettingsRow
          label="Модель"
          description="Модель, которую агент использует для диалогов."
        >
          <div className="flex w-full max-w-sm gap-2">
            {availableModels.length > 0 ? (
              <select
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                className={`${selectClassName} font-mono`}
              >
                {!availableModels.some((m) => m.id === modelInput) &&
                  modelInput && (
                    <option value={modelInput}>{modelInput} (текущая)</option>
                  )}
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                    {m.description ? ` — ${m.description}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={modelInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setModelInput(e.target.value)
                }
                placeholder={
                  loadingModels ? 'Загружаю модели...' : 'например: qwen3.5:35b'
                }
                className="flex-1 font-mono"
              />
            )}
          </div>
        </SettingsRow>
        <SettingsRow
          label="Базовый URL"
          description="Для локальных провайдеров: Ollama, LM Studio, MLX. Для облака оставьте пустым."
        >
          <div className="flex w-full max-w-sm gap-2">
            <Input
              value={baseUrlInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBaseUrlInput(e.target.value)
              }
              placeholder="например: http://localhost:11434/v1"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </SettingsRow>

        <div className="rounded-xl border border-primary-200 bg-white/80 px-3 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-primary-900">
                Запасная модель
              </p>
              <p className="text-xs text-primary-600">
                Используется только если основная модель не ответила. Оставьте пустым, чтобы
                отключить запасной вариант.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setShowFallbackRow((v) => !v)}
            >
              {showFallbackRow ? 'Скрыть запасную модель' : 'Показать запасную модель'}
            </Button>
          </div>
          {showFallbackRow ? (
            <div className="mt-3 space-y-3 border-t border-primary-200 pt-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-primary-600">Запасной провайдер</span>
                  <Input
                    value={fallbackProviderInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFallbackProviderInput(e.target.value)
                    }
                    placeholder="например: openrouter"
                    className="font-mono text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-primary-600">ID запасной модели</span>
                  <Input
                    value={fallbackModelInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFallbackModelInput(e.target.value)
                    }
                    placeholder="provider/model или id модели"
                    className="font-mono text-sm"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-primary-600">Базовый URL запасной модели</span>
                <Input
                  value={fallbackBaseUrlInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFallbackBaseUrlInput(e.target.value)
                  }
                  placeholder="Оставьте пустым для облачных API"
                  className="font-mono text-sm"
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            disabled={saving}
            onClick={() => {
              const hasFallback =
                fallbackProviderInput.trim() ||
                fallbackModelInput.trim() ||
                fallbackBaseUrlInput.trim()
              const configUpdate: Record<string, unknown> = {
                model: modelInput.trim(),
                provider: providerInput.trim(),
                base_url: baseUrlInput.trim() || null,
              }
              if (hasFallback) {
                configUpdate.fallback_model = {
                  provider: fallbackProviderInput.trim(),
                  model: fallbackModelInput.trim(),
                  base_url: fallbackBaseUrlInput.trim() || null,
                }
              } else {
                configUpdate.fallback_model = null
              }
              void saveConfig({ config: configUpdate })
            }}
          >
            {saving ? 'Сохраняю...' : 'Сохранить модель'}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="API-ключи"
        description="Ключи провайдеров, которые хранятся в ~/.hermes/.env."
        icon={CloudIcon}
      >
        {data.providers
          .filter((p) => p.envKeys.length > 0 && p.id !== 'custom')
          .map((provider) => (
            <SettingsRow
              key={provider.id}
              label={provider.name}
              description={
                provider.configured ? '✅ Настроено' : '❌ Не настроено'
              }
            >
              <div className="flex w-full max-w-sm items-center gap-2">
                {provider.envKeys.map((envKey) => (
                  <div key={envKey} className="flex-1">
                    {editingKey === envKey ? (
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={keyInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setKeyInput(e.target.value)
                          }
                          placeholder={`Вставьте ${envKey}`}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            void saveConfig({ env: { [envKey]: keyInput } })
                            setEditingKey(null)
                            setKeyInput('')
                          }}
                        >
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingKey(null)
                            setKeyInput('')
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-mono"
                          style={{ color: 'var(--theme-muted)' }}
                        >
                          {provider.maskedKeys[envKey] || 'Не задано'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingKey(envKey)
                            setKeyInput('')
                          }}
                        >
                          {provider.configured ? 'Изменить' : 'Добавить'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SettingsRow>
          ))}
      </SettingsSection>

      <SettingsSection
        title="Память"
        description="Настройки памяти Hermes Agent и профиля пользователя."
        icon={UserIcon}
      >
        <SettingsRow
          label="Память включена"
          description="Сохранять и использовать память между сессиями."
        >
          <Switch
            checked={memoryConfig.memory_enabled !== false}
            onCheckedChange={(checked: boolean) =>
              void saveConfig({
                config: { memory: { memory_enabled: checked } },
              })
            }
          />
        </SettingsRow>
        <SettingsRow
          label="Профиль пользователя"
          description="Запоминать предпочтения и контекст пользователя."
        >
          <Switch
            checked={memoryConfig.user_profile_enabled !== false}
            onCheckedChange={(checked: boolean) =>
              void saveConfig({
                config: { memory: { user_profile_enabled: checked } },
              })
            }
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Терминал"
        description="Настройки выполнения команд."
        icon={SourceCodeSquareIcon}
      >
        <SettingsRow label="Движок" description="Какой механизм выполняет команды терминала.">
          <span
            className="text-sm font-mono"
            style={{ color: 'var(--theme-muted)' }}
          >
            {(terminalConfig.backend as string) || 'local'}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Таймаут"
          description="Максимальное время выполнения команды в секундах."
        >
          <Input
            type="number"
            min={10}
            value={readNumber(terminalConfig.timeout, 180)}
            onChange={(e) =>
              saveNumberField('terminal', 'timeout', e.target.value, 180)
            }
            className="md:w-28"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Свои провайдеры"
        description="Настройте свой OpenAI-совместимый адрес. Добавляйте понятные строки в custom_providers; поля manifest ниже нужны только для отдельного manifest-пути."
        icon={CloudIcon}
      >
        <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/80 p-4">
          <div>
            <p className="text-sm font-medium text-primary-900">Добавить своего провайдера</p>
            <p className="mt-1 text-xs text-primary-600">
              <span className="font-medium">Название</span> нужно только для списка, например{' '}
              <span className="font-mono">Qwen3.6.Eclipse</span> = модель + сервер.{' '}
              <span className="font-medium">ID провайдера</span> — имя в конфиге Hermes. Оставьте
              пустым, чтобы создать безопасный id из названия. API-ключ в этой строке хранится
              только в записи провайдера, не в .env.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-primary-600">Название</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={addCpTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddCpTitle(e.target.value)
                  }
                  placeholder="например: Qwen3.6.Eclipse"
                  className="font-mono text-sm sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    setAddCpTitle(
                      suggestCustomProviderTitle(
                        modelInput,
                        addCpBaseUrl.trim() || baseUrlInput,
                      ),
                    )
                  }
                >
                  Предложить из модели и URL
                </Button>
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-primary-600">ID провайдера (необязательно)</span>
              <Input
                value={addCpProviderId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddCpProviderId(e.target.value)
                }
                placeholder="например: ECLIPSE"
                className="font-mono text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-primary-600">Базовый URL</span>
              <Input
                value={addCpBaseUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddCpBaseUrl(e.target.value)
                }
                placeholder="http://host:11434/v1"
                className="font-mono text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 py-0 text-xs text-primary-700 underline"
                onClick={() => {
                  setAddCpBaseUrl(baseUrlInput.trim())
                  setAddCpTitle((t) =>
                    t.trim()
                      ? t
                      : suggestCustomProviderTitle(modelInput, baseUrlInput.trim()),
                  )
                }}
              >
                Заполнить из блока модели выше
              </Button>
            </div>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-primary-600">
                API-ключ только для этой строки
              </span>
              <Input
                type="password"
                value={addCpYamlKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddCpYamlKey(e.target.value)
                }
                placeholder="Оставьте пустым, если сервер работает без ключа"
                className="font-mono text-sm"
              />
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => submitAddCustomProviderForm()}
          >
            Добавить в список своих провайдеров
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-primary-200 bg-white/90">
          <div className="flex flex-col gap-2 border-b border-primary-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-primary-700">
              <span className="font-medium text-primary-900">Сохранённые и найденные адреса</span>
              <span className="text-primary-600">
                {' '}
                (
                {customProviders.length +
                  (extraPrimaryNotInList ? 1 : 0) +
                  (extraManifestNotInList ? 1 : 0)}
                )
              </span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => saveCurrentToCustomProvidersList()}
            >
              Сохранить текущую модель в список
            </Button>
          </div>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-primary-200 bg-primary-100/70 text-left text-[11px] font-semibold uppercase tracking-wide text-primary-600">
                <th className="px-3 py-2">Источник</th>
                <th className="px-3 py-2">Название</th>
                <th className="px-3 py-2">ID провайдера</th>
                <th className="px-3 py-2">Базовый URL</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {customProviders.length === 0 &&
              !extraPrimaryNotInList &&
              !extraManifestNotInList ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-xs leading-relaxed text-primary-600"
                  >
                    В <span className="font-mono">custom_providers</span> пока нет строк, и
                    основной или manifest URL не найден. Добавьте своего провайдера или настройте
                    модель выше и нажмите «Сохранить текущую модель в список».
                  </td>
                </tr>
              ) : null}
              {customProviders.map((raw, index) => {
                const entry = normalizeCustomProviderEntry(raw)
                const key = entry.name || `idx-${index}`
                return (
                  <tr
                    key={`saved-${key}-${index}`}
                    className="border-b border-primary-100 odd:bg-primary-50/40"
                  >
                    <td className="px-3 py-2 align-top text-xs text-primary-600">Сохранено</td>
                    <td className="max-w-[160px] px-3 py-2 align-top text-xs font-medium text-primary-900 break-words">
                      {entry.title || '—'}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs text-primary-800">
                      {entry.name || '—'}
                    </td>
                    <td className="max-w-[240px] px-3 py-2 align-top font-mono text-xs text-primary-700 break-all">
                      {entry.base_url || '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving || !entry.name}
                          onClick={() => applyCustomProviderFromList(raw)}
                        >
                          Применить
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:text-red-800"
                          disabled={saving}
                          onClick={() => removeCustomProviderAt(index)}
                          aria-label={`Удалить ${entry.name || 'своего провайдера'}`}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {extraPrimaryNotInList ? (
                <tr className="border-b border-primary-100 bg-amber-50/50">
                  <td className="px-3 py-2 align-top text-xs text-amber-900">Активен, но не в списке</td>
                  <td className="max-w-[160px] px-3 py-2 align-top text-xs text-primary-800 break-words">
                    {suggestCustomProviderTitle(modelInput, extraPrimaryNotInList.base_url)}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs font-medium text-primary-900">
                    {extraPrimaryNotInList.name}
                  </td>
                  <td className="max-w-[240px] px-3 py-2 align-top font-mono text-xs text-primary-700 break-all">
                    {extraPrimaryNotInList.base_url}
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => {
                          setProviderInput(extraPrimaryNotInList.name)
                          setBaseUrlInput(extraPrimaryNotInList.base_url)
                          void fetchModelsForProvider(extraPrimaryNotInList.name)
                        }}
                      >
                        Применить
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() =>
                          persistCustomProviderRow(
                            extraPrimaryNotInList.name,
                            extraPrimaryNotInList.base_url,
                            {
                              title: suggestCustomProviderTitle(
                                modelInput,
                                extraPrimaryNotInList.base_url,
                              ),
                            },
                          )
                        }
                      >
                        Добавить в список
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : null}
              {extraManifestNotInList ? (
                <tr className="border-b border-primary-100 bg-sky-50/50">
                  <td className="px-3 py-2 align-top text-xs text-sky-900">Блок manifest</td>
                  <td className="max-w-[160px] px-3 py-2 align-top text-xs text-primary-800 break-words">
                    {(() => {
                      try {
                        const h = new URL(extraManifestNotInList.base_url).hostname
                        const short = h.split('.')[0] || h
                        return `Manifest.${short.charAt(0).toUpperCase()}${short.slice(1).toLowerCase()}`
                      } catch {
                        return 'Manifest'
                      }
                    })()}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-primary-600">
                    (путь env-ключа)
                  </td>
                  <td className="max-w-[240px] px-3 py-2 align-top font-mono text-xs text-primary-700 break-all">
                    {extraManifestNotInList.base_url}
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        const u = extraManifestNotInList.base_url
                        persistCustomProviderRow(deriveCustomProviderNameFromBaseUrl(u), u, {
                          title: (() => {
                            try {
                              const h = new URL(u).hostname
                              const short = h.split('.')[0] || h
                              return `Manifest.${short.charAt(0).toUpperCase()}${short.slice(1).toLowerCase()}`
                            } catch {
                              return 'Manifest'
                            }
                          })(),
                        })
                      }}
                    >
                      Добавить в список
                    </Button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <SettingsRow
          label="Manifest: CUSTOM_API_KEY"
          description={
            customApiKeyConfigured
              ? '✅ Сохранён в ~/.hermes/.env для manifest-провайдера OpenAI.'
              : customEndpointConfigured
                ? '○ Не задан — это нормально, если адрес локальный или не требует env-ключ.'
                : '○ Необязательно. Оставьте пустым, если не используете providers.manifest + CUSTOM_API_KEY.'
          }
        >
          <div className="flex w-full max-w-sm flex-col gap-1">
            <p className="text-[11px] text-primary-500">
              Оставьте пустым, если не используете. Заполняйте только если manifest-интеграция
              требует этот ключ.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {editingCustomKey ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="password"
                      value={customApiKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCustomApiKey(e.target.value)
                      }
                      placeholder="Оставьте пустым, чтобы очистить ключ"
                      className="min-w-[12rem] flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        void saveConfig({
                          env: {
                            CUSTOM_API_KEY: customApiKey.trim() ? customApiKey.trim() : null,
                          },
                        })
                        setEditingCustomKey(false)
                      }}
                    >
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCustomKey(false)}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--theme-muted)' }}
                    >
                      {customApiKeyConfigured
                        ? customProviderCatalogEntry.maskedKeys['CUSTOM_API_KEY'] || 'Задан'
                        : 'Не задан'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCustomKey(true)
                        setCustomApiKey('')
                      }}
                    >
                      {customApiKeyConfigured ? 'Изменить' : 'Добавить'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Manifest: базовый URL"
          description={
            manifestBaseUrlOnly
              ? `✅ ${manifestBaseUrlOnly}`
              : '○ Необязательно — только если используете providers.manifest отдельно от основной модели.'
          }
        >
          <div className="flex w-full max-w-sm flex-col gap-1">
            <p className="text-[11px] text-primary-500">
              Меняет только <span className="font-mono">providers.manifest</span>. Основной
              базовый URL остаётся в блоке «Модель и провайдер».
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {editingCustomBaseUrl ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={customBaseUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCustomBaseUrl(e.target.value)
                      }
                      placeholder="http://127.0.0.1:8080/v1"
                      className="min-w-[12rem] flex-1 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const u = customBaseUrl.trim()
                        if (!u) {
                          setSaveMessage('Введите базовый URL manifest или отмените действие.')
                          setTimeout(() => setSaveMessage(null), 3000)
                          return
                        }
                        void saveConfig({
                          config: {
                            model: mergeModelForManifestSave(data.config, modelInput.trim()),
                            providers: {
                              manifest: {
                                type: 'openai',
                                base_url: u,
                                key_env: 'CUSTOM_API_KEY',
                              },
                            },
                          },
                        })
                        setEditingCustomBaseUrl(false)
                      }}
                    >
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCustomBaseUrl(false)
                        setCustomBaseUrl(manifestBaseUrlOnly)
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--theme-muted)' }}
                    >
                      {manifestBaseUrlOnly || 'Не задан'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCustomBaseUrl(manifestBaseUrlOnly)
                        setEditingCustomBaseUrl(true)
                      }}
                    >
                      {manifestBaseUrlOnly ? 'Изменить' : 'Добавить'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="О системе"
        description="Техническая информация о Hermes Agent."
        icon={Notification03Icon}
      >
        <SettingsRow
          label="Путь к конфигу"
          description="Где Hermes хранит локальную конфигурацию."
        >
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--theme-muted)' }}
          >
            {data.claudeHome}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Активный провайдер"
          description="Текущий провайдер модели."
        >
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--theme-accent)' }}
          >
            {data.providers.find((p) => p.id === data.activeProvider)?.name ||
              data.activeProvider}
          </span>
        </SettingsRow>
      </SettingsSection>
    </>
  )

  const renderAgentBehavior = () => (
    <SettingsSection
      title="Поведение агента"
      description="Ограничения выполнения и доступ к инструментам."
      icon={Settings02Icon}
    >
      <SettingsRow
        label="Максимум шагов"
        description="Сколько шагов агент может сделать на один запрос: от 1 до 100."
      >
        <Input
          type="number"
          min={1}
          max={100}
          value={readNumber(agentConfig.max_turns, 50)}
          onChange={(e) =>
            saveNumberField('agent', 'max_turns', e.target.value, 50)
          }
          className="md:w-28"
        />
      </SettingsRow>
      <SettingsRow
        label="Таймаут gateway"
        description="Сколько секунд ждать ответ gateway."
      >
        <Input
          type="number"
          min={10}
          max={600}
          value={readNumber(agentConfig.gateway_timeout, 120)}
          onChange={(e) =>
            saveNumberField('agent', 'gateway_timeout', e.target.value, 120)
          }
          className="md:w-28"
        />
      </SettingsRow>
      <SettingsRow
        label="Использование инструментов"
        description="Должен ли агент использовать инструменты, когда они доступны."
      >
        <select
          value={(agentConfig.tool_use_enforcement as string) || 'auto'}
          onChange={(e) =>
            void saveConfig({
              config: { agent: { tool_use_enforcement: e.target.value } },
            })
          }
          className={selectClassName}
        >
          <option value="auto">Авто</option>
          <option value="required">Обязательно</option>
          <option value="none">Не требовать</option>
        </select>
      </SettingsRow>
    </SettingsSection>
  )

  const renderSmartRouting = () => (
    <SettingsSection
      title="Умный выбор модели"
      description="Автоматически отправлять простые запросы на более дешёвую модель."
      icon={SparklesIcon}
    >
      <SettingsRow
        label="Включить умный выбор"
        description="Автоматически выбирать более дешёвую модель для простых запросов."
      >
        <Switch
          checked={readBoolean(smartRouting.enabled, false)}
          onCheckedChange={(checked) =>
            void saveConfig({
              config: { smart_model_routing: { enabled: checked } },
            })
          }
        />
      </SettingsRow>
      <SettingsRow
        label="Дешёвая модель"
        description="Модель для простых запросов."
      >
        <select
          value={(smartRouting.cheap_model as string) || ''}
          onChange={(e) =>
            void saveConfig({
              config: { smart_model_routing: { cheap_model: e.target.value } },
            })
          }
          className={selectClassName}
        >
          <option value="">Выберите модель</option>
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}
            </option>
          ))}
        </select>
      </SettingsRow>
      <SettingsRow
        label="Максимум символов"
        description="Сообщения короче этого значения считаются простыми."
      >
        <Input
          type="number"
          min={1}
          value={readNumber(smartRouting.max_simple_chars, 500)}
          onChange={(e) =>
            saveNumberField(
              'smart_model_routing',
              'max_simple_chars',
              e.target.value,
              500,
            )
          }
          className="md:w-32"
        />
      </SettingsRow>
      <SettingsRow
        label="Максимум слов"
        description="Сообщения с меньшим числом слов считаются простыми."
      >
        <Input
          type="number"
          min={1}
          value={readNumber(smartRouting.max_simple_words, 80)}
          onChange={(e) =>
            saveNumberField(
              'smart_model_routing',
              'max_simple_words',
              e.target.value,
              80,
            )
          }
          className="md:w-32"
        />
      </SettingsRow>
    </SettingsSection>
  )

  const renderVoice = () => (
    <div className="space-y-4">
      <SettingsSection
        title="Озвучивание"
        description="Настройки голосового вывода ответов агента."
        icon={VolumeHighIcon}
      >
        <SettingsRow
          label="Провайдер TTS"
          description="Какой движок использовать для озвучивания."
        >
          <select
            value={ttsProvider}
            onChange={(e) =>
              void saveConfig({ config: { tts: { provider: e.target.value } } })
            }
            className={selectClassName}
          >
            <option value="edge">Edge TTS (бесплатно)</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="openai">OpenAI TTS</option>
            <option value="neutts">NeuTTS</option>
          </select>
        </SettingsRow>

        {ttsProvider === 'edge' && (
          <SettingsRow label="Голос" description="Название голоса Edge.">
            <Input
              value={(ttsEdge.voice as string) || ''}
              onChange={(e) =>
                void saveConfig({
                  config: { tts: { edge: { voice: e.target.value } } },
                })
              }
              placeholder="en-US-AriaNeural"
              className="md:w-64"
            />
          </SettingsRow>
        )}

        {ttsProvider === 'elevenlabs' && (
          <>
            <SettingsRow label="ID голоса" description="voice_id в ElevenLabs.">
              <Input
                value={(ttsElevenLabs.voice_id as string) || ''}
                onChange={(e) =>
                  void saveConfig({
                    config: {
                      tts: { elevenlabs: { voice_id: e.target.value } },
                    },
                  })
                }
                className="md:w-64"
              />
            </SettingsRow>
            <SettingsRow label="Модель" description="Название модели ElevenLabs.">
              <Input
                value={(ttsElevenLabs.model as string) || ''}
                onChange={(e) =>
                  void saveConfig({
                    config: { tts: { elevenlabs: { model: e.target.value } } },
                  })
                }
                className="md:w-64"
              />
            </SettingsRow>
          </>
        )}

        {ttsProvider === 'openai' && (
          <>
            <SettingsRow
              label="Голос"
              description="alloy, echo, fable, onyx, nova, shimmer"
            >
              <select
                value={(ttsOpenAi.voice as string) || 'alloy'}
                onChange={(e) =>
                  void saveConfig({
                    config: { tts: { openai: { voice: e.target.value } } },
                  })
                }
                className={selectClassName}
              >
                {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(
                  (voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ),
                )}
              </select>
            </SettingsRow>
            <SettingsRow label="Модель" description="Модель OpenAI TTS.">
              <Input
                value={(ttsOpenAi.model as string) || ''}
                onChange={(e) =>
                  void saveConfig({
                    config: { tts: { openai: { model: e.target.value } } },
                  })
                }
                placeholder="tts-1"
                className="md:w-64"
              />
            </SettingsRow>
          </>
        )}
      </SettingsSection>

      <SettingsSection
        title="Распознавание речи"
        description="Настройки голосового ввода."
        icon={Mic01Icon}
      >
        <SettingsRow label="Включить STT" description="Включить голосовой ввод.">
          <Switch
            checked={readBoolean(sttConfig.enabled, false)}
            onCheckedChange={(checked) =>
              void saveConfig({ config: { stt: { enabled: checked } } })
            }
          />
        </SettingsRow>
        <SettingsRow
          label="Провайдер STT"
          description="Какой движок использовать для распознавания речи."
        >
          <select
            value={sttProvider}
            onChange={(e) =>
              void saveConfig({ config: { stt: { provider: e.target.value } } })
            }
            className={selectClassName}
          >
            {STT_PROVIDER_OPTIONS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </SettingsRow>
        {sttProvider === 'local' && (
          <SettingsRow
            label="Размер модели"
            description="tiny, base, small, medium, large"
          >
            <select
              value={(sttLocal.model_size as string) || 'base'}
              onChange={(e) =>
                void saveConfig({
                  config: { stt: { local: { model_size: e.target.value } } },
                })
              }
              className={selectClassName}
            >
              {['tiny', 'base', 'small', 'medium', 'large'].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </SettingsRow>
        )}
        {sttProvider === 'groq' && (
          <>
            <SettingsRow
              label="Модель Groq"
              description="Выберите модель Whisper, которую должен запускать Groq."
            >
              <select
                value={(sttGroq.model as string) || GROQ_STT_MODELS[0]}
                onChange={(e) =>
                  void saveConfig({
                    config: { stt: { groq: { ...sttGroq, model: e.target.value } } },
                  })
                }
                className={selectClassName}
              >
                {GROQ_STT_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow
              label="Язык"
              description="Необязательный код BCP-47, например ru или en-US. Оставьте пустым для автоопределения."
            >
              <Input
                value={(sttConfig.language as string) || ''}
                onChange={(e) =>
                  void saveConfig({
                    config: { stt: { language: e.target.value } },
                  })
                }
                placeholder="авто"
                className="md:w-64"
              />
            </SettingsRow>
          </>
        )}
      </SettingsSection>
    </div>
  )

  const renderDisplay = () => (
    <SettingsSection
      title="Экран"
      description="Настройки отображения агента в интерфейсе."
      icon={PaintBoardIcon}
    >
      <SettingsRow label="Стиль ответов" description="Манера ответа агента.">
        <select
          value={(displayConfig.personality as string) || 'default'}
          onChange={(e) =>
            void saveConfig({
              config: { display: { personality: e.target.value } },
            })
          }
          className={selectClassName}
        >
          <option value="default">Обычный</option>
          <option value="concise">Краткий</option>
          <option value="verbose">Подробный</option>
          <option value="creative">Творческий</option>
        </select>
      </SettingsRow>
      <SettingsRow
        label="Потоковый вывод"
        description="Показывать ответ по мере генерации."
      >
        <Switch
          checked={readBoolean(displayConfig.streaming, true)}
          onCheckedChange={(checked) =>
            void saveConfig({ config: { display: { streaming: checked } } })
          }
        />
      </SettingsRow>
      <SettingsRow
        label="Показывать рассуждения"
        description="Показывать блоки рассуждений модели в интерфейсе."
      >
        <Switch
          checked={readBoolean(displayConfig.show_reasoning, false)}
          onCheckedChange={(checked) =>
            void saveConfig({
              config: { display: { show_reasoning: checked } },
            })
          }
        />
      </SettingsRow>
      <SettingsRow label="Показывать стоимость" description="Показывать данные о стоимости и расходе.">
        <Switch
          checked={readBoolean(displayConfig.show_cost, false)}
          onCheckedChange={(checked) =>
            void saveConfig({ config: { display: { show_cost: checked } } })
          }
        />
      </SettingsRow>
      <SettingsRow label="Компактный вид" description="Использовать более плотную раскладку.">
        <Switch
          checked={readBoolean(displayConfig.compact, false)}
          onCheckedChange={(checked) =>
            void saveConfig({ config: { display: { compact: checked } } })
          }
        />
      </SettingsRow>
      <SettingsRow label="Тема CLI" description="Тема CLI, если она задана в Hermes.">
        <span
          className="text-sm font-mono"
          style={{ color: 'var(--theme-muted)' }}
        >
          {(displayConfig.skin as string) || 'default'}
        </span>
      </SettingsRow>
    </SettingsSection>
  )

  const sectionContent = {
    claude: renderClaudeOverview(),
    agent: renderAgentBehavior(),
    routing: renderSmartRouting(),
    voice: renderVoice(),
    display: renderDisplay(),
  } as const

  return (
    <>
      {saveMessage && (
        <div
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{
            backgroundColor:
              saveMessage.includes('Failed') ||
              saveMessage.includes('Не удалось') ||
              saveMessage.includes('обязател') ||
              saveMessage.includes('Заполните') ||
              saveMessage.includes('Введите')
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(34,197,94,0.15)',
            color:
              saveMessage.includes('Failed') ||
              saveMessage.includes('Не удалось') ||
              saveMessage.includes('обязател') ||
              saveMessage.includes('Заполните') ||
              saveMessage.includes('Введите')
                ? '#ef4444'
                : '#22c55e',
          }}
        >
          {saveMessage}
        </div>
      )}
      {sectionContent[activeView]}
    </>
  )
}

// ── Connection Section ──────────────────────────────────────────────────

type ConnectionSettings = {
  gateway: string
  dashboard: string
  source: 'override' | 'env' | 'default'
}

type ConnectionCheck = {
  status?: 'connected' | 'enhanced' | 'partial' | 'disconnected'
  label?: string
  detail?: string
  error?: string
}

function ConnectionSection() {
  const [current, setCurrent] = useState<ConnectionSettings | null>(null)
  const [gatewayInput, setGatewayInput] = useState('')
  const [dashboardInput, setDashboardInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/connection-settings')
      if (!res.ok) return
      const data = (await res.json()) as ConnectionSettings
      setCurrent(data)
      setGatewayInput(data.gateway)
      setDashboardInput(data.dashboard)
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const checkConnection = async (): Promise<{
    message: string
    isError: boolean
  }> => {
    try {
      const res = await fetch('/api/connection-status', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as ConnectionCheck
      if (!res.ok) {
        return {
          message:
            typeof data.error === 'string'
              ? `Проверка подключения не прошла: ${data.error}`
              : 'Проверка подключения не прошла.',
          isError: true,
        }
      }
      const label = data.label || 'проверено'
      const detail = data.detail ? ` ${data.detail}` : ''
      return {
        message: `Подключение: ${label}.${detail}`,
        isError: data.status === 'disconnected',
      }
    } catch {
      return {
        message: 'Настройки сохранены, но проверить подключение сейчас не удалось.',
        isError: true,
      }
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    setIsError(false)
    try {
      const res = await fetch('/api/connection-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: gatewayInput.trim(),
          dashboard: dashboardInput.trim(),
        }),
      })
      const data = (await res.json()) as ConnectionSettings & { error?: string }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setCurrent(data)
      const check = await checkConnection()
      setIsError(check.isError)
      setMessage(`Сохранено. ${check.message}`)
    } catch (err) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 6000)
    }
  }

  const reset = async () => {
    setGatewayInput('')
    setDashboardInput('')
    setSaving(true)
    try {
      const res = await fetch('/api/connection-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway: '', dashboard: '' }),
      })
      const data = (await res.json()) as ConnectionSettings
      setCurrent(data)
      setGatewayInput(data.gateway)
      setDashboardInput(data.dashboard)
      const check = await checkConnection()
      setIsError(check.isError)
      setMessage(`Сброшено к env / адресам по умолчанию. ${check.message}`)
    } catch {
      setIsError(true)
      setMessage('Не удалось сбросить')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 6000)
    }
  }

  const inputClass =
    'h-9 w-full rounded-lg border border-primary-200 bg-primary-50 px-3 text-sm text-primary-900 font-mono outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400'

  const sourceLabel: Record<ConnectionSettings['source'], string> = {
    override: 'Переопределено во время работы, сохранено в workspace-overrides.json',
    env: 'Из HERMES_API_URL / необязательного HERMES_DASHBOARD_URL',
    default: 'Адреса по умолчанию, переопределение не задано',
  }

  return (
    <SettingsSection
      title="Подключение"
      description="Укажите, где Workspace должен искать сервисы Hermes Agent. Подходит для Tailscale, локальной сети и удалённого сервера."
      icon={Link01Icon}
    >
      <div className="text-xs text-primary-600">
        {current ? sourceLabel[current.source] : 'Загружаю…'}
      </div>

      <SettingsRow
        label="Gateway URL"
        description="Чат, completions и health-проверка. По умолчанию http://127.0.0.1:8642."
      >
        <input
          className={inputClass}
          value={gatewayInput}
          onChange={(e) => setGatewayInput(e.target.value)}
          placeholder="http://100.x.y.z:8642"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </SettingsRow>

      <SettingsRow
        label="Legacy dashboard URL"
        description="Необязательно. В режиме единой панели COMANDOS родной dashboard Hermes не нужен."
      >
        <input
          className={inputClass}
          value={dashboardInput}
          onChange={(e) => setDashboardInput(e.target.value)}
          placeholder="http://100.x.y.z:9119"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </SettingsRow>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Сохраняю…' : 'Сохранить и проверить'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={reset}
          disabled={saving || current?.source === 'default'}
        >
          Сбросить
        </Button>
        {message ? (
          <span
            className={cn(
              'text-xs',
              isError ? 'text-red-500' : 'text-emerald-600',
            )}
          >
            {message}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-primary-200 bg-primary-100/50 p-3 text-xs text-primary-600">
        <strong className="font-semibold">Tailscale / удалённый сервер:</strong> укажите
        Tailscale IP gateway, например <code>http://100.x.y.z:8642</code>, и проверьте,
        что gateway слушает <code>0.0.0.0</code>. Для этого на стороне агента в{' '}
        <code>.env</code> задайте <code>API_SERVER_HOST=0.0.0.0</code>. Перезапуск
        Workspace не нужен: возможности проверяются заново после сохранения.
      </div>
    </SettingsSection>
  )
}
