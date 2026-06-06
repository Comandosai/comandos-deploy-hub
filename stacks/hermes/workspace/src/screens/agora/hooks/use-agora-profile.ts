/**
 * useAgoraProfile — local persistent profile for the Agora.
 *
 * v0.0: pure localStorage. v0.1+: this profile is the payload sent to
 * the WebSocket server on `join`.
 */
import { useCallback, useEffect, useState } from 'react'
import { AGORA_PROFILE_STORAGE_KEY } from '../lib/agora-types'
import type { AgoraAvatarId, AgoraProfile, AgoraStatus } from '../lib/agora-types'

function generateInitialProfile(): AgoraProfile {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `agora-${Math.random().toString(36).slice(2, 10)}`
  const num = Math.floor(Math.random() * 9000) + 1000
  const handle = `builder${num}`
  return {
    id,
    handle,
    displayName: `Участник ${num}`,
    avatarId: 'hermes',
    bio: '',
    status: 'online',
  }
}

function loadProfile(): AgoraProfile {
  if (typeof window === 'undefined') return generateInitialProfile()
  try {
    const raw = window.localStorage.getItem(AGORA_PROFILE_STORAGE_KEY)
    if (!raw) {
      const initial = generateInitialProfile()
      window.localStorage.setItem(AGORA_PROFILE_STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as Partial<AgoraProfile>
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.handle !== 'string' ||
      typeof parsed.displayName !== 'string' ||
      typeof parsed.avatarId !== 'string'
    ) {
      return generateInitialProfile()
    }
    return {
      id: parsed.id,
      handle: parsed.handle,
      displayName: parsed.displayName,
      avatarId: parsed.avatarId,
      bio: typeof parsed.bio === 'string' ? parsed.bio : '',
      status: parsed.status === 'away' || parsed.status === 'busy' ? parsed.status : 'online',
      links: Array.isArray(parsed.links) ? parsed.links : undefined,
      activity: typeof parsed.activity === 'string' ? parsed.activity : undefined,
    }
  } catch {
    return generateInitialProfile()
  }
}

export function useAgoraProfile() {
  const [profile, setProfile] = useState<AgoraProfile>(() => loadProfile())

  useEffect(() => {
    try {
      window.localStorage.setItem(AGORA_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // ignore quota / private mode
    }
  }, [profile])

  const updateProfile = useCallback((patch: Partial<AgoraProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }))
  }, [])

  const setAvatar = useCallback(
    (avatarId: AgoraAvatarId) => updateProfile({ avatarId }),
    [updateProfile],
  )

  const setStatus = useCallback(
    (status: AgoraStatus) => updateProfile({ status }),
    [updateProfile],
  )

  return { profile, updateProfile, setAvatar, setStatus }
}
