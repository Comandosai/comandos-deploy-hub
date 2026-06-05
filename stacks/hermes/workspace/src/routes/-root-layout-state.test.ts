import { describe, expect, it } from 'vitest'
import { getRootSurfaceState } from './-root-layout-state'

describe('root layout surface state', () => {
  it('waits for auth status before showing gated surfaces', () => {
    expect(getRootSurfaceState(false, null)).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    })
  })

  it('shows fullscreen onboarding until onboarding is complete', () => {
    const authed = { authRequired: false, authenticated: true }

    expect(getRootSurfaceState(false, authed)).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: true,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    })

    expect(getRootSurfaceState(null, authed)).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: true,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    })
  })

  it('shows workspace shell and post-onboarding overlays after completion', () => {
    expect(
      getRootSurfaceState(true, { authRequired: false, authenticated: true }),
    ).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: true,
      showPostOnboardingOverlays: true,
    })
  })

  it('shows login when auth is required and not authenticated, regardless of onboarding state', () => {
    const unauthed = { authRequired: true, authenticated: false }
    const expected = {
      showLogin: true,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    }

    expect(getRootSurfaceState(false, unauthed)).toEqual(expected)
    expect(getRootSurfaceState(null, unauthed)).toEqual(expected)
    expect(getRootSurfaceState(true, unauthed)).toEqual(expected)
  })

  it('does not gate on auth when auth is not required', () => {
    expect(
      getRootSurfaceState(true, { authRequired: false, authenticated: false }),
    ).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: true,
      showPostOnboardingOverlays: true,
    })
  })

  it('does not gate on auth when authenticated', () => {
    expect(
      getRootSurfaceState(false, { authRequired: true, authenticated: true }),
    ).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: true,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    })
  })

  it('shows license activation after password auth when license is required', () => {
    expect(
      getRootSurfaceState(true, {
        authRequired: true,
        authenticated: true,
        licenseRequired: true,
        licenseActivated: false,
      }),
    ).toEqual({
      showLogin: false,
      showLicense: true,
      showOnboarding: false,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    })
  })

  it('does not gate on license when activated', () => {
    expect(
      getRootSurfaceState(true, {
        authRequired: true,
        authenticated: true,
        licenseRequired: true,
        licenseActivated: true,
      }),
    ).toEqual({
      showLogin: false,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: true,
      showPostOnboardingOverlays: true,
    })
  })
})
