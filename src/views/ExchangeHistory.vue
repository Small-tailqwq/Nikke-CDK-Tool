<template>
  <div class="exchange-history">
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>兑换历史</span>
          <div class="header-actions">
            <el-select v-model="selectedUser" placeholder="选择用户" clearable>
              <el-option
                v-for="user in userStore.users"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
            <el-button type="primary" @click="handleRefresh">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="historyList"
        stripe
        v-loading="loading"
      >
        <el-table-column prop="date" label="兑换时间" width="180" sortable>
          <template #default="{ row }">
            {{ row.date }}
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户" width="150" />
        <el-table-column prop="cdk" label="CDK码" min-width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="结果" min-width="200" />
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import { getExchangeHistory } from '../utils/api'

const userStore = useUserStore()
const exchangeStore = useExchangeStore()

const loading = ref(false)
const selectedUser = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 计算属性：根据选择的用户和分页过滤历史记录
const historyList = computed(() => {
  let list = exchangeStore.history

  // 按用户筛选
  if (selectedUser.value) {
    list = list.filter(record => record.userId === selectedUser.value)
  }

  // 计算总数
  total.value = list.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})

// 获取历史记录
const fetchHistory = async () => {
  loading.value = true
  try {
    // 如果选择了特定用户，则获取该用户的历史记录
    if (selectedUser.value) {
      const user = userStore.getUserById(selectedUser.value)
      if (user) {
        const result = await getExchangeHistory(user.cookie)
        if (result.success) {
          // 更新历史记录
          const records = result.data.map(item => ({
            ...item,
            userId: user.id,
            userName: user.name
          }))
          await exchangeStore.addExchangeRecords(records)
        } else {
          ElMessage.error(result.message)
        }
      }
    } else {
      // 获取所有用户的历史记录
      const promises = userStore.users.map(async user => {
        const result = await getExchangeHistory(user.cookie)
        if (result.success) {
          return result.data.map(item => ({
            ...item,
            userId: user.id,
            userName: user.name
          }))
        }
        return []
      })

      const results = await Promise.all(promises)
      const allRecords = results.flat()
      await exchangeStore.addExchangeRecords(allRecords)
    }
  } catch (error) {
    ElMessage.error('获取历史记录失败')
  } finally {
    loading.value = false
  }
}

// 处理刷新
const handleRefresh = () => {
  currentPage.value = 1
  fetchHistory()
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
watch(selectedUser, () => {
  currentPage.value = 1
  fetchHistory()
})

onMounted(() => {
  userStore.fetchUsers()
  fetchHistory()
})
</script>

<style lang="scss" scoped>
.exchange-history {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;

  .history-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-actions {
        display: flex;
        gap: 10px;
        align-items: center;

        .el-select {
          width: 200px;
        }
      }
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style> 