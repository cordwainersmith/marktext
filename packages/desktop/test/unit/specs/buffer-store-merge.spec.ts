import { mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: () => {} } }))

const { default: EditorBufferStore, mergeBufferStates } =
  await import('main_renderer/editorBufferStore')

const tab = (id: string, pathname: string | null, isSaved: boolean, markdown = '') => ({
  id,
  pathname,
  isSaved,
  markdown
})

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('mergeBufferStates', () => {
  it('keeps the first state as the base and scopes tab ids per buffer', () => {
    const merged = mergeBufferStates([
      { tabs: [tab('mt-1', '/a.md', true)], currentFileId: 'mt-1', layout: { rightColumn: 'toc' } },
      {
        tabs: [tab('mt-1', '/b.md', true)],
        currentFileId: 'mt-1',
        layout: { rightColumn: 'files' }
      }
    ])

    expect(merged.tabs.map((t) => [t.id, t.pathname])).toEqual([
      ['0:mt-1', '/a.md'],
      ['1:mt-1', '/b.md']
    ])
    expect(merged.currentFileId).toBe('0:mt-1')
    expect(merged.layout).toEqual({ rightColumn: 'toc' })
  })

  it('drops saved duplicates but never an unsaved tab', () => {
    const merged = mergeBufferStates([
      { tabs: [tab('1', '/hld.md', false, 'edit A'), tab('2', '/x.md', true)] },
      {
        tabs: [
          tab('1', '/hld.md', true),
          tab('2', '/hld.md', false, 'edit B'),
          tab('3', '/x.md', true),
          tab('4', null, false, 'untitled')
        ]
      }
    ])

    expect(merged.tabs.map((t) => t.markdown)).toEqual(['edit A', '', 'edit B', 'untitled'])
  })

  it('remaps restore warnings to the scoped tab ids', () => {
    const merged = mergeBufferStates([
      { tabs: [] },
      { tabs: [tab('mt-3', '/c.md', true)], restoreWarnings: [{ tabId: 'mt-3', msg: 'm' }] }
    ])
    expect(merged.restoreWarnings).toEqual([{ tabId: '1:mt-3', msg: 'm' }])
  })
})

describe('EditorBufferStore.mergeAllBufferStores', () => {
  const setup = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mt-merge-'))
    dirs.push(dir)
    const write = (id: string, content: unknown, mtimeSec: number) => {
      const file = path.join(dir, `${id}_editor_buffer_store.json`)
      writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
      utimesSync(file, mtimeSec, mtimeSec)
    }
    return { dir, write, store: new EditorBufferStore({ editorBufferStorePath: dir }) }
  }

  it('returns null when there are no buffers', () => {
    expect(setup().store.mergeAllBufferStores()).toBeNull()
  })

  it('merges into the newest buffer, deletes the others and leaves unreadable ones', () => {
    const { dir, write } = setup()
    write('old', { tabs: [tab('mt-1', '/old.md', false)], currentFileId: 'mt-1' }, 1000)
    write('new', { tabs: [tab('mt-1', '/new.md', true)], currentFileId: 'mt-1' }, 2000)
    write('broken', '', 1500)
    const store = new EditorBufferStore({ editorBufferStorePath: dir })

    const entry = store.mergeAllBufferStores()

    expect(entry?.id).toBe('new')
    expect(readdirSync(dir).sort()).toEqual([
      'broken_editor_buffer_store.json',
      'new_editor_buffer_store.json'
    ])
    const merged = JSON.parse(readFileSync(path.join(dir, 'new_editor_buffer_store.json'), 'utf8'))
    expect(merged.tabs.map((t: { pathname: string }) => t.pathname)).toEqual(['/new.md', '/old.md'])
    expect(merged.currentFileId).toBe('0:mt-1')
  })
})
