import { describe, it, expect } from 'vitest'
import type { IFileState } from '@shared/types/files'
import { filterOpenedFiles } from '@/components/sideBar/openedFilesFilter'

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
