// Fork-local: turns a tab into a Google Doc through a personal Apps Script web
// app (see fork-local/drive-upload). Pandoc renders the markdown to docx and the
// script imports that as a native Doc, which keeps tables, images and math.
import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import { app } from 'electron'
import fs from 'fs-extra'
import { MARKDOWN_EXTENSIONS } from 'common/filesystem/paths'
import pandoc, { getCommand } from '../utils/pandoc'
import type {
  DriveFolder,
  DriveUploadRequest,
  DriveUploadResult,
  DriveUploadStatus
} from '@shared/types/driveUpload'

export class DriveUploadError extends Error {}

interface DriveUploadConfig {
  webAppUrl: string
  apiKey: string
}

interface DriveUploadState {
  // Saved tab pathname to the Doc it was uploaded as.
  docs: Record<string, string>
  lastFolder: DriveFolder | null
}

interface ScriptResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const configPath = (): string =>
  path.join(os.homedir(), '.config', 'marktext', 'drive-upload.json')

const statePath = (): string => path.join(app.getPath('userData'), 'drive-upload-state.json')

const docUrl = (id: string): string => `https://docs.google.com/document/d/${id}/edit`

export const markdownToDocx = (markdown: string, cwd: string | undefined): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const proc = spawn(
      getCommand(),
      ['-f', 'gfm+tex_math_dollars+yaml_metadata_block', '-t', 'docx', '-o', '-'],
      { cwd }
    )
    const chunks: Buffer[] = []
    let stderr = ''
    proc.on('error', reject)
    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks))
      } else {
        reject(new DriveUploadError(stderr.trim() || `pandoc exited with code ${code}`))
      }
    })
    proc.stdin.end(markdown)
  })

export const readConfig = async(): Promise<DriveUploadConfig> => {
  const file = configPath()
  let config: Partial<DriveUploadConfig>
  try {
    config = await fs.readJson(file)
  } catch {
    throw new DriveUploadError(`Missing or unreadable ${file}`)
  }
  if (!config.webAppUrl || !config.apiKey) {
    throw new DriveUploadError(`${file} needs both webAppUrl and apiKey`)
  }
  return { webAppUrl: config.webAppUrl, apiKey: config.apiKey }
}

const readState = async(): Promise<DriveUploadState> => {
  try {
    const state = await fs.readJson(statePath())
    return { docs: state.docs ?? {}, lastFolder: state.lastFolder ?? null }
  } catch {
    return { docs: {}, lastFolder: null }
  }
}

const writeState = (state: DriveUploadState): Promise<void> => fs.outputJson(statePath(), state)

const callScript = async<T>(action: string, params: object): Promise<T> => {
  const { webAppUrl, apiKey } = await readConfig()
  // text/plain keeps the POST a simple request; Apps Script parses the body
  // itself and answers with a redirect that fetch follows as a GET.
  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ apiKey, timestamp: Date.now(), action, params })
  })
  if (!response.ok) {
    throw new DriveUploadError(`Apps Script returned HTTP ${response.status}`)
  }
  const json = (await response.json()) as ScriptResponse<T>
  if (!json.success) {
    throw new DriveUploadError(json.error || 'Apps Script reported a failure')
  }
  return json.data as T
}

export const docName = (filename: string): string => {
  const lower = filename.toLowerCase()
  const ext = MARKDOWN_EXTENSIONS.find((x) => lower.endsWith(`.${x}`))
  return ext ? filename.slice(0, -(ext.length + 1)) : filename
}

export const getStatus = async(pathname: string | null): Promise<DriveUploadStatus> => {
  let configError: string | null = null
  try {
    await readConfig()
  } catch (error) {
    configError = (error as Error).message
  }
  const state = await readState()
  const fileId = pathname ? state.docs[pathname] : undefined
  return {
    configured: configError === null,
    configError,
    pandoc: pandoc.exists(),
    existingUrl: fileId ? docUrl(fileId) : null,
    lastFolder: state.lastFolder
  }
}

export const listFolders = (parentId: string | null): Promise<DriveFolder[]> =>
  callScript<DriveFolder[]>('listFolders', { parentId })

export const upload = async(req: DriveUploadRequest): Promise<DriveUploadResult> => {
  const docx = await markdownToDocx(req.markdown, req.pathname ? path.dirname(req.pathname) : undefined)
  const state = await readState()
  const fileId = req.pathname ? state.docs[req.pathname] : undefined
  const result = await callScript<{ id: string, url: string, updated: boolean }>('upload', {
    name: docName(req.filename),
    docxBase64: docx.toString('base64'),
    fileId,
    folderId: fileId ? undefined : req.folder?.id
  })

  if (req.pathname) state.docs[req.pathname] = result.id
  if (!fileId && req.folder) state.lastFolder = req.folder
  await writeState(state)
  return { url: result.url || docUrl(result.id), updated: result.updated }
}
