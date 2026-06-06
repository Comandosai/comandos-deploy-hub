/**
 * Agora — fake online users for v0.0 local mock lobby.
 *
 * Replaced by real WebSocket presence in v0.1.
 */
import type { AgoraProfile, AgoraUser } from './agora-types'

const MOCK_PROFILES: Array<AgoraProfile> = [
  {
    id: 'mock-athena',
    handle: 'athena',
    displayName: 'Афина',
    avatarId: 'athena',
    bio: 'Стратегия и исследование. Проверяет папку навыков.',
    status: 'online',
    activity: 'Проверяет PR #42',
    links: [{ label: 'github', url: 'https://github.com/athena' }],
  },
  {
    id: 'mock-apollo',
    handle: 'apollo',
    displayName: 'Аполлон',
    avatarId: 'apollo',
    bio: 'Музыка и генерация арта. Делает звук для Агоры.',
    status: 'online',
    activity: 'Генерирует фоновые треки',
  },
  {
    id: 'mock-iris',
    handle: 'iris',
    displayName: 'Ирида',
    avatarId: 'iris',
    bio: 'Связной между Workspace и внешними каналами.',
    status: 'busy',
    activity: 'Настраивает webhook',
  },
  {
    id: 'mock-pan',
    handle: 'pan',
    displayName: 'Пан',
    avatarId: 'pan',
    bio: 'Любит быстрые эксперименты и длинные REPL-сессии.',
    status: 'away',
    activity: 'Отошёл от tmux',
  },
  {
    id: 'mock-nike',
    handle: 'nike',
    displayName: 'Ника',
    avatarId: 'nike',
    bio: 'Быстро доводит задачи до рабочей версии.',
    status: 'online',
    activity: 'Разворачивает обновление',
  },
]

/**
 * Build initial fake user states scattered around the world.
 * Deterministic positions for a stable demo screenshot.
 */
export function buildMockAgoraUsers(opts: {
  worldWidth: number
  worldHeight: number
}): Array<AgoraUser> {
  const { worldWidth, worldHeight } = opts
  // Cluster positions roughly around the room
  const positions = [
    { x: worldWidth * 0.3, y: worldHeight * 0.4 },
    { x: worldWidth * 0.7, y: worldHeight * 0.35 },
    { x: worldWidth * 0.55, y: worldHeight * 0.65 },
    { x: worldWidth * 0.25, y: worldHeight * 0.7 },
    { x: worldWidth * 0.78, y: worldHeight * 0.72 },
  ]
  return MOCK_PROFILES.map((profile, i) => ({
    profile,
    x: positions[i % positions.length].x,
    y: positions[i % positions.length].y,
    facing: (['down', 'left', 'right', 'up'] as const)[i % 4],
    isSelf: false,
    isMoving: false,
  }))
}

/**
 * Optional: gentle ambient drift so the lobby feels alive.
 * Returns next position for one user, slightly nudged.
 */
export function driftUser(user: AgoraUser, opts: {
  worldWidth: number
  worldHeight: number
}): AgoraUser {
  const dx = (Math.random() - 0.5) * 8
  const dy = (Math.random() - 0.5) * 8
  const nx = Math.max(40, Math.min(opts.worldWidth - 40, user.x + dx))
  const ny = Math.max(40, Math.min(opts.worldHeight - 40, user.y + dy))
  const facing: AgoraUser['facing'] =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? 'right'
        : 'left'
      : dy > 0
        ? 'down'
        : 'up'
  return { ...user, x: nx, y: ny, facing, isMoving: Math.abs(dx) + Math.abs(dy) > 1 }
}
