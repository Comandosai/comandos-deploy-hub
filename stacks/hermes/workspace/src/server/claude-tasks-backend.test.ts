import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

async function loadBackend(options?: {
  cards?: Array<Record<string, unknown>>
  updatedCard?: Record<string, unknown> | null
}) {
  const listKanbanCards = vi.fn(async () => options?.cards ?? [])
  const createKanbanCard = vi.fn(async (input) => ({
    id: 'card-created',
    title: input.title,
    spec: input.spec ?? '',
    acceptanceCriteria: [],
    assignedWorker: input.assignedWorker ?? null,
    reviewer: null,
    status: input.status ?? 'backlog',
    missionId: null,
    reportPath: null,
    createdBy: input.createdBy ?? 'user',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  }))
  const updateKanbanCard = vi.fn(async (_taskId, _updates) => options?.updatedCard ?? null)
  const deleteKanbanCard = vi.fn(async (taskId: string) => taskId === 'card-2')
  const getKanbanBackendMeta = vi.fn(() => ({
    id: 'hermes-proxy',
    label: 'Hermes Dashboard kanban',
    detected: true,
    writable: true,
  }))

  vi.doMock('./kanban-backend', () => ({
    listKanbanCards,
    createKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
    getKanbanBackendMeta,
  }))

  const mod = await import('./claude-tasks-backend')
  return { mod, listKanbanCards, createKanbanCard, updateKanbanCard, deleteKanbanCard, getKanbanBackendMeta }
}

describe('claude-tasks-backend', () => {
  it('maps shared kanban cards into /tasks records and preserves blocked cards', async () => {
    const { mod } = await loadBackend({
      cards: [
        {
          id: 'card-1',
          title: 'Blocked card',
          spec: 'Investigate runtime edge case',
          acceptanceCriteria: [],
          assignedWorker: 'swarm6',
          reviewer: null,
          status: 'blocked',
          missionId: null,
          reportPath: null,
          createdBy: 'aurora',
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_050_000,
        },
      ],
    })

    const tasks = await mod.listClaudeTasks({ includeDone: true })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      id: 'card-1',
      title: 'Blocked card',
      description: 'Investigate runtime edge case',
      column: 'blocked',
      assignee: 'swarm6',
      created_by: 'aurora',
    })
  })

  it('reads task metadata from the shared kanban spec without showing it in the description', async () => {
    const { mod } = await loadBackend({
      cards: [
        {
          id: 'card-meta',
          title: 'Preserve task fields',
          spec: [
            'Visible task description',
            '',
            '<!-- comandos-task-meta {"priority":"high","tags":["qa","buttons"],"due_date":"2026-06-06"} -->',
          ].join('\n'),
          acceptanceCriteria: [],
          assignedWorker: null,
          reviewer: null,
          status: 'review',
          missionId: null,
          reportPath: null,
          createdBy: 'user',
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_050_000,
        },
      ],
    })

    const tasks = await mod.listClaudeTasks({ includeDone: true })
    expect(tasks[0]).toMatchObject({
      id: 'card-meta',
      description: 'Visible task description',
      column: 'review',
      priority: 'high',
      tags: ['qa', 'buttons'],
      due_date: '2026-06-06',
    })
  })

  it('creates tasks in the shared kanban backend instead of tasks.json', async () => {
    const { mod, createKanbanCard } = await loadBackend()

    const task = await mod.createClaudeTask({
      title: 'Wire workspace board to shared kanban',
      description: 'Proxy through Agent API',
      column: 'todo',
      priority: 'low',
      assignee: 'swarm3',
      tags: ['qa', 'buttons'],
      due_date: '2026-06-06',
      created_by: 'user',
    })

    expect(createKanbanCard).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Wire workspace board to shared kanban',
      spec: [
        'Proxy through Agent API',
        '',
        '<!-- comandos-task-meta {"priority":"low","tags":["qa","buttons"],"due_date":"2026-06-06"} -->',
      ].join('\n'),
      assignedWorker: 'swarm3',
      status: 'ready',
      createdBy: 'user',
    }))
    expect(task).toMatchObject({
      id: 'card-created',
      column: 'todo',
      priority: 'low',
      assignee: 'swarm3',
      tags: ['qa', 'buttons'],
      due_date: '2026-06-06',
    })
  })

  it('moves running and blocked cards through kanban status updates', async () => {
    const { mod, updateKanbanCard } = await loadBackend({
      cards: [
        {
          id: 'card-2',
          title: 'Updated card',
          spec: 'Now running',
          acceptanceCriteria: [],
          assignedWorker: 'swarm5',
          reviewer: null,
          status: 'running',
          missionId: null,
          reportPath: null,
          createdBy: 'aurora',
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_050_000,
        },
      ],
      updatedCard: {
        id: 'card-2',
        title: 'Updated card',
        spec: 'Now blocked',
        acceptanceCriteria: [],
        assignedWorker: 'swarm5',
        reviewer: null,
        status: 'blocked',
        missionId: null,
        reportPath: null,
        createdBy: 'aurora',
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_090_000,
      },
    })

    const task = await mod.moveClaudeTask('card-2', 'blocked')
    expect(updateKanbanCard).toHaveBeenCalledWith('card-2', expect.objectContaining({ status: 'blocked' }))
    expect(task).toMatchObject({ id: 'card-2', column: 'blocked' })
  })

  it('updates task metadata through the shared kanban spec', async () => {
    const { mod, updateKanbanCard } = await loadBackend({
      cards: [
        {
          id: 'card-3',
          title: 'Editable card',
          spec: 'Original description',
          acceptanceCriteria: [],
          assignedWorker: null,
          reviewer: null,
          status: 'ready',
          missionId: null,
          reportPath: null,
          createdBy: 'user',
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_050_000,
        },
      ],
      updatedCard: {
        id: 'card-3',
        title: 'Editable card updated',
        spec: [
          'Updated description',
          '',
          '<!-- comandos-task-meta {"priority":"high","tags":["updated"],"due_date":"2026-06-07"} -->',
        ].join('\n'),
        acceptanceCriteria: [],
        assignedWorker: null,
        reviewer: null,
        status: 'review',
        missionId: null,
        reportPath: null,
        createdBy: 'user',
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_090_000,
      },
    })

    const task = await mod.updateClaudeTask('card-3', {
      title: 'Editable card updated',
      description: 'Updated description',
      column: 'review',
      priority: 'high',
      tags: ['updated'],
      due_date: '2026-06-07',
    })

    expect(updateKanbanCard).toHaveBeenCalledWith('card-3', expect.objectContaining({
      title: 'Editable card updated',
      spec: [
        'Updated description',
        '',
        '<!-- comandos-task-meta {"priority":"high","tags":["updated"],"due_date":"2026-06-07"} -->',
      ].join('\n'),
      status: 'review',
    }))
    expect(task).toMatchObject({
      id: 'card-3',
      description: 'Updated description',
      priority: 'high',
      tags: ['updated'],
      due_date: '2026-06-07',
    })
  })

  it('deletes tasks through the shared kanban backend', async () => {
    const { mod, deleteKanbanCard } = await loadBackend()

    await expect(mod.deleteClaudeTask('card-2')).resolves.toBe(true)
    await expect(mod.deleteClaudeTask('missing-card')).resolves.toBe(false)

    expect(deleteKanbanCard).toHaveBeenCalledWith('card-2')
    expect(deleteKanbanCard).toHaveBeenCalledWith('missing-card')
  })
})
