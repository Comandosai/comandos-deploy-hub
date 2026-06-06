import { useState } from 'react'
import { WaveChatPanelsShowcase } from './components/wave-chat-panels-showcase'
import { PlaygroundScreen } from './playground-screen'

const HERMES_WORLD_ORIGIN = 'https://hermes-world.ai'

export function HermesWorldEmbed() {
  const [started, setStarted] = useState(false)
  const showPanelShowcase = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('panels') === 'wave-chat'

  const startInPanel = () => {
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __HERMES_PUBLIC_PLAY__?: boolean }).__HERMES_PUBLIC_PLAY__ = true
      try {
        window.localStorage.removeItem('hermes-playground-admin')
        window.localStorage.removeItem('hermes-playground-owner')
      } catch {}
    }
    setStarted(true)
  }

  if (showPanelShowcase) {
    return <WaveChatPanelsShowcase />
  }

  return (
    <main className="relative h-full min-h-0 overflow-hidden bg-[#050015] text-white">
      {!started ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(168,85,247,.24),transparent_48%),#050015] px-4">
          <div className="max-w-xl rounded-3xl border border-white/12 bg-black/35 px-6 py-6 text-center shadow-2xl backdrop-blur-xl">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/70">COMANDOS AI Workspace</div>
            <div className="mt-2 text-3xl font-black tracking-tight">HermesWorld готов к запуску</div>
            <div className="mt-3 text-sm leading-6 text-white/62">
              Локальная версия запускается только после вашего клика, чтобы браузер не блокировал звук и не писал технические предупреждения.
            </div>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#06111f] transition hover:bg-white"
                onClick={startInPanel}
              >
                Запустить в панели
              </button>
              <a
                href={`${HERMES_WORLD_ORIGIN}/play/`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/82 transition hover:border-cyan-200/40 hover:text-white"
              >
                Открыть в новой вкладке
              </a>
            </div>
            <div className="mt-4 text-xs text-white/42">Среда запуска: локальная панель</div>
          </div>
        </div>
      ) : null}
      {started ? (
        <>
          <PlaygroundScreen />
          <a
            href={`${HERMES_WORLD_ORIGIN}/play/`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur transition hover:border-cyan-200/40 hover:text-white"
          >
            Открыть отдельно
          </a>
        </>
      ) : null}
    </main>
  )
}
