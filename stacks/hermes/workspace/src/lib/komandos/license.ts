// Заглушка под будущий Supabase-license-gate клуба Командос.
// Реальная реализация подключится отдельным шагом — интерфейс фиксируется сейчас.
//
// Где это используется в будущем:
//  - На старте приложения (см. KOMANDOS_LICENSE_GATE-якорь в src/routes/__root.tsx)
//  - Перед монтированием <Outlet/> — оборачивает приложение <LicenseGate/>
//  - В Supabase: таблица licenses(key, tier, is_active, expires_at, vps_fingerprint, last_heartbeat)
//  - Edge Function: /functions/v1/check_license

export type LicenseTier = 'free' | 'pro' | 'elite'

export type LicenseStatus =
  | {
      state: 'active'
      key: string
      email: string
      tier: LicenseTier
      expiresAt: string | null
    }
  | { state: 'trial'; expiresAt: string; tier: LicenseTier }
  | { state: 'expired' }
  | { state: 'revoked'; reason: string }
  | { state: 'unknown' }

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

export async function checkLicense(): Promise<LicenseStatus> {
  // TODO(supabase-gate): заменить на реальный запрос к Edge Function.
  // const res = await fetch('https://<project>.supabase.co/functions/v1/check_license', {
  //   method: 'POST',
  //   headers: { 'content-type': 'application/json' },
  //   body: JSON.stringify({ key: getStoredKey(), fingerprint: getFingerprint() }),
  // })
  return {
    state: 'active',
    key: 'LOCAL-DEV',
    email: 'local@komandos',
    tier: 'elite',
    expiresAt: null,
  }
}

export function isLicensed(status: LicenseStatus): boolean {
  return status.state === 'active' || status.state === 'trial'
}

export function getTier(status: LicenseStatus): LicenseTier | null {
  if (status.state === 'active' || status.state === 'trial') {
    return status.tier
  }
  return null
}

export function startHeartbeat(onUpdate: (s: LicenseStatus) => void): () => void {
  const tick = async () => {
    try {
      const s = await checkLicense()
      onUpdate(s)
    } catch {
      onUpdate({ state: 'unknown' })
    }
  }
  void tick()
  const id = setInterval(tick, HEARTBEAT_INTERVAL_MS)
  return () => clearInterval(id)
}
