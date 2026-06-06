import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
} from '../../server/rate-limit'

type SuggestedCommand = {
  command: string
  description: string
}

type DebugAnalysis = {
  summary: string
  rootCause: string
  suggestedCommands: Array<SuggestedCommand>
  docsLink?: string
}

function cleanTerminalOutput(value: unknown): string {
  return typeof value === 'string' ? value.slice(-16_000) : ''
}

function analyzeTerminalOutput(output: string): DebugAnalysis {
  const lower = output.toLowerCase()
  const commands: Array<SuggestedCommand> = []

  if (!output.trim()) {
    return {
      summary: 'В активном терминале пока нет вывода для анализа.',
      rootCause:
        'Команда ещё не запускалась, вывод очищен или терминал не успел подключиться.',
      suggestedCommands: [
        {
          command: 'pwd && ls -la',
          description:
            'Проверить текущую папку и убедиться, что терминал принимает команды.',
        },
      ],
    }
  }

  if (lower.includes('command not found') || lower.includes('not recognized')) {
    commands.push({
      command: 'echo $PATH && which node pnpm git',
      description:
        'Проверить PATH и наличие базовых команд, которые часто нужны панели.',
    })
    return {
      summary: 'Похоже, команда не найдена в окружении терминала.',
      rootCause:
        'Нужный бинарный файл не установлен или каталог с ним не добавлен в PATH.',
      suggestedCommands: commands,
    }
  }

  if (
    lower.includes('eaddrinuse') ||
    lower.includes('address already in use') ||
    lower.includes('port is already allocated')
  ) {
    commands.push({
      command: 'lsof -iTCP -sTCP:LISTEN -P -n | head -80',
      description:
        'Посмотреть, какой процесс уже слушает порт, прежде чем менять настройки.',
    })
    return {
      summary: 'Похоже, нужный порт уже занят.',
      rootCause:
        'Сервис пытается стартовать на порту, который уже слушает другой процесс.',
      suggestedCommands: commands,
    }
  }

  if (
    lower.includes('permission denied') ||
    lower.includes('eacces') ||
    lower.includes('operation not permitted')
  ) {
    commands.push({
      command: 'id && pwd && ls -ld .',
      description:
        'Проверить пользователя, текущую папку и права на запись в рабочий каталог.',
    })
    return {
      summary: 'Похоже, операция упёрлась в права доступа.',
      rootCause:
        'Текущий пользователь не может читать, писать или запускать нужный файл.',
      suggestedCommands: commands,
    }
  }

  if (
    lower.includes('[reconnecting') ||
    lower.includes('failed to connect') ||
    lower.includes('connection error') ||
    lower.includes('[переподключаюсь') ||
    lower.includes('не удалось подключиться') ||
    lower.includes('ошибка соединения')
  ) {
    commands.push({
      command: 'curl -fsS http://127.0.0.1:8642/health || true',
      description:
        'Проверить, отвечает ли локальный Hermes Agent Gateway на стандартном порту.',
    })
    commands.push({
      command: 'ps aux | grep -i hermes | grep -v grep',
      description:
        'Понять, запущен ли Hermes Agent или связанный gateway-процесс.',
    })
    return {
      summary: 'Терминал или gateway показывает признаки переподключения.',
      rootCause:
        'Серверная часть терминала или Hermes Agent Gateway недоступны, перезапускаются или слушают другой адрес.',
      suggestedCommands: commands,
    }
  }

  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('exception')
  ) {
    commands.push({
      command: 'tail -n 120 logs/*.log 2>/dev/null || true',
      description:
        'Если в проекте есть логи, посмотреть последние ошибки без длинной прокрутки терминала.',
    })
    commands.push({
      command: 'git status --short',
      description:
        'Проверить, не совпала ли ошибка с незавершёнными локальными изменениями.',
    })
    return {
      summary: 'В выводе терминала есть ошибка, но нужен ближайший контекст.',
      rootCause:
        'По последним строкам видно только общий сбой. Нужны соседние строки лога или команда, которая его вызвала.',
      suggestedCommands: commands,
    }
  }

  return {
    summary: 'Критичных признаков ошибки в последних строках не найдено.',
    rootCause:
      'Вывод терминала не содержит типовых маркеров сбоя. Если проблема остаётся, проверьте команду, которую запускали, и серверные логи.',
    suggestedCommands: [
      {
        command: 'pwd && git status --short',
        description:
          'Быстро понять текущую папку и есть ли незавершённые изменения.',
      },
    ],
  }
}

export const Route = createFileRoute('/api/debug-analyze')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        const ip = getClientIp(request)
        if (!rateLimit(`debug-analyze:${ip}`, 60, 60_000)) {
          return rateLimitResponse()
        }

        const body = (await request.json().catch(() => ({}))) as Record<
          string,
          unknown
        >
        return json(analyzeTerminalOutput(cleanTerminalOutput(body.terminalOutput)))
      },
    },
  },
})
