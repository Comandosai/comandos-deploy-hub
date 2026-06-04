export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  icon: string
  goal: string
  tags?: string[]
  teamConfigId?: string
  tasks: Array<{
    title: string
    description?: string
  }>
  createdAt: number
  updatedAt: number
  isBuiltIn?: boolean
}

const STORAGE_KEY = 'clawsuite:workflow-templates'

// Built-in templates that ship with Workspace.
export const BUILT_IN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-code-review',
    name: 'Проверка кода',
    description: 'Найти ошибки, проблемы скорости и слабые места качества кода',
    icon: '🔍',
    goal: 'Проверь кодовую базу: найди ошибки, проблемы скорости и возможности улучшить качество кода.',
    tags: ['review', 'quality', 'audit'],
    tasks: [
      { title: 'Прочитать ключевые исходные файлы и понять устройство проекта' },
      { title: 'Найти ошибки и логические проблемы' },
      { title: 'Проверить возможные уязвимости' },
      { title: 'Предложить улучшения качества кода' },
      { title: 'Написать короткий отчёт с приоритетами' },
    ],
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'tpl-bug-fix',
    name: 'Исправление ошибки',
    description: 'Найти причину ошибки, исправить и проверить',
    icon: '🐛',
    goal: 'Разберись с ошибкой, найди настоящую причину, внеси минимальное исправление и проверь результат. Добавь тесты, если это уместно.',
    tasks: [
      { title: 'Повторить ошибку и понять симптомы' },
      { title: 'Проследить путь выполнения и найти причину' },
      { title: 'Внести исправление' },
      { title: 'Запустить проверку типов' },
      { title: 'Подготовить понятный коммит' },
    ],
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'tpl-feature-build',
    name: 'Новая функция',
    description: 'Спланировать и реализовать функцию целиком',
    icon: '🏗️',
    goal: 'Спланируй, реализуй, проверь и кратко задокументируй новую функцию.',
    tags: ['build', 'feature', 'implementation'],
    tasks: [
      { title: 'Изучить существующие паттерны и устройство проекта' },
      { title: 'Создать нужные файлы и компоненты' },
      { title: 'Подключить маршруты, состояние и API-вызовы' },
      { title: 'Обработать ошибки и крайние случаи' },
      { title: 'Запустить проверку типов и исправить проблемы' },
      { title: 'Подготовить коммит и пуш' },
    ],
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'tpl-research',
    name: 'Исследование',
    description: 'Изучить тему и подготовить структурированный отчёт',
    icon: '📊',
    goal: 'Тщательно изучи тему, сравни варианты и подготовь структурированный отчёт с выводами и рекомендациями.',
    tasks: [
      { title: 'Найти релевантные источники и документацию' },
      { title: 'Проанализировать и сравнить подходы' },
      { title: 'Написать структурированный отчёт' },
      { title: 'Добавить раздел с рекомендациями' },
    ],
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'tpl-refactor',
    name: 'Рефакторинг',
    description: 'Упростить код без изменения поведения',
    icon: '♻️',
    goal: 'Улучши выбранную часть кода: сделай структуру проще, уменьши сложность и сохрани текущее поведение.',
    tasks: [
      { title: 'Прочитать и понять текущую реализацию' },
      { title: 'Найти места для упрощения' },
      { title: 'Вносить изменения постепенно' },
      { title: 'Проверить, что поведение не изменилось' },
      { title: 'Подготовить коммит с понятным описанием' },
    ],
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'tpl-audit',
    name: 'Проверка безопасности',
    description: 'Найти уязвимости и рискованные места в коде',
    icon: '🛡️',
    goal: 'Проведи проверку безопасности: XSS, инъекции, обход авторизации, утечки секретов и проблемы зависимостей. Подготовь отчёт по важности.',
    tasks: [
      { title: 'Проверить код на зашитые секреты и API-ключи' },
      { title: 'Проверить валидацию и очистку входящих данных' },
      { title: 'Проверить авторизацию и права доступа' },
      { title: 'Проверить уязвимости зависимостей' },
      { title: 'Написать отчёт с оценкой важности' },
    ],
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
]

export function loadCustomTemplates(): WorkflowTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WorkflowTemplate[]
  } catch {
    return []
  }
}

export function saveCustomTemplates(templates: WorkflowTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch { /* ignore */ }
}

export function getAllTemplates(): WorkflowTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...loadCustomTemplates()]
}

export function saveAsTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): WorkflowTemplate {
  const newTemplate: WorkflowTemplate = {
    ...template,
    id: `tpl-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const existing = loadCustomTemplates()
  saveCustomTemplates([newTemplate, ...existing])
  return newTemplate
}

export function deleteTemplate(id: string): void {
  const existing = loadCustomTemplates()
  saveCustomTemplates(existing.filter((t) => t.id !== id))
}
