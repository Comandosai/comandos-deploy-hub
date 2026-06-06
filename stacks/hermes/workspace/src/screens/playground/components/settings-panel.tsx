import type { ChangeEvent, ReactNode } from 'react'
import { useHermesWorldSettings, type HermesWorldSettings } from './hermesworld-settings'

type Props = {
  open: boolean
  onClose: () => void
  signedInName?: string | null
  onSignOut?: () => void
}

type Path =
  | ['graphics', keyof HermesWorldSettings['graphics']]
  | ['performance', keyof HermesWorldSettings['performance']]
  | ['controls', keyof HermesWorldSettings['controls']]
  | ['audio', keyof HermesWorldSettings['audio']]
  | ['display', keyof HermesWorldSettings['display']]
  | ['accessibility', keyof HermesWorldSettings['accessibility']]

export function SettingsPanel({ open, onClose, signedInName, onSignOut }: Props) {
  const [settings, updateSettings] = useHermesWorldSettings()
  if (!open) return null

  const set = <T,>(path: Path, value: T) => {
    updateSettings((current) => ({
      ...current,
      [path[0]]: {
        ...(current[path[0]] as object),
        [path[1]]: value,
      },
    }))
  }
  const onNumber = (path: Path) => (event: ChangeEvent<HTMLInputElement>) => set(path, Number(event.target.value))
  const onSelect = (path: Path) => (event: ChangeEvent<HTMLSelectElement>) => set(path, event.target.value)
  const onToggle = (path: Path) => (event: ChangeEvent<HTMLInputElement>) => set(path, event.target.checked)

  const toggleFullscreen = async () => {
    const next = !settings.display.fullscreen
    set(['display', 'fullscreen'], next)
    try {
      if (next && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      if (!next && document.fullscreenElement) await document.exitFullscreen()
    } catch {}
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки HermesWorld"
        className="max-h-[92vh] w-[min(96vw,980px)] overflow-hidden rounded-3xl border-2 text-white shadow-2xl"
        style={{
          borderColor: 'rgba(241,197,109,.55)',
          background: 'linear-gradient(180deg, rgba(15,22,34,.98), rgba(5,8,13,.97))',
          boxShadow: '0 0 46px rgba(241,197,109,.18), 0 24px 90px rgba(0,0,0,.74)',
        }}
      >
        <div className="flex items-center justify-between border-b border-amber-200/15 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/65">HermesWorld</div>
            <div className="text-2xl font-black text-[#F1C56D]">Настройки</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 hover:bg-white/10">
            Закрыть
          </button>
        </div>
        <div className="grid max-h-[calc(92vh-84px)] gap-3 overflow-y-auto p-4 md:grid-cols-2 xl:grid-cols-3">
          <Section title="Графика">
            <Select label="Дальность прорисовки" value={settings.graphics.renderDistance} onChange={onSelect(['graphics', 'renderDistance'])} options={['low', 'med', 'high', 'ultra']} />
            <Select label="Качество теней" value={settings.graphics.shadowQuality} onChange={onSelect(['graphics', 'shadowQuality'])} options={['low', 'med', 'high', 'ultra']} />
            <Select label="Качество текстур" value={settings.graphics.textureQuality} onChange={onSelect(['graphics', 'textureQuality'])} options={['low', 'med', 'high', 'ultra']} />
            <Check label="Сглаживание" checked={settings.graphics.antiAliasing} onChange={onToggle(['graphics', 'antiAliasing'])} />
          </Section>

          <Section title="Производительность">
            <Check label="Счётчик FPS" checked={settings.performance.fpsCounter} onChange={onToggle(['performance', 'fpsCounter'])} />
            <Select label="Целевой FPS" value={settings.performance.targetFps} onChange={onSelect(['performance', 'targetFps'])} options={['30', '60', '120', 'uncapped']} />
            <Check label="Меньше анимации" checked={settings.performance.reducedMotion} onChange={onToggle(['performance', 'reducedMotion'])} />
          </Section>

          <Section title="Управление">
            <Range label="Чувствительность мыши" value={settings.controls.mouseSensitivity} min={1} max={100} onChange={onNumber(['controls', 'mouseSensitivity'])} />
            <Check label="Инвертировать Y" checked={settings.controls.invertY} onChange={onToggle(['controls', 'invertY'])} />
            <div className="rounded-xl border border-white/10 bg-black/25 p-2">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Клавиши</div>
              <div className="grid gap-1 text-[11px] text-white/70">
                {Object.entries(settings.controls.bindings).slice(0, 14).map(([action, key]) => (
                  <div key={action} className="flex justify-between gap-2"><span>{CONTROL_ACTION_LABELS[action] ?? action}</span><kbd className="text-amber-100">{key}</kbd></div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Звук">
            <Range label="Общая громкость" value={settings.audio.master} min={0} max={100} onChange={onNumber(['audio', 'master'])} />
            <Range label="Музыка" value={settings.audio.music} min={0} max={100} onChange={onNumber(['audio', 'music'])} />
            <Range label="Эффекты" value={settings.audio.sfx} min={0} max={100} onChange={onNumber(['audio', 'sfx'])} />
            <Range label="Фон" value={settings.audio.ambient} min={0} max={100} onChange={onNumber(['audio', 'ambient'])} />
          </Section>

          <Section title="Экран">
            <Range label="Масштаб интерфейса" value={settings.display.uiScale} min={50} max={150} onChange={onNumber(['display', 'uiScale'])} suffix="%" />
            <Range label="Прозрачность HUD" value={settings.display.hudOpacity} min={30} max={100} onChange={onNumber(['display', 'hudOpacity'])} suffix="%" />
            <button type="button" onClick={toggleFullscreen} className="rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-sm font-bold text-amber-100 hover:bg-amber-200/15">
              {settings.display.fullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран'}
            </button>
          </Section>

          <Section title="Доступность">
            <Check label="Режим без вспышек" checked={settings.accessibility.photosensitiveMode} onChange={onToggle(['accessibility', 'photosensitiveMode'])} />
            <p className="text-xs leading-relaxed text-white/50">Отключает быстрые вспышки, строб-эффекты, резкие искры и быстрые световые циклы. В обычном режиме вспышки ограничены частотой 1.5 Гц, а здесь полностью останавливаются.</p>
          </Section>

          <Section title="Аккаунт">
            {signedInName ? (
              <>
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-50">Вы вошли как {signedInName}</div>
                <button type="button" onClick={onSignOut} className="rounded-xl border border-red-300/25 bg-red-300/10 px-3 py-2 text-sm font-bold text-red-100 hover:bg-red-300/15">Выйти</button>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white/55">Вход не выполнен. Выход из аккаунта недоступен.</div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#F1C56D]">{title}</h2><div className="space-y-3">{children}</div></section>
}

const SELECT_LABELS: Record<string, string> = {
  low: 'низко',
  med: 'средне',
  high: 'высоко',
  ultra: 'ультра',
  uncapped: 'без ограничения',
}

const CONTROL_ACTION_LABELS: Record<string, string> = {
  forward: 'вперёд',
  backward: 'назад',
  left: 'влево',
  right: 'вправо',
  jump: 'прыжок',
  sprint: 'бег',
  interact: 'действие',
  chat: 'чат',
  journal: 'журнал',
  map: 'карта',
  inventory: 'инвентарь',
  avatar: 'аватар',
  focus: 'фокус',
  attack: 'удар',
  dash: 'рывок',
  bolt: 'импульс',
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (event: ChangeEvent<HTMLSelectElement>) => void }) {
  return <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">{label}<select value={value} onChange={onChange} className="mt-1 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none">{options.map((option) => <option key={option} value={option}>{SELECT_LABELS[option] ?? option}</option>)}</select></label>
}

function Range({ label, value, min, max, suffix = '', onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">{label}: <span className="text-amber-100">{value}{suffix}</span><input aria-label={label} type="range" value={value} min={min} max={max} onChange={onChange} className="mt-2 w-full accent-[#F1C56D]" /></label>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/75"><span>{label}</span><input aria-label={label} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#F1C56D]" /></label>
}
