import { useEffect } from 'react'

const BASE_TITLE = 'COMANDOS AI Workspace'

/**
 * Sets document.title for the current page.
 * Usage: usePageTitle('Сессии') -> "Сессии — COMANDOS AI Workspace"
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = page ? `${page} — ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [page])
}
