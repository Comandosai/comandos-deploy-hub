import {
  CheckmarkCircle02Icon,
  Home01Icon,
  Plug01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import {
  ConnectionCheckStep,
  ModelConfigurationStep,
} from './setup-step-content'
import type { HugeiconsIcon } from '@hugeicons/react'
import type * as React from 'react'

type IconType = React.ComponentProps<typeof HugeiconsIcon>['icon']

export type OnboardingStepComponentProps = {
  setCanProceed: (canProceed: boolean) => void
}

export type OnboardingStep = {
  id: string
  title: string
  description: string
  icon: IconType
  iconBg: string
  component?: React.ComponentType<OnboardingStepComponentProps>
  nextLabel?: string
  completeLabel?: string
  canProceedByDefault?: boolean
}

export const ONBOARDING_STEPS: Array<OnboardingStep> = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в COMANDOS AI Workspace',
    description: 'Командный центр COMANDOS AI на базе Hermes Agent',
    icon: Home01Icon,
    iconBg: 'bg-orange-500',
    nextLabel: 'Начать',
  },
  {
    id: 'connection-check',
    title: 'Проверка связи',
    description: 'Проверим, что серверная часть Hermes Agent доступна.',
    icon: Plug01Icon,
    iconBg: 'bg-emerald-500',
    component: ConnectionCheckStep,
    canProceedByDefault: false,
  },
  {
    id: 'model-configuration',
    title: 'Настройка модели',
    description: 'Проверьте текущего провайдера и модель.',
    icon: Settings01Icon,
    iconBg: 'bg-cyan-500',
    component: ModelConfigurationStep,
  },
  {
    id: 'ready',
    title: 'Готово',
    description:
      'Начните чат с агентом. Можно попросить его помочь с кодом, исследованием или рабочей задачей.',
    icon: CheckmarkCircle02Icon,
    iconBg: 'bg-emerald-500',
    completeLabel: 'Открыть чат',
  },
]

export const STORAGE_KEY = 'claude-onboarding-complete'
