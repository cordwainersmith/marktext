// Drops the open buffer into the llm-wiki inbox, the folder `wiki-fetch inbox`
// converts into immutable sources under `raw/`. Nothing here runs the ingest
// pipeline; the drop is the whole contract, and the next `uv run wiki-ingest`
// picks the file up.
import type { IFileState } from '@shared/types/files'

const INBOX_RELATIVE_DIR = 'projects/llm-wiki/inbox'

// Enough room to disambiguate a busy inbox without spinning on a pathological
// directory.
const MAX_SUFFIX_ATTEMPTS = 50

export type DropStatus = 'written' | 'duplicate'

export interface DropResult {
  status: DropStatus
  pathname: string
}

export class WikiInboxError extends Error {}

export const inboxDir = (): string => {
  const home = window.electron.process.env.HOME
  if (!home) throw new WikiInboxError('HOME is not set')
  return window.path.join(home, INBOX_RELATIVE_DIR)
}

// Untitled buffers carry a bare `Untitled-1`, and a plain-text note would land
// as `.txt`. Both need a markdown extension for the converter to route them.
export const inboxFilename = (filename: string): string =>
  window.fileUtils.hasMarkdownExtension(filename) ? filename : `${filename}.md`

/**
 * Pick a name inside `dir` that does not clobber a drop already waiting to be
 * ingested. An identical body is reported as a duplicate rather than written
 * twice, which keeps the button idempotent; a different body under the same
 * name gets a `-1`, `-2`, … suffix.
 */
export const resolveDropTarget = async(
  dir: string,
  filename: string,
  markdown: string
): Promise<DropResult> => {
  const extension = window.path.extname(filename)
  const stem = filename.slice(0, filename.length - extension.length)

  for (let attempt = 0; attempt <= MAX_SUFFIX_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? filename : `${stem}-${attempt}${extension}`
    const pathname = window.path.join(dir, candidate)

    if (!(await window.fileUtils.pathExists(pathname))) {
      return { status: 'written', pathname }
    }
    if ((await window.fileUtils.readFile(pathname, 'utf8')) === markdown) {
      return { status: 'duplicate', pathname }
    }
  }

  throw new WikiInboxError(`no free name for "${filename}" up to suffix -${MAX_SUFFIX_ATTEMPTS}`)
}

/**
 * Write the tab's live buffer (unsaved edits included) into the inbox.
 * `outputFile` creates the directory, so a first run on a fresh machine works.
 */
export const dropIntoWikiInbox = async(file: IFileState): Promise<DropResult> => {
  const target = await resolveDropTarget(inboxDir(), inboxFilename(file.filename), file.markdown)
  if (target.status === 'written') {
    await window.fileUtils.outputFile(target.pathname, file.markdown)
  }
  return target
}
