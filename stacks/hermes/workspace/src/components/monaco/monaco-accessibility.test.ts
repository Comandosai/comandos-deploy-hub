/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { labelMonacoTextareas } from './monaco-accessibility'

describe('monaco accessibility helpers', function monacoAccessibilitySuite() {
  it('renames Monaco IME textareas for Russian users', function imeTextareaLabelTest() {
    const container = document.createElement('div')
    const textarea = document.createElement('textarea')
    textarea.className = 'ime-text-area'
    textarea.setAttribute('aria-label', 'Editor input')
    container.appendChild(textarea)

    labelMonacoTextareas(container, 'Редактор файлов')

    expect(textarea.getAttribute('aria-label')).toBe('Редактор файлов')
    expect(textarea.getAttribute('title')).toBe('Редактор файлов')
  })
})
