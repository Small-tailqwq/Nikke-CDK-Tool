<template>
  <div class="user-management">
    <el-card class="user-card">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-button type="primary" size="small" @click="showAddUserDialog">
            添加用户
          </el-button>
        </div>
      </template>

      <el-table
        :data="userStore.users"
        stripe
        v-loading="userStore.loading"
        class="user-table"
      >
        <el-table-column prop="name" label="用户名" min-width="120" />
        <el-table-column prop="uid" label="UID" min-width="180" />
        <el-table-column prop="serverName" label="服务器" min-width="100" />
        <el-table-column
          prop="createTime"
          label="添加时间"
          min-width="180"
          class-name="hide-on-mobile"
        />
        <el-table-column label="Cookie状态" min-width="150">
          <template #default="{ row }">
            <el-tag :type="getCookieStatusType(row.cookieExpireDays)">
              剩余 {{ row.cookieExpireDays }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" type="primary" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 用户对话框 -->
    <user-dialog
      v-model:visible="dialogVisible"
      :is-edit="isEdit"
      :user-id="selectedUserId"
      class="user-dialog"
    />

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      :width="isMobile ? '90%' : '400px'"
      class="delete-dialog"
    >
      <p>确定要删除用户 "{{ selectedUser?.name }}" 吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete" :loading="deleting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import UserDialog from '../components/UserDialog.vue'

const userStore = useUserStore()

const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const deleting = ref(false)
const isEdit = ref(false)
const selectedUser = ref(null)
const selectedUserId = ref(null)

// 检测是否为移动端
const isMobile = computed(() => window.innerWidth <= 768)

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days > 180) return 'success'
  if (days > 30) return 'warning'
  return 'danger'
}

// 显示添加用户对话框
const showAddUserDialog = () => {
  isEdit.value = false
  selectedUserId.value = null
  dialogVisible.value = true
}

// 处理编辑用户
const handleEdit = (user) => {
  isEdit.value = true
  selectedUserId.value = user.id
  dialogVisible.value = true
}

// 处理删除用户
const handleDelete = (user) => {
  selectedUser.value = user
  deleteDialogVisible.value = true
}

// 确认删除用户
const confirmDelete = async () => {
  if (!selectedUser.value) return

  deleting.value = true
  try {
    await userStore.deleteUser(selectedUser.value.id)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
  } catch (error) {
    ElMessage.error('删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  userStore.fetchUsers()
})
</script>

<style lang="scss" scoped>
.user-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;

  @media screen and (max-width: 768px) {
    padding: 12px;
  }

  .user-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;

      @media screen and (max-width: 768px) {
        font-size: 14px;
      }
    }

    :deep(.user-table) {
      // 移动端表格样式优化
      @media screen and (max-width: 768px) {
        .hide-on-mobile {
          display: none;
        }

        .el-table__header-wrapper {
          font-size: 14px;
        }

        .el-table__body-wrapper {
          font-size: 13px;
        }

        .el-button-group {
          display: flex;
          gap: 4px;
        }

        .el-tag {
          font-size: 12px;
          padding: 0 4px;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  :deep(.user-dialog) {
    @media screen and (max-width: 768px) {
      .el-dialog {
        width: 90% !important;
        margin: 20px auto !important;
      }
    }
  }

  :deep(.delete-dialog) {
    @media screen and (max-width: 768px) {
      .el-dialog {
        width: 90% !important;
        margin: 20px auto !important;
      }
    }
  }
}
</style>
