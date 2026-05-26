import { useEffect } from 'react'

const EXACT_TEXT: Record<string, string> = {
  Chat: 'Чат',
  Files: 'Файлы',
  Terminal: 'Терминал',
  Memory: 'Память',
  Skills: 'Навыки',
  Settings: 'Настройки',
  Search: 'Поиск',
  Dashboard: 'Панель',
  Tasks: 'Задачи',
  Operations: 'Операции',
  Profiles: 'Профили',
  User: 'Пользователь',
  Workspace: 'Пространство',
  Orchestrator: 'Оркестратор',
  Builder: 'Сборщик',
  Reviewer: 'Проверяющий',
  Researcher: 'Исследователь',
  Strategist: 'Стратег',
  'KM Agent': 'Агент знаний',
  'Ops Watch': 'Наблюдатель',
  'Inbox Triage': 'Разбор входящих',
  'New Session': 'Новая сессия',
  'New Job': 'Создать задание',
  'New Task': 'Создать задачу',
  'New Team': 'Новая команда',
  'Add Agent': 'Добавить агента',
  'Add Server': 'Добавить сервер',
  'Add Agents': 'Добавить агентов',
  Open: 'Открыть',
  Close: 'Закрыть',
  Cancel: 'Отмена',
  Save: 'Сохранить',
  Delete: 'Удалить',
  Copy: 'Копировать',
  Retry: 'Повторить',
  Refresh: 'Обновить',
  Update: 'Обновить',
  Download: 'Скачать',
  Upload: 'Загрузить',
  Create: 'Создать',
  Edit: 'Изменить',
  Remove: 'Удалить',
  Send: 'Отправить',
  Stop: 'Остановить',
  Expand: 'Развернуть',
  Collapse: 'Свернуть',
  Active: 'Активно',
  Idle: 'Ожидает',
  Running: 'В работе',
  Ready: 'Готово',
  Failed: 'Ошибка',
  Error: 'Ошибка',
  Success: 'Готово',
  Unknown: 'Неизвестно',
  Summary: 'Сводка',
  Output: 'Результат',
  History: 'История',
  Status: 'Статус',
  Review: 'Проверка',
  Default: 'По умолчанию',
  Session: 'Сессия',
  Provider: 'Провайдер',
  Usage: 'Расход',
  Backend: 'Серверная часть',
  Connection: 'Подключение',
  default: 'по умолчанию',
  Marketplace: 'Маркетплейс',
  Installed: 'Установлено',
  Available: 'Доступно',
  Enabled: 'Включено',
  Disabled: 'Выключено',
  'No data': 'Данных пока нет',
  'No session': 'Сессии нет',
  'No modes saved.': 'Режимы пока не сохранены.',
  'No pending approvals': 'Нет ожидающих подтверждений',
  'No matching models.': 'Подходящих моделей нет.',
  'No model data.': 'Данных по моделям нет.',
  'No key findings available': 'Ключевых выводов пока нет',
  'No timeline events yet': 'Событий пока нет',
  'No artifacts collected yet': 'Артефактов пока нет',
  'No remote agents found': 'Удалённые агенты не найдены',
  'No active mission': 'Активной миссии нет',
  'No agents configured yet': 'Агенты пока не настроены',
  'No tracked tasks yet.': 'Отслеживаемых задач пока нет.',
  'No dispatched tasks yet.': 'Отправленных задач пока нет.',
  'Waiting for response…': 'Жду ответ...',
  'Loading…': 'Загрузка...',
  'Loading approvals...': 'Загружаю подтверждения...',
  'Loading models…': 'Загружаю модели...',
  'Search output': 'Поиск по выводу',
  'Search settings, paths, or descriptions': 'Поиск настроек, путей и описаний',
  'Search memory files': 'Поиск по памяти',
  'Search knowledge': 'Поиск по знаниям',
  'Search templates...': 'Поиск шаблонов...',
  'Search snippets by title, content, or tag...':
    'Поиск фрагментов по названию, тексту или тегу...',
  'Search screens, sessions, and commands': 'Поиск экранов, сессий и команд',
  'Send directive...': 'Отправить указание...',
  'Add a description…': 'Добавьте описание...',
  'Add note': 'Добавить заметку',
  'Add custom provider': 'Добавить провайдера',
  'Upload profile picture': 'Загрузить фото профиля',
  'Download conversation': 'Скачать диалог',
  'Remove attachment': 'Удалить вложение',
  'Open navigation menu': 'Открыть меню навигации',
  'Open settings': 'Открыть настройки',
  'Open Agent View': 'Открыть панель агента',
  'Collapse navigation sidebar': 'Свернуть боковое меню',
  'Expand sidebar on hover': 'Раскрывать меню при наведении',
  'Chat content width': 'Ширина сообщений в чате',
  'Close output': 'Закрыть результат',
  'Close overflow panel': 'Закрыть дополнительную панель',
  'Close providers dialog': 'Закрыть окно провайдеров',
  'Close provider setup wizard': 'Закрыть настройку провайдера',
  'Close agent output': 'Закрыть результат агента',
  'Close compare view': 'Закрыть сравнение',
  'Close debug analyzer panel': 'Закрыть отладочную панель',
  'Session options': 'Настройки сессии',
  'Session name': 'Название сессии',
  'Copy share link': 'Скопировать ссылку',
  'Open full': 'Открыть полностью',
  'Model & Provider': 'Модель и провайдер',
  'Custom Providers': 'Пользовательские провайдеры',
  'Save Model': 'Сохранить модель',
  'Save current model setup to list':
    'Сохранить текущую настройку модели в список',
  'Add to custom providers list': 'Добавить в список провайдеров',
  'Saved & detected endpoints': 'Сохранённые и найденные подключения',
  'Provider id': 'ID провайдера',
  'Provider id (optional)': 'ID провайдера (необязательно)',
  'Save & reprobe': 'Сохранить и проверить',
  'Reset to defaults': 'Сбросить настройки',
  'Display name': 'Имя в панели',
  'Leave blank for default.': 'Оставьте пустым для значения по умолчанию.',
  'Configure voice output for agent responses.':
    'Настройте голосовой ответ агента.',
  'Configure voice input recognition.': 'Настройте распознавание голоса.',
  'PRIMARY PROFILE': 'ОСНОВНОЙ ПРОФИЛЬ',
  'SWARM ORCHESTRATOR / GREENLIGHT GATE':
    'ОРКЕСТРАТОР РОЯ / КОНТРОЛЬ ПОДТВЕРЖДЕНИЙ',
  'RAZSOC / GBRAIN KNOWLEDGE STEWARD': 'ХРАНИТЕЛЬ ЗНАНИЙ',
  'SCOPED IMPLEMENTATION AGENT': 'АГЕНТ СБОРКИ',
  'INDEPENDENT REVIEW / MERGE GATE': 'НЕЗАВИСИМАЯ ПРОВЕРКА',
  'BROWSER / WORKFLOW / CLI SMOKE VERIFICATION':
    'ПРОВЕРКА БРАУЗЕРА, СЦЕНАРИЕВ И CLI',
  'BRAIN-FIRST RESEARCH / BOUNDED AUTORESEARCH': 'ИССЛЕДОВАНИЕ И ПОИСК ФАКТОВ',
  'LOCAL INFRA / RUNTIME HEALTH WATCH': 'КОНТРОЛЬ ЛОКАЛЬНОЙ ИНФРЫ',
  'UPSTREAM DEPENDENCY / PATCH HYGIENE': 'ЗАВИСИМОСТИ И АККУРАТНОСТЬ ПРАВОК',
  'WEDGES / BETS / KILL CRITERIA': 'СТРАТЕГИЯ И КРИТЕРИИ ОСТАНОВКИ',
  'CAPTURE / DISCARD / ROUTE / TASK TRIAGE':
    'РАЗБОР, ОТБОР И НАПРАВЛЕНИЕ ВХОДЯЩИХ',
  Coffee: 'Кофе',
  Water: 'Вода',
  Snacks: 'Перекус',
}

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bNew Session\b/g, 'Новая сессия'],
  [/\bNew Job\b/g, 'Создать задание'],
  [/\bNew Task\b/g, 'Создать задачу'],
  [/\bAdd Agent\b/g, 'Добавить агента'],
  [/\bAdd Server\b/g, 'Добавить сервер'],
  [/\bOpen chat\b/g, 'Открыть чат'],
  [/\bOpen jobs\b/g, 'Открыть задания'],
  [/\bOpen settings\b/g, 'Открыть настройки'],
  [/\bOpen sessions\b/g, 'Открыть сессии'],
  [/\bOpen models\b/g, 'Открыть модели'],
  [/\bActive Model\b/g, 'Активная модель'],
  [/\bActive mission\b/g, 'Активная миссия'],
  [/\bWorkspace Ready\b/g, 'Пространство готово'],
  [/\bChat Ready\b/g, 'Чат готов'],
  [
    /\bConfigure Monaco defaults for the files workspace\./g,
    'Настройте редактор файлов.',
  ],
  [
    /\bWrap long lines in the editor by default\./g,
    'Переносить длинные строки в редакторе.',
  ],
  [
    /\bConfigure the default AI model for Hermes Agent\./g,
    'Настройте основную модель Hermes Agent.',
  ],
  [/\bTerminal execution backend\./g, 'Серверная часть для терминала.'],
  [/\bSaved in\b/g, 'Сохранено в'],
  [/\bNot configured\b/g, 'Не настроено'],
  [/\bConfigured\b/g, 'Настроено'],
  [/\bChange\b/g, 'Изменить'],
  [/\bAdd to list\b/g, 'Добавить в список'],
  [
    /\bPrefill from Model & Provider above\b/g,
    'Заполнить из блока модели и провайдера выше',
  ],
  [/\blive tools\b/g, 'живые инструменты'],
  [/\bGateway used default model\b/g, 'Шлюз использовал модель по умолчанию'],
  [/\bAuto \(Gateway Default\)\b/g, 'Авто (модель шлюза)'],
  [
    /\bUses your configured default model\b/g,
    'Использует настроенную модель по умолчанию',
  ],
  [
    /\bNo messages yet for\s+([A-Za-z0-9_-]+)\s*\.\s*Send a prompt below\./g,
    'Сообщений для $1 пока нет. Напишите задачу ниже.',
  ],
  [
    /\bTracked work for this agent lives here\./g,
    'Здесь появятся отслеживаемые задачи этого агента.',
  ],
  [/\bReady to build\./g, 'Готов к сборке.'],
  [/\bWorker\b/g, 'Исполнитель'],
  [/\bNo results for\b/g, 'Ничего не найдено для'],
  [/\bNo messages yet\b/g, 'Сообщений пока нет'],
  [/\bNo sessions yet\b/g, 'Сессий пока нет'],
  [/\bNo matching log lines\b/g, 'Подходящих строк лога нет'],
  [/\bNo analytics usage\b/g, 'Нет статистики использования'],
  [/\bNo usage\b/g, 'Нет использования'],
  [/\bLoading approvals\b/g, 'Загружаю подтверждения'],
  [/\bTasks Completed\b/g, 'Задач завершено'],
  [/\bSkills usage\b/g, 'Использование навыков'],
  [/\bMemory Files\b/g, 'Файлы памяти'],
  [/\bUser Profile\b/g, 'Профиль пользователя'],
  [/\bDefault:\s*/g, 'По умолчанию: '],
  [/\bStatus:\s*/g, 'Статус: '],
  [/\bSession:\s*/g, 'Сессия: '],
  [/\bOutput\b/g, 'Результат'],
  [/\bSummary\b/g, 'Сводка'],
  [/\bHistory\b/g, 'История'],
  [/\bSettings\b/g, 'Настройки'],
  [/\bRefresh\b/g, 'Обновить'],
  [/\bRetry\b/g, 'Повторить'],
  [/\bCopy\b/g, 'Копировать'],
  [/\bClose\b/g, 'Закрыть'],
  [/\bCancel\b/g, 'Отмена'],
  [/\bSave\b/g, 'Сохранить'],
  [/\bDelete\b/g, 'Удалить'],
  [/\bSearch\b/g, 'Поиск'],
  [/\bSend\b/g, 'Отправить'],
  [/\bUpload\b/g, 'Загрузить'],
  [/\bDownload\b/g, 'Скачать'],
  [/\bCollapse\b/g, 'Свернуть'],
  [/\bExpand\b/g, 'Развернуть'],
]

const ATTRIBUTE_NAMES = ['aria-label', 'title', 'placeholder']

function translateText(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return value

  const exact = EXACT_TEXT[trimmed]
  if (exact) {
    return value.replace(trimmed, exact)
  }

  let next = value
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement)
  }
  return next
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true
  return Boolean(
    element.closest(
      'code, pre, textarea, input, [contenteditable="true"], [data-chat-message-id], [data-chat-message-bubble]',
    ),
  )
}

function patchElement(element: Element) {
  if (shouldSkipElement(element)) return

  for (const attributeName of ATTRIBUTE_NAMES) {
    const current = element.getAttribute(attributeName)
    if (!current) continue
    const translated = translateText(current)
    if (translated !== current) {
      element.setAttribute(attributeName, translated)
    }
  }
}

function patchTextNode(node: Text) {
  const parent = node.parentElement
  if (shouldSkipElement(parent)) return
  const current = node.nodeValue ?? ''
  const translated = translateText(current)
  if (translated !== current) {
    node.nodeValue = translated
  }
}

function patchTree(root: ParentNode) {
  if (root instanceof Element) {
    patchElement(root)
  }

  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let elementNode = elementWalker.nextNode()
  while (elementNode) {
    patchElement(elementNode as Element)
    elementNode = elementWalker.nextNode()
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let textNode = textWalker.nextNode()
  while (textNode) {
    patchTextNode(textNode as Text)
    textNode = textWalker.nextNode()
  }
}

export function useRussianUiPatcher() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    let scheduled = false
    const schedulePatch = (root: ParentNode = document.body) => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        patchTree(root)
      })
    }

    schedulePatch(document.body)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'characterData' &&
          mutation.target instanceof Text
        ) {
          patchTextNode(mutation.target)
          continue
        }

        if (
          mutation.type === 'attributes' &&
          mutation.target instanceof Element
        ) {
          patchElement(mutation.target)
          continue
        }

        for (const node of mutation.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) {
            schedulePatch(node)
          } else if (node instanceof Text) {
            patchTextNode(node)
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTE_NAMES,
    })

    return () => observer.disconnect()
  }, [])
}
