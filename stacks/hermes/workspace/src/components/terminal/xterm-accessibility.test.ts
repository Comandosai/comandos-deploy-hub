/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { hideXtermMeasureElements } from './xterm-accessibility'

describe('xterm accessibility helpers', function xtermAccessibilitySuite() {
  it('renames the xterm helper textarea for Russian users', function helperTextareaLabelTest() {
    const container = document.createElement('div')
    const textarea = document.createElement('textarea')
    textarea.className = 'xterm-helper-textarea'
    textarea.setAttribute('aria-label', 'Terminal input')
    container.appendChild(textarea)

    hideXtermMeasureElements(container)

    expect(textarea.getAttribute('aria-label')).toBe('Ввод терминала')
    expect(textarea.getAttribute('title')).toBe('Ввод терминала')
  })
})
