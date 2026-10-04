import { describe, it, expect } from 'vitest'
import type { IFileState } from '@shared/types/files'
import { filterOpenedFiles, folderLabel } from '@/components/sideBar/openedFilesFilter'

const tab = (filename: string, markdown: string): IFileState =>
  ({ id: filename, filename, markdown }) as IFileState

const tabs = [
  tab('vertex-setup.md', '# Vertex\n\nConfigure the Gemini endpoint.'),
  tab('HLD.md', '# Design\n\nThe agent calls vertex through a proxy.'),
  tab('notes.md', 'Nothing relevant here.')
]

describe('filterOpenedFiles', () => {
  it('returns every tab without snippets for an empty or blank query', () => {
    expect(filterOpenedFiles(tabs, '   ')).toEqual(tabs.map((t) => ({ tab: t, snippet: null })))
  })

  it('matches filenames and content case-insensitively', () => {
    const names = filterOpenedFiles(tabs, 'VERTEX').map((m) => m.tab.filename)
    expect(names).toEqual(['vertex-setup.md', 'HLD.md'])
  })

  it('returns the first matching content line as the snippet', () => {
    const [match] = filterOpenedFiles(tabs, 'proxy')
    expect(match.tab.filename).toBe('HLD.md')
    expect(match.snippet).toBe('The agent calls vertex through a proxy.')
  })

  it('has no snippet when only the filename matches', () => {
    expect(filterOpenedFiles(tabs, 'setup')).toEqual([{ tab: tabs[0], snippet: null }])
  })

  it('cuts long lines around the match so it stays visible', () => {
    const long = tab('long.md', `${'a'.repeat(200)} needle ${'b'.repeat(200)}`)
    const [{ snippet }] = filterOpenedFiles([long], 'needle')
    expect(snippet?.startsWith('…')).toBe(true)
    expect(snippet?.endsWith('…')).toBe(true)
    expect(snippet).toContain('needle')
  })
})

describe('folderLabel', () => {
  const home = '/Users/me'

  it('starts at the project folder for files under ~/projects', () => {
    expect(folderLabel('/Users/me/projects/marktext/docs/a.md', home)).toBe('marktext/docs')
    expect(folderLabel('/Users/me/projects/marktext/a.md', home)).toBe('marktext')
  })

  it('abbreviates other paths under home with ~', () => {
    expect(folderLabel('/Users/me/projects/a.md', home)).toBe('~/projects')
    expect(folderLabel('/Users/me/Documents/a.md', home)).toBe('~/Documents')
    expect(folderLabel('/Users/me/a.md', home)).toBe('~')
  })

  it('keeps paths outside home unchanged', () => {
    expect(folderLabel('/tmp/notes/a.md', home)).toBe('/tmp/notes')
    expect(folderLabel('/Users/meow/a.md', home)).toBe('/Users/meow')
  })

  it('is empty for untitled buffers', () => {
    expect(folderLabel(null, home)).toBe('')
  })
})
