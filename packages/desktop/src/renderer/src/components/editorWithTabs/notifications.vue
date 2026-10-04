<template>
  <div
    v-if="currentNotification"
    class="editor-notifications"
    :class="currentNotification.style"
    :style="{ 'max-width': `calc(100vw - ${effectiveSideBarWidth}px)` }"
  >
    <div class="msg">
      {{ currentNotification.msg }}
    </div>
    <div class="controls">
      <div>
        <span
          v-if="currentNotification.diskMarkdown !== undefined"
          class="inline-button text-button"
          @click.stop="showDiff = true"
        >
          {{ t('editor.notifications.showDiff') }}
        </span>
        <span
          v-if="currentNotification.showConfirm"
          class="inline-button"
          @click.stop="handleClick(true)"
        >
          {{ t('common.ok') }}
        </span>
        <span
          class="inline-button"
          @click.stop="handleClick(false)"
        >
          <el-icon
            class="close-icon"
            :size="12"
          >
            <Close />
          </el-icon>
        </span>
      </div>
    </div>
    <el-dialog
      v-model="showDiff"
      :title="t('editor.notifications.diffTitle', { name: currentFile?.filename ?? '' })"
      width="80%"
      append-to-body
    >
      <div class="diff-legend">
        <span class="removed">− {{ t('editor.notifications.diffInMarkText') }}</span>
        <span class="added">+ {{ t('editor.notifications.diffOnDisk') }}</span>
      </div>
      <div class="diff-view">
        <template
          v-for="(line, index) of diff"
          :key="index"
        >
          <div
            v-if="line.type === 'skipped'"
            class="diff-line skipped"
          >
            {{ t('editor.notifications.diffUnchangedLines', { count: line.count }) }}
          </div>
          <div
            v-else
            class="diff-line"
            :class="line.type"
          >
            {{ line.text || ' ' }}
          </div>
        </template>
      </div>
      <template #footer>
        <el-button
          type="primary"
          @click="reloadFromDisk"
        >
          {{ t('editor.notifications.reloadFromDisk') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/store/editor'
import { useLayoutStore } from '@/store/layout'
import { storeToRefs } from 'pinia'
import { Close } from '@element-plus/icons-vue'
import { t } from '../../i18n'
import { collapseUnchanged, diffLines } from '@/util/lineDiff'

const editorStore = useEditorStore()
const layoutStore = useLayoutStore()

const { currentFile } = storeToRefs(editorStore)
const { effectiveSideBarWidth } = storeToRefs(layoutStore)

const currentNotification = computed(() => {
  const notifications = currentFile.value?.notifications
  if (!notifications || notifications.length === 0) {
    return null
  }
  return notifications[0]
})

const showDiff = ref(false)

// Computed only while the dialog is open, since the buffer changes per keystroke.
const diff = computed(() => {
  const diskMarkdown = currentNotification.value?.diskMarkdown
  if (!showDiff.value || diskMarkdown === undefined) return []
  return collapseUnchanged(diffLines(currentFile.value?.markdown ?? '', diskMarkdown))
})

const reloadFromDisk = () => {
  showDiff.value = false
  handleClick(true)
}

const handleClick = (status: boolean) => {
  const notifications = currentFile.value?.notifications
  if (!notifications || notifications.length === 0) {
    console.error(t('editor.notifications.notificationNotFound'))
    return
  }

  const item = notifications.shift()
  const action = item?.action
  if (action) {
    action(status)
  }
}
</script>

<style scoped>
.editor-notifications {
  position: relative;
  display: flex;
  flex-direction: row;
  max-height: 100px;
  margin-top: 4px;
  background: var(--notificationPrimaryBg);
  color: var(--notificationPrimaryColor);
  padding: 8px 10px;
  user-select: none;
  overflow: hidden;
  &.warn {
    background: var(--notificationWarningBg);
    color: var(--notificationWarningColor);
  }
  &.crit {
    background: var(--notificationErrorBg);
    color: var(--notificationErrorColor);
  }
}
.msg {
  font-size: 13px;
  flex: 1;
}
.controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  & > div {
    display: flex;
    flex-direction: row;
  }
  & .inline-button:not(:last-child) {
    margin-right: 3px;
  }
  & .inline-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  & .inline-button.text-button {
    width: auto;
    padding: 0 8px;
  }
  & .inline-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }
}
.diff-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 12px;
  & .removed {
    color: var(--el-color-danger);
  }
  & .added {
    color: var(--el-color-success);
  }
}
.diff-view {
  max-height: 60vh;
  overflow: auto;
  font-family: var(--codeFontFamily, monospace);
  font-size: 12px;
  line-height: 18px;
  user-select: text;
}
.diff-line {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0 8px;
  &.removed {
    background: rgba(245, 108, 108, 0.15);
  }
  &.removed::before {
    content: '− ';
  }
  &.added {
    background: rgba(103, 194, 58, 0.15);
  }
  &.added::before {
    content: '+ ';
  }
  &.same::before {
    content: '  ';
  }
  &.skipped {
    opacity: 0.6;
    font-style: italic;
  }
}
</style>
