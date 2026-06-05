import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import appCss from '../styles.css?url'
import { getRootSurfaceState } from './-root-layout-state'
import type { AuthStatus } from '@/lib/claude-auth'
import { SearchModal } from '@/components/search/search-modal'
import { UsageMeter } from '@/components/usage-meter'
import { TerminalShortcutListener } from '@/components/terminal-shortcut-listener'
import { GlobalShortcutListener } from '@/components/global-shortcut-listener'
import { WorkspaceShell } from '@/components/workspace-shell'
import { MobilePromptTrigger } from '@/components/mobile-prompt/MobilePromptTrigger'
import { Toaster } from '@/components/ui/toast'
import { OnboardingTour } from '@/components/onboarding/onboarding-tour'
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal'
import { UpdateCenterNotifier } from '@/components/update-center-notifier'
import { initializeSettingsAppearance, useSettings } from '@/hooks/use-settings'
import { useApplyChatWidth } from '@/hooks/use-chat-settings'
import { useRussianUiPatcher } from '@/hooks/use-russian-ui-patcher'
import {
  ClaudeOnboarding,
  ONBOARDING_COMPLETE_EVENT,
  ONBOARDING_KEY,
} from '@/components/onboarding/claude-onboarding'
import { ErrorBoundary } from '@/components/error-boundary'
import { LoginScreen } from '@/components/auth/login-screen'
import { LicenseScreen } from '@/components/license/license-screen'
import { fetchClaudeAuthStatus } from '@/lib/claude-auth'

const APP_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  // frame-ancestors is ignored in meta CSP and must be sent as an HTTP header.
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' ws: wss: http: https:",
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "frame-src 'self' http: https:",
].join('; ')

// KOMANDOS_LICENSE_GATE: future <LicenseGate/> will mount before <Outlet/>.
// Interface stub lives at src/lib/komandos/license.ts

const THEME_STORAGE_KEY = 'komandos-theme'
const LEGACY_THEME_STORAGE_KEY = 'claude-theme'
const DEFAULT_THEME = 'komandos-dark'
const VALID_THEMES = ['komandos-dark']

const themeScript = `
(() => {
  window.process = window.process || { env: {}, platform: 'browser' };

  try {
    const root = document.documentElement
    const validThemes = ${JSON.stringify(VALID_THEMES)}
    // ?theme=komandos-dark в URL форсит выбор и записывает в localStorage —
    // удобно когда у тебя в storage сидит старая тема из предыдущей сессии.
    let urlTheme = null
    try { urlTheme = new URLSearchParams(window.location.search).get('theme') } catch {}
    if (urlTheme && validThemes.includes(urlTheme)) {
      localStorage.setItem('${THEME_STORAGE_KEY}', urlTheme)
    }
    let storedTheme = localStorage.getItem('${THEME_STORAGE_KEY}')
    const legacyTheme = localStorage.getItem('${LEGACY_THEME_STORAGE_KEY}')
    const mappedLegacyTheme = legacyTheme ? 'komandos-dark' : null
    if (!validThemes.includes(storedTheme) && mappedLegacyTheme) {
      storedTheme = mappedLegacyTheme
      localStorage.setItem('${THEME_STORAGE_KEY}', mappedLegacyTheme)
      localStorage.removeItem('${LEGACY_THEME_STORAGE_KEY}')
    } else if (legacyTheme) {
      localStorage.removeItem('${LEGACY_THEME_STORAGE_KEY}')
    }
    const theme = '${DEFAULT_THEME}'
    localStorage.setItem('${THEME_STORAGE_KEY}', theme)
    const isDark = true
    root.classList.remove('light', 'dark', 'system')
    root.classList.add(isDark ? 'dark' : 'light')
    root.setAttribute('data-theme', theme)
    root.style.setProperty('color-scheme', isDark ? 'dark' : 'light')

    // Demo mode
    try {
      if (new URLSearchParams(window.location.search).get('demo') === '1') {
        document.documentElement.setAttribute('data-demo', 'true');
      }
    } catch {}
  } catch {}
})()
`

const themeColorScript = `
(() => {
  try {
    const root = document.documentElement
    const theme = root.getAttribute('data-theme') || '${DEFAULT_THEME}'
    const colors = {
      'komandos-dark': '#0B0B0C',
    }
    const nextColor = colors[theme] || colors['${DEFAULT_THEME}']
    const isDark = true

    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', nextColor)
    root.style.setProperty('color-scheme', isDark ? 'dark' : 'light')
  } catch {}
})()
`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-visual',
      },
      {
        title: 'COMANDOS AI Workspace',
      },
      {
        name: 'description',
        content:
          'COMANDOS AI Workspace — командный центр клуба для чата, инструментов, файлов, памяти и задач.',
      },
      {
        property: 'og:image',
        content: '/cover.png',
      },
      {
        property: 'og:image:type',
        content: 'image/png',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:image',
        content: '/cover.png',
      },
      // PWA meta tags
      {
        name: 'theme-color',
        content: '#0A0A0A',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/komandos/favicon-32.png',
      },
      // PWA manifest and icons
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/komandos/apple-touch-icon.png',
        sizes: '180x180',
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootLayout,
  errorComponent: function RootError({ error }) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-primary-50">
        <h1 className="text-2xl font-semibold text-primary-900 mb-4">
          Что-то пошло не так
        </h1>
        <pre className="p-4 bg-primary-100 rounded-lg text-sm text-primary-700 max-w-full overflow-auto mb-6">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-4 py-2 bg-accent-500 text-[var(--theme-on-accent)] rounded-lg hover:bg-accent-600 transition-colors"
        >
          На главную
        </button>
      </div>
    )
  },
})

const queryClient = new QueryClient()

export function getRootLayoutMode(
  onboardingComplete: string | null,
): 'onboarding' | 'workspace' {
  return onboardingComplete === 'true' ? 'workspace' : 'onboarding'
}

export function wrapInlineScript(source: string): string {
  return `(() => {\n  try {\n${source}\n  } catch (error) {\n    console.error('Inline bootstrap script failed', error)\n  }\n})()`
}

type ServiceWorkerLike = {
  register: (
    scriptURL: string,
    options?: RegistrationOptions,
  ) => Promise<unknown>
}

type CachesLike = {
  keys: () => Promise<Array<string>>
  delete: (name: string) => Promise<boolean> | boolean
}

export async function registerAppServiceWorker({
  serviceWorker,
  cachesApi,
}: {
  serviceWorker?: ServiceWorkerLike
  cachesApi?: CachesLike
}): Promise<void> {
  await cachesApi
    ?.keys()
    .then((names) =>
      Promise.allSettled(names.map((name) => cachesApi.delete(name))),
    )
    .catch(() => undefined)

  await serviceWorker
    ?.register('/sw.js', { scope: '/' })
    .catch((error: unknown) => {
      console.warn('PWA service worker registration failed', error)
    })
}

function RootLayout() {
  const { settings } = useSettings()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isHermesWorldLandingRoute =
    pathname === '/hermes-world' ||
    pathname.startsWith('/hermes-world/') ||
    pathname === '/world' ||
    pathname.startsWith('/world/')
  const isGameSurfaceRoute =
    isHermesWorldLandingRoute ||
    pathname === '/playground' ||
    pathname.startsWith('/playground/')
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null,
  )
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [mounted, setMounted] = useState(false)
  useApplyChatWidth()
  useRussianUiPatcher()

  useEffect(() => {
    setMounted(true)
    initializeSettingsAppearance()

    const syncOnboardingCompletion = () => {
      try {
        setOnboardingComplete(localStorage.getItem(ONBOARDING_KEY) === 'true')
      } catch {
        setOnboardingComplete(false)
      }
    }

    if (typeof window === 'undefined') {
      return undefined
    }

    syncOnboardingCompletion()

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== ONBOARDING_KEY) return
      syncOnboardingCompletion()
    }

    const handleOnboardingCompleteChanged = () => {
      syncOnboardingCompletion()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(
      ONBOARDING_COMPLETE_EVENT,
      handleOnboardingCompleteChanged,
    )

    void registerAppServiceWorker({
      serviceWorker:
        'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
      cachesApi: 'caches' in window ? caches : undefined,
    })

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(
        ONBOARDING_COMPLETE_EVENT,
        handleOnboardingCompleteChanged,
      )
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    let cancelled = false
    fetchClaudeAuthStatus()
      .then((status) => {
        if (!cancelled) setAuthStatus(status)
      })
      .catch(() => {
        if (!cancelled) {
          setAuthStatus({ authenticated: true, authRequired: false })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || authStatus === null) return undefined
    if (authStatus.authRequired && !authStatus.authenticated) return undefined
    if (authStatus.licenseRequired && !authStatus.licenseActivated) {
      return undefined
    }

    let cancelled = false
    void fetch('/api/connection-status')
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          status: {
            ok?: boolean
            chatReady?: boolean
            modelConfigured?: boolean
          } | null,
        ) => {
          if (cancelled || !status) return
          if (status.ok || (status.chatReady && status.modelConfigured)) {
            localStorage.setItem(ONBOARDING_KEY, 'true')
            setOnboardingComplete(true)
          }
        },
      )
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [
    authStatus?.authRequired,
    authStatus?.authenticated,
    authStatus?.licenseRequired,
    authStatus?.licenseActivated,
  ])

  const rootSurfaceState = getRootSurfaceState(onboardingComplete, authStatus)

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      {mounted && rootSurfaceState.showLogin ? <LoginScreen /> : null}
      {mounted && rootSurfaceState.showLicense ? (
        <LicenseScreen status={authStatus?.license} />
      ) : null}
      {mounted && rootSurfaceState.showOnboarding ? <ClaudeOnboarding /> : null}
      {rootSurfaceState.showWorkspaceShell ? (
        <>
          <GlobalShortcutListener />
          <TerminalShortcutListener />
          <WorkspaceShell>
            <ErrorBoundary
              className="h-full min-h-0 flex-1"
              title="Что-то пошло не так"
              description="Страница не открылась. Обновите её и попробуйте ещё раз."
            >
              <Outlet />
            </ErrorBoundary>
          </WorkspaceShell>
          {!isHermesWorldLandingRoute ? <SearchModal /> : null}
          {/* Keep UsageMeter mounted so search-modal OPEN_USAGE still works even when the pill is hidden by default. */}
          {!isGameSurfaceRoute ? (
            <UsageMeter visible={settings.showUsageMeter} />
          ) : null}
          {!isHermesWorldLandingRoute ? <KeyboardShortcutsModal /> : null}
          {!isHermesWorldLandingRoute ? <UpdateCenterNotifier /> : null}
          {rootSurfaceState.showPostOnboardingOverlays &&
          !isGameSurfaceRoute ? (
            <>
              <MobilePromptTrigger />
              <OnboardingTour />
            </>
          ) : null}
        </>
      ) : null}
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={APP_CSP} />
        <script
          dangerouslySetInnerHTML={{
            __html: wrapInlineScript(`
          // Polyfill crypto.randomUUID for non-secure contexts (HTTP access via LAN IP)
          if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
            crypto.randomUUID = function() {
              return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
                return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
              });
            };
          }
        `),
          }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: wrapInlineScript(themeScript) }}
        />
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: wrapInlineScript(themeColorScript),
          }}
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: wrapInlineScript(`
          (function(){
            if (document.getElementById('splash-screen')) return;
            if (location.pathname === '/hermes-world' || location.pathname.indexOf('/hermes-world/') === 0 || location.pathname === '/world' || location.pathname.indexOf('/world/') === 0) return;
            var bg = '#0B0B0C', txt = '#F5F5F4', muted = '#A1A1A1', accent = '#D9FC67';
            try {
              var theme = '${DEFAULT_THEME}';
              localStorage.setItem('${THEME_STORAGE_KEY}', theme);
            } catch(e){}

            var isDark = true;
            var quips = ["Собираем командный центр...","Проверяем связь с агентами...","Готовим рабочую панель...","Подключаем память и инструменты...","Запускаем COMANDOS AI Workspace..."];
            var quip = quips[Math.floor(Math.random() * quips.length)];

            var d = document.createElement('div');
            d.id = 'splash-screen';
            d.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:'+bg+';transition:opacity 0.5s ease;';
            d.innerHTML = '<img src="/komandos/logo-mark.png" alt="COMANDOS AI" style="width:80px;height:80px;margin-bottom:18px;border-radius:16px;filter:drop-shadow(0 8px 32px color-mix(in srgb,'+accent+' 35%, transparent))" />'
              + '<div style="font:800 24px/1.1 Raleway,Inter,system-ui,-apple-system,sans-serif;letter-spacing:-0.02em;color:'+txt+'">COMANDOS AI Workspace</div>'
              + '<div style="margin-top:8px;font:500 12px/1 Raleway,Inter,system-ui,-apple-system,sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:'+muted+'">'+quip+'</div>'
              + '<div style="margin-top:28px;width:140px;height:3px;background:'+(isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')+';border-radius:3px;overflow:hidden;position:relative"><div id=splash-bar style="width:0%;height:100%;background:'+accent+';border-radius:3px;transition:width 0.4s ease"></div></div>';
            document.body.prepend(d);

            var bar = document.getElementById('splash-bar');
            if (bar) {
              setTimeout(function(){ bar.style.width='15%' }, 300);
              setTimeout(function(){ bar.style.width='40%' }, 800);
              setTimeout(function(){ bar.style.width='65%' }, 1500);
              setTimeout(function(){ bar.style.width='85%' }, 2500);
              setTimeout(function(){ bar.style.width='92%' }, 3200);
            }

            window.__dismissSplash = function() {
              var el = document.getElementById('splash-screen');
              if (!el) return;
              if (bar) bar.style.width = '100%';
              setTimeout(function(){
                el.style.pointerEvents = 'none';
                el.style.opacity = '0';
                setTimeout(function(){ el.remove(); }, 500);
              }, 300);
            };
            // Fallback: always dismiss after 5s
            setTimeout(function(){ window.__dismissSplash && window.__dismissSplash(); }, 5000);
            // Fast dismiss: returning users skip quickly
            try {
              if (localStorage.getItem('claude-claude-url') || localStorage.getItem('claude-url')) {
                setTimeout(function(){ window.__dismissSplash && window.__dismissSplash(); }, 600);
              }
            } catch(e) {}
          })()
        `),
          }}
        />
        <div className="root">{children}</div>
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: wrapInlineScript(`
          (function(){
            var start = Date.now();
            function check() {
              var el = document.querySelector('nav, aside, .workspace-shell, [data-testid]');
              var elapsed = Date.now() - start;
              if (el && elapsed > 2500) { window.__dismissSplash && window.__dismissSplash(); }
              else { setTimeout(check, 200); }
            }
            setTimeout(check, 2500);
          })()
        `),
          }}
        />
      </body>
    </html>
  )
}
