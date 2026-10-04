<template>
  <div
    class="opened-file"
    :title="file.pathname"
    :class="[{ active: currentFile?.id === file.id, unsaved: !file.isSaved }]"
    @click="selectFile(file)"
  >
    <el-icon
      class="close-icon"
      :size="10"
      @click.stop="removeFileInTab(file)"
    >
      <Close />
    </el-icon>
    <span class="name">{{ file.filename }}</span>
    <span
      v-if="folder"
      class="folder"
    >{{ folder }}</span>
    <el-tooltip
      v-if="diffTooltip"
      :content="diffTooltip"
      placement="bottom"
    >
      <el-icon
        class="diff-icon"
        :size="14"
        @click.stop="emit('show-diff')"
      >
        <View />
      </el-icon>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/store/editor'
import { Close, View } from '@element-plus/icons-vue'
import type { TabDescriptor } from './types'

defineProps<{
  file: TabDescriptor
  folder?: string
  // Shows a hover button that emits show-diff, with this as its tooltip.
  diffTooltip?: string
}>()

const emit = defineEmits<{ 'show-diff': [] }>()

const editorStore = useEditorStore()

const { currentFile } = storeToRefs(editorStore)

const selectFile = (file: TabDescriptor): void => {
  if (file.id !== currentFile.value?.id) {
    editorStore.UPDATE_CURRENT_FILE(file)
  }
}

const removeFileInTab = (file: TabDescriptor): void => {
  const { isSaved } = file
  if (isSaved) {
    editorStore.FORCE_CLOSE_TAB(file)
  } else {
    editorStore.CLOSE_UNSAVED_TAB(file)
  }
}
</script>

<style scoped>
.opened-file {
  display: flex;
  user-select: none;
  height: 28px;
  line-height: 28px;
  padding-left: 35px;
  position: relative;
  color: var(--sideBarColor);
  & > .close-icon {
    display: none;
    position: absolute;
    top: 9px;
    left: 10px;
    cursor: pointer;
  }
  &:hover > .close-icon {
    display: inline-flex;
  }
  & > .diff-icon {
    display: none;
    flex-shrink: 0;
    margin: 0 12px 0 auto;
    align-self: center;
    cursor: pointer;
  }
  &:hover > .diff-icon {
    display: inline-flex;
  }
  & > .diff-icon:hover {
    color: var(--highlightThemeColor);
  }
  &:hover {
    background: var(--sideBarItemHoverBgColor);
  }
  & > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Gives up its width before the filename does. */
  & > .folder {
    flex-shrink: 1000;
    margin: 0 10px 0 6px;
    font-size: 12px;
    color: var(--sideBarTextColor);
  }
}
.opened-file.active {
  color: var(--highlightThemeColor);
}
.unsaved.opened-file::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--highlightThemeColor);
  position: absolute;
  top: 11px;
  left: 12px;
}
.unsaved.opened-file:hover::before {
  content: none;
}
</style>
