import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { Conductor } from '@/screens/gateway/conductor'

function ConductorRoute() {
  usePageTitle('Оркестратор')
  return <Conductor />
}

export const Route = createFileRoute('/conductor')({
  component: ConductorRoute,
})
