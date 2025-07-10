<template>
  <div class="user-management">
    <el-card class="user-card">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <div class="header-actions">
            <el-button
              type="success"
              size="small"
              @click="handleBatchRenewCookies"
              :loading="batchRenewLoading"
              :disabled="!hasRenewableUsers"
            >
              批量续期
            </el-button>
            <el-button type="primary" size="small" @click="showAddUserDialog">
              添加用户
            </el-button>
          </div>
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
        <el-table-column label="服务器" min-width="160">
          <template #default="{ row }">
            <div class="server-display">
              <el-tag
                v-for="(tag, index) in parseServerTags(row)"
                :key="index"
                :type="tag.type"
                size="small"
                class="server-tag"
              >
                {{ tag.text }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="角色信息"
          min-width="160"
          class-name="hide-on-mobile"
        >
          <template #default="{ row }">
            <div class="player-info-display">
              <div v-if="row.server === 'cn'">
                <div class="info-row">
                  <span class="info-label">角色:</span>
                  <span class="info-value">{{ getCnRoleName(row) }}</span>
                </div>
              </div>
              <div
                v-else-if="
                  (row.server === 'global' || row.server === 'tw') &&
                  row.playerInfo
                "
              >
                <div class="info-row">
                  <span class="info-label">角色:</span>
                  <span class="info-value">{{ row.playerInfo.role_name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">战力:</span>
                  <span class="info-value">{{
                    row.playerInfo.team_combat?.toLocaleString()
                  }}</span>
                </div>
              </div>
              <div v-else class="no-info">
                <span>暂无详细信息</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="createTime"
          label="添加时间"
          min-width="180"
          class-name="hide-on-mobile"
        />
        <el-table-column label="Cookie状态" min-width="200">
          <template #default="{ row }">
            <div class="cookie-status-display">
              <el-tag v-if="row.server === 'cn'" type="info">
                国服不适用
              </el-tag>
              <template v-else>
                <el-tag :type="getCookieStatusType(row.cookieExpireDays)">
                  {{
                    row.cookieExpireDays === -1
                      ? 'Cookie时间异常'
                      : `剩余 ${row.cookieExpireDays} 天`
                  }}
                </el-tag>
                <el-tooltip
                  v-if="row.cookieExpireDays === -1"
                  content="Cookie已失效或无法验证，请重新设置完整的Cookie"
                  placement="top"
                >
                  <el-icon
                    style="margin-left: 4px; color: var(--el-color-warning)"
                  >
                    <WarningFilled />
                  </el-icon>
                </el-tooltip>
                <el-button
                  v-if="shouldShowRenewButton(row)"
                  size="small"
                  type="primary"
                  plain
                  @click="handleRenewUserCookie(row)"
                  :loading="getRenewLoading(row.id)"
                  class="renew-btn"
                >
                  续期
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" type="primary" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button
                v-if="row.server !== 'cn'"
                size="small"
                type="success"
                @click="handleSyncHistory(row)"
                :loading="syncLoading"
              >
                同步历史
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessageBox, ElLoading } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import UserDialog from '../components/UserDialog.vue'
import { showCustomMessage } from '../utils/customMessage'
import {
  renewGlobalCookie,
  shouldRenewCookie,
  autoRenewUserCookie,
} from '../utils/api'

const userStore = useUserStore()
const exchangeStore = useExchangeStore()

const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const deleting = ref(false)
const isEdit = ref(false)
const selectedUser = ref(null)
const selectedUserId = ref(null)
const syncLoading = ref(false)

// Cookie续期相关状态
const renewLoadingMap = ref(new Map()) // 记录每个用户的续期状态
const batchRenewLoading = ref(false)

// 检测是否为移动端
const isMobile = computed(() => window.innerWidth <= 768)

// 计算是否有需要续期的用户
const hasRenewableUsers = computed(() => {
  return userStore.users.some((user) => shouldShowRenewButton(user))
})

// 国际服区域映射表（英文 -> 中文）
const regionMapping = {
  Global: '全球区',
  Japan: '日区',
  Korea: '韩区',
  NA: '北美区',
  SEA: '东南亚区',
}

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days === -1) return 'danger' // 过期时间异常
  if (days > 20) return 'success'
  if (days > 7) return 'warning'
  return 'danger'
}

// 解析国服用户的游戏参数
const parseCnUserData = (user) => {
  if (user.server !== 'cn' || !user.cookie) {
    return null
  }

  try {
    const gameParams = JSON.parse(user.cookie)
    return {
      role_id: gameParams.role_id,
      role_name: gameParams.role_name,
      area_id: gameParams.area_id,
      zone_id: gameParams.zone_id,
    }
  } catch (error) {
    console.warn('解析国服用户数据失败:', error)
    return null
  }
}

// 获取国服平台类型（微信/QQ）
const getCnPlatformType = (user) => {
  const cnData = parseCnUserData(user)
  if (!cnData) return 'qq' // 默认QQ

  // area_id: '1' = 微信, '2' = QQ
  return cnData.area_id === '1' ? 'wechat' : 'qq'
}

// 获取国服平台显示文本
const getCnPlatformText = (user) => {
  const platformType = getCnPlatformType(user)
  return platformType === 'wechat' ? '微信区' : 'QQ区'
}

// 获取国服角色名
const getCnRoleName = (user) => {
  const cnData = parseCnUserData(user)
  if (!cnData || !cnData.role_name) return '未知角色'

  try {
    return decodeURIComponent(cnData.role_name)
  } catch (error) {
    return cnData.role_name
  }
}

// Cookie续期相关方法
// 判断用户是否需要显示续期按钮
const shouldShowRenewButton = (user) => {
  if (user.server === 'cn' || !user.cookie) {
    return false
  }
  // 异常状态的Cookie不显示续期按钮，需要重新设置
  if (user.cookieExpireDays === -1) {
    return false
  }
  return shouldRenewCookie(user.cookieExpireDays, 7)
}

// 获取用户续期加载状态
const getRenewLoading = (userId) => {
  return renewLoadingMap.value.get(userId) || false
}

// 单个用户Cookie续期
const handleRenewUserCookie = async (user) => {
  if (user.server === 'cn') {
    showCustomMessage('国服用户无需Cookie续期', 'info')
    return
  }

  if (!user.cookie) {
    showCustomMessage('用户Cookie为空，无法续期', 'warning')
    return
  }

  // 设置加载状态
  renewLoadingMap.value.set(user.id, true)

  try {
    console.log(`开始为用户 ${user.name} 续期Cookie...`)

    const result = await renewGlobalCookie(user.cookie)

    if (result.success) {
      // 更新用户数据
      const updateData = {
        cookie: result.data.newCookie,
        cookieExpireDays: result.data.expireDays,
        cookieActualExpireDate: new Date(
          Date.now() + result.data.expireDays * 24 * 60 * 60 * 1000
        ).toISOString(),
      }

      await userStore.updateUser(user.id, updateData)

      showCustomMessage(
        `用户 ${user.name} Cookie续期成功！新的有效期：${result.data.expireDays}天`,
        'success'
      )

      console.log(`用户 ${user.name} Cookie续期成功:`, {
        renewedAt: result.data.renewedAt,
        newExpireDays: result.data.expireDays,
      })
    } else {
      showCustomMessage(
        `用户 ${user.name} Cookie续期失败：${result.message}`,
        'error'
      )
      console.error(`用户 ${user.name} Cookie续期失败:`, result)
    }
  } catch (error) {
    console.error(`用户 ${user.name} Cookie续期异常:`, error)
    showCustomMessage(`用户 ${user.name} Cookie续期过程中发生异常`, 'error')
  } finally {
    // 清除加载状态
    renewLoadingMap.value.delete(user.id)
  }
}

// 批量Cookie续期
const handleBatchRenewCookies = async () => {
  // 筛选需要续期的用户
  const renewableUsers = userStore.users.filter((user) =>
    shouldShowRenewButton(user)
  )

  if (renewableUsers.length === 0) {
    showCustomMessage('当前没有需要续期的用户', 'info')
    return
  }

  // 确认对话框
  try {
    await ElMessageBox.confirm(
      `检测到 ${renewableUsers.length} 个用户的Cookie需要续期，是否继续？`,
      '批量续期确认',
      {
        confirmButtonText: '确定续期',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return // 用户取消
  }

  batchRenewLoading.value = true

  try {
    // 显示进度提示
    const loadingInstance = ElLoading.service({
      lock: true,
      text: `正在为第1个用户续期，共${renewableUsers.length}个用户...`,
      background: 'rgba(0, 0, 0, 0.7)',
    })

    let successCount = 0
    let failCount = 0
    const results = []

    // 逐个用户进行续期（避免并发过多）
    for (let i = 0; i < renewableUsers.length; i++) {
      const user = renewableUsers[i]

      // 更新进度提示
      loadingInstance.text = `正在为 ${user.name} 续期，第${i + 1}个，共${
        renewableUsers.length
      }个用户...`

      try {
        const result = await autoRenewUserCookie(user)

        if (result.success) {
          successCount++

          // 更新用户数据
          const updateData = {
            cookie: result.data.newCookie,
            cookieExpireDays: result.data.expireDays,
            cookieActualExpireDate: new Date(
              Date.now() + result.data.expireDays * 24 * 60 * 60 * 1000
            ).toISOString(),
          }

          await userStore.updateUser(user.id, updateData)

          results.push({
            user: user.name,
            success: true,
            expireDays: result.data.expireDays,
          })

          console.log(
            `批量续期: 用户 ${user.name} 成功，新过期天数: ${result.data.expireDays}`
          )
        } else {
          failCount++
          results.push({
            user: user.name,
            success: false,
            message: result.message,
          })

          console.warn(`批量续期: 用户 ${user.name} 失败:`, result.message)
        }
      } catch (error) {
        failCount++
        results.push({
          user: user.name,
          success: false,
          message: error.message || '续期异常',
        })

        console.error(`批量续期: 用户 ${user.name} 异常:`, error)
      }

      // 添加延迟，避免请求过于密集
      if (i < renewableUsers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // 关闭加载提示
    loadingInstance.close()

    // 显示结果
    if (successCount > 0) {
      showCustomMessage(
        `批量续期完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        successCount === renewableUsers.length ? 'success' : 'warning'
      )
    } else {
      showCustomMessage(
        `批量续期失败：所有 ${failCount} 个用户都续期失败`,
        'error'
      )
    }

    // 详细结果日志
    console.log('批量续期结果汇总:', {
      total: renewableUsers.length,
      success: successCount,
      fail: failCount,
      details: results,
    })
  } catch (error) {
    console.error('批量续期异常:', error)
    showCustomMessage('批量续期过程中发生异常', 'error')
  } finally {
    batchRenewLoading.value = false
  }
}

// 解析服务器标签信息
const parseServerTags = (user) => {
  const tags = []

  if (user.server === 'cn') {
    // 国服：服务器 + 平台区
    tags.push({
      text: '国服',
      type: 'primary',
    })
    tags.push({
      text: getCnPlatformText(user),
      type: getCnPlatformType(user) === 'wechat' ? 'success' : 'primary',
    })
  } else if (user.server === 'global') {
    // 国际服：主服务器 + 具体区域 + 等级
    tags.push({
      text: '国际服',
      type: 'primary',
    })

    // 如果有角色信息，解析具体区域
    if (user.playerInfo && user.playerInfo.region_name) {
      const regionName =
        regionMapping[user.playerInfo.region_name] ||
        user.playerInfo.region_name
      tags.push({
        text: regionName,
        type: 'info',
      })
    }

    // 如果有等级信息，添加等级标签
    if (user.playerInfo && user.playerInfo.player_level) {
      tags.push({
        text: `Lv.${user.playerInfo.player_level}`,
        type: 'success',
      })
    }
  } else if (user.server === 'tw') {
    // 港澳台服：主服务器 + 具体区域 + 等级
    tags.push({
      text: '港澳台服',
      type: 'warning',
    })

    // 如果有角色信息，解析具体区域
    if (user.playerInfo && user.playerInfo.region_name) {
      const regionName =
        regionMapping[user.playerInfo.region_name] ||
        user.playerInfo.region_name
      tags.push({
        text: regionName,
        type: 'info',
      })
    }

    // 如果有等级信息，添加等级标签
    if (user.playerInfo && user.playerInfo.player_level) {
      tags.push({
        text: `Lv.${user.playerInfo.player_level}`,
        type: 'success',
      })
    }
  } else {
    // 其他情况，显示原始服务器名称
    tags.push({
      text: user.serverName || '未知服务器',
      type: 'info',
    })
  }

  return tags
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

// 处理同步历史记录
const handleSyncHistory = async (user) => {
  if (!user || !user.cookie || user.server === 'cn') {
    showCustomMessage('只支持同步国际服用户的历史记录', 'error')
    return
  }

  // 显示同步选项对话框
  ElMessageBox.confirm('此功能为同步云端CDK兑换记录', '同步历史记录', {
    confirmButtonText: '全部',
    cancelButtonText: '最近20条',
    distinguishCancelAndClose: true,
    type: 'info',
  })
    .then(async () => {
      // 用户选择同步全部
      await syncAllPages(user)
    })
    .catch((action) => {
      if (action === 'cancel') {
        // 用户选择只同步第一页
        syncSinglePage(user, 1)
      }
    })
}

// 同步单页历史记录
const syncSinglePage = async (user, page = 1) => {
  syncLoading.value = true
  try {
    // 调用store中的同步方法
    const result = await exchangeStore.syncUserHistory(user, { page })

    if (result.success) {
      showCustomMessage(result.message, 'success')

      // 如果有总数信息，额外显示
      if (result.total && result.currentPage < result.totalPages) {
        setTimeout(() => {
          showCustomMessage(
            `共有 ${result.total} 条记录，分 ${result.totalPages} 页，当前已同步第 ${result.currentPage} 页`,
            'info'
          )
        }, 1000)
      }
    } else {
      showCustomMessage(result.message || '同步历史记录失败', 'error')
    }
  } catch (error) {
    console.error('同步历史记录失败:', error)
    showCustomMessage(
      '同步历史记录失败: ' + (error.message || '未知错误'),
      'error'
    )
  } finally {
    syncLoading.value = false
  }
}

// 同步所有页面
const syncAllPages = async (user) => {
  syncLoading.value = true

  try {
    // 显示进度提示
    const loadingInstance = ElLoading.service({
      lock: true,
      text: '正在同步第1页...',
      background: 'rgba(0, 0, 0, 0.7)',
    })

    // 同步第一页，获取总页数信息
    const firstPageResult = await exchangeStore.syncUserHistory(user, {
      page: 1,
      syncAll: true,
    })

    if (!firstPageResult.success) {
      loadingInstance.close()
      showCustomMessage(firstPageResult.message || '同步失败', 'error')
      return
    }

    const totalPages = firstPageResult.totalPages || 1
    let currentPage = 1
    let totalRecords = firstPageResult.count || 0

    // 如果只有一页或没有更多页，直接返回
    if (totalPages <= 1 || !firstPageResult.hasMorePages) {
      loadingInstance.close()
      showCustomMessage(`成功同步了 ${totalRecords} 条历史记录`, 'success')
      return
    }

    // 同步剩余页面
    while (currentPage < totalPages) {
      currentPage++

      // 更新加载提示
      loadingInstance.text = `正在同步第${currentPage}页，共${totalPages}页...`

      // 同步下一页
      const result = await exchangeStore.syncUserHistory(user, {
        page: currentPage,
        syncAll: true,
      })

      if (result.success && result.count > 0) {
        totalRecords += result.count
      } else {
        break // 如果失败或没有更多记录，停止同步
      }

      // 添加小延迟，避免请求过于密集
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    // 关闭加载提示
    loadingInstance.close()

    // 显示最终结果
    showCustomMessage(
      `成功同步了 ${totalRecords} 条历史记录，共 ${currentPage} 页`,
      'success'
    )
  } catch (error) {
    console.error('同步所有历史记录失败:', error)
    showCustomMessage('同步失败: ' + (error.message || '未知错误'), 'error')
  } finally {
    syncLoading.value = false
  }
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
    // 国际服用户删除后，Cookie会在自然过期时失效，无需手动清除

    await userStore.deleteUser(selectedUser.value.id)
    showCustomMessage('删除成功', 'success')
    deleteDialogVisible.value = false
  } catch (error) {
    showCustomMessage('删除失败', 'error')
  } finally {
    deleting.value = false
  }
}

// 处理来自Cookie警告组件的编辑用户事件
const handleEditUserEvent = (event) => {
  const { userId } = event.detail
  if (userId) {
    console.log(`[UserManagement] 收到编辑用户事件，用户ID: ${userId}`)
    handleEdit(userId)
  }
}

onMounted(async () => {
  await userStore.fetchUsers()

  // 🔧 检查是否有需要验证的Cookie状态异常用户
  const usersWithInvalidCookies = userStore.users.filter(
    (user) => user.server !== 'cn' && user.cookieExpireDays === -1
  )

  if (usersWithInvalidCookies.length > 0) {
    console.log(
      `发现 ${usersWithInvalidCookies.length} 个用户的Cookie状态异常，建议重新设置`
    )
  }

  // 🔧 监听来自Cookie警告组件的编辑用户事件
  window.addEventListener('editUser', handleEditUserEvent)
})

// 清理事件监听器
onBeforeUnmount(() => {
  window.removeEventListener('editUser', handleEditUserEvent)
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

  .server-display {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    .server-tag {
      font-size: 11px;
      padding: 0 6px;
      height: 22px;
      line-height: 20px;
      border-radius: 4px;
      font-weight: 500;

      @media screen and (max-width: 768px) {
        font-size: 10px;
        padding: 0 4px;
        height: 20px;
        line-height: 18px;
      }
    }
  }

  .player-info-display {
    .info-row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      font-size: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .info-label {
        color: var(--el-text-color-secondary);
        margin-right: 4px;
        font-weight: 500;
        min-width: 32px;
      }

      .info-value {
        color: var(--el-text-color-primary);
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .no-info {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      font-style: italic;
    }
  }

  .cookie-status-display {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .renew-btn {
      font-size: 11px;
      padding: 0 8px;
      height: 24px;
      border-radius: 4px;
      transition: all 0.3s ease;

      @media screen and (max-width: 768px) {
        font-size: 10px;
        padding: 0 6px;
        height: 22px;
        margin-top: 2px;
      }

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(64, 158, 255, 0.4);
      }

      &:active {
        transform: translateY(0);
      }
    }
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

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;

        @media screen and (max-width: 768px) {
          flex-wrap: wrap;
          gap: 6px;
        }
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
          flex-wrap: wrap;

          .el-button {
            margin-bottom: 4px;
          }
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
