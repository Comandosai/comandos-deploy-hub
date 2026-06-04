'use client'

import { useSyncExternalStore } from 'react'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type AgentAvatarPreference = 'mark' | 'logo'
export type AgentAvatarSize = 'sm' | 'md' | 'lg'

export const AGENT_AVATAR_STORAGE_KEY = 'komandos-avatar-preference'
const AGENT_AVATAR_EVENT = 'komandos-avatar-preference-change'

type AgentAvatarProps = {
  size?: AgentAvatarSize
  className?: string
  iconClassName?: string
}

function getContainerSizeClassName(size: AgentAvatarSize): string {
  if (size === 'sm') return 'size-6'
  if (size === 'lg') return 'size-10'
  return 'size-8'
}

function getLogoSizeClassName(size: AgentAvatarSize): string {
  if (size === 'sm') return 'size-4 rounded overflow-hidden'
  if (size === 'lg') return 'size-6 rounded-lg overflow-hidden'
  return 'size-5 rounded-md overflow-hidden'
}

export function readAgentAvatarPreference(): AgentAvatarPreference {
  if (typeof window === 'undefined') return 'mark'

  try {
    const stored = window.localStorage.getItem(AGENT_AVATAR_STORAGE_KEY)
    if (stored === 'mark' || stored === 'logo') {
      return stored
    }
  } catch {
    // Ignore storage errors
  }

  return 'mark'
}

export function writeAgentAvatarPreference(
  preference: AgentAvatarPreference,
): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(AGENT_AVATAR_STORAGE_KEY, preference)
  } catch {
    // Ignore storage errors
  }

  window.dispatchEvent(new Event(AGENT_AVATAR_EVENT))
}

export function toggleAgentAvatarPreference(
  currentPreference: AgentAvatarPreference,
): AgentAvatarPreference {
  const nextPreference = currentPreference === 'mark' ? 'logo' : 'mark'
  writeAgentAvatarPreference(nextPreference)
  return nextPreference
}

export function subscribeToAgentAvatarPreference(
  onStoreChange: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return function noop() {
      return undefined
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === AGENT_AVATAR_STORAGE_KEY) {
      onStoreChange()
    }
  }

  function handlePreferenceChange() {
    onStoreChange()
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(AGENT_AVATAR_EVENT, handlePreferenceChange)

  return function unsubscribe() {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(AGENT_AVATAR_EVENT, handlePreferenceChange)
  }
}

function AgentAvatar({
  size = 'md',
  className,
  iconClassName,
}: AgentAvatarProps) {
  const preference = useSyncExternalStore(
    subscribeToAgentAvatarPreference,
    readAgentAvatarPreference,
    function getServerSnapshot() {
      return 'mark'
    },
  )

  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger
          type="button"
          className={cn(
            'inline-flex cursor-pointer items-center justify-center rounded-full border border-primary-300/70 bg-primary-200/70 text-primary-900 transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/45',
            getContainerSizeClassName(size),
            className,
          )}
          aria-label="Сменить аватар агента"
          onClick={function handleToggleAvatar(event) {
            event.stopPropagation()
            toggleAgentAvatarPreference(preference as AgentAvatarPreference)
          }}
        >
          {preference === 'mark' ? (
            <img
              src="/komandos/logo-mark.png"
              alt="COMANDOS AI"
              className={cn(getLogoSizeClassName(size), iconClassName)}
            />
          ) : (
            <img
              src="/komandos/mascot-helmet.png"
              alt="COMANDOS AI mascot"
              className={cn(
                getLogoSizeClassName(size),
                iconClassName,
                'rounded-xl',
              )}
            />
          )}
        </TooltipTrigger>
        <TooltipContent side="top">Сменить аватар</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}

export { AgentAvatar }
