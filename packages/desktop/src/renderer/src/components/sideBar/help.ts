import {
  Folder as FilesIcon,
  Files as OpenedFilesIcon,
  Search as SearchIcon,
  Memo as TocIcon,
  Promotion as WikiInboxIcon,
  Setting as SettingIcon,
  UploadFilled as DriveUploadIcon
} from '@element-plus/icons-vue'
import { t } from '@/i18n'

export interface SideBarIconEntry {
  id: string
  name: () => string
  icon: unknown
}

export const sideBarIcons: SideBarIconEntry[] = [
  {
    id: 'files',
    name: () => t('sideBar.icons.files'),
    icon: FilesIcon
  },
  {
    id: 'openedFiles',
    name: () => t('sideBar.icons.openedFiles'),
    icon: OpenedFilesIcon
  },
  {
    id: 'search',
    name: () => t('sideBar.icons.search'),
    icon: SearchIcon
  },
  {
    id: 'toc',
    name: () => t('sideBar.icons.toc'),
    icon: TocIcon
  }
]

export const sideBarBottomIcons: SideBarIconEntry[] = [
  {
    id: 'wikiInbox',
    name: () => t('sideBar.icons.wikiInbox'),
    icon: WikiInboxIcon
  },
  {
    id: 'driveUpload',
    name: () => t('sideBar.icons.driveUpload'),
    icon: DriveUploadIcon
  },
  {
    id: 'settings',
    name: () => t('sideBar.icons.settings'),
    icon: SettingIcon
  }
]
