<template>
  <div v-loading="loading" class="history-record-list">
    <div
      v-for="(record, index) in records"
      :key="record.id || `${record.cdk}-${record.userId}-${index}`"
      class="record-item"
      :class="{ 'is-success': record.success, 'is-clickable': record.merged }"
      @click="emit('item-click', record)"
    >
      <div class="record-main">
        <span class="record-cdk">{{ record.cdk }}</span>
        <el-tag :type="record.success ? 'success' : 'danger'" size="small" class="record-result">
          {{ record.success ? '成功' : '失败' }}
        </el-tag>
      </div>

      <div class="record-meta">
        <span class="record-user">{{ record.userName }}</span>
        <el-tag
          v-if="showServer && (record.serverName || record.server)"
          :type="getServerTagType(record.server)"
          size="small"
          effect="plain"
        >
          {{ record.serverName || getServerName(record.server) }}
        </el-tag>
        <el-tag v-if="record.source === '云端'" type="info" size="small" effect="plain">
          云端
        </el-tag>
        <el-tag v-if="record.merged" type="warning" size="small" effect="plain">已融合</el-tag>
        <span class="record-date">{{ record.date }}</span>
      </div>

      <p v-if="record.message" class="record-message">{{ record.message }}</p>
    </div>

    <el-empty v-if="!loading && records.length === 0" :image-size="72" description="暂无记录" />
  </div>
</template>

<script setup>
import { getServerName, getServerTagType } from '../utils/serverUtils'

defineProps({
  records: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  showServer: { type: Boolean, default: true },
})

const emit = defineEmits(['item-click'])
</script>

<style lang="scss" scoped>
.history-record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 80px;
}

.record-item {
  position: relative;
  padding: 10px 12px 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  overflow: hidden;

  // 左侧状态色条
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--el-color-danger);
  }

  &.is-success::before {
    background: var(--el-color-success);
  }

  &.is-clickable {
    cursor: pointer;
  }
}

.record-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.record-cdk {
  font-family: var(--cdk-font-mono, ui-monospace, monospace);
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-all;
  min-width: 0;
}

.record-result {
  flex-shrink: 0;
}

.record-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.record-user {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.record-date {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.record-message {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
</style>
