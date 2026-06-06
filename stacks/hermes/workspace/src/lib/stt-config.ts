export const STT_PROVIDER_OPTIONS = [
  { value: 'local', label: 'Локально (Whisper)' },
  { value: 'openai', label: 'OpenAI Whisper API' },
  { value: 'groq', label: 'Groq Whisper API' },
] as const

export const LOCAL_STT_MODEL_SIZE_OPTIONS = [
  { value: 'tiny', label: 'Очень маленькая' },
  { value: 'base', label: 'Базовая' },
  { value: 'small', label: 'Малая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'large', label: 'Большая' },
] as const

export const GROQ_STT_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3',
  'distil-whisper-large-v3-en',
] as const
