export function normalizeVoiceError(
  error: unknown,
  fallback = 'Не удалось обработать голос. Попробуйте ещё раз.',
): string {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`.trim()
      : typeof error === 'string'
        ? error
        : ''
  const message = raw.trim()
  const lower = message.toLowerCase()

  if (!message) return fallback

  if (
    lower.includes('notallowederror') ||
    lower.includes('permission denied') ||
    lower.includes('permission dismissed') ||
    lower.includes('denied') ||
    lower.includes('not-allowed')
  ) {
    return 'Браузер не дал доступ к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.'
  }

  if (
    lower.includes('notfounderror') ||
    lower.includes('device not found') ||
    lower.includes('requested device not found')
  ) {
    return 'Микрофон не найден. Подключите микрофон и попробуйте снова.'
  }

  if (
    lower.includes('notreadableerror') ||
    lower.includes('could not start audio source') ||
    lower.includes('device in use')
  ) {
    return 'Микрофон занят другой программой или сейчас недоступен. Закройте другие записи и повторите.'
  }

  if (
    lower.includes('securityerror') ||
    lower.includes('secure origin') ||
    lower.includes('secure origins')
  ) {
    return 'Голосовой ввод работает только по HTTPS или на локальном адресе. Откройте панель через защищённую ссылку.'
  }

  if (
    lower.includes('audio recording not supported') ||
    lower.includes('mediarecorder') ||
    lower.includes('recording not supported')
  ) {
    return 'Этот браузер не поддерживает запись голоса. Откройте панель в Chrome или Comet по HTTPS.'
  }

  if (
    lower.includes('speech recognition not supported') ||
    lower.includes('not supported in this browser')
  ) {
    return 'Диктовка в этом браузере недоступна. Используйте Chrome/Comet или включите удалённое распознавание голоса.'
  }

  if (lower.includes('remote stt is not enabled')) {
    return 'Удалённое распознавание голоса не включено для этого профиля. В настройках голоса выберите OpenAI или Groq и добавьте ключ.'
  }

  if (lower.includes('groq') && lower.includes('api_key')) {
    return 'Для распознавания через Groq не найден GROQ_API_KEY. Добавьте ключ и повторите.'
  }

  if (
    lower.includes('openai stt') ||
    lower.includes('voice_tools_openai_key') ||
    lower.includes('openai_api_key')
  ) {
    return 'Для распознавания через OpenAI не найден ключ. Добавьте VOICE_TOOLS_OPENAI_KEY или OPENAI_API_KEY.'
  }

  if (lower.includes('too many requests')) {
    return 'Слишком много попыток распознавания подряд. Подождите минуту и повторите.'
  }

  if (
    lower.includes('missing audio file') ||
    lower.includes('audio file is empty') ||
    lower.includes('no text')
  ) {
    return 'Не удалось разобрать запись. Попробуйте сказать фразу громче и записать ещё раз.'
  }

  if (
    lower.includes('transcription') ||
    lower.includes('stt') ||
    lower.includes('audio/transcriptions') ||
    lower.includes('network')
  ) {
    return 'Сервис распознавания голоса не ответил. Проверьте ключи, модель STT и повторите.'
  }

  if (lower.includes('recording failed')) {
    return 'Запись голоса сорвалась. Нажмите микрофон ещё раз.'
  }

  if (lower.includes('microphone access')) {
    return 'Нет доступа к микрофону. Разрешите доступ в браузере и повторите.'
  }

  return fallback
}
