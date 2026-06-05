<template>
  <div class="exchange-history">
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>兑换历史</span>
          <div class="header-actions">
            <el-select
              v-model="selectedUser"
              placeholder="选择用户"
              clearable
              size="small"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option
                v-for="user in userStore.users"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
            <el-select
              v-model="selectedServer"
              placeholder="选择服务器"
              clearable
              size="small"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option
                v-for="server in serverOptions"
                :key="server.value"
                :label="server.label"
                :value="server.value"
              />
            </el-select>
            <el-select
              v-model="selectedSource"
              placeholder="选择来源"
              clearable
              size="small"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option
                v-for="source in sourceOptions"
                :key="source.value"
                :label="source.label"
                :value="source.value"
              />
            </el-select>
            <el-button
              type="primary"
              size="small"
              plain
              :loading="syncLoading"
              :disabled="!hasGlobalUsers"
              @click="syncAllHistory"
            >
              同步全部历史
            </el-button>
            <el-dropdown trigger="click" @command="handleClearCommand">
              <el-button type="danger" size="small" plain>
                清除历史
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="clearFiltered" :disabled="total === 0"
                    >清除筛选后的历史</el-dropdown-item
                  >
                  <el-dropdown-item command="clearAll" divided>清除全部历史</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="historyList"
        stripe
        class="history-table"
        @row-click="handleRowClick"
      >
        <el-table-column
          v-if="!isMobile"
          prop="date"
          label="兑换时间"
          min-width="180"
          sortable
          class-name="hide-on-mobile"
        >
          <template #default="{ row }">
            {{ row.date }}
            <el-tooltip v-if="row.merged && row.mergedAt" content="显示融合时间" placement="top">
              <el-icon class="merge-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户" min-width="120" />
        <el-table-column prop="cdk" label="CDK码" min-width="200" />
        <el-table-column
          v-if="!isMobile"
          label="服务器"
          min-width="110"
          class-name="hide-on-mobile server-column"
        >
          <template #default="{ row }">
            <el-tag
              :type="getServerTagType(row.server)"
              size="small"
              effect="plain"
              class="server-tag"
            >
              {{ row.serverName || getServerName(row.server) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="80" :fixed="isMobile ? false : 'right'">
          <template #default="{ row }">
            <div class="status-column">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
              <el-tag
                v-if="row.source === '云端'"
                type="info"
                size="small"
                effect="plain"
                class="source-tag"
              >
                云端
              </el-tag>
              <el-tag
                v-if="row.merged"
                type="warning"
                size="small"
                effect="plain"
                class="source-tag"
              >
                已融合
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="结果" min-width="200" show-overflow-tooltip />
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next'"
          size="small"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 确认对话框 -->
    <el-dialog v-model="clearDialogVisible" :title="clearDialogTitle" width="300px" center>
      <span>{{ clearDialogMessage }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="clearDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmClear">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 融合记录详情对话框 -->
    <el-dialog v-model="mergeDetailVisible" title="融合记录详情" width="500px">
      <div v-if="selectedRecord" class="merge-detail">
        <div class="merge-info">
          <p><strong>CDK码：</strong>{{ selectedRecord.cdk }}</p>
          <p><strong>用户：</strong>{{ selectedRecord.userName }}</p>
          <p><strong>兑换时间：</strong>{{ selectedRecord.date }}</p>
          <p>
            <strong>融合时间：</strong
            >{{
              selectedRecord.mergedAt
                ? new Date(selectedRecord.mergedAt)
                    .toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })
                    .replace(/\//g, '-')
                : '未知'
            }}
          </p>
          <p><strong>融合来源：</strong>{{ selectedRecord.mergedFrom || '未知' }}</p>
          <p>
            <strong>状态：</strong>
            <el-tag :type="selectedRecord.success ? 'success' : 'danger'" size="small">
              {{ selectedRecord.success ? '成功' : '失败' }}
            </el-tag>
          </p>
          <p><strong>结果信息：</strong>{{ selectedRecord.message }}</p>
        </div>

        <div class="merge-explanation">
          <h4>融合说明</h4>
          <p>此记录是通过智能融合本地记录和云端记录生成的：</p>
          <ul>
            <li>时间信息：优先采用云端时间（更精确）</li>
            <li>结果信息：优先采用本地信息（更详细）</li>
            <li>成功状态：如有一个成功则认为成功</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import { ArrowDown, InfoFilled } from '@element-plus/icons-vue'
import { serverOptions, getServerName, getServerTagType } from '../utils/serverUtils'
import { showCustomMessage } from '../utils/customMessage'

const userStore = useUserStore()
const exchangeStore = useExchangeStore()

const loading = ref(false)
const selectedUser = ref('')
const selectedServer = ref('')
const selectedSource = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const syncLoading = ref(false)

// 清除历史相关
const clearDialogVisible = ref(false)
const clearDialogTitle = ref('')
const clearDialogMessage = ref('')
const clearType = ref('') // 'all' 或 'filtered'
const mergeDetailVisible = ref(false)
const selectedRecord = ref(null)

// 检测是否为移动端
const isMobile = computed(() => window.innerWidth <= 768)

// 检查是否有国际服用户
const hasGlobalUsers = computed(() => {
  return userStore.users.some((user) => user.server !== 'cn')
})

// 来源选项
const sourceOptions = [
  { label: '本地兑换', value: '本地' },
  { label: '云端同步', value: '云端' },
]

// 获取当前筛选条件下的所有记录
const getFilteredRecords = () => {
  let list = exchangeStore.history

  // 按用户筛选
  if (selectedUser.value) {
    list = list.filter((record) => record.userId === selectedUser.value)
  }

  // 按服务器筛选
  if (selectedServer.value) {
    list = list.filter((record) => record.server === selectedServer.value)
  }

  // 按来源筛选
  if (selectedSource.value) {
    list = list.filter((record) => record.source === selectedSource.value)
  }

  return list
}

// 计算属性：根据选择的用户、服务器和分页过滤历史记录
const historyList = computed(() => {
  const list = getFilteredRecords()

  // 计算总数
  total.value = list.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})

// 处理下拉菜单展开/收起，避免与导航菜单动画冲突
const handleDropdownVisibleChange = (visible) => {
  // 当下拉菜单打开时，给body添加类名暂停导航菜单动画
  if (visible) {
    document.body.classList.add('dropdown-open')
  } else {
    document.body.classList.remove('dropdown-open')
  }
}

// 处理页码改变
const handleCurrentChange = (page) => {
  currentPage.value = page
}

// 处理每页条数改变
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

// 监听选择的用户变化
watch([selectedUser, selectedServer, selectedSource], () => {
  currentPage.value = 1
})

// 处理清除命令
const handleClearCommand = (command) => {
  clearType.value = command

  if (command === 'clearAll') {
    clearDialogTitle.value = '清除全部历史'
    clearDialogMessage.value = '确定要清除全部兑换历史记录吗？此操作不可恢复。'
    clearDialogVisible.value = true
  } else if (command === 'clearFiltered') {
    const filteredCount = getFilteredRecords().length
    if (filteredCount === 0) {
      showCustomMessage('当前没有符合筛选条件的记录', 'warning')
      return
    }

    let filterDesc = []
    if (selectedUser.value) {
      const userName = userStore.getUserById(selectedUser.value)?.name || '未知用户'
      filterDesc.push(`用户"${userName}"`)
    }
    if (selectedServer.value) {
      const serverName = getServerName(selectedServer.value)
      filterDesc.push(`服务器"${serverName}"`)
    }
    if (selectedSource.value) {
      const sourceName =
        sourceOptions.find((s) => s.value === selectedSource.value)?.label || '未知来源'
      filterDesc.push(`来源"${sourceName}"`)
    }

    const filterText = filterDesc.length > 0 ? `（${filterDesc.join('、')}）` : ''
    clearDialogTitle.value = '清除筛选历史'
    clearDialogMessage.value = `确定要清除当前筛选条件下的 ${filteredCount} 条记录${filterText}吗？此操作不可恢复。`
    clearDialogVisible.value = true
  }
}

// 确认清除
const confirmClear = async () => {
  loading.value = true
  try {
    if (clearType.value === 'clearAll') {
      // 清除全部历史
      await exchangeStore.clearHistory()
      showCustomMessage('已清除全部历史记录', 'success')
    } else if (clearType.value === 'clearFiltered') {
      // 清除筛选后的历史
      const filteredRecords = getFilteredRecords()

      // 获取要保留的记录（不在筛选结果中的记录）
      const remainingRecords = exchangeStore.history.filter((record) => {
        // 检查记录是否在筛选结果中
        return !filteredRecords.some((filtered) => filtered.id === record.id)
      })

      // 替换历史记录为保留的记录
      await exchangeStore.replaceHistory(remainingRecords)

      showCustomMessage(`已清除 ${filteredRecords.length} 条筛选后的历史记录`, 'success')
    }
  } catch (error) {
    showCustomMessage('清除历史记录失败', 'error')
    console.error('清除历史记录失败:', error)
  } finally {
    loading.value = false
    clearDialogVisible.value = false
  }
}

// 同步全部历史
const syncAllHistory = async () => {
  syncLoading.value = true
  try {
    await exchangeStore.syncAllHistory({ pageSize: 20 })
    showCustomMessage('已同步全部历史记录', 'success')
  } catch (error) {
    showCustomMessage('同步历史记录失败', 'error')
    console.error('同步历史记录失败:', error)
  } finally {
    syncLoading.value = false
  }
}

// 处理行点击
const handleRowClick = (row) => {
  // 如果是融合记录，则显示详情对话框
  if (row.merged) {
    selectedRecord.value = row
    mergeDetailVisible.value = true
  }
}

onMounted(() => {
  userStore.fetchUsers()
  exchangeStore.fetchHistory()
})

// 组件卸载时清理
onBeforeUnmount(() => {
  // 清理下拉菜单状态类名
  document.body.classList.remove('dropdown-open')
})
</script>

<style lang="scss" scoped>
.exchange-history {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;

  @media screen and (max-width: 768px) {
    padding: 12px;
  }

  .history-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;

      @media screen and (max-width: 768px) {
        font-size: 14px;
      }

      .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;

        .el-select {
          width: 150px;

          @media screen and (max-width: 768px) {
            width: 120px;
          }
        }
      }
    }

    .status-column {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;

      .source-tag {
        font-size: 11px;
        padding: 0 4px;
        height: 18px;
        line-height: 16px;
      }
    }

    /* 为表格添加美观滚动条 */
    :deep(.el-table) {
      .el-table__body-wrapper,
      .el-table__header-wrapper,
      .el-table__fixed-body-wrapper {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);

        &::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        &::-webkit-scrollbar-track {
          background: var(--scrollbar-track);
          border-radius: 6px;
        }

        &::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 6px;
          transition: background-color 0.2s ease;

          &:hover {
            background: var(--scrollbar-thumb-hover);
          }

          &:active {
            background: var(--scrollbar-thumb-active);
          }
        }

        &::-webkit-scrollbar-corner {
          background: var(--scrollbar-track);
        }
      }
    }

    // 移动端表格样式优化
    @media screen and (max-width: 768px) {
      :deep(.el-table) {
        .hide-on-mobile {
          display: none;
        }

        .el-table__header-wrapper {
          font-size: 14px;
        }

        .el-table__body-wrapper {
          font-size: 13px;
        }

        .el-tag {
          font-size: 12px;
          padding: 0 4px;
        }

        /* 移动端使用更细的滚动条 */
        .el-table__body-wrapper,
        .el-table__header-wrapper {
          &::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }

          &::-webkit-scrollbar-thumb:hover {
            width: 6px;
          }
        }
      }
    }

    // 服务器列样式优化 - 解决黑点问题
    :deep(.server-column) {
      .cell {
        // 方案1：完全禁用overflow hidden（推荐）
        overflow: visible !important;

        // 方案2：如果需要保持overflow hidden，则确保有足够空间
        // min-width: 120px;
        // padding: 0 8px;

        .server-tag {
          // 确保tag有足够的显示空间
          max-width: 100%;
          box-sizing: border-box;

          // 防止内容被意外截断
          overflow: visible;
          white-space: nowrap;

          // 如果真的需要截断，使用更明确的省略号
          // overflow: hidden;
          // text-overflow: ellipsis;

          // 确保内容垂直居中
          display: inline-flex;
          align-items: center;
          vertical-align: middle;
        }
      }
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;

    @media screen and (max-width: 768px) {
      margin-top: 16px;
      justify-content: center;
    }
  }

  // 对话框样式
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 10px;
  }

  // 融合记录样式
  .merge-info-icon {
    margin-left: 4px;
    font-size: 14px;
    color: var(--el-color-warning);
    cursor: pointer;
  }

  .merge-detail {
    .merge-info {
      background: var(--el-fill-color-light);
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;

      p {
        margin: 8px 0;
      }
    }

    .merge-explanation {
      font-size: 14px;
      color: var(--el-text-color-secondary);

      h4 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 16px;
        color: var(--el-text-color-primary);
      }

      ul {
        padding-left: 20px;
        margin: 8px 0;
      }
    }
  }
}

/* 分页组件滚动优化 */
:deep(.el-pagination) {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 6px;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--scrollbar-thumb-hover);
    }

    &:active {
      background: var(--scrollbar-thumb-active);
    }
  }

  &::-webkit-scrollbar-corner {
    background: var(--scrollbar-track);
  }

  @media screen and (max-width: 768px) {
    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
      width: 6px;
    }
  }
}
</style>
