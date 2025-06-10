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
            >
              <el-option
                v-for="user in userStore.users"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        :data="historyList"
        stripe
        v-loading="loading"
        class="history-table"
      >
        <el-table-column
          prop="date"
          label="兑换时间"
          min-width="180"
          sortable
          class-name="hide-on-mobile"
        >
          <template #default="{ row }">
            {{ row.date }}
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户" min-width="120" />
        <el-table-column prop="cdk" label="CDK码" min-width="200" />
        <el-table-column label="状态" min-width="80" fixed="right">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="message"
          label="结果"
          min-width="200"
          show-overflow-tooltip
        />
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          :layout="
            isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next'
          "
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          small
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'

const userStore = useUserStore()
const exchangeStore = useExchangeStore()

const loading = ref(false)
const selectedUser = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 检测是否为移动端
const isMobile = computed(() => window.innerWidth <= 768)

// 计算属性：根据选择的用户和分页过滤历史记录
const historyList = computed(() => {
  let list = exchangeStore.history

  // 按用户筛选
  if (selectedUser.value) {
    list = list.filter((record) => record.userId === selectedUser.value)
  }

  // 计算总数
  total.value = list.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})

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
watch(selectedUser, () => {
  currentPage.value = 1
})

onMounted(() => {
  userStore.fetchUsers()
  exchangeStore.fetchHistory()
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

        .el-select {
          width: 200px;

          @media screen and (max-width: 768px) {
            width: 160px;
          }
        }
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
