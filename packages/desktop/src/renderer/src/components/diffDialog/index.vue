<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="80%"
    class="diff-dialog"
    append-to-body
  >
    <div class="diff-legend">
      <span><span class="removed">−</span> {{ beforeLabel }}</span>
      <span><span class="added">+</span> {{ afterLabel }}</span>
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
    <template
      v-if="actionLabel"
      #footer
    >
      <el-button
        type="primary"
        @click="emit('action')"
      >
        {{ actionLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../i18n'
import { collapseUnchanged, diffLines } from '@/util/lineDiff'

const props = defineProps<{
  title: string
  before: string
  after: string
  beforeLabel: string
  afterLabel: string
  actionLabel?: string
}>()

const emit = defineEmits<{ action: [] }>()

const visible = defineModel<boolean>({ required: true })

// Computed only while open, since `before` is often the live buffer.
const diff = computed(() =>
  visible.value ? collapseUnchanged(diffLines(props.before, props.after)) : []
)
</script>

<style scoped>
.diff-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--floatFontColor);
  & .removed {
    color: #f85149;
  }
  & .added {
    color: #3fb950;
  }
}
/* The editor's own colors, so text contrast holds in every theme. */
.diff-view {
  max-height: 60vh;
  overflow: auto;
  padding: 6px 0;
  border-radius: 4px;
  border: 1px solid var(--floatBorderColor);
  background: var(--editorBgColor);
  color: var(--editorColor);
  font-family: var(--codeFontFamily, monospace);
  font-size: 13px;
  line-height: 20px;
  user-select: text;
}
.diff-line {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0 10px;
  border-left: 3px solid transparent;
  &.removed {
    background: rgba(248, 81, 73, 0.18);
    border-left-color: #f85149;
  }
  &.removed::before {
    content: '− ';
    color: #f85149;
  }
  &.added {
    background: rgba(63, 185, 80, 0.18);
    border-left-color: #3fb950;
  }
  &.added::before {
    content: '+ ';
    color: #3fb950;
  }
  &.same::before {
    content: '  ';
  }
  &.skipped {
    color: var(--editorColor50);
    font-style: italic;
  }
}
</style>

<style>
.diff-dialog .el-dialog__title {
  color: var(--floatFontColor);
}
</style>
