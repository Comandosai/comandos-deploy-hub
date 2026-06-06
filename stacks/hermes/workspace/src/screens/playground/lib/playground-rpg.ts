import type { AvatarConfig } from './avatar-config'

/**
 * Hermes Playground RPG data model.
 *
 * Training Grounds is the new first-run loop for the Nous Research x Kimi
 * creative hackathon build. Legacy worlds and items remain additive.
 */

export type PlaygroundWorldId = 'training' | 'agora' | 'forge' | 'grove' | 'oracle' | 'arena'

export type PlaygroundSkillId =
  | 'promptcraft'
  | 'worldsmithing'
  | 'summoning'
  | 'engineering'
  | 'oracle'
  | 'diplomacy'

export type EquipmentSlot = 'weapon' | 'cloak' | 'head' | 'artifact'

export type PlaygroundItemId =
  | 'hermes-sigil'
  | 'training-blade'
  | 'novice-cloak'
  | 'initiate-circlet'
  | 'archive-lens'
  | 'wisp-core'
  | 'hermes-token'
  | 'athena-scroll'
  | 'forge-shard'
  | 'portal-key'
  | 'oracle-crystal'
  | 'kimi-sigil'
  | 'grove-leaf'
  | 'arena-medal'
  | 'song-fragment'
  | 'oracle-riddle'

export type QuestObjectiveType =
  | 'talk_to_npc'
  | 'collect_item'
  | 'visit_zone'
  | 'open_inventory'
  | 'equip_item'
  | 'send_chat'
  | 'inspect_docs'
  | 'build_prompt'
  | 'defeat_enemy'
  | 'enter_world'
  | 'gather_song'
  | 'duel_npc'
  | 'meet_player'
  | 'exchange_chat'
  | 'summon_familiar'

export type QuestObjective = {
  id: string
  type: QuestObjectiveType
  label: string
  target?: string
  hint?: string
}

export type QuestReward = {
  xp: number
  items?: PlaygroundItemId[]
  skillXp?: Partial<Record<PlaygroundSkillId, number>>
  unlockWorlds?: PlaygroundWorldId[]
  title?: string
}

export type PlaygroundQuest = {
  id: string
  chapter: string
  title: string
  description: string
  /** What this quest teaches about Hermes Agent / product-building. */
  lesson?: string
  /** Why the player should care, shown in the journal as practical payoff. */
  payoff?: string
  objectives: QuestObjective[]
  reward: QuestReward
  optional?: boolean
}

export type PlaygroundWorld = {
  id: PlaygroundWorldId
  name: string
  tagline: string
  description: string
  accent: string
  lockedByDefault?: boolean
  requiredItem?: PlaygroundItemId
}

export type PlaygroundSkill = {
  id: PlaygroundSkillId
  name: string
  icon: string
  description: string
}

export type PlaygroundItem = {
  id: PlaygroundItemId
  name: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  description: string
  slot?: EquipmentSlot
  accent?: string
  stat?: { label: string; value: number }
}

export type EquippedItems = Record<EquipmentSlot, PlaygroundItemId | null>

export type QuestProgressEntry = {
  completedObjectives: string[]
  completed: boolean
}

export type PlayerProfile = {
  displayName: string
  avatarConfig: AvatarConfig
  equipped: EquippedItems
  inventory: PlaygroundItemId[]
  questProgress: Record<string, QuestProgressEntry>
  level: number
  xp: number
  titlesUnlocked: string[]
  lastZone: PlaygroundWorldId
}

export const PLAYGROUND_WORLDS: PlaygroundWorld[] = [
  {
    id: 'training',
    name: 'Тренировочная площадка',
    tagline: 'Стартовая зона',
    description: 'Круг прибытия, наставники, архивы и закрытые ворота Кузницы для первого прохода.',
    accent: '#5eead4',
  },
  {
    id: 'agora',
    name: 'Площадь Агоры',
    tagline: 'Общая площадь',
    description: 'Общая площадь, где встречаются люди и агенты.',
    accent: '#d9b35f',
  },
  {
    id: 'forge',
    name: 'Кузница',
    tagline: 'Мир сборки',
    description: 'Неоновый мир, где запросы превращаются в рабочие инструменты.',
    accent: '#22d3ee',
    lockedByDefault: true,
    requiredItem: 'portal-key',
  },
  {
    id: 'grove',
    name: 'Роща',
    tagline: 'Социальный мир',
    description: 'Живой лес для музыки, общения и творческих ритуалов.',
    accent: '#34d399',
    lockedByDefault: true,
    requiredItem: 'forge-shard',
  },
  {
    id: 'oracle',
    name: 'Храм Оракула',
    tagline: 'Мир поиска',
    description: 'Тихий архив, где агенты отвечают по знаниям, памяти и поиску.',
    accent: '#a78bfa',
    lockedByDefault: true,
    requiredItem: 'oracle-crystal',
  },
  {
    id: 'arena',
    name: 'Арена моделей',
    tagline: 'Мир испытаний',
    description: 'Модели соревнуются через проверки, запросы и агентские дуэли.',
    accent: '#fb7185',
    lockedByDefault: true,
    requiredItem: 'kimi-sigil',
  },
]

export const PLAYGROUND_SKILLS: PlaygroundSkill[] = [
  {
    id: 'promptcraft',
    name: 'Промпты',
    icon: '📜',
    description: 'Настраивайте поведение агента через ясные инструкции и повторяемые правила.',
  },
  {
    id: 'worldsmithing',
    name: 'Создание миров',
    icon: '🏗️',
    description: 'Собирайте игровые миры из истории, визуала, музыки и кода.',
  },
  {
    id: 'summoning',
    name: 'Призыв агентов',
    icon: '🧬',
    description: 'Подключайте специальных ИИ-агентов как помощников и персонажей.',
  },
  {
    id: 'engineering',
    name: 'Инженерия',
    icon: '⚙️',
    description: 'Превращайте задания в инструменты, правки кода, связи и автоматизации.',
  },
  {
    id: 'oracle',
    name: 'Оракул',
    icon: '🔮',
    description: 'Ищите, запоминайте и раскрывайте скрытый контекст из базы знаний.',
  },
  {
    id: 'diplomacy',
    name: 'Дипломатия',
    icon: '🤝',
    description: 'Согласовывайте работу людей, команд и агентов в общих задачах.',
  },
]

export const PLAYGROUND_ITEMS: PlaygroundItem[] = [
  {
    id: 'hermes-sigil',
    name: 'Сигил Hermes',
    icon: '🜂',
    rarity: 'rare',
    description: 'Стартовый знак участника, который входит на тренировочную площадку.',
    slot: 'artifact',
    accent: '#5eead4',
    stat: { label: 'Фокус промпта', value: 4 },
  },
  {
    id: 'training-blade',
    name: 'Учебный клинок',
    icon: '🗡️',
    rarity: 'common',
    description: 'Лёгкий учебный клинок для первых боевых упражнений.',
    slot: 'weapon',
    accent: '#fb7185',
    stat: { label: 'Сила', value: 3 },
  },
  {
    id: 'novice-cloak',
    name: 'Плащ новичка',
    icon: '🧥',
    rarity: 'common',
    description: 'Бирюзовый полевой плащ для начинающих сборщиков миров.',
    slot: 'cloak',
    accent: '#22d3ee',
    stat: { label: 'Защита', value: 2 },
  },
  {
    id: 'initiate-circlet',
    name: 'Обруч посвящённого',
    icon: '👑',
    rarity: 'rare',
    description: 'Тонкий золотой обруч для тех, кто прошёл первый круг обучения.',
    slot: 'head',
    accent: '#facc15',
    stat: { label: 'Команда', value: 2 },
  },
  {
    id: 'archive-lens',
    name: 'Линза архива',
    icon: '🔎',
    rarity: 'rare',
    description: 'Помогает видеть память, документы и скрытые связи между инструментами.',
    slot: 'artifact',
    accent: '#a78bfa',
    stat: { label: 'Память', value: 5 },
  },
  {
    id: 'wisp-core',
    name: 'Ядро искры',
    icon: '🫧',
    rarity: 'rare',
    description: 'Малое ядро, оставшееся после сбоя-искорки.',
    slot: 'artifact',
    accent: '#f472b6',
    stat: { label: 'Импульс', value: 4 },
  },
  {
    id: 'hermes-token',
    name: 'Токен Hermes',
    icon: '🪽',
    rarity: 'common',
    description: 'Знак входа в HermesWorld. Тёплый на ощупь и неожиданно полезный.',
  },
  {
    id: 'athena-scroll',
    name: 'Свиток Афины',
    icon: '📜',
    rarity: 'rare',
    description: 'Открывает диалог с агентом-наставником и первый ритуал создания мира.',
  },
  {
    id: 'portal-key',
    name: 'Ключ портала',
    icon: '🗝️',
    rarity: 'rare',
    description: 'Открывает первый созданный мир: Кузницу.',
  },
  {
    id: 'forge-shard',
    name: 'Осколок кузницы',
    icon: '💠',
    rarity: 'epic',
    description: 'Осколок состояния созданного мира. Нужен для открытия следующих зон.',
  },
  {
    id: 'oracle-crystal',
    name: 'Кристалл оракула',
    icon: '🔮',
    rarity: 'epic',
    description: 'Хранит знания, контекст и память из завершённых заданий.',
  },
  {
    id: 'kimi-sigil',
    name: 'Сигил Kimi',
    icon: '🌙',
    rarity: 'legendary',
    description: 'Реликт хакатона. Открывает Арену моделей.',
  },
  {
    id: 'grove-leaf',
    name: 'Лист рощи',
    icon: '🍃',
    rarity: 'rare',
    description: 'Светящийся лист из биолюминесцентного леса. Поёт при касании.',
  },
  {
    id: 'song-fragment',
    name: 'Фрагмент песни',
    icon: '🎶',
    rarity: 'epic',
    description: 'Часть генеративной агентской симфонии. Фрагменты открывают ритуал Рощи.',
  },
  {
    id: 'oracle-riddle',
    name: 'Загадка оракула',
    icon: '🤔',
    rarity: 'epic',
    description: 'Запечатанный свиток с нерешённым вопросом.',
  },
  {
    id: 'arena-medal',
    name: 'Медаль арены',
    icon: '🏅',
    rarity: 'legendary',
    description: 'Награда за победу в дуэли моделей на Арене.',
  },
]

export const PLAYGROUND_QUESTS: PlaygroundQuest[] = [
  {
    id: 'training-q1',
    chapter: 'Обучение на тренировочной площадке',
    title: 'Подойти и заговорить',
    description: 'Подойдите к Афине у круга прибытия и получите сигил Hermes.',
    lesson: 'Hermes Agent связывает вашу работу: модели, инструменты, файлы, память и каналы находятся в одном месте.',
    payoff: 'Вы проходите базовый цикл: подойти к агенту, выбрать ответ и получить полезный результат.',
    objectives: [
      {
        id: 'speak-athena',
        type: 'talk_to_npc',
        label: 'Подойдите к Афине и поговорите с ней',
        target: 'athena',
        hint: 'Афина ждёт у круга прибытия.',
      },
      {
        id: 'claim-sigil',
        type: 'collect_item',
        label: 'Получите сигил Hermes',
        target: 'hermes-sigil',
      },
    ],
    reward: {
      xp: 40,
      items: ['hermes-sigil', 'training-blade', 'novice-cloak'],
      skillXp: { promptcraft: 20, summoning: 10 },
    },
  },
  {
    id: 'training-q2',
    chapter: 'Обучение на тренировочной площадке',
    title: 'Открыть снаряжение',
    description: 'Откройте инвентарь и наденьте учебный клинок и плащ.',
    lesson: 'В Hermes возможности собираются модулями: навыки, инструменты, профили и контекстные файлы работают как снаряжение под разные задачи.',
    payoff: 'Вы учитесь проверять, включать и сочетать возможности перед реальной работой.',
    objectives: [
      {
        id: 'open-kit',
        type: 'open_inventory',
        label: 'Откройте панель снаряжения',
        hint: 'Используйте вкладку инвентаря справа.',
      },
      {
        id: 'equip-blade',
        type: 'equip_item',
        label: 'Наденьте учебный клинок',
        target: 'training-blade',
      },
      {
        id: 'equip-cloak',
        type: 'equip_item',
        label: 'Наденьте плащ новичка',
        target: 'novice-cloak',
      },
    ],
    reward: {
      xp: 60,
      skillXp: { engineering: 20, worldsmithing: 20 },
    },
  },
  {
    id: 'training-q3',
    chapter: 'Обучение на тренировочной площадке',
    title: 'Освоить чат и общение',
    description: 'Отправьте одно локальное сообщение строителям рядом.',
    lesson: 'Hermes работает не только в одном окне приложения, а в чатах и рабочих сценариях людей.',
    payoff: 'Вы видите, как общий контекст превращает одиночную работу агента в совместную сборку продукта.',
    objectives: [
      {
        id: 'send-local-chat',
        type: 'send_chat',
        label: 'Отправьте одно сообщение в локальный чат',
        hint: 'Нажмите T или используйте верхнюю панель чата.',
      },
    ],
    reward: {
      xp: 75,
      skillXp: { diplomacy: 35 },
    },
  },
  {
    id: 'training-q4',
    chapter: 'Обучение на тренировочной площадке',
    title: 'Освоить память и документы',
    description: 'Посетите архивный подиум и откройте подсказки по документам и памяти.',
    lesson: 'Память, документы и контекст помогают Hermes помнить цели, решения, состояние проекта, предпочтения и передачу задач.',
    payoff: 'Вы понимаете, почему постоянный контекст лучше, чем повторять одно и то же в каждой сессии.',
    objectives: [
      {
        id: 'visit-archive',
        type: 'visit_zone',
        label: 'Посетите архивный подиум',
        target: 'archive-podium',
        hint: 'Идите к фиолетовым огням возле подиума.',
      },
      {
        id: 'inspect-memory',
        type: 'inspect_docs',
        label: 'Откройте справку по документам и памяти',
      },
    ],
    reward: {
      xp: 90,
      items: ['archive-lens'],
      skillXp: { oracle: 45, promptcraft: 15 },
    },
  },
  {
    id: 'training-q5',
    chapter: 'Обучение на тренировочной площадке',
    title: 'Собрать с Hermes',
    description: 'Дойдите до ворот Кузницы и попросите Афину собрать что-нибудь вместе с вами.',
    lesson: 'Кузница показывает главный цикл Hermes: описать результат, подключить агентов и инструменты, проверить ход работы и превратить запрос в продукт.',
    payoff: 'Вы переходите от знакомства с интерфейсом к использованию Hermes как системы сборки.',
    objectives: [
      {
        id: 'visit-forge-gate',
        type: 'visit_zone',
        label: 'Дойдите до ворот Кузницы',
        target: 'forge-gate',
        hint: 'Ворота закрыты, пока вы не завершите этот ритуал.',
      },
      {
        id: 'build-something',
        type: 'build_prompt',
        label: 'Попросите Афину или проводника Кузницы что-нибудь собрать',
        target: 'build-demo',
      },
    ],
    reward: {
      xp: 140,
      items: ['initiate-circlet', 'portal-key'],
      unlockWorlds: ['forge'],
      title: 'Начинающий сборщик',
      skillXp: { worldsmithing: 55, engineering: 45 },
    },
  },
  {
    id: 'agora-diplomacy',
    chapter: 'Бонус Агоры — Дипломатия',
    title: 'Пакт Агоры',
    description: 'Найдите другого живого строителя на площади Агоры. Встаньте рядом и обменяйтесь сообщениями.',
    lesson: 'Дипломатия Hermes: агенты сильнее, когда умеют согласовывать действия с другими.',
    payoff: 'Совместная работа — реальный навык Hermes, а не украшение интерфейса.',
    optional: true,
    objectives: [
      { id: 'meet-builder', type: 'meet_player', label: 'Встаньте рядом с другим строителем в Агоре' },
      { id: 'exchange-chat', type: 'exchange_chat', label: 'Отправьте сообщение, пока рядом есть другой игрок' },
    ],
    reward: {
      xp: 80,
      skillXp: { diplomacy: 80 },
      title: 'Дипломат мира',
    },
  },
  {
    id: 'forge-summon',
    chapter: 'Бонус Кузницы — Призыв',
    title: 'Призвать спутника Кузницы',
    description: 'Призовите временного спутника Hermes в Кузнице. Он будет идти рядом одну минуту.',
    lesson: 'Призыв Hermes: подключайте подагентов по требованию, не раздувая основной контекст.',
    payoff: 'Вы осваиваете базу агентной композиции: вызвать помощника, получить пользу и аккуратно завершить.',
    optional: true,
    objectives: [
      { id: 'enter-forge-bonus', type: 'enter_world', label: 'Войдите в Кузницу', target: 'forge' },
      { id: 'summon-familiar', type: 'summon_familiar', label: 'Нажмите 4 на панели действий, чтобы призвать спутника' },
    ],
    reward: {
      xp: 80,
      skillXp: { summoning: 80 },
      title: 'Призыватель Кузницы',
    },
  },
  {
    id: 'training-bonus-wisp',
    chapter: 'Бонус тренировочной площадки',
    title: 'Убрать сбой-искорку',
    description: 'Победите нестабильную искорку, которая мешает на тренировочном круге.',
    lesson: 'В реальных проектах бывают сбои: плохие запросы, сломанные инструменты, потерянный контекст, ошибки входа и шумная обратная связь.',
    payoff: 'Вы тренируете рабочую привычку Hermes: найти проблему, выбрать нужный инструмент и убрать препятствие.',
    optional: true,
    objectives: [
      {
        id: 'defeat-wisp',
        type: 'defeat_enemy',
        label: 'Победите сбой-искорку',
        target: 'glitch-wisp',
      },
      {
        id: 'collect-core',
        type: 'collect_item',
        label: 'Заберите ядро искры',
        target: 'wisp-core',
      },
    ],
    reward: {
      xp: 55,
      items: ['wisp-core'],
      skillXp: { engineering: 20 },
    },
  },
  {
    id: 'grove-ritual',
    chapter: 'Глава II — Ритуал Рощи',
    title: 'Ритуал Рощи',
    description: 'Войдите в Рощу и найдите фрагмент песни в биолюминесцентном лесу.',
    objectives: [
      { id: 'enter-grove', type: 'enter_world', label: 'Войдите в Рощу', target: 'grove' },
      { id: 'song', type: 'gather_song', label: 'Найдите фрагмент песни', target: 'song-fragment' },
    ],
    reward: {
      xp: 160,
      items: ['grove-leaf', 'song-fragment'],
      skillXp: { diplomacy: 80, oracle: 40 },
      unlockWorlds: ['oracle'],
    },
  },
  {
    id: 'oracle-riddle',
    chapter: 'Глава III — Загадка оракула',
    title: 'Загадка оракула',
    description: 'Посетите храм Оракула и примите загадку от Афины.',
    objectives: [
      { id: 'enter-oracle', type: 'enter_world', label: 'Войдите в храм Оракула', target: 'oracle' },
      { id: 'riddle', type: 'collect_item', label: 'Получите загадку оракула', target: 'oracle-riddle' },
    ],
    reward: {
      xp: 200,
      items: ['oracle-riddle', 'oracle-crystal'],
      skillXp: { oracle: 120, promptcraft: 60 },
      unlockWorlds: ['arena'],
    },
  },
  {
    id: 'arena-duel',
    chapter: 'Глава IV — Арена моделей',
    title: 'Дуэль моделей',
    description: 'Войдите на Арену моделей. Выдержите дуэль и получите сигил Kimi.',
    objectives: [
      { id: 'enter-arena', type: 'enter_world', label: 'Войдите на Арену моделей', target: 'arena' },
      { id: 'survive', type: 'duel_npc', label: 'Выдержите дуэль моделей' },
      { id: 'kimi', type: 'collect_item', label: 'Получите сигил Kimi', target: 'kimi-sigil' },
    ],
    reward: {
      xp: 320,
      items: ['arena-medal', 'kimi-sigil'],
      skillXp: { engineering: 80, summoning: 80, oracle: 40 },
    },
  },
]

export function itemById(id: PlaygroundItemId) {
  return PLAYGROUND_ITEMS.find((item) => item.id === id)
}

export function worldById(id: PlaygroundWorldId) {
  return PLAYGROUND_WORLDS.find((world) => world.id === id)
}

export function questById(id: string) {
  return PLAYGROUND_QUESTS.find((quest) => quest.id === id)
}

export function isItemEquippable(itemId: PlaygroundItemId) {
  return Boolean(itemById(itemId)?.slot)
}
