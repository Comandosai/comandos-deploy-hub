const MONACO_IME_TEXTAREA_SELECTOR = 'textarea.ime-text-area'

export function labelMonacoTextareas(
  container: HTMLElement | null,
  label: string,
) {
  const root = container ?? document.body
  for (const node of root.querySelectorAll<HTMLTextAreaElement>(
    MONACO_IME_TEXTAREA_SELECTOR,
  )) {
    node.setAttribute('aria-label', label)
    node.setAttribute('title', label)
  }
}
