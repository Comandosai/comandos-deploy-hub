/**
 * Convincing fake multiplayer for hackathon.
 *
 * Real WS multiplayer is in the spec for v0.2 but is not safe to ship in
 * the same-day window — TanStack Start would need a custom WS plugin or
 * sidecar process. Instead, render 2-4 "online" bots per world with
 * generated names + persona avatars. They wander via a lightweight
 * waypoint walker that looks like real player movement.
 */
import type { PlaygroundWorldId } from './playground-rpg'

export type BotProfile = {
  id: string
  name: string
  avatar: string
  color: string
  spawn: [number, number, number]
  lines: Array<string>
}

const COMMUNITY_NAMES = [
  'GrokKnight', 'NousPilgrim', 'KimiArtisan', 'OpusBard', 'CodexSmith',
  'ClaudeWanderer', 'GeminiLore', 'MixtralOracle', 'LlamaScribe', 'HermesFan',
  'BuilderAva', 'GroveSpirit', 'ForgeBaron', 'OracleNote', 'ArenaRook',
]

export const BOT_PROFILES: Record<PlaygroundWorldId, Array<BotProfile>> = {
  training: [
    {
      id: 'bot-training-1',
      name: COMMUNITY_NAMES[11],
      avatar: 'athena',
      color: '#5eead4',
      spawn: [-9, 0, 10],
      lines: ['первый проход по тренировочной площадке', 'сейчас надеваю клинок', 'ворота Кузницы почти открыты'],
    },
    {
      id: 'bot-training-2',
      name: COMMUNITY_NAMES[12],
      avatar: 'pan',
      color: '#34d399',
      spawn: [10, 0, -7],
      lines: ['маленькие задачи быстрее доходят до результата', 'на архивном подиуме есть цикл документации', 'искру легко добить Молнией'],
    },
  ],
  agora: [
    {
      id: 'bot-agora-1',
      name: COMMUNITY_NAMES[0],
      avatar: 'iris',
      color: '#22d3ee',
      spawn: [-7, 0, 7],
      lines: ['кто-нибудь уже пробовал новый генератор Кузницы?', 'доброе утро, создатели', 'уже третий уровень'],
    },
    {
      id: 'bot-agora-2',
      name: COMMUNITY_NAMES[1],
      avatar: 'eros',
      color: '#f472b6',
      spawn: [7, 0, 7],
      lines: ['собирать промпты здесь реально интересно', 'кто ещё сейчас в COMANDOS AI Workspace?', 'увидимся в Роще'],
    },
    {
      id: 'bot-agora-3',
      name: COMMUNITY_NAMES[2],
      avatar: 'apollo',
      color: '#f59e0b',
      spawn: [-7, 0, -7],
      lines: ['пишу тему для Агоры', 'Kimi звучит как оракул', 'скажите, если закончите вторую главу'],
    },
  ],
  forge: [
    {
      id: 'bot-forge-1',
      name: COMMUNITY_NAMES[3],
      avatar: 'pan',
      color: '#34d399',
      spawn: [-6, 0, 5],
      lines: ['выпустил новый свиток промпта', 'Кузница сегодня похожа на настоящую мастерскую', 'соберём задание вместе?'],
    },
    {
      id: 'bot-forge-2',
      name: COMMUNITY_NAMES[4],
      avatar: 'chronos',
      color: '#facc15',
      spawn: [6, 0, -5],
      lines: ['архивирую запуски за последний час', 'терминал миссий в сети', 'кто сломал медальон?'],
    },
  ],
  grove: [
    {
      id: 'bot-grove-1',
      name: COMMUNITY_NAMES[5],
      avatar: 'apollo',
      color: '#f59e0b',
      spawn: [-5, 0, 4],
      lines: ['ночью Роща звучит иначе', 'две части песни уже готовы', 'Аполлон здесь сам диктует строки'],
    },
    {
      id: 'bot-grove-2',
      name: COMMUNITY_NAMES[6],
      avatar: 'pan',
      color: '#34d399',
      spawn: [5, 0, -4],
      lines: ['деревья здесь живые', 'кто ещё собирает ресурсы?', 'ещё один лист'],
    },
  ],
  oracle: [
    {
      id: 'bot-oracle-1',
      name: COMMUNITY_NAMES[7],
      avatar: 'athena',
      color: '#a78bfa',
      spawn: [-4, 0, 4],
      lines: ['загадка рекурсивная', 'кристаллы памяти сегодня тяжёлые', 'режим мудреца'],
    },
    {
      id: 'bot-oracle-2',
      name: COMMUNITY_NAMES[8],
      avatar: 'eros',
      color: '#f472b6',
      spawn: [4, 0, -4],
      lines: ['спрашивайте мягко', 'оракул слышит промпты как стихи', 'это место выглядит сильно'],
    },
  ],
  arena: [
    {
      id: 'bot-arena-1',
      name: COMMUNITY_NAMES[9],
      avatar: 'nike',
      color: '#fb7185',
      spawn: [-5, 0, 0],
      lines: ['сегодня без поражений', 'Kimi против Claude — поехали', 'кто следующий?'],
    },
    {
      id: 'bot-arena-2',
      name: COMMUNITY_NAMES[10],
      avatar: 'hermes',
      color: '#2dd4bf',
      spawn: [5, 0, 0],
      lines: ['без судей, только испытания', 'вызывайте на дуэль', 'битва моделей набирает жар'],
    },
  ],
}

export function botsFor(worldId: PlaygroundWorldId): Array<BotProfile> {
  return BOT_PROFILES[worldId]
}
