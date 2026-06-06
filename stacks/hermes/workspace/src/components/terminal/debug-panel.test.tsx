/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DebugPanel } from './debug-panel'

vi.mock('@/components/ui/braille-spinner', function mockBrailleSpinner() {
  return {
    BrailleSpinner: function BrailleSpinner() {
      return <span data-testid="braille-spinner" />
    },
  }
})

afterEach(function cleanupAfterTest() {
  cleanup()
})

describe('DebugPanel', function debugPanelSuite() {
  it('shows Russian loading and fallback text', function loadingTextTest() {
    render(
      <DebugPanel
        analysis={null}
        isLoading
        onClose={vi.fn()}
        onRunCommand={vi.fn()}
      />,
    )

    expect(screen.getByText('Анализирую...')).not.toBeNull()
    expect(screen.queryByText('Analyzing...')).toBeNull()
  })

  it('renders Russian diagnostic failure text', function failureTextTest() {
    render(
      <DebugPanel
        analysis={{
          summary: 'Не удалось выполнить диагностику терминала.',
          rootCause: 'Сервер вернул неожиданный ответ диагностики.',
          suggestedCommands: [],
        }}
        isLoading={false}
        onClose={vi.fn()}
        onRunCommand={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Не удалось выполнить диагностику терминала.'),
    ).not.toBeNull()
    expect(
      screen.getByText('Сервер вернул неожиданный ответ диагностики.'),
    ).not.toBeNull()
    expect(screen.queryByText('Debug analysis failed.')).toBeNull()
  })
})
