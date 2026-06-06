import { describe, expect, it } from 'vitest'

import {
  GROQ_STT_MODELS,
  LOCAL_STT_MODEL_SIZE_OPTIONS,
  STT_PROVIDER_OPTIONS,
} from './stt-config'

describe('stt config', () => {
  it('includes groq as a selectable STT provider', () => {
    expect(STT_PROVIDER_OPTIONS).toContainEqual({
      value: 'groq',
      label: 'Groq Whisper API',
    })
  })

  it('uses Russian labels without changing saved STT values', () => {
    expect(STT_PROVIDER_OPTIONS[0]).toEqual({
      value: 'local',
      label: 'Локально (Whisper)',
    })
    expect(LOCAL_STT_MODEL_SIZE_OPTIONS).toEqual([
      { value: 'tiny', label: 'Очень маленькая (tiny)' },
      { value: 'base', label: 'Базовая (base)' },
      { value: 'small', label: 'Малая (small)' },
      { value: 'medium', label: 'Средняя (medium)' },
      { value: 'large', label: 'Большая (large)' },
    ])
  })

  it('lists the supported Groq Whisper models in priority order', () => {
    expect(GROQ_STT_MODELS).toEqual([
      'whisper-large-v3-turbo',
      'whisper-large-v3',
      'distil-whisper-large-v3-en',
    ])
  })
})
