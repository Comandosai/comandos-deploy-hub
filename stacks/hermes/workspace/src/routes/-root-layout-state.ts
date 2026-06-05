export type RootSurfaceState = {
  showLogin: boolean
  showLicense: boolean
  showOnboarding: boolean
  showWorkspaceShell: boolean
  showPostOnboardingOverlays: boolean
}

export type RootAuthStatus = {
  authRequired: boolean
  authenticated: boolean
  licenseRequired?: boolean
  licenseActivated?: boolean
}

export function getRootSurfaceState(
  onboardingComplete: boolean | null,
  authStatus: RootAuthStatus | null = null,
): RootSurfaceState {
  if (authStatus === null) {
    return {
      showLogin: false,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    }
  }

  if (authStatus.authRequired && !authStatus.authenticated) {
    return {
      showLogin: true,
      showLicense: false,
      showOnboarding: false,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    }
  }

  if (authStatus.licenseRequired && !authStatus.licenseActivated) {
    return {
      showLogin: false,
      showLicense: true,
      showOnboarding: false,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    }
  }

  if (onboardingComplete !== true) {
    return {
      showLogin: false,
      showLicense: false,
      showOnboarding: true,
      showWorkspaceShell: false,
      showPostOnboardingOverlays: false,
    }
  }

  return {
    showLogin: false,
    showLicense: false,
    showOnboarding: false,
    showWorkspaceShell: true,
    showPostOnboardingOverlays: true,
  }
}
