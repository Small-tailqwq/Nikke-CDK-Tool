<template>
  <div class="bla-menu-wrapper">
    <el-tag v-if="user.server === 'cn'" type="info" size="small">国服不适用</el-tag>
    <template v-else>
      <button
        type="button"
        class="bla-badge-trigger"
        :aria-label="`查看 ${user.name || '当前账号'} 的 BlaBla 管理`"
        aria-haspopup="dialog"
        :aria-expanded="dialogVisible"
        @click="dialogVisible = true"
      >
        <el-tag :type="badgeState.type" size="small">{{ badgeState.label }}</el-tag>
        <el-tag v-if="hasCustomExchangeConfig" type="warning" size="small" effect="plain"
          >配置</el-tag
        >
        <el-icon class="trigger-arrow"><ArrowDown /></el-icon>
      </button>
      <el-dialog
        v-model="dialogVisible"
        :title="`BlaBla 管理 · ${user.name || '未命名用户'}`"
        width="min(900px, calc(100vw - 32px))"
        top="5vh"
        class="bla-dialog"
        append-to-body
        @open="handleShow"
      >
        <template #header>
          <div class="panel-header">
            <div class="panel-heading">
              <h2>BlaBla 管理</h2>
              <span class="account-name">{{ user.name || '未命名用户' }}</span>
            </div>
            <div class="panel-actions">
              <el-button
                :loading="overviewLoading"
                :disabled="!canInspect || runLoading"
                @click="refreshOverview()"
              >
                刷新状态
              </el-button>
              <el-button
                type="primary"
                :loading="runLoading"
                :disabled="!canRun"
                @click="runTasksNow"
              >
                执行每日任务
              </el-button>
            </div>
          </div>
        </template>
        <div class="bla-panel">
          <el-alert
            v-if="!user.cookie"
            type="warning"
            :closable="false"
            title="缺少 Cookie，暂时无法查询任务状态。"
          />
          <el-alert
            v-else-if="overviewError"
            type="warning"
            :closable="false"
            :title="overviewError"
          />
          <el-alert
            v-else-if="!user.blaEnabled"
            type="info"
            :closable="false"
            title="未开启自动任务，仍可查看状态和配置兑换。"
          />

          <div class="overview-grid">
            <div class="overview-card">
              <span>今日任务</span><strong>{{ taskProgressText }}</strong>
            </div>
            <div class="overview-card">
              <span>积分</span><strong>{{ totalPointsText }}</strong>
            </div>
            <div class="overview-card">
              <span>兑换策略</span><strong>{{ effectivePlanShortText }}</strong>
            </div>
            <div class="overview-card">
              <span>上次刷新</span><strong>{{ overviewTimeText }}</strong>
            </div>
          </div>

          <el-tabs v-model="activeTab" class="panel-tabs">
            <el-tab-pane label="每日任务" name="tasks">
              <div class="tab-scroll beautiful-scrollbar">
                <section class="content-card">
                  <div class="section-header">
                    <h3>任务完成情况</h3>
                    <span class="section-summary">{{ taskProgressText }}</span>
                  </div>
                  <el-progress
                    :percentage="overviewPercentage"
                    :status="progressStatus"
                    :stroke-width="6"
                    :show-text="false"
                  />
                  <p class="section-help">{{ taskSummaryHint }}</p>
                  <div v-if="taskItems.length" class="task-list">
                    <div v-for="task in taskItems" :key="task.id" class="task-row">
                      <span>{{ task.name }}</span>
                      <el-tag :type="getTaskTagType(task)" size="small">{{
                        task.statusText
                      }}</el-tag>
                    </div>
                  </div>
                  <el-empty v-else description="暂无任务状态" :image-size="64" />
                </section>
              </div>
            </el-tab-pane>
            <el-tab-pane v-if="hasAnniversaryEvent" label="周年活动" name="event" lazy>
              <div class="tab-scroll beautiful-scrollbar"><Nikke4thEvent :user="user" /></div>
            </el-tab-pane>
            <el-tab-pane label="每月兑换" name="exchange">
              <div class="tab-scroll beautiful-scrollbar">
                <div class="exchange-layout">
                  <section class="content-card config-card">
                    <div class="section-header">
                      <h3>单独配置</h3>
                      <el-switch v-model="draftConfig.enabled" aria-label="启用单独兑换配置" />
                    </div>
                    <p class="section-help">关闭后使用通用兑换配置。</p>
                    <el-select
                      v-model="draftConfig.items"
                      multiple
                      filterable
                      clearable
                      class="config-select"
                      :disabled="!draftConfig.enabled"
                      placeholder="选择每月兑换商品"
                      aria-label="每月兑换商品"
                    >
                      <el-option
                        v-for="option in monthlyProductOptions"
                        :key="option"
                        :label="option"
                        :value="option"
                      />
                    </el-select>
                    <div class="config-actions">
                      <el-button
                        :disabled="!hasDraftChanges || savingConfig"
                        @click="resetDraftToStored"
                        >撤销</el-button
                      >
                      <el-button
                        type="primary"
                        :loading="savingConfig"
                        :disabled="!hasDraftChanges"
                        @click="saveConfig"
                        >保存配置</el-button
                      >
                    </div>
                  </section>
                  <section class="content-card">
                    <div class="section-header">
                      <h3>本月兑换</h3>
                      <span class="section-summary">{{ exchangeSummaryText }}</span>
                    </div>
                    <el-progress
                      :percentage="exchangeProgressPercentage"
                      :status="exchangeProgressStatus"
                      :stroke-width="6"
                      :show-text="false"
                    />
                    <p class="section-help">{{ monthlyExchangeStatusText }}</p>
                    <dl class="exchange-details">
                      <div>
                        <dt>生效策略</dt>
                        <dd>{{ effectivePlanText }}</dd>
                      </div>
                      <div>
                        <dt>已选商品</dt>
                        <dd>{{ selectedItemsText }}</dd>
                      </div>
                      <div v-if="activeExchangeItems.length">
                        <dt>本月已兑</dt>
                        <dd>{{ redeemedItemsText }}</dd>
                      </div>
                      <div v-if="activeExchangeItems.length">
                        <dt>本月待兑</dt>
                        <dd>{{ pendingItemsText }}</dd>
                      </div>
                      <div v-if="hasRecentExchangeMessage">
                        <dt>最近兑换</dt>
                        <dd>
                          {{ exchangeExecutionMessage
                          }}<span v-if="user.blaLastRedeemAt" class="muted">{{
                            formatDateTime(user.blaLastRedeemAt)
                          }}</span>
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane name="logs">
              <template #label
                ><span class="log-tab-label"
                  >执行日志<span class="log-count">{{ logSummaryText }}</span></span
                ></template
              >
              <section class="log-panel">
                <div class="log-header">
                  <span>{{ logSummaryHint }}</span
                  ><el-tag
                    v-if="user.blaLastResult"
                    :type="user.blaLastResult === 'success' ? 'success' : 'warning'"
                    size="small"
                    >{{ user.blaLastResult === 'success' ? '执行完成' : '执行异常' }}</el-tag
                  >
                </div>
                <ol
                  v-if="recentMessages.length"
                  class="log-list beautiful-scrollbar"
                  aria-label="最近一次执行日志"
                >
                  <li v-for="(message, index) in recentMessages" :key="index" class="log-line">
                    <span class="log-number" aria-hidden="true">{{
                      String(index + 1).padStart(2, '0')
                    }}</span>
                    <span class="log-message">{{ message }}</span>
                  </li>
                </ol>
                <el-empty v-else description="暂无执行日志" :image-size="64" />
              </section>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { showCustomMessage } from '../utils/customMessage'
import { fetchBlaOverview, runBlaTasks } from '../utils/blaSigner'
import { getBlaTodayKey } from '../utils/blaRunState'
import Nikke4thEvent from './Nikke4thEvent.vue'
import { getNikke4thOpenCount } from '../utils/nikke4th'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  ranToday: {
    type: Boolean,
    default: false,
  },
})

const userStore = useUserStore()

const overviewLoading = ref(false)
const runLoading = ref(false)
const savingConfig = ref(false)
const overviewError = ref('')
const dialogVisible = ref(false)
const activeTab = ref('tasks')
const hasAnniversaryEvent = getNikke4thOpenCount() > 0

const monthlyProductOptions = [
  '[Global] 珠寶 ×30',
  '[Global] 珠寶 ×60',
  '[Global] 珠寶 ×120',
  '[Global] 珠寶 ×320',
  '[Global] 指揮官見面禮：芯塵 ×30',
]

const draftConfig = reactive({
  enabled: false,
  items: [],
})

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  return items
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

const normalizeExchangeRecord = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return {}
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, value]) => [String(key || '').trim(), String(value || '').trim()])
      .filter(([key, value]) => key && value)
  )
}

const getCurrentMonthKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const getStoredConfig = () => ({
  enabled: Boolean(props.user.blaCustomExchangeEnabled),
  items: normalizeItems(props.user.blaMonthlyExchangeItems),
})

const syncDraftFromUser = () => {
  const storedConfig = getStoredConfig()
  draftConfig.enabled = storedConfig.enabled
  draftConfig.items = [...storedConfig.items]
}

const currentOverview = computed(() => props.user.blaTaskOverview || null)

const hasCustomExchangeConfig = computed(() => {
  return Boolean(props.user.blaCustomExchangeEnabled)
})

const badgeState = computed(() => {
  if (!props.user.blaEnabled) {
    return { label: '未开启', type: 'info' }
  }

  if (props.user.blaLastResult === 'fail') {
    return { label: '异常', type: 'danger' }
  }

  const overview = currentOverview.value
  if (overview?.totalCount > 0) {
    if (overview.pendingCount === 0) {
      return { label: '今日完成', type: 'success' }
    }
    if (overview.pendingCount === overview.manualPendingCount) {
      return { label: '待手动', type: 'warning' }
    }
    return {
      label: `${overview.completedCount}/${overview.totalCount}`,
      type: overview.autoPendingCount > 0 ? 'warning' : 'success',
    }
  }

  if (props.ranToday) {
    return { label: '今日已执行', type: 'warning' }
  }

  return { label: '待执行', type: 'info' }
})

const taskItems = computed(() => currentOverview.value?.tasks || [])
const storedExchangeItems = computed(() => normalizeItems(props.user.blaMonthlyExchangeItems))
const activeExchangeItems = computed(() =>
  hasCustomExchangeConfig.value ? storedExchangeItems.value : []
)
const currentMonthKey = computed(() => getCurrentMonthKey())
const exchangeRecord = computed(() => normalizeExchangeRecord(props.user.blaMonthlyExchangeRecord))
const redeemedExchangeItems = computed(() =>
  activeExchangeItems.value.filter((item) => exchangeRecord.value[item] === currentMonthKey.value)
)
const pendingExchangeItems = computed(() =>
  activeExchangeItems.value.filter((item) => exchangeRecord.value[item] !== currentMonthKey.value)
)

const overviewPercentage = computed(() => currentOverview.value?.completionRate || 0)

const progressStatus = computed(() => {
  const overview = currentOverview.value
  if (!overview || overview.totalCount === 0) return undefined
  if (overview.pendingCount === 0) return 'success'
  if (overview.autoPendingCount > 0) return 'warning'
  return undefined
})

const taskProgressText = computed(() => {
  const overview = currentOverview.value
  if (!overview || overview.totalCount === 0) return '未获取'
  if (overview.manualPendingCount > 0 && overview.pendingCount === overview.manualPendingCount) {
    return `${overview.completedCount}/${overview.totalCount}，剩余手动`
  }
  return `${overview.completedCount}/${overview.totalCount}`
})

const taskSummaryHint = computed(() => {
  const overview = currentOverview.value
  if (!overview || overview.totalCount === 0) {
    return '刷新状态后可查看当天任务进度。'
  }
  if (overview.pendingCount === 0) {
    return '今日 BlaBla 任务已经全部完成。'
  }
  if (overview.autoPendingCount > 0 && overview.manualPendingCount > 0) {
    return `剩余 ${overview.autoPendingCount} 项待自动执行，${overview.manualPendingCount} 项需手动完成。`
  }
  if (overview.autoPendingCount > 0) {
    return `剩余 ${overview.autoPendingCount} 项待自动执行。`
  }
  if (overview.manualPendingCount > 0) {
    return `剩余 ${overview.manualPendingCount} 项需手动完成。`
  }
  return '各项任务的完成情况如下。'
})

const totalPointsText = computed(() => {
  const totalPoints = currentOverview.value?.totalPoints
  return Number.isFinite(totalPoints) ? `${totalPoints}` : '--'
})

const effectivePlanShortText = computed(() => {
  return hasCustomExchangeConfig.value ? '单独配置' : '通用配置'
})

const effectivePlanText = computed(() => {
  if (!hasCustomExchangeConfig.value) return '沿用默认通用购买配置'
  return '使用当前账号的单独月度兑换配置'
})

const selectedItemsText = computed(() => {
  if (!storedExchangeItems.value.length) {
    return hasCustomExchangeConfig.value ? '已开启单独配置，但暂未选择商品' : '沿用通用配置'
  }
  if (!hasCustomExchangeConfig.value) {
    return `已保存 ${storedExchangeItems.value.length} 项备用商品，当前未启用`
  }
  return storedExchangeItems.value.join(' / ')
})

const overviewTimeText = computed(() => {
  const fetchedAt = currentOverview.value?.fetchedAt
  return fetchedAt ? formatDateTime(fetchedAt) : '未刷新'
})

const recentMessages = computed(() => {
  return Array.isArray(props.user.blaLastMessages) ? props.user.blaLastMessages : []
})

const hasExchangeRunThisMonth = computed(() => {
  if (!props.user.blaLastRedeemAt) return false
  const redeemDate = new Date(props.user.blaLastRedeemAt)
  if (Number.isNaN(redeemDate.getTime())) return false
  const now = new Date()
  return redeemDate.getFullYear() === now.getFullYear() && redeemDate.getMonth() === now.getMonth()
})

const exchangeTargetCount = computed(() => activeExchangeItems.value.length)
const exchangeCompletedCount = computed(() => redeemedExchangeItems.value.length)
const exchangeProgressPercentage = computed(() => {
  if (exchangeTargetCount.value === 0) return 0
  return Math.round((exchangeCompletedCount.value / exchangeTargetCount.value) * 100)
})

const exchangeProgressStatus = computed(() => {
  if (exchangeTargetCount.value > 0 && exchangeCompletedCount.value >= exchangeTargetCount.value) {
    return 'success'
  }
  if (hasCustomExchangeConfig.value && exchangeTargetCount.value > 0) return 'warning'
  return undefined
})

const exchangeSummaryText = computed(() => {
  if (!hasCustomExchangeConfig.value) return '沿用通用配置'
  if (!exchangeTargetCount.value) return '待配置'
  if (exchangeCompletedCount.value >= exchangeTargetCount.value) {
    return `本月已兑 ${exchangeCompletedCount.value}/${exchangeTargetCount.value}`
  }
  if (hasExchangeRunThisMonth.value) {
    return `本月进度 ${exchangeCompletedCount.value}/${exchangeTargetCount.value}`
  }
  if (hasCustomExchangeConfig.value) return '本月待执行'
  return '沿用通用配置'
})

const monthlyExchangeStatusText = computed(() => {
  if (exchangeTargetCount.value > 0 && exchangeCompletedCount.value >= exchangeTargetCount.value) {
    return exchangeExecutionMessage.value || '本月已完成兑换记录写入'
  }
  if (hasCustomExchangeConfig.value && !exchangeTargetCount.value) {
    return '已开启单独配置，但暂未选择商品'
  }
  if (hasExchangeRunThisMonth.value) {
    return exchangeExecutionMessage.value || '本月已执行过兑换检查'
  }
  if (hasCustomExchangeConfig.value) {
    return '本月暂无兑换记录，等待后续执行'
  }
  return '当前沿用通用购买配置，本月暂无单独兑换记录'
})

const exchangeExecutionMessage = computed(() => props.user.blaLastRedeemMessage || '暂无说明')

const hasRecentExchangeMessage = computed(() => {
  return Boolean(props.user.blaLastRedeemAt || props.user.blaLastRedeemMessage)
})

const redeemedItemsText = computed(() => {
  if (!exchangeTargetCount.value) return '暂无'
  return redeemedExchangeItems.value.length
    ? redeemedExchangeItems.value.join(' / ')
    : '本月暂无已兑商品'
})

const pendingItemsText = computed(() => {
  if (!exchangeTargetCount.value) return '暂无'
  return pendingExchangeItems.value.length
    ? pendingExchangeItems.value.join(' / ')
    : '本月无待兑商品'
})

const logSummaryText = computed(() => {
  if (recentMessages.value.length) return `${recentMessages.value.length} 条`
  return '暂无'
})

const logSummaryHint = computed(() => {
  if (props.user.blaLastRun) {
    return `最近执行时间：${props.user.blaLastRun}`
  }
  return '暂无执行记录'
})

const canInspect = computed(() => {
  return Boolean(props.user.cookie && props.user.server !== 'cn')
})

const canRun = computed(() => {
  return Boolean(props.user.blaEnabled && props.user.cookie && props.user.server !== 'cn')
})

const hasDraftChanges = computed(() => {
  const storedConfig = getStoredConfig()
  const currentItems = normalizeItems(draftConfig.items)
  if (storedConfig.enabled !== draftConfig.enabled) return true
  return JSON.stringify(storedConfig.items) !== JSON.stringify(currentItems)
})

const formatDateTime = (value) => {
  if (!value) return '未记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getTaskTagType = (task) => {
  if (task.completed) return 'success'
  if (task.requiresManual) return 'warning'
  return 'info'
}

const handleShow = () => {
  activeTab.value = 'tasks'
  syncDraftFromUser()
  if (canInspect.value && !currentOverview.value && !overviewLoading.value) {
    refreshOverview(false)
  }
}

const refreshOverview = async (showToast = true) => {
  if (!canInspect.value || overviewLoading.value) return

  overviewLoading.value = true
  overviewError.value = ''

  try {
    const result = await fetchBlaOverview(props.user.cookie)
    if (!result.success || !result.overview) {
      overviewError.value = result.message || '获取 BlaBla 状态失败'
      if (showToast) {
        showCustomMessage(overviewError.value, 'warning')
      }
      return
    }

    await userStore.updateUser(props.user.id, {
      blaTaskOverview: result.overview,
    })

    if (showToast) {
      showCustomMessage('BlaBla 状态已刷新', 'success')
    }
  } catch (error) {
    overviewError.value = error.message || '获取 BlaBla 状态失败'
    if (showToast) {
      showCustomMessage(overviewError.value, 'error')
    }
  } finally {
    overviewLoading.value = false
  }
}

const runTasksNow = async () => {
  if (!canRun.value || runLoading.value) return

  runLoading.value = true
  overviewError.value = ''

  try {
    const result = await runBlaTasks(props.user.cookie, {
      exchangeEnabled: Boolean(props.user.blaCustomExchangeEnabled),
      exchangeItems: props.user.blaMonthlyExchangeItems,
      exchangeRecord: props.user.blaMonthlyExchangeRecord,
    })
    const executedAt = new Date().toLocaleString()
    await userStore.updateUser(props.user.id, {
      blaLastRun: executedAt,
      blaLastResult: result.success ? 'success' : 'fail',
      blaLastMessages: result.messages,
      blaTaskOverview: result.overview || null,
      ...(result.exchange?.attempted
        ? {
            blaMonthlyExchangeRecord: result.exchange.record || {},
            blaLastRedeemAt: result.exchange.lastRedeemAt || new Date().toISOString(),
            blaLastRedeemMessage: result.exchange.lastRedeemMessage || '',
          }
        : {}),
      ...(result.success ? { blaLastRunDateKey: getBlaTodayKey() } : {}),
    })

    activeTab.value = 'logs'
    const summaryParts = []
    if (result.overview) {
      summaryParts.push(`任务 ${result.overview.completedCount}/${result.overview.totalCount}`)
    }
    if (result.exchange?.attempted && result.exchange?.lastRedeemMessage) {
      summaryParts.push(result.exchange.lastRedeemMessage)
    }
    const summary = summaryParts.length
      ? `BlaBla 已执行：${summaryParts.join('，')}`
      : 'BlaBla 已执行'
    showCustomMessage(summary, result.success ? 'success' : 'warning')
  } catch (error) {
    overviewError.value = error.message || '执行 BlaBla 任务失败'
    showCustomMessage(overviewError.value, 'error')
  } finally {
    runLoading.value = false
  }
}

const resetDraftToStored = () => {
  syncDraftFromUser()
}

const saveConfig = async () => {
  if (!hasDraftChanges.value || savingConfig.value) return

  savingConfig.value = true

  try {
    await userStore.updateUser(props.user.id, {
      blaCustomExchangeEnabled: draftConfig.enabled,
      blaMonthlyExchangeItems: normalizeItems(draftConfig.items),
      blaExchangeConfigUpdatedAt: new Date().toISOString(),
    })
    showCustomMessage('BlaBla 单独兑换配置已保存', 'success')
  } catch (error) {
    showCustomMessage(error.message || '保存 BlaBla 配置失败', 'error')
  } finally {
    savingConfig.value = false
  }
}

watch(
  [
    () => props.user.id,
    () => props.user.blaCustomExchangeEnabled,
    () => props.user.blaMonthlyExchangeItems,
  ],
  () => {
    syncDraftFromUser()
  },
  { immediate: true }
)
</script>

<style lang="scss">
.bla-menu-wrapper {
  display: flex;
  justify-content: center;
}
.bla-badge-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  padding: 4px 0;
  cursor: pointer;
  color: inherit;
  .trigger-arrow {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.bla-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  padding: 24px;
  border-radius: 16px;
  .el-dialog__header {
    padding: 0 40px 20px 0;
    margin: 0;
    flex-shrink: 0;
  }
  .el-dialog__headerbtn {
    top: 16px;
    right: 12px;
  }
  .el-dialog__body {
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .panel-header,
  .panel-heading,
  .panel-actions,
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .panel-header,
  .section-header {
    justify-content: space-between;
  }
  .panel-heading {
    flex-wrap: wrap;
    gap: 8px 12px;
    min-width: 0;
  }
  .panel-heading h2 {
    margin: 0;
    font-size: 18px;
    color: var(--el-text-color-primary);
  }
  .account-name {
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
  }
  .panel-actions {
    flex-shrink: 0;
    gap: 8px;
  }
  .panel-actions .el-button + .el-button {
    margin-left: 0;
  }
  .bla-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    height: min(640px, calc(100dvh - 180px));
    min-height: 0;
  }
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    flex-shrink: 0;
  }
  .overview-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-light);
    span {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
    strong {
      font-size: 15px;
      color: var(--el-text-color-primary);
      overflow-wrap: anywhere;
    }
  }
  .panel-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .panel-tabs > .el-tabs__header {
    flex-shrink: 0;
    margin-bottom: 16px;
  }
  .panel-tabs > .el-tabs__content {
    flex: 1;
    min-height: 0;
  }
  .panel-tabs .el-tab-pane {
    height: 100%;
  }
  .tab-scroll {
    height: 100%;
    overflow-y: auto;
    padding-right: 6px;
    box-sizing: border-box;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
  .section-summary {
    color: var(--el-color-primary);
    font-size: 13px;
    text-align: right;
  }
  .section-help {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }
  .content-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    padding: 20px;
  }
  .task-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .task-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
  }
  .task-row .el-tag {
    flex-shrink: 0;
  }
  .exchange-layout {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 16px;
    align-items: start;
  }
  .config-select {
    width: 100%;
  }
  .config-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .config-actions .el-button + .el-button {
    margin-left: 0;
  }
  .exchange-details {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    font-size: 13px;
  }
  .exchange-details dt {
    margin-bottom: 5px;
    color: var(--el-text-color-secondary);
  }
  .exchange-details dd {
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
    color: var(--el-text-color-primary);
  }
  .muted {
    display: block;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
  .log-tab-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .log-count {
    font-size: 11px;
    line-height: 18px;
    border-radius: 5px;
    padding: 0 5px;
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
  }
  .log-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }
  .log-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }
  .log-line {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 13px;
    line-height: 1.7;
  }
  .log-line:last-child {
    border-bottom: 0;
  }
  .log-line:nth-child(even) {
    background: var(--el-fill-color-extra-light);
  }
  .log-number {
    color: var(--el-text-color-placeholder);
    font-variant-numeric: tabular-nums;
    user-select: none;
  }
  .log-message {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--el-text-color-regular);
  }
}
@media screen and (max-width: 600px) {
  .bla-dialog {
    margin: 12px auto !important;
    max-height: calc(100dvh - 24px);
    padding: 16px;
    .el-dialog__header {
      padding-right: 32px;
      padding-bottom: 16px;
    }
    .el-dialog__headerbtn {
      top: 6px;
      right: 4px;
    }
    .panel-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 14px;
    }
    .panel-actions {
      flex-wrap: wrap;
    }
    .bla-panel {
      height: calc(100dvh - 200px);
      gap: 12px;
    }
    .overview-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .overview-card {
      padding: 10px 12px;
      gap: 5px;
    }
    .overview-card strong {
      font-size: 14px;
    }
    .task-list,
    .exchange-layout {
      grid-template-columns: 1fr;
    }
    .content-card {
      padding: 14px;
    }
    .log-line {
      padding: 10px;
      gap: 6px;
      grid-template-columns: 22px minmax(0, 1fr);
    }
    .log-header {
      flex-wrap: wrap;
    }
    .panel-tabs .el-tabs__item {
      padding: 0 12px;
    }
  }
}
</style>
