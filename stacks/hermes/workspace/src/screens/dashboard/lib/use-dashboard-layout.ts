import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'dashboard.layout.v1'

/**
 * Catalog of hideable widgets. The order here is also the *default
 * display order* on the side rail / main column, so adding a new
 * widget = adding it here in the right position.
 *
 * `column` distinguishes main column from side rail so the edit panel
 * can group them sensibly in the picker UI.
 */
export type WidgetId =
  | 'analytics_chart'
  | 'top_models'
  | 'provider_mix'
  | 'cache_efficiency'
  | 'velocity'
  | 'cost_ledger'
  | 'sessions_intelligence'
  | 'logs_tail'
  | 'operator_tip'
  | 'skills_usage'
  | 'achievements'
  | 'mix_rhythm'

export type WidgetMeta = {
  id: WidgetId
  label: string
  description: string
  column: 'main' | 'rail'
  /** Defaults to true; widgets opt-in to being hideable explicitly so
   *  we can keep "Attention" mandatory if we want, etc. */
  hideable: boolean
}

export const WIDGET_CATALOG: ReadonlyArray<WidgetMeta> = [
  {
    id: 'analytics_chart',
    label: 'График аналитики',
    description: 'Динамика токенов, сессий и вызовов по периодам.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'top_models',
    label: 'Главные модели',
    description: 'Доля моделей в выбранном периоде аналитики.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'provider_mix',
    label: 'Провайдеры',
    description:
      'Доля токенов по семействам провайдеров.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'cache_efficiency',
    label: 'Эффективность кэша',
    description:
      'Доля попаданий в кэш. Чем выше, тем ниже расход.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'velocity',
    label: 'Темп',
    description:
      'Среднее число сессий в день и сравнение с прошлым периодом.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'cost_ledger',
    label: 'Журнал расходов',
    description:
      'Расходы по моделям и провайдерам.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'sessions_intelligence',
    label: 'Активность сессий',
    description: 'Недавние сессии, токены, инструменты и статусы.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'logs_tail',
    label: 'Живые логи',
    description:
      'Последние строки логов gateway. Включайте при разборе проблем.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'operator_tip',
    label: 'Подсказка оператору',
    description:
      'Подсказка по текущему состоянию панели.',
    column: 'main',
    hideable: true,
  },
  {
    id: 'skills_usage',
    label: 'Использование навыков',
    description: 'Пять самых используемых навыков.',
    column: 'rail',
    hideable: true,
  },
  {
    id: 'achievements',
    label: 'Достижения',
    description: 'Недавние открытия и прогресс.',
    column: 'rail',
    hideable: true,
  },
  {
    id: 'mix_rhythm',
    label: 'Mix & rhythm',
    description: 'Token mix + hour-of-day activity strip.',
    column: 'rail',
    hideable: true,
  },
]

type StoredLayout = {
  hidden: Array<WidgetId>
}

/**
 * Iteration 014 defaults:
 * - Logs Tail off (triage tool, not a default).
 * - Provider Mix off (Eric kept Cache only).
 * - Velocity, Cost Ledger off (live in the menu so the picker
 *   actually has interesting opt-in widgets).
 * - Operator Tip off too — Eric's call after iter 013, the bottom-
 *   of-column gap is better solved by Sessions Intelligence's
 *   flex-1 stretch than by an additional card. Tip stays available
 *   in the edit menu for users who want a contextual nudge.
 * Attention is no longer a widget id at all (it moved into OpsStrip).
 */
const DEFAULT_HIDDEN: ReadonlyArray<WidgetId> = [
  'logs_tail',
  'provider_mix',
  'velocity',
  'cost_ledger',
  'operator_tip',
]

/**
 * Storage schema marker. We bumped from v1 → v2 when iteration 006
 * removed the `attention` widget id and made `logs_tail` default-off,
 * so existing localStorage entries with `attention` get migrated
 * cleanly instead of silently re-hiding stale ids.
 */
const STORAGE_VERSION = 4

function readLayout(): StoredLayout {
  if (typeof window === 'undefined') {
    return { hidden: [...DEFAULT_HIDDEN] }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { hidden: [...DEFAULT_HIDDEN] }
    const parsed = JSON.parse(raw) as StoredLayout & {
      version?: number
    }
    const valid = new Set<WidgetId>(WIDGET_CATALOG.map((w) => w.id))
    const incoming = Array.isArray(parsed.hidden) ? parsed.hidden : []
    const filtered = incoming.filter((id): id is WidgetId =>
      valid.has(id as WidgetId),
    )
    // Schema migration: when we introduce new widgets that should be
    // off-by-default, bump STORAGE_VERSION and union the prior user
    // hides with the new defaults so existing installs don't suddenly
    // sprout widgets they never asked for. Returning users keep every
    // explicit hide they had, plus the newly default-hidden widgets
    // become hidden until they opt in via the edit menu.
    const storedVersion = parsed.version ?? 0
    if (storedVersion < STORAGE_VERSION) {
      const merged = new Set<WidgetId>(filtered)
      for (const id of DEFAULT_HIDDEN) merged.add(id)
      return { hidden: Array.from(merged) }
    }
    return { hidden: filtered }
  } catch {
    return { hidden: [...DEFAULT_HIDDEN] }
  }
}

function writeLayout(layout: StoredLayout) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...layout, version: STORAGE_VERSION }),
    )
  } catch {
    /* quota / disabled storage — non-fatal */
  }
}

/**
 * Dashboard widget layout hook. Owns:
 * - which widgets are hidden (persisted to localStorage)
 * - whether the dashboard is in edit mode
 *
 * Returns helpers for individual widgets to ask "am I visible?" and
 * for the edit panel to flip widgets on/off.
 *
 * Kept as a hook (not a React Context) because the dashboard tree is
 * shallow enough that prop-drilling the result one level is cleaner
 * than threading a provider — and prop-drilling makes it obvious
 * which widgets actually consume the layout.
 */
export function useDashboardLayout() {
  const [editMode, setEditMode] = useState(false)
  const [hidden, setHidden] = useState<Set<WidgetId>>(
    () => new Set(readLayout().hidden),
  )

  // Persist on every change. Cheap; ~1KB max.
  useEffect(() => {
    writeLayout({ hidden: Array.from(hidden) })
  }, [hidden])

  const toggleEdit = useCallback(() => setEditMode((v) => !v), [])

  const hide = useCallback((id: WidgetId) => {
    setHidden((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const show = useCallback((id: WidgetId) => {
    setHidden((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // Reset returns to the iteration-006 defaults rather than "show
  // literally everything" so first-time users hitting Reset don't
  // suddenly see Logs they never asked for.
  const reset = useCallback(
    () => setHidden(new Set(DEFAULT_HIDDEN)),
    [],
  )

  const isVisible = useCallback(
    (id: WidgetId) => !hidden.has(id),
    [hidden],
  )

  const counts = useMemo(() => {
    const total = WIDGET_CATALOG.length
    return {
      total,
      visible: total - hidden.size,
      hidden: hidden.size,
    }
  }, [hidden])

  return {
    editMode,
    toggleEdit,
    setEditMode,
    hidden,
    hide,
    show,
    reset,
    isVisible,
    counts,
  }
}

export type DashboardLayout = ReturnType<typeof useDashboardLayout>
