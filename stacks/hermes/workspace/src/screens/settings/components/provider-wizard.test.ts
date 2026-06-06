/** @vitest-environment jsdom */
import React from 'react'
import { fireEvent, screen, within } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ProviderWizard, getOrderedSupportedAuthTypes } from './provider-wizard'

vi.mock('@/components/ui/dialog', async function mockDialogComponents() {
  const ReactModule = await import('react')

  return {
    DialogRoot: function DialogRoot({
      children,
      open,
    }: {
      children: React.ReactNode
      open?: boolean
    }) {
      if (!open) return null
      return ReactModule.createElement(ReactModule.Fragment, null, children)
    },
    DialogContent: function DialogContent({
      children,
      className,
    }: {
      children: React.ReactNode
      className?: string
    }) {
      return ReactModule.createElement(
        'div',
        { className, role: 'dialog' },
        children,
      )
    },
    DialogDescription: function DialogDescription({
      children,
      className,
    }: {
      children: React.ReactNode
      className?: string
    }) {
      return ReactModule.createElement('p', { className }, children)
    },
    DialogTitle: function DialogTitle({
      children,
      className,
    }: {
      children: React.ReactNode
      className?: string
    }) {
      return ReactModule.createElement('h2', { className }, children)
    },
  }
})

vi.mock('@/components/ui/button', async function mockButtonComponent() {
  const ReactModule = await import('react')

  return {
    Button: ReactModule.forwardRef(function Button(
      {
        children,
        className,
        onClick,
        disabled,
        type = 'button',
        ...rest
      }: {
        children?: React.ReactNode
        className?: string
        disabled?: boolean
        onClick?: React.MouseEventHandler<HTMLButtonElement>
        type?: 'button' | 'submit' | 'reset'
      },
      ref: React.ForwardedRef<HTMLButtonElement>,
    ) {
      return ReactModule.createElement(
        'button',
        {
          ...rest,
          ref,
          type,
          className,
          disabled,
          onClick,
        },
        children,
      )
    }),
  }
})

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean
}
reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true

async function renderProviderWizard() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await React.act(() => {
    root.render(
      React.createElement(ProviderWizard, {
        open: true,
        onOpenChange: vi.fn(),
      }),
    )
  })

  return {
    container,
    unmount: async () => {
      await React.act(() => root.unmount())
      document.body.removeChild(container)
    },
  }
}

describe('getOrderedSupportedAuthTypes', () => {
  it('shows only supported auth methods in the stable wizard order', () => {
    expect(getOrderedSupportedAuthTypes(['cli-token'])).toEqual(['cli-token'])
    expect(getOrderedSupportedAuthTypes(['oauth', 'api-key'])).toEqual([
      'api-key',
      'oauth',
    ])
  })
})

describe('ProviderWizard', function providerWizardSuite() {
  it('routes OpenAI Codex through Codex CLI instead of OAuth', async function codexCliFlowTest() {
    const { unmount } = await renderProviderWizard()

    await React.act(() => {
      fireEvent.click(screen.getByRole('button', { name: /OpenAI Codex/i }))
    })

    const authStep = screen
      .getByText('Шаг 2: выберите способ входа')
      .closest('section')

    expect(authStep).not.toBeNull()
    expect(
      within(authStep as HTMLElement).getByRole('button', {
        name: /CLI-вход/i,
      }),
    ).not.toBeNull()
    expect(
      within(authStep as HTMLElement).queryByRole('button', {
        name: /OAuth/i,
      }),
    ).toBeNull()
    expect(
      within(authStep as HTMLElement).queryByRole('button', {
        name: /API-ключ/i,
      }),
    ).toBeNull()

    await React.act(() => {
      fireEvent.click(screen.getByRole('button', { name: /CLI-вход/i }))
    })

    expect(
      screen.getByText(/OpenAI Codex подключается через Codex CLI/),
    ).not.toBeNull()
    expect(screen.getAllByText(/codex login/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Start OAuth/i)).toBeNull()
    expect(screen.queryByText(/OAuth device flow not supported/i)).toBeNull()

    await React.act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: /Перейти к проверке/i }),
      )
    })

    expect(
      screen.getByText(/Проверяю файл ~\/\.codex\/auth\.json/),
    ).not.toBeNull()
    expect(screen.queryByText(/Start OAuth/i)).toBeNull()
    expect(screen.queryByText(/OAuth device flow not supported/i)).toBeNull()

    await unmount()
  })
})
