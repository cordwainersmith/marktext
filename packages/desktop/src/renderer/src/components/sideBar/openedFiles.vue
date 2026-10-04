<template>
  <div class="opened-files-view">
    <div class="search-wrapper">
      <input
        v-model="query"
        type="text"
        :placeholder="t('sideBar.openedFiles.searchPlaceholder')"
        @keyup.esc="query = ''"
      >
    </div>
    <div class="title">
      <span class="text-overflow">{{ t('sideBar.tree.openedFiles') }}</span>
      <el-tooltip
        v-if="changedOnDisk"
        :content="t('sideBar.openedFiles.reloadChanged', { count: changedOnDisk })"
        placement="bottom"
      >
        <a
          href="javascript:;"
          class="badge-action"
          @click.stop="editorStore.RELOAD_TABS_CHANGED_ON_DISK()"
        >
          <el-icon><Refresh /></el-icon>
          {{ changedOnDisk }}
        </a>
      </el-tooltip>
      <el-tooltip
        v-if="locallyEdited"
        :content="t('sideBar.openedFiles.saveEdited', { count: locallyEdited })"
        placement="bottom"
      >
        <a
          href="javascript:;"
          class="badge-action"
          @click.stop="editorStore.SAVE_TABS_WITH_LOCAL_EDITS()"
        >
          <svg
            class="icon"
            aria-hidden="true"
          >
            <use xlink:href="#icon-save-all" />
          </svg>
          {{ locallyEdited }}
        </a>
      </el-tooltip>
      <a
        href="javascript:;"
        :title="t('sideBar.tree.closeAll')"
        @click.stop="editorStore.ASK_FOR_SAVE_ALL(true)"
      >
        <svg
          class="icon"
          aria-hidden="true"
        >
          <use xlink:href="#icon-close-all" />
        </svg>
      </a>
    </div>
    <div class="opened-files-list">
      <div
        v-for="{ tab, snippet } of matches"
        :key="tab.id"
      >
        <opened-file
          :file="tab"
          :folder="folderLabel(tab.pathname, home)"
          :diff-tooltip="
            tab.pathname && hasLocalEditsOnly(tab) ? t('sideBar.openedFiles.showUnsaved') : undefined
          "
          @show-diff="showUnsavedDiff(tab)"
        />
        <div
          v-if="snippet"
          class="snippet"
          :title="snippet"
          @click="editorStore.UPDATE_CURRENT_FILE(tab)"
        >
          {{ snippet }}
        </div>
      </div>
      <div
        v-if="query && !matches.length"
        class="no-results"
      >
        {{ t('sideBar.search.noResultsFound') }}
      </div>
    </div>
    <diff-dialog
      v-model="diffOpen"
      :title="t('sideBar.openedFiles.unsavedTitle', { name: diffTab?.filename ?? '' })"
      :before="savedMarkdown"
      :after="diffTab?.markdown ?? ''"
      :before-label="t('sideBar.openedFiles.diffSaved')"
      :after-label="t('sideBar.openedFiles.diffUnsaved')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/store/editor'
import OpenedFile from './treeOpenedTab.vue'
import DiffDialog from '../diffDialog/index.vue'
import type { TabDescriptor } from './types'
import { Refresh } from '@element-plus/icons-vue'
import {
  countTabsChangedOnDisk,
  filterOpenedFiles,
  folderLabel,
  hasLocalEditsOnly
} from './openedFilesFilter'

const { t } = useI18n()
const editorStore = useEditorStore()
const { tabs } = storeToRefs(editorStore)

const home = window.electron.process.env.HOME
const query = ref('')
const diffOpen = ref(false)
const diffTab = ref<TabDescriptor | null>(null)
const savedMarkdown = ref('')

const showUnsavedDiff = async (tab: TabDescriptor): Promise<void> => {
  if (!tab.pathname) return
  try {
    const raw = await window.fileUtils.readFile(tab.pathname, 'utf8')
    // The buffer always holds LF line endings, whatever the file uses.
    savedMarkdown.value = String(raw).replace(/\r\n?/g, '\n')
  } catch {
    // A file deleted from disk has nothing saved, so all of the buffer is pending.
    savedMarkdown.value = ''
  }
  diffTab.value = tab
  diffOpen.value = true
}

const locallyEdited = computed(() => tabs.value.filter(hasLocalEditsOnly).length)
const changedOnDisk = computed(() => countTabsChangedOnDisk(tabs.value))
const matches = computed(() => filterOpenedFiles(tabs.value, query.value))
</script>

<style scoped>
.opened-files-view {
  font-size: 14px;
  color: var(--sideBarColor);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-wrapper {
  display: flex;
  flex-shrink: 0;
  margin: 37px 8px 10px 8px;
  padding: 0 6px;
  border-radius: 4px;
  height: 28px;
  border: 1px solid var(--floatBorderColor);
  background: var(--inputBgColor);
  box-sizing: border-box;
  align-items: center;
  & > input {
    color: var(--sideBarColor);
    background: transparent;
    height: 100%;
    flex: 1;
    border: none;
    outline: none;
    padding: 0;
    font-size: 13px;
  }
}

.title {
  height: 30px;
  line-height: 30px;
  padding: 0 15px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.title > span {
  flex: 1;
}

.title > a {
  display: none;
  text-decoration: none;
  color: var(--sideBarColor);
  margin-left: 8px;
}

.title:hover > a {
  display: block;
}

/* Always shown, unlike the hover-only actions, since they carry a count. */
.title > a.badge-action {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--highlightThemeColor);
}

.title > a:hover {
  color: var(--highlightThemeColor);
}

.opened-files-list {
  flex: 1;
  overflow: auto;
}

.snippet {
  padding: 0 15px 6px 35px;
  margin-top: -4px;
  font-size: 12px;
  line-height: 16px;
  color: var(--sideBarTextColor);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.no-results {
  padding: 0 15px;
  font-size: 13px;
  color: var(--sideBarTextColor);
}
</style>
