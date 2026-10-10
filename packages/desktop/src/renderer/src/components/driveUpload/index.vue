<template>
  <el-dialog
    v-model="visible"
    :title="t('sideBar.driveUpload.title')"
    width="440px"
    class="drive-upload-dialog"
    append-to-body
  >
    <div
      v-if="status"
      class="drive-upload"
    >
      <p
        v-if="blocker"
        class="error"
      >
        {{ blocker }}
      </p>
      <template v-else-if="!result">
        <p
          v-if="status.existingUrl"
          class="hint"
        >
          {{ t('sideBar.driveUpload.updatesExisting') }}
        </p>
        <template v-else>
          <el-checkbox
            v-model="toFolder"
            :label="t('sideBar.driveUpload.toFolder')"
          />
          <p class="hint">
            {{ t('sideBar.driveUpload.destination', { name: destinationName }) }}
          </p>
          <el-tree
            v-if="toFolder"
            v-loading="loadingRoot"
            element-loading-background="transparent"
            class="folder-tree"
            :empty-text="loadingRoot ? ' ' : undefined"
            lazy
            highlight-current
            node-key="id"
            :props="{ label: 'name', isLeaf: () => false }"
            :load="loadFolders"
            @current-change="selectFolder"
          />
        </template>
      </template>
      <p
        v-if="result"
        class="hint"
      >
        {{ t(result.updated ? 'sideBar.driveUpload.updated' : 'sideBar.driveUpload.created') }}
      </p>
      <p
        v-if="error"
        class="error"
      >
        {{ t('sideBar.driveUpload.failed', { error }) }}
      </p>
    </div>
    <template #footer>
      <el-button
        v-if="result"
        type="primary"
        @click="openDoc"
      >
        {{ t('sideBar.driveUpload.open') }}
      </el-button>
      <el-button
        v-else
        type="primary"
        :loading="uploading"
        :disabled="!status || !!blocker"
        @click="upload"
      >
        {{ t(uploading ? 'sideBar.driveUpload.uploading' : 'sideBar.driveUpload.upload') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type Node from 'element-plus/es/components/tree/src/model/node'
import bus from '@/bus'
import { t } from '@/i18n'
import type { IFileState } from '@shared/types/files'
import type { DriveFolder, DriveUploadResult, DriveUploadStatus } from '@shared/types/driveUpload'

const visible = ref(false)
const file = ref<IFileState | null>(null)
const status = ref<DriveUploadStatus | null>(null)
const toFolder = ref(false)
const folder = ref<DriveFolder | null>(null)
const uploading = ref(false)
const result = ref<DriveUploadResult | null>(null)
const error = ref('')
// The first Apps Script call takes a few seconds, and the tree would show its
// empty text the whole time.
const loadingRoot = ref(false)

const blocker = computed(() => {
  if (!status.value) return ''
  if (!status.value.configured) {
    return t('sideBar.driveUpload.notConfigured', { error: status.value.configError ?? '' })
  }
  if (!status.value.pandoc) return t('sideBar.driveUpload.noPandoc')
  return ''
})

const destinationName = computed(() =>
  toFolder.value && folder.value ? folder.value.name : t('sideBar.driveUpload.root')
)

const open = async (payload: unknown): Promise<void> => {
  const tab = payload as IFileState
  file.value = tab
  status.value = null
  result.value = null
  error.value = ''
  visible.value = true
  try {
    status.value = await window.driveUpload.status(tab.pathname || null)
    folder.value = status.value.lastFolder
    toFolder.value = !!status.value.lastFolder
  } catch (err) {
    error.value = (err as Error).message
  }
}

const loadFolders = async (
  node: Node,
  resolve: (data: DriveFolder[]) => void
): Promise<void> => {
  const isRoot = node.level === 0
  if (isRoot) loadingRoot.value = true
  try {
    resolve(await window.driveUpload.listFolders(isRoot ? null : node.data.id))
  } catch (err) {
    error.value = (err as Error).message
    resolve([])
  } finally {
    if (isRoot) loadingRoot.value = false
  }
}

const selectFolder = (data: DriveFolder): void => {
  folder.value = { id: data.id, name: data.name }
}

const upload = async (): Promise<void> => {
  if (!file.value) return
  uploading.value = true
  error.value = ''
  try {
    result.value = await window.driveUpload.upload({
      markdown: file.value.markdown,
      filename: file.value.filename,
      pathname: file.value.pathname || null,
      folder: toFolder.value ? folder.value : null
    })
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    uploading.value = false
  }
}

const openDoc = (): void => {
  if (result.value) window.electron.shell.openExternal(result.value.url)
  visible.value = false
}

onMounted(() => {
  bus.on('drive-upload', open)
})

onBeforeUnmount(() => {
  bus.off('drive-upload', open)
})
</script>

<style scoped>
.drive-upload {
  color: var(--floatFontColor);
  & .hint {
    margin: 8px 0;
    font-size: 13px;
  }
  & .error {
    margin: 8px 0;
    font-size: 13px;
    color: #f85149;
    word-break: break-word;
  }
}
.folder-tree {
  max-height: 280px;
  overflow: auto;
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  min-height: 60px;
  background: transparent;
  --el-tree-text-color: var(--floatFontColor);
  --el-tree-expand-icon-color: var(--floatFontColor);
  --el-tree-node-hover-bg-color: var(--floatHoverColor);
  & :deep(.el-tree-node__label) {
    color: inherit;
  }
  &.el-tree--highlight-current :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background: var(--floatHoverColor);
    color: var(--themeColor);
  }
}
</style>

<style>
.drive-upload-dialog .el-dialog__title {
  color: var(--floatFontColor);
}
</style>
