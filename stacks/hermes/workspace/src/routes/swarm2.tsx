import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { Swarm2Screen } from '@/screens/swarm2/swarm2-screen'

export const Route = createFileRoute('/swarm2')({
  ssr: false,
  component: function Swarm2Route() {
    usePageTitle('Рой')
    return <Swarm2Screen />
  },
  errorComponent: function Swarm2Error({ error }) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-primary-50 p-6 text-center">
        <h2 className="mb-3 text-xl font-semibold text-primary-900">
          Не удалось открыть рой
        </h2>
        <p className="mb-4 max-w-md text-sm text-primary-600">
          {error instanceof Error
            ? error.message
            : 'Произошла неизвестная ошибка'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-accent-500 px-4 py-2 text-primary-950 transition-colors hover:bg-accent-600"
        >
          Перезагрузить страницу
        </button>
      </div>
    )
  },
  pendingComponent: function Swarm2Pending() {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-r-transparent" />
          <p className="text-sm text-primary-500">Загружаю рой...</p>
        </div>
      </div>
    )
  },
})
