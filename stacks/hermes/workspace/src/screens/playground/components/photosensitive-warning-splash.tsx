import { useEffect, useState } from 'react'
import { HERMESWORLD_SETTINGS_KEY, loadHermesWorldSettings, saveHermesWorldSettings } from './hermesworld-settings'

const WARNING_DISMISSED_KEY = 'hermesworld:photosensitive-warning-dismissed'

type Props = { onOpenSettings?: () => void }

export function PhotosensitiveWarningSplash({ onOpenSettings }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(WARNING_DISMISSED_KEY) !== '1')
    } catch {
      setOpen(true)
    }
  }, [])

  if (!open) return null

  const dismiss = () => {
    try { window.localStorage.setItem(WARNING_DISMISSED_KEY, '1') } catch {}
    setOpen(false)
  }
  const enable = () => {
    const current = loadHermesWorldSettings()
    saveHermesWorldSettings({
      ...current,
      performance: { ...current.performance, reducedMotion: true },
      accessibility: { ...current.accessibility, photosensitiveMode: true },
    })
    try {
      const raw = window.localStorage.getItem(HERMESWORLD_SETTINGS_KEY)
      if (raw) window.localStorage.setItem(HERMESWORLD_SETTINGS_KEY, raw)
    } catch {}
    dismiss()
    onOpenSettings?.()
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[160] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Предупреждение о светочувствительности"
        className="w-[min(94vw,620px)] rounded-3xl border-2 p-6 text-white shadow-2xl"
        style={{ borderColor: 'rgba(241,197,109,.72)', background: 'linear-gradient(180deg, rgba(15,22,34,.98), rgba(4,7,12,.98))', boxShadow: '0 0 60px rgba(241,197,109,.18), 0 30px 100px rgba(0,0,0,.8)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/70">Предупреждение</div>
        <h2 className="mt-2 text-2xl font-black text-[#F1C56D]">Светочувствительный режим</h2>
        <p className="mt-4 text-sm leading-7 text-white/76">
          Здесь есть вспышки и быстрые смены цвета. Если у вас бывает реакция на яркие эффекты,
          включите щадящий режим перед продолжением.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={enable} className="rounded-xl border border-amber-200/40 bg-amber-200 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0A0D12] shadow-[0_0_22px_rgba(241,197,109,.22)]">
            Включить щадящий режим
          </button>
          <button type="button" onClick={dismiss} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white/70 hover:bg-white/10">
            Продолжить без изменений
          </button>
        </div>
      </div>
    </div>
  )
}
