import {
  createKanbanCard,
  deleteKanbanCard,
  getKanbanBackendMeta,
  listKanbanCards,
  updateKanbanCard,
} from './kanban-backend'
import type { KanbanBackendMeta } from './kanban-backend'

export type TaskColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export type ClaudeTaskRecord = {
  id: string
  title: string
  description: string
  column: TaskColumn
  priority: TaskPriority
  assignee: string | null
  tags: Array<string>
  due_date: string | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

type TaskFilters = {
  column?: string | null
  assignee?: string | null
  priority?: string | null
  includeDone?: boolean
}

type CreateTaskInput = {
  title: string
  description?: string
  column?: TaskColumn
  priority?: TaskPriority
  assignee?: string | null
  tags?: Array<string>
  due_date?: string | null
  created_by?: string
}

type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'created_by'>>

const TASK_META_MARKER = 'comandos-task-meta'
const TASK_META_REGEX = /\n?\n?<!--\s*comandos-task-meta\s+({[\s\S]*?})\s*-->\s*$/m

type TaskSpecMeta = {
  priority: TaskPriority
  tags: Array<string>
  due_date: string | null
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function mapKanbanStatusToTaskColumn(status: string): TaskColumn {
  switch (status) {
    case 'ready':
      return 'todo'
    case 'running':
      return 'in_progress'
    case 'review':
      return 'review'
    case 'blocked':
      return 'blocked'
    case 'done':
      return 'done'
    case 'backlog':
    default:
      return 'backlog'
  }
}

function mapTaskColumnToKanbanStatus(column: TaskColumn): 'backlog' | 'ready' | 'running' | 'review' | 'blocked' | 'done' {
  switch (column) {
    case 'todo':
      return 'ready'
    case 'in_progress':
      return 'running'
    case 'review':
      return 'review'
    case 'blocked':
      return 'blocked'
    case 'done':
      return 'done'
    case 'backlog':
    default:
      return 'backlog'
  }
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === 'high' || value === 'medium' || value === 'low'
}

function normalizeTags(value: unknown): Array<string> {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
    : []
}

function normalizeDueDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null
}

function decodeTaskSpec(spec: string): { description: string } & TaskSpecMeta {
  const match = spec.match(TASK_META_REGEX)
  if (!match || typeof match.index !== 'number') {
    return {
      description: spec,
      priority: 'medium',
      tags: [],
      due_date: null,
    }
  }
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(match[1]) as Record<string, unknown>
  } catch {
    return {
      description: spec.replace(TASK_META_REGEX, '').trimEnd(),
      priority: 'medium',
      tags: [],
      due_date: null,
    }
  }
  return {
    description: spec.slice(0, match.index).trimEnd(),
    priority: isTaskPriority(parsed.priority) ? parsed.priority : 'medium',
    tags: normalizeTags(parsed.tags),
    due_date: normalizeDueDate(parsed.due_date),
  }
}

function encodeTaskSpec(description: string, meta: Partial<TaskSpecMeta>): string {
  const cleanDescription = description.replace(TASK_META_REGEX, '').trimEnd()
  const priority = meta.priority ?? 'medium'
  const tags = normalizeTags(meta.tags)
  const dueDate = normalizeDueDate(meta.due_date)
  if (priority === 'medium' && tags.length === 0 && !dueDate) return cleanDescription
  const payload = JSON.stringify({
    priority,
    tags,
    due_date: dueDate,
  })
  return `${cleanDescription}${cleanDescription ? '\n\n' : ''}<!-- ${TASK_META_MARKER} ${payload} -->`
}

function mapCardToTask(card: {
  id: string
  title: string
  spec: string
  assignedWorker: string | null
  status: string
  createdBy: string
  createdAt: number
  updatedAt: number
}): ClaudeTaskRecord {
  const spec = decodeTaskSpec(card.spec)
  return {
    id: card.id,
    title: card.title,
    description: spec.description,
    column: mapKanbanStatusToTaskColumn(card.status),
    priority: spec.priority,
    assignee: card.assignedWorker,
    tags: spec.tags,
    due_date: spec.due_date,
    position: card.updatedAt,
    created_by: card.createdBy,
    created_at: toIso(card.createdAt),
    updated_at: toIso(card.updatedAt),
  }
}

export function getClaudeTasksBackendMeta(): KanbanBackendMeta {
  return getKanbanBackendMeta()
}

export async function listClaudeTasks(filters: TaskFilters = {}): Promise<Array<ClaudeTaskRecord>> {
  let tasks = (await listKanbanCards()).map(mapCardToTask)
  if (!filters.includeDone) {
    tasks = tasks.filter((task) => task.column !== 'done')
  }
  if (filters.column) {
    tasks = tasks.filter((task) => task.column === filters.column)
  }
  if (filters.assignee) {
    tasks = tasks.filter((task) => task.assignee === filters.assignee)
  }
  if (filters.priority) {
    tasks = tasks.filter((task) => task.priority === filters.priority)
  }
  return tasks.sort((a, b) => b.position - a.position || a.title.localeCompare(b.title))
}

export async function getClaudeTask(taskId: string): Promise<ClaudeTaskRecord | null> {
  const tasks = await listKanbanCards()
  const card = tasks.find((entry) => entry.id === taskId)
  return card ? mapCardToTask(card) : null
}

export async function createClaudeTask(input: CreateTaskInput): Promise<ClaudeTaskRecord> {
  const card = await createKanbanCard({
    title: input.title,
    spec: encodeTaskSpec(input.description ?? '', {
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      due_date: input.due_date ?? null,
    }),
    assignedWorker: input.assignee ?? null,
    status: mapTaskColumnToKanbanStatus(input.column ?? 'backlog'),
    createdBy: input.created_by ?? 'user',
  })
  return mapCardToTask(card)
}

export async function updateClaudeTask(taskId: string, updates: UpdateTaskInput): Promise<ClaudeTaskRecord | null> {
  const current = await getClaudeTask(taskId)
  if (!current) return null
  const shouldUpdateSpec =
    typeof updates.description === 'string' ||
    updates.priority !== undefined ||
    updates.tags !== undefined ||
    updates.due_date !== undefined
  const card = await updateKanbanCard(taskId, {
    title: typeof updates.title === 'string' ? updates.title : undefined,
    spec: shouldUpdateSpec
      ? encodeTaskSpec(
          typeof updates.description === 'string'
            ? updates.description
            : current.description,
          {
            priority: updates.priority ?? current.priority,
            tags: updates.tags ?? current.tags,
            due_date: updates.due_date ?? current.due_date,
          },
        )
      : undefined,
    assignedWorker:
      updates.assignee === null || typeof updates.assignee === 'string'
        ? updates.assignee
        : undefined,
    status: updates.column ? mapTaskColumnToKanbanStatus(updates.column) : undefined,
  })
  return card ? mapCardToTask(card) : null
}

export async function moveClaudeTask(taskId: string, column: TaskColumn): Promise<ClaudeTaskRecord | null> {
  return updateClaudeTask(taskId, { column })
}

export async function deleteClaudeTask(taskId: string): Promise<boolean> {
  return deleteKanbanCard(taskId)
}
