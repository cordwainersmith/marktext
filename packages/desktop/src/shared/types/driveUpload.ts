export interface DriveFolder {
  id: string
  name: string
}

export interface DriveUploadStatus {
  configured: boolean
  configError: string | null
  pandoc: boolean
  existingUrl: string | null
  lastFolder: DriveFolder | null
}

export interface DriveUploadRequest {
  markdown: string
  filename: string
  // null for untitled tabs, which always get a new Doc.
  pathname: string | null
  // null uploads to My Drive root. Ignored when the tab already has a Doc.
  folder: DriveFolder | null
}

export interface DriveUploadResult {
  url: string
  updated: boolean
}
