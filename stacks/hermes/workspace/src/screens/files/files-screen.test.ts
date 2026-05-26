import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const filesScreenPath = path.resolve(__dirname, 'files-screen.tsx')

describe('FilesScreen remote workspace mode', () => {
  it('defaults to server-side file access copy instead of local folder picker copy', () => {
    const source = fs.readFileSync(filesScreenPath, 'utf8')

    expect(source).toContain('Рабочая папка сервера')
    expect(source).toContain(
      'Файлы загружаются с сервера Workspace через /api/files',
    )
    expect(source).toContain('Файлы агента появятся здесь')
    expect(source).not.toContain('showDirectoryPicker')
    expect(source).not.toContain('Рабочая папка не выбрана')
  })
})
