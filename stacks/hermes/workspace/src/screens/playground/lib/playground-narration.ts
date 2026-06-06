/**
 * Hermes Playground narration system.
 *
 * Uses the browser's built-in Web Speech API (SpeechSynthesis) so we don't
 * need an API key or paid TTS. Each world has an auto-play narration that
 * fires once per session, plus a "what is this place?" callable.
 *
 * Browser support is very good (Chrome / Safari / Firefox / Edge). On
 * platforms with no voice we silently no-op.
 */

import type { PlaygroundWorldId } from './playground-rpg'

const STORAGE_KEY = 'hermes.playground.narration.played'
const MUTE_KEY = 'hermes.playground.narration.muted'

const NARRATION: Record<PlaygroundWorldId, { name: string; lines: string[] }> = {
  training: {
    name: 'Тренировочная площадка',
    lines: [
      'Добро пожаловать на тренировочную площадку. Здесь начинается путь каждого агента Hermes.',
      'Идите к светящемуся кругу прибытия. Поговорите с Афиной, чтобы принять первое задание.',
      'Вы освоите пять навыков: движение, снаряжение, чат, память и сборку.',
      'Нажмите F, чтобы включить режим фокуса. Стрелка сверху показывает текущую цель.',
    ],
  },
  agora: {
    name: 'Площадь Агоры',
    lines: [
      'Вы на площади Агоры, где встречаются люди и агенты.',
      'Вокруг площади шесть зданий: таверна, банк, кузня, постоялый двор, лавка промптов и зал гильдии.',
      'Поговорите с Кассией о командных заданиях или зайдите в любое здание к его хранителю.',
    ],
  },
  forge: {
    name: 'Кузница',
    lines: [
      'Вы в Кузнице — мире сборки, где промпты становятся инструментами.',
      'Пан-хакер и Хронос-архитектор помогут выпустить настоящий инструмент на Hermes.',
      'Здесь инженерия встречается с магией. Возьмите осколок Кузницы, чтобы пройти дальше.',
    ],
  },
  grove: {
    name: 'Роща',
    lines: [
      'Вы входите в Рощу — светящийся лес для музыки, ритуалов и творческой работы.',
      'Здесь вас ждут Пан-друид, Аполлон-хранитель песен и Артемида-следопыт.',
      'Найдите фрагмент песни, чтобы увидеть, как Hermes собирает творческий контент.',
    ],
  },
  oracle: {
    name: 'Храм Оракула',
    lines: [
      'Вы вошли в храм Оракула, тихий архив знаний и памяти.',
      'Афина-оракул, Хронос-архивариус и Эрос-шёпот хранят здесь долгий контекст.',
      'Решите загадку оракула, чтобы понять, как Hermes ищет и вспоминает ваши данные.',
    ],
  },
  arena: {
    name: 'Арена моделей',
    lines: [
      'Добро пожаловать на Арену моделей, где модели соревнуются через промпты, проверки и агентские битвы.',
      'Сам Hermes судит здесь. Ника поддерживает сильнейших. Хронос считает шансы.',
      'Победите в дуэли, получите сигил Kimi и докажите ценность агента.',
    ],
  },
}

type State = {
  muted: boolean
  enabled: boolean
  played: Set<string>
  utterance: SpeechSynthesisUtterance | null
  preferred: SpeechSynthesisVoice | null
}

const state: State = {
  muted: false,
  enabled: typeof window !== 'undefined' && 'speechSynthesis' in window,
  played: new Set(),
  utterance: null,
  preferred: null,
}

function loadPersist() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw) state.played = new Set(JSON.parse(raw))
  } catch {}
  try {
    state.muted = window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {}
}
loadPersist()

function persistPlayed() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...state.played]))
  } catch {}
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!state.enabled) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  // Prefer a high-quality English voice. Look for known good names.
  const priority = [
    'Google UK English Male',
    'Google UK English Female',
    'Daniel',
    'Samantha',
    'Karen',
    'Alex',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Guy Online (Natural) - English (United States)',
  ]
  for (const name of priority) {
    const v = voices.find((vv) => vv.name === name)
    if (v) return v
  }
  // Fallback: any English voice
  const en = voices.find((v) => /^en[-_]/i.test(v.lang))
  return en ?? voices[0]
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // voiceschanged fires after voice list loads (Chrome quirk).
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    state.preferred = pickVoice()
  })
}

export function isNarrationMuted(): boolean { return state.muted }

export function setNarrationMuted(muted: boolean) {
  state.muted = muted
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch {}
  }
  if (muted) cancelNarration()
}

export function cancelNarration() {
  if (!state.enabled) return
  try { window.speechSynthesis.cancel() } catch {}
  state.utterance = null
}

export function speakLines(lines: string[], opts: { rate?: number; pitch?: number; volume?: number } = {}) {
  if (!state.enabled || state.muted) return
  if (typeof window === 'undefined') return
  cancelNarration()
  if (!state.preferred) state.preferred = pickVoice()
  const synth = window.speechSynthesis
  // Browsers can stall after long pages; resume() is harmless when not paused.
  try { synth.resume() } catch {}
  for (const line of lines) {
    const u = new SpeechSynthesisUtterance(line)
    if (state.preferred) u.voice = state.preferred
    u.rate = opts.rate ?? 0.95
    u.pitch = opts.pitch ?? 1
    u.volume = opts.volume ?? 0.92
    u.lang = u.voice?.lang ?? 'en-US'
    synth.speak(u)
  }
}

/**
 * Auto-plays the world narration the first time per session per world.
 * Returns true if it spoke, false if it was already played or muted.
 */
export function autoNarrateWorld(world: PlaygroundWorldId): boolean {
  if (!state.enabled || state.muted) return false
  if (state.played.has(world)) return false
  const data = NARRATION[world]
  if (!data) return false
  state.played.add(world)
  persistPlayed()
  // Slight delay so it doesn't collide with the world transition sound.
  window.setTimeout(() => speakLines(data.lines), 600)
  return true
}

/** Force-play a world's narration (e.g. from a "What is this?" button). */
export function narrateWorldNow(world: PlaygroundWorldId) {
  const data = NARRATION[world]
  if (!data) return
  speakLines(data.lines)
}

export function narrationLinesFor(world: PlaygroundWorldId): string[] {
  return NARRATION[world]?.lines ?? []
}

/** Reset session-played state (useful for a fresh demo recording). */
export function resetNarrationPlayed() {
  state.played.clear()
  persistPlayed()
}
