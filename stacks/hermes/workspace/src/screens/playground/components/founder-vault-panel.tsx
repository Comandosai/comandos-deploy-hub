type FounderReward = {
  id: string
  name: string
  icon: string
  description: string
}

type FounderVaultPanelProps = {
  eligible?: boolean
  claimedRewardIds?: string[]
  onClaim?: () => void
}

const REWARDS: FounderReward[] = [
  { id: 'founder-cape', name: 'Плащ основателя', icon: '🧥', description: 'Анимированный плащ с золотой отделкой.' },
  { id: 'founder-banner', name: 'Знамя основателя', icon: '🏳️', description: 'Знамя гильдии для залов дома.' },
  { id: 'aether-50', name: 'Эфир x50', icon: '💠', description: 'Премиальная валюта для создания предметов.' },
  { id: 'coins-1000', name: 'Монеты x1000', icon: '🪙', description: 'Стартовый запас для магазинов.' },
  { id: 'trader-trial', name: 'Пробный Trader Agent', icon: '🤖', description: 'Пробный доступ к торговому агенту.' },
  { id: 'founder-title', name: 'Титул основателя', icon: '👑', description: 'Постоянный титул аккаунта.' },
  { id: 'founder-pet', name: 'Спутник основателя', icon: '🐉', description: 'Малый эфирный спутник.' },
]

export function FounderVaultPanel({ eligible = false, claimedRewardIds = [], onClaim }: FounderVaultPanelProps) {
  const claimed = new Set(claimedRewardIds)
  const allClaimed = REWARDS.every((reward) => claimed.has(reward.id))
  const canClaim = eligible && !allClaimed

  return (
    <section
      aria-label="Панель хранилища основателя"
      className="w-[min(94vw,720px)] rounded-[32px] border border-[#d9b35f]/50 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,.21),transparent_38%),linear-gradient(180deg,rgba(30,21,12,.98),rgba(5,5,11,.96))] p-5 text-[#f9e7b5] shadow-[0_30px_100px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.12)]"
    >
      <header className="mb-4 flex flex-col gap-3 border-b border-[#d9b35f]/25 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#d9b35f]/72">Ограниченный набор наград</p>
          <h2 className="font-serif text-3xl font-black text-[#ffe7a3]">Хранилище основателя</h2>
          <p className="mt-1 max-w-xl text-sm text-[#f9e7b5]/68">Семь наград основателя откроются после выполнения условия запуска.</p>
        </div>
        <span className="w-fit rounded-full border border-[#d9b35f]/35 bg-black/32 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#d9b35f]">
          получено {claimed.size}/{REWARDS.length}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {REWARDS.map((reward) => {
          const isClaimed = claimed.has(reward.id)
          return (
            <article
              key={reward.id}
              data-testid="founder-reward-slot"
              className="relative min-h-[148px] rounded-3xl border border-[#d9b35f]/32 bg-[linear-gradient(180deg,rgba(217,179,95,.13),rgba(0,0,0,.32))] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#fbbf24]/35 bg-black/30 text-3xl shadow-[0_0_22px_rgba(251,191,36,.18)]" aria-hidden>
                {reward.icon}
              </div>
              <h3 className="mt-2 text-sm font-black leading-tight text-[#ffe7a3]">{reward.name}</h3>
              <p className="mt-1 text-[10px] leading-snug text-[#f9e7b5]/62">{reward.description}</p>
              <div className={`mt-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${isClaimed ? 'bg-emerald-300/15 text-emerald-200' : 'bg-black/30 text-[#d9b35f]/72'}`}>
                {isClaimed ? 'Получено' : 'Закрыто'}
              </div>
            </article>
          )
        })}
      </div>

      <footer className="mt-5 flex flex-col gap-3 rounded-3xl border border-[#d9b35f]/24 bg-black/24 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#ffe7a3]">Условие основателя</p>
          <p className="text-xs text-[#f9e7b5]/64">Зарезервируйте имя и завершите обучение запуска. Право на награды синхронизируется из аккаунта.</p>
        </div>
        <button
          onClick={onClaim}
          disabled={!canClaim}
          aria-label="Получить награды основателя"
          className="rounded-2xl border border-[#fbbf24]/45 bg-[linear-gradient(180deg,#fde68a,#d9b35f)] px-5 py-2.5 text-sm font-black text-[#211507] shadow-[0_14px_40px_rgba(217,179,95,.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-none disabled:bg-white/8 disabled:text-white/38 disabled:shadow-none"
        >
          {allClaimed ? 'Награды получены' : eligible ? 'Получить награды' : 'Условия не выполнены'}
        </button>
      </footer>
    </section>
  )
}
