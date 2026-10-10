import { EventEmitter } from 'events'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const files = vi.hoisted(() => ({ store: {} as Record<string, unknown> }))
const spawnMock = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({ app: { getPath: () => '/userData' } }))
vi.mock('os', () => ({ default: { homedir: () => '/home/liran' }, homedir: () => '/home/liran' }))
vi.mock('child_process', () => ({ default: { spawn: spawnMock }, spawn: spawnMock }))
vi.mock('main_renderer/utils/pandoc', () => ({
  default: { exists: () => true },
  getCommand: () => 'pandoc'
}))
vi.mock('fs-extra', () => ({
  default: {
    readJson: (p: string) =>
      p in files.store ? Promise.resolve(files.store[p]) : Promise.reject(new Error('ENOENT')),
    outputJson: (p: string, data: unknown) => {
      files.store[p] = JSON.parse(JSON.stringify(data))
      return Promise.resolve()
    }
  }
}))

const { getStatus, upload } = await import('main_renderer/driveUpload')

const CONFIG = '/home/liran/.config/marktext/drive-upload.json'
const STATE = '/userData/drive-upload-state.json'
const URL = 'https://script.google.com/macros/s/abc/exec'

// A fake pandoc that emits `stdout` and exits with `code` once stdin closes.
const fakePandoc = (code = 0, stdout = 'DOCX', stderr = ''): void => {
  spawnMock.mockImplementation(() => {
    const proc = new EventEmitter() as EventEmitter & Record<string, unknown>
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    proc.stdin = {
      end: () => {
        queueMicrotask(() => {
          if (stdout) (proc.stdout as EventEmitter).emit('data', Buffer.from(stdout))
          if (stderr) (proc.stderr as EventEmitter).emit('data', Buffer.from(stderr))
          proc.emit('close', code)
        })
      }
    }
    return proc
  })
}

let fetchMock: ReturnType<typeof vi.fn>

const scriptReplies = (data: unknown): void => {
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) })
}

const sentParams = (call = 0): Record<string, unknown> =>
  JSON.parse(fetchMock.mock.calls[call][1].body).params

const saved = { markdown: '# Hi', filename: 'note.md', pathname: '/notes/note.md', folder: null }

beforeEach(() => {
  files.store = { [CONFIG]: { webAppUrl: URL, apiKey: 'secret' } }
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  spawnMock.mockClear()
  fakePandoc()
})

describe('main/driveUpload', () => {
  it('reports a missing config file with its path', async() => {
    delete files.store[CONFIG]
    const status = await getStatus('/notes/note.md')
    expect(status.configured).toBe(false)
    expect(status.configError).toContain(CONFIG)
  })

  it('creates a Doc on the first upload of a saved tab and remembers its id', async() => {
    scriptReplies({ success: true, data: { id: 'doc1', url: 'https://docs/doc1', updated: false } })

    const result = await upload(saved)

    expect(result).toEqual({ url: 'https://docs/doc1', updated: false })
    expect(sentParams().fileId).toBeUndefined()
    expect(sentParams().name).toBe('note')
    expect(sentParams().docxBase64).toBe(Buffer.from('DOCX').toString('base64'))
    expect(spawnMock.mock.calls[0][2]).toEqual({ cwd: '/notes' })
    expect((files.store[STATE] as { docs: Record<string, string> }).docs).toEqual({ '/notes/note.md': 'doc1' })
  })

  it('updates the remembered Doc on a later upload of the same path', async() => {
    files.store[STATE] = { docs: { '/notes/note.md': 'doc1' }, lastFolder: null }
    scriptReplies({ success: true, data: { id: 'doc1', url: 'https://docs/doc1', updated: true } })

    expect((await getStatus('/notes/note.md')).existingUrl).toContain('doc1')
    const result = await upload({ ...saved, folder: { id: 'f1', name: 'Work' } })

    expect(result.updated).toBe(true)
    expect(sentParams().fileId).toBe('doc1')
    expect(sentParams().folderId).toBeUndefined()
  })

  it('never sends or records a Doc id for an untitled tab', async() => {
    files.store[STATE] = { docs: { '/notes/note.md': 'doc1' }, lastFolder: null }
    scriptReplies({ success: true, data: { id: 'doc2', url: 'https://docs/doc2', updated: false } })

    await upload({ ...saved, filename: 'Untitled-1', pathname: null })

    expect(sentParams().fileId).toBeUndefined()
    expect(spawnMock.mock.calls[0][2]).toEqual({ cwd: undefined })
    expect((files.store[STATE] as { docs: Record<string, string> }).docs).toEqual({ '/notes/note.md': 'doc1' })
  })

  it('remembers the folder a new Doc went into', async() => {
    scriptReplies({ success: true, data: { id: 'doc1', url: 'https://docs/doc1', updated: false } })

    await upload({ ...saved, folder: { id: 'f1', name: 'Work' } })

    expect(sentParams().folderId).toBe('f1')
    expect((await getStatus(null)).lastFolder).toEqual({ id: 'f1', name: 'Work' })
  })

  it('rejects with the script error', async() => {
    scriptReplies({ success: false, error: 'Unauthorized' })
    await expect(upload(saved)).rejects.toThrow('Unauthorized')
    expect(files.store[STATE]).toBeUndefined()
  })

  it('rejects with pandoc stderr on a nonzero exit', async() => {
    fakePandoc(1, '', 'bad markdown')
    await expect(upload(saved)).rejects.toThrow('bad markdown')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the key and a timestamp in the body, not the URL', async() => {
    scriptReplies({ success: true, data: { id: 'doc1', url: 'https://docs/doc1', updated: false } })

    await upload(saved)

    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(url).toBe(URL)
    expect(body.apiKey).toBe('secret')
    expect(typeof body.timestamp).toBe('number')
    expect(body.action).toBe('upload')
  })
})
