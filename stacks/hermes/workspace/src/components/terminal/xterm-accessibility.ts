type FitLike = {
  fit: () => void
}

const MEASURE_SELECTOR = [
  '.xterm-char-measure-element',
  '[style*="top: -50000px"][style*="width: 50000px"][style*="white-space: pre"]',
].join(',')
const MEASURE_TEXT = 'W'.repeat(32)
const REPEATED_MEASURE_TEXT = /^(.)\1{7,}$/

function getMeasureElements(container: HTMLElement | null) {
  const root = container ?? document.body
  return Array.from(root.querySelectorAll<HTMLElement>(MEASURE_SELECTOR))
}

function restoreXtermMeasureText(container: HTMLElement | null) {
  for (const node of getMeasureElements(container)) {
    if (node.textContent) continue
    node.textContent = node.dataset.comandosMeasureText || MEASURE_TEXT
  }
}

export function hideXtermMeasureElements(container: HTMLElement | null) {
  for (const node of getMeasureElements(container)) {
    node.setAttribute('aria-hidden', 'true')
    node.setAttribute('role', 'presentation')
    if (node.textContent && REPEATED_MEASURE_TEXT.test(node.textContent)) {
      node.dataset.comandosMeasureText = node.textContent
      node.textContent = ''
    }
  }
}

export function fitXtermAndHideMeasureElements(
  fitAddon: FitLike,
  container: HTMLElement | null,
) {
  restoreXtermMeasureText(container)
  fitAddon.fit()
  hideXtermMeasureElements(container)
}
