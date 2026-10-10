import { ipcMain } from 'electron'
import type { DriveUploadRequest } from '@shared/types/driveUpload'
import { getStatus, listFolders, upload } from '../driveUpload'

export const registerDriveUploadHandlers = (): void => {
  ipcMain.handle('mt::drive-upload::status', (_e, pathname: string | null) => getStatus(pathname))
  ipcMain.handle('mt::drive-upload::list-folders', (_e, parentId: string | null) => listFolders(parentId))
  ipcMain.handle('mt::drive-upload::upload', (_e, req: DriveUploadRequest) => upload(req))
}
