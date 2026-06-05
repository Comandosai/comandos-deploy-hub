import { describe, expect, it } from 'vitest'
import {
  getOAuthDeviceCodeUnsupportedMessage,
  getUnsupportedOAuthDeviceCodeResponse,
} from './oauth.device-code'

describe('getOAuthDeviceCodeUnsupportedMessage', () => {
  it('explains that OpenAI Codex uses Codex CLI instead of panel OAuth', () => {
    expect(getOAuthDeviceCodeUnsupportedMessage('openai-codex')).toContain(
      'codex login',
    )
    expect(getOAuthDeviceCodeUnsupportedMessage('openai-codex')).not.toContain(
      'пока не реализовано',
    )
  })

  it('uses a readable provider name for unsupported OAuth providers', () => {
    expect(getOAuthDeviceCodeUnsupportedMessage('deepseek')).toBe(
      'OAuth-подключение для DeepSeek пока не реализовано в панели. Используйте API-ключ, локальный сервер или настройку через терминал.',
    )
  })

  it('does not expose raw empty provider ids in the message', () => {
    expect(getOAuthDeviceCodeUnsupportedMessage('   ')).toBe(
      'OAuth-подключение для этого провайдера пока не реализовано в панели. Используйте API-ключ, локальный сервер или настройку через терминал.',
    )
  })

  it('returns an ok:false payload for unsupported providers without forcing a browser-level HTTP error', () => {
    expect(getUnsupportedOAuthDeviceCodeResponse('openai-codex')).toEqual({
      ok: false,
      unsupported: true,
      error:
        'OpenAI Codex не подключается через OAuth в панели. Выполните codex login на сервере, затем вернитесь в настройки и нажмите «Проверить».',
    })
  })
})
