import { posix } from 'path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IFileState } from '@shared/types/files'
import { dropIntoWikiInbox, inboxDir, WikiInboxError } from '@/services/wikiInbox'

const HOME = '/Users/liran'
const INBOX = `${HOME}/projects/llm-wiki/inbox`

// The service reaches window.path, window.fileUtils and window.electron at call
// time; back them with an in-memory inbox so each spec can seed what is already
// waiting there.
let inbox: Record<string, string>
let outputFile: ReturnType<typeof vi.fn>

const tab = (filename: string, markdown: string): IFileState =>
  ({ filename, markdown }) as IFileState

beforeEach(() => {
  inbox = {}
  outputFile = vi.fn((p: string, data: string) => {
    inbox[p] = data
    return Promise.resolve()
  })

  const w = window as unknown as Record<string, unknown>
  w.path = {
    join: (...parts: string[]) => posix.join(...parts),
    extname: (p: string) => posix.extname(p)
  }
  w.fileUtils = {
    hasMarkdownExtension: (name: string) => name.toLowerCase().endsWith('.md'),
    pathExists: (p: string) => Promise.resolve(p in inbox),
    readFile: (p: string) => Promise.resolve(inbox[p]),
    outputFile
  }
  w.electron = { process: { env: { HOME } } }
})

describe('services/wikiInbox', () => {
  it('resolves the inbox under the user home', () => {
    expect(inboxDir()).toBe(INBOX)
  })

  it('throws when HOME is unset rather than writing to a relative path', () => {
    const electron = (window as unknown as { electron: { process: { env: Record<string, string> } } }).electron
    electron.process.env = {}

    expect(() => inboxDir()).toThrow(WikiInboxError)
  })

  it('writes the live buffer into the inbox', async() => {
    const result = await dropIntoWikiInbox(tab('notes.md', '# notes'))

    expect(result).toEqual({ status: 'written', pathname: `${INBOX}/notes.md` })
    expect(outputFile).toHaveBeenCalledWith(`${INBOX}/notes.md`, '# notes')
  })

  it('gives an untitled buffer a markdown extension so the converter routes it', async() => {
    const result = await dropIntoWikiInbox(tab('Untitled-1', 'scratch'))

    expect(result.pathname).toBe(`${INBOX}/Untitled-1.md`)
  })

  it('reports a duplicate without rewriting when the same body is already waiting', async() => {
    inbox[`${INBOX}/notes.md`] = '# notes'

    const result = await dropIntoWikiInbox(tab('notes.md', '# notes'))

    expect(result).toEqual({ status: 'duplicate', pathname: `${INBOX}/notes.md` })
    expect(outputFile).not.toHaveBeenCalled()
  })

  it('suffixes rather than clobbering a different drop under the same name', async() => {
    inbox[`${INBOX}/notes.md`] = 'a pending drop'

    const result = await dropIntoWikiInbox(tab('notes.md', 'different content'))

    expect(result).toEqual({ status: 'written', pathname: `${INBOX}/notes-1.md` })
    expect(inbox[`${INBOX}/notes.md`]).toBe('a pending drop')
  })

  it('keeps counting past the first suffix', async() => {
    inbox[`${INBOX}/notes.md`] = 'one'
    inbox[`${INBOX}/notes-1.md`] = 'two'

    const result = await dropIntoWikiInbox(tab('notes.md', 'three'))

    expect(result.pathname).toBe(`${INBOX}/notes-2.md`)
  })

  it('matches a duplicate that already carries a suffix', async() => {
    inbox[`${INBOX}/notes.md`] = 'one'
    inbox[`${INBOX}/notes-1.md`] = 'two'

    const result = await dropIntoWikiInbox(tab('notes.md', 'two'))

    expect(result).toEqual({ status: 'duplicate', pathname: `${INBOX}/notes-1.md` })
    expect(outputFile).not.toHaveBeenCalled()
  })
})
