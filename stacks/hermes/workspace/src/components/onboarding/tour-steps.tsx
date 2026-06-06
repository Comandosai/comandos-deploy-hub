import type { Step } from 'react-joyride'

export const tourSteps: Array<Step> = [
  // Step 1: Welcome
  {
    target: 'body',
    placement: 'center',
    title: 'Добро пожаловать в COMANDOS AI Workspace',
    content: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <img
          src="/komandos/logo-mark.png"
          alt="COMANDOS AI"
          style={{ width: 48, height: 48, borderRadius: 12 }}
        />
        <p style={{ textAlign: 'center', margin: 0 }}>
          Командный центр для агентов, чатов, файлов и операционных панелей.
          Быстро покажем основные зоны.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  // Step 2: Sidebar
  {
    target: '[data-tour="sidebar-container"]',
    placement: 'right',
    title: 'Навигация',
    content:
      'Здесь собраны основные инструменты. Секции можно сворачивать и держать рабочее пространство плотным.',
  },
  // Step 3: New Session
  {
    target: '[data-tour="new-session"]',
    placement: 'right',
    title: 'Новый чат',
    content:
      'Начните новую сессию с агентом. Диалоги сохраняются автоматически.',
  },
  // Step 4: Dashboard
  {
    target: '[data-tour="dashboard"]',
    placement: 'right',
    title: 'Панель управления',
    content:
      'Обзор сессий, usage и активности в одном командном экране.',
  },
  // Step 5: Agent Hub
  {
    target: '[data-tour="agent-hub"]',
    placement: 'right',
    title: 'Центр агентов',
    content:
      'Управляйте агентами и их конфигурациями, создавайте специализированные роли.',
  },
  // Step 7: Skills
  {
    target: '[data-tour="skills"]',
    placement: 'right',
    title: 'Библиотека навыков',
    content:
      'Просматривайте и устанавливайте skills, чтобы расширять возможности агентов.',
  },
  // Step 8: Terminal
  {
    target: '[data-tour="terminal"]',
    placement: 'right',
    title: 'Встроенный терминал',
    content:
      'Быстрые команды прямо внутри COMANDOS AI Workspace.',
  },
  // Step 9: usage meter in the header
  {
    target: '[data-tour="usage-meter"]',
    placement: 'bottom',
    title: 'Монитор расхода',
    content:
      'Следите за расходом провайдеров, стоимостью и потреблением API.',
  },
  // Step 10: Settings
  {
    target: '[data-tour="settings"]',
    placement: 'right',
    title: 'Настройки',
    content:
      'Настраивайте провайдеры, темы, поведение интерфейса и язык.',
  },
  // Step 11: Finish
  {
    target: 'body',
    placement: 'center',
    title: 'Готово',
    content:
      'Начинайте работу с агентом, открывайте панели и адаптируйте COMANDOS AI Workspace под свой workflow. Для горячих клавиш нажмите ?.',
  },
]
