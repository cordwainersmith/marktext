import type { TabDescriptor } from './types'

export interface OpenedFileMatch {
  tab: TabDescriptor
  // The first content line containing the query, trimmed for display. Null
  // when only the filename matched.
  snippet: string | null
}

const SNIPPET_MAX_LENGTH = 80

// Characters kept before the match when a long line has to be cut, so the
// match itself stays visible.
const SNIPPET_LEAD = 20

const findSnippet = (markdown: string, needle: string): string | null => {
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim()
    const index = line.toLowerCase().indexOf(needle)
    if (index === -1) continue
    const start = line.length <= SNIPPET_MAX_LENGTH ? 0 : Math.max(0, index - SNIPPET_LEAD)
    const end = start + SNIPPET_MAX_LENGTH
    return `${start > 0 ? '…' : ''}${line.slice(start, end)}${end < line.length ? '…' : ''}`
  }
  return null
}

export const filterOpenedFiles = (tabs: TabDescriptor[], query: string): OpenedFileMatch[] => {
  const needle = query.trim().toLowerCase()
  if (!needle) return tabs.map((tab) => ({ tab, snippet: null }))

  const matches: OpenedFileMatch[] = []
  for (const tab of tabs) {
    const snippet = findSnippet(tab.markdown ?? '', needle)
    if (snippet !== null || tab.filename.toLowerCase().includes(needle)) {
      matches.push({ tab, snippet })
    }
  }
  return matches
}

// The parent folder shown next to a filename. Paths under ~/projects start at
// the project folder (e.g. `marktext/docs`), other paths under home use `~`.
export const folderLabel = (pathname: string | null, home: string | undefined): string => {
  if (!pathname) return ''
  const segments = pathname.split(/[\\/]/)
  segments.pop()
  const dir = segments.join('/')
  if (!home) return dir

  const homeDir = home.split(/[\\/]/).join('/')
  const projectsPrefix = `${homeDir}/projects/`
  if (dir.startsWith(projectsPrefix)) return dir.slice(projectsPrefix.length)
  if (dir === homeDir || dir.startsWith(`${homeDir}/`)) return `~${dir.slice(homeDir.length)}`
  return dir
}
