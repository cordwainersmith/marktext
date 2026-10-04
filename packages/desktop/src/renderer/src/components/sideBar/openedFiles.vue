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
      <a
        href="javascript:;"
        :title="t('sideBar.tree.saveAll')"
        @click.stop="editorStore.ASK_FOR_SAVE_ALL(false)"
      >
        <svg
          class="icon"
          aria-hidden="true"
        >
          <use xlink:href="#icon-save-all" />
        </svg>
      </a>
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
        <opened-file :file="tab" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/store/editor'
import OpenedFile from './treeOpenedTab.vue'
import { filterOpenedFiles } from './openedFilesFilter'

const { t } = useI18n()
const editorStore = useEditorStore()
const { tabs } = storeToRefs(editorStore)

const query = ref('')
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
