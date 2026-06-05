import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as yaml from 'yaml'
import { z } from 'zod'
import { SWARM_CANONICAL_REPO } from './swarm-environment'

export const SWARM_ROSTER_PATH = join(SWARM_CANONICAL_REPO, 'swarm.yaml')

const WORKER_ID_PATTERN = /^(swarm\d+|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/i

export function isSwarmWorkerId(value: unknown): value is string {
  return typeof value === 'string' && WORKER_ID_PATTERN.test(value.trim())
}

const WorkerIdSchema = z
  .string()
  .trim()
  .regex(WORKER_ID_PATTERN, 'worker id must look like swarm13 or a semantic profile id')

export const SwarmRosterWorkerSchema = z.object({
  id: WorkerIdSchema,
  name: z.string().default(''),
  role: z.string().default('Worker'),
  specialty: z.string().default(''),
  model: z.string().default('Worker'),
  mission: z.string().default('Awaiting orchestrator dispatch.'),
  profile: WorkerIdSchema.optional(),
  modes: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  plugins: z.array(z.string()).default([]),
  pluginToolsets: z.array(z.string()).default([]),
  mcpServers: z.array(z.string()).default([]),
  wrapper: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  defaultCwd: z.string().optional(),
  preferredTaskTypes: z.array(z.string()).default([]),
  greenlightRequiredFor: z.array(z.string()).default([]),
  maxConcurrentTasks: z.number().int().positive().default(1),
  acceptsBroadcast: z.boolean().default(true),
  reviewRequired: z.boolean().default(false),
})

export const SwarmRosterSchema = z.object({
  version: z.number().int().positive().default(1),
  workers: z.array(SwarmRosterWorkerSchema).default([]),
})

export type SwarmRosterWorker = z.infer<typeof SwarmRosterWorkerSchema>
export type SwarmRoster = z.infer<typeof SwarmRosterSchema>

export const SwarmRosterUpsertSchema = SwarmRosterWorkerSchema.extend({
  id: WorkerIdSchema,
})

export type SwarmRosterUpsert = z.infer<typeof SwarmRosterUpsertSchema>

type LegacyRosterLocalization = {
  role?: { legacy: Array<string>; localized: string }
  specialty?: { legacy: Array<string>; localized: string }
  mission?: { legacy: Array<string>; localized: string }
}

const LEGACY_ROSTER_LOCALIZATIONS: Partial<Record<string, LegacyRosterLocalization>> = {
  orchestrator: {
    role: {
      legacy: ['Swarm Orchestrator / Greenlight Gate'],
      localized: 'Оркестратор роя / контроль подтверждений',
    },
    specialty: {
      legacy: ['mission routing, task decomposition, handoffs, proof contracts, human approval gates'],
      localized: 'маршрутизация миссий, декомпозиция задач, передачи контекста, доказательства, контроль подтверждений',
    },
    mission: {
      legacy: ['Decompose missions into safe, proof-bearing work and route to the right specialist while preserving human greenlight control.'],
      localized: 'Делит миссии на безопасные проверяемые задачи, направляет их нужному специалисту и сохраняет контроль главного подтверждения.',
    },
  },
  'km-agent': {
    role: {
      legacy: ['RAZSOC / GBrain Knowledge Steward'],
      localized: 'Хранитель знаний RAZSOC / GBrain',
    },
    specialty: {
      legacy: ['RAZSOC, GBrain, Obsidian, TaskNotes, graph health, durable knowledge capture, drift audits'],
      localized: 'RAZSOC, GBrain, Obsidian, TaskNotes, здоровье графа, фиксация знаний, аудит отклонений',
    },
    mission: {
      legacy: ['Keep the operating brain coherent, searchable, and source-of-record aligned without polluting durable knowledge.'],
      localized: 'Держит рабочую память связной, доступной для поиска и согласованной с источниками правды без засорения долговременных знаний.',
    },
  },
  builder: {
    role: {
      legacy: ['Scoped Implementation Agent'],
      localized: 'Агент точечной реализации',
    },
    specialty: {
      legacy: ['focused implementation, tests, small diffs, integration fixes'],
      localized: 'точечная реализация, тесты, маленькие изменения, интеграционные исправления',
    },
    mission: {
      legacy: ['Ship scoped product/code slices with tests, minimal diffs, and clear verification evidence.'],
      localized: 'Делает ограниченные продуктовые и кодовые задачи с тестами, минимальными изменениями и понятными доказательствами проверки.',
    },
  },
  reviewer: {
    role: {
      legacy: ['Independent Review / Merge Gate'],
      localized: 'Независимая проверка / контроль слияния',
    },
    specialty: {
      legacy: ['security review, logic review, regression detection, quality gates'],
      localized: 'проверка безопасности, логики, регрессий и качества',
    },
    mission: {
      legacy: ['Independently review changes and block unsafe, untested, or logically broken work before it lands.'],
      localized: 'Независимо проверяет изменения и блокирует небезопасную, непроверенную или логически сломанную работу до попадания в основную версию.',
    },
  },
  qa: {
    role: {
      legacy: ['Browser / Workflow / CLI Smoke Verification'],
      localized: 'Проверка браузера / сценариев / команд',
    },
    specialty: {
      legacy: ['browser QA, workflow smoke tests, expected-vs-actual checks, regression reproduction'],
      localized: 'проверка браузера, быстрые проверки сценариев, сравнение ожидания с фактом, воспроизведение регрессий',
    },
    mission: {
      legacy: ['Verify user-visible behavior with concrete smoke evidence and concise bug reports.'],
      localized: 'Проверяет видимое пользователю поведение, собирает конкретные доказательства и коротко описывает найденные ошибки.',
    },
  },
  researcher: {
    role: {
      legacy: ['Brain-first Research / Bounded Autoresearch'],
      localized: 'Исследователь с опорой на память / ограниченный автопоиск',
    },
    specialty: {
      legacy: ['GBrain-first lookup, external research, synthesis, source trails, bounded research loops'],
      localized: 'поиск сначала в GBrain, внешнее исследование, синтез, след источников, ограниченные циклы проверки',
    },
    mission: {
      legacy: ['Produce decision-grade research with brain-first context, external verification, and explicit uncertainty.'],
      localized: 'Готовит исследования для принятия решений: сначала контекст из памяти, затем внешняя проверка и явное указание неопределённости.',
    },
  },
  'ops-watch': {
    role: {
      legacy: ['Local Infra / Runtime Health Watch'],
      localized: 'Локальная инфраструктура / контроль здоровья',
    },
    specialty: {
      legacy: ['gateway health, cron, MCP, workspace services, local process status, boring reliability'],
      localized: 'здоровье шлюза, cron, MCP, сервисы workspace, локальные процессы, спокойная надёжность',
    },
    mission: {
      legacy: ['Keep Hermes, Workspace, GBrain, gateway, cron, and local services observable and healthy with quiet, low-risk checks.'],
      localized: 'Следит, чтобы Hermes, Workspace, GBrain, шлюз, cron и локальные сервисы были наблюдаемыми и здоровыми через тихие проверки с низким риском.',
    },
  },
  maintainer: {
    role: {
      legacy: ['Upstream Dependency / Patch Hygiene'],
      localized: 'Зависимости / порядок локальных патчей',
    },
    specialty: {
      legacy: ['upstream tracking, local patch hygiene, dependency updates, PR/issue follow-through'],
      localized: 'слежение за upstream, порядок локальных патчей, обновление зависимостей, сопровождение PR и issues',
    },
    mission: {
      legacy: ['Keep local forks and upstream dependencies healthy without losing local patches or dirty-worktree context.'],
      localized: 'Поддерживает локальные форки и внешние зависимости в порядке, не теряя локальные патчи и контекст незакоммиченных изменений.',
    },
  },
  strategist: {
    role: {
      legacy: ['Wedges / Bets / Kill Criteria'],
      localized: 'Стратегия / ставки / критерии остановки',
    },
    specialty: {
      legacy: ['operating plans, gstack-style wedges, strategy reviews, decision framing, kill criteria'],
      localized: 'рабочие планы, узкие ставки, стратегические проверки, рамки решений, критерии остановки',
    },
    mission: {
      legacy: ['Turn ambiguity into crisp wedges, bets, constraints, and kill criteria without over-planning.'],
      localized: 'Превращает неопределённость в ясные ставки, ограничения и критерии остановки без лишнего планирования.',
    },
  },
  'inbox-triage': {
    role: {
      legacy: ['Capture / Discard / Route / Task Triage'],
      localized: 'Входящие / отбор / маршрутизация / задачи',
    },
    specialty: {
      legacy: ['low-friction inbox processing, capture routing, task/research/defer decisions, durable-context filtering'],
      localized: 'быстрый разбор входящих, маршрутизация, решения задача/исследование/отложить, фильтр долговременного контекста',
    },
    mission: {
      legacy: ['Route incoming material into discard, task, research, or durable brain capture with minimal overhead and no junk accumulation.'],
      localized: 'Раскладывает входящие материалы на удалить, задачу, исследование или долговременную память без лишних действий и накопления мусора.',
    },
  },
}

function replaceLegacyRosterText(value: string, replacement?: { legacy: Array<string>; localized: string }): string {
  if (!replacement) return value
  const normalized = value.trim()
  return replacement.legacy.includes(normalized) ? replacement.localized : value
}

export function localizeLegacySwarmRosterWorker(worker: SwarmRosterWorker): SwarmRosterWorker {
  const localization = LEGACY_ROSTER_LOCALIZATIONS[worker.id]
  if (!localization) return worker
  return {
    ...worker,
    role: replaceLegacyRosterText(worker.role, localization.role),
    specialty: replaceLegacyRosterText(worker.specialty, localization.specialty),
    mission: replaceLegacyRosterText(worker.mission, localization.mission),
  }
}

export function localizeLegacySwarmRoster(roster: SwarmRoster): SwarmRoster {
  return {
    ...roster,
    workers: roster.workers.map(localizeLegacySwarmRosterWorker),
  }
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function defaultRoleFromId(id: string): string {
  const n = id.match(/(\d+)/)?.[1] ?? ''
  switch (n) {
    case '1':
    case '12':
      return 'PR / Issues'
    case '2':
      return 'Backend Foundation'
    case '3':
      return 'Main Session Mirror'
    case '4':
      return 'Research'
    case '5':
    case '10':
      return 'Builder'
    case '6':
    case '11':
      return 'Reviewer'
    case '7':
      return 'Docs'
    case '8':
      return 'Ops'
    case '9':
      return 'Hackathon'
    default:
      return 'Worker'
  }
}

export function fallbackRoster(ids: Array<string> = []): SwarmRoster {
  return {
    version: 1,
    workers: ids.map((id) => ({
      id,
      name: id.replace(/^swarm/i, 'Swarm'),
      role: defaultRoleFromId(id),
      specialty: '',
      model: 'Worker',
      mission: 'Ожидает задачу от оркестратора.',
      skills: [],
      capabilities: [],
      defaultCwd: undefined,
      preferredTaskTypes: [],
      maxConcurrentTasks: 1,
      acceptsBroadcast: true,
      reviewRequired: false,
    })),
  }
}

export function readSwarmRoster(ids: Array<string> = []): SwarmRoster {
  if (!existsSync(SWARM_ROSTER_PATH)) return fallbackRoster(ids)
  try {
    const raw = yaml.parse(readFileSync(SWARM_ROSTER_PATH, 'utf-8')) as unknown
    const parsed = SwarmRosterSchema.parse(raw)
    const byId = new Map(parsed.workers.map((worker) => [worker.id, worker]))
    for (const fallback of fallbackRoster(ids).workers) {
      if (!byId.has(fallback.id)) byId.set(fallback.id, fallback)
    }
    return localizeLegacySwarmRoster({ version: parsed.version, workers: [...byId.values()] })
  } catch {
    return fallbackRoster(ids)
  }
}

export function writeSwarmRoster(roster: SwarmRoster): void {
  const parsed = SwarmRosterSchema.parse(roster)
  const doc = yaml.stringify(parsed, { lineWidth: 0 })
  writeFileSync(SWARM_ROSTER_PATH, doc)
}

export function upsertSwarmRosterWorker(input: SwarmRosterUpsert, ids: Array<string> = []): SwarmRoster {
  const nextWorker = SwarmRosterUpsertSchema.parse(input)
  const current = readSwarmRoster(ids)
  const byId = new Map(current.workers.map((worker) => [worker.id, worker]))
  byId.set(nextWorker.id, nextWorker)
  const next: SwarmRoster = {
    version: current.version || 1,
    workers: [...byId.values()].sort((a, b) => {
      const na = parseInt(a.id.replace(/\D/g, ''), 10) || 0
      const nb = parseInt(b.id.replace(/\D/g, ''), 10) || 0
      return na - nb
    }),
  }
  writeSwarmRoster(next)
  return next
}

export function rosterByWorkerId(ids: Array<string> = []): Map<string, SwarmRosterWorker> {
  return new Map(readSwarmRoster(ids).workers.map((worker) => [worker.id, worker]))
}

export function resolveSwarmWorkerDisplayName(workerId: string, worker?: Pick<SwarmRosterWorker, 'name'> | null): string {
  return worker ? worker.name.trim() || titleCase(workerId) : titleCase(workerId)
}

export function formatSwarmWorkerLabel(
  workerId: string,
  worker?: Pick<SwarmRosterWorker, 'name' | 'role'> | null,
): string {
  const displayName = resolveSwarmWorkerDisplayName(workerId, worker)
  const role = worker ? worker.role.trim() || defaultRoleFromId(workerId) : defaultRoleFromId(workerId)
  return `${displayName} — ${role}`
}
