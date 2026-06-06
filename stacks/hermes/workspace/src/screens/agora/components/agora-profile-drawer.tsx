/**
 * AgoraProfileDrawer — view/edit user profile.
 * Self profile is editable. Others are read-only with a "wave" CTA.
 */
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { AgoraAvatarId, AgoraProfile, AgoraStatus, AgoraUser } from '../lib/agora-types'

const ALL_AVATARS: Array<{ id: AgoraAvatarId; label: string; tier: 'greek' | 'emoji' }> = [
  { id: 'hermes', label: 'Гермес', tier: 'greek' },
  { id: 'athena', label: 'Афина', tier: 'greek' },
  { id: 'apollo', label: 'Аполлон', tier: 'greek' },
  { id: 'artemis', label: 'Артемида', tier: 'greek' },
  { id: 'iris', label: 'Ирида', tier: 'greek' },
  { id: 'nike', label: 'Ника', tier: 'greek' },
  { id: 'eros', label: 'Эрос', tier: 'greek' },
  { id: 'pan', label: 'Пан', tier: 'greek' },
  { id: 'chronos', label: 'Хронос', tier: 'greek' },
  { id: 'owl', label: 'Сова', tier: 'emoji' },
  { id: 'hermes-cat', label: 'Кот', tier: 'emoji' },
  { id: 'robot', label: 'Робот', tier: 'emoji' },
  { id: 'fox', label: 'Лис', tier: 'emoji' },
  { id: 'ghost', label: 'Призрак', tier: 'emoji' },
  { id: 'wolf', label: 'Волк', tier: 'emoji' },
  { id: 'octopus', label: 'Осьминог', tier: 'emoji' },
  { id: 'dragon', label: 'Дракон', tier: 'emoji' },
  { id: 'panda', label: 'Панда', tier: 'emoji' },
]

const STATUS_OPTIONS: Array<AgoraStatus> = ['online', 'away', 'busy']
const STATUS_LABELS: Record<AgoraStatus, string> = {
  online: 'Онлайн',
  away: 'Отошёл',
  busy: 'Занят',
}

interface AgoraProfileDrawerProps {
  open: boolean
  user: AgoraUser | null
  selfId: string
  onClose: () => void
  onSaveProfile: (patch: Partial<AgoraProfile>) => void
  onWave?: (user: AgoraUser) => void
}

export function AgoraProfileDrawer({
  open,
  user,
  selfId,
  onClose,
  onSaveProfile,
  onWave,
}: AgoraProfileDrawerProps) {
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editStatus, setEditStatus] = useState<AgoraStatus>('online')

  useEffect(() => {
    if (user) {
      setEditName(user.profile.displayName)
      setEditBio(user.profile.bio)
      setEditStatus(user.profile.status)
    }
  }, [user?.profile.id])

  const isSelf = user?.profile.id === selfId

  return (
    <AnimatePresence>
      {open && user && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-[71] h-full w-full max-w-md overflow-y-auto p-5"
            style={{
              background: 'var(--theme-bg)',
              borderLeft: '1px solid var(--theme-border)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-semibold">{isSelf ? 'Ваш профиль' : user.profile.displayName}</h2>
              <button
                type="button"
                onClick={onClose}
                className="opacity-60 hover:opacity-100 text-lg leading-none"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <img
                src={`/avatars/${user.profile.avatarId}.png`}
                alt={user.profile.displayName}
                width={72}
                height={72}
                className="rounded-full"
                style={{ border: '2px solid var(--theme-border)' }}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = '/avatars/hermes.png'
                }}
              />
              <div className="flex-1 min-w-0">
                {isSelf ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => onSaveProfile({ displayName: editName.slice(0, 32) || 'Участник' })}
                    aria-label="Имя профиля"
                    className="w-full rounded-md px-2 py-1 text-sm font-semibold outline-none"
                    style={{
                      background: 'var(--theme-card)',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                  />
                ) : (
                  <div className="text-sm font-semibold">{user.profile.displayName}</div>
                )}
                <div className="text-[11px] opacity-60">@{user.profile.handle}</div>
                {user.profile.activity && !isSelf && (
                  <div className="text-[11px] mt-1 opacity-80">{user.profile.activity}</div>
                )}
              </div>
            </div>

            <section className="mb-5">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">Статус</div>
              {isSelf ? (
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setEditStatus(s)
                        onSaveProfile({ status: s })
                      }}
                      aria-label={`Установить статус: ${STATUS_LABELS[s]}`}
                      className="rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.05em]"
                      style={{
                        background:
                          editStatus === s
                            ? 'var(--theme-accent)'
                            : 'var(--theme-card)',
                        color: editStatus === s ? 'var(--theme-bg)' : 'var(--theme-text)',
                        border: '1px solid var(--theme-border)',
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] opacity-80">{STATUS_LABELS[user.profile.status]}</div>
              )}
            </section>

            <section className="mb-5">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">О себе</div>
              {isSelf ? (
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  onBlur={() => onSaveProfile({ bio: editBio.slice(0, 240) })}
                  placeholder="Коротко расскажите о себе..."
                  aria-label="Описание профиля"
                  rows={3}
                  maxLength={240}
                  className="w-full rounded-md px-2 py-1.5 text-[12px] outline-none resize-none"
                  style={{
                    background: 'var(--theme-card)',
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
              ) : (
                <div className="text-[12px] opacity-80 whitespace-pre-wrap">{user.profile.bio || 'Описание не заполнено.'}</div>
              )}
            </section>

            {isSelf && (
              <section className="mb-5">
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">Аватар</div>
                <div className="grid grid-cols-6 gap-2">
                  {ALL_AVATARS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSaveProfile({ avatarId: a.id })}
                      title={a.label}
                      aria-label={`Выбрать аватар: ${a.label}`}
                      className="rounded-lg p-1 transition-transform hover:scale-105"
                      style={{
                        background:
                          user.profile.avatarId === a.id
                            ? 'color-mix(in srgb, var(--theme-accent) 25%, transparent)'
                            : 'var(--theme-card)',
                        border: `1px solid ${
                          user.profile.avatarId === a.id ? 'var(--theme-accent)' : 'var(--theme-border)'
                        }`,
                      }}
                    >
                      <img
                        src={`/avatars/${a.id}.png`}
                        alt={a.label}
                        width={40}
                        height={40}
                        className="rounded-full block"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = '/avatars/hermes.png'
                        }}
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            {!isSelf && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onWave?.(user)}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
                  style={{
                    background: 'var(--theme-accent)',
                    color: 'var(--theme-bg)',
                  }}
                >
                  👋 Поприветствовать
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
