<template>
  <div class="bla-menu-wrapper">
    <el-tag v-if="user.server === 'cn'" type="info" size="small">国服不适用</el-tag>
    <el-popover
      v-else
      trigger="click"
      placement="bottom"
      :width="popoverWidth"
      popper-class="bla-popover"
      @show="handleShow"
    >
      <template #reference>
        <button type="button" class="bla-badge-trigger">
          <el-tag :type="badgeState.type" size="small">
            {{ badgeState.label }}
          </el-tag>
          <el-tag
            v-if="hasCustomExchangeConfig"
            type="warning"
            size="small"
            effect="plain"
            class="config-indicator"
          >
            配置
          </el-tag>
          <el-icon class="trigger-arrow"><ArrowDown /></el-icon>
        </button>
      </template>

      <div class="bla-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">BlaBla 管控</div>
            <div class="panel-subtitle">{{ user.name || '未命名用户' }}</div>
          </div>
          <div class="panel-actions">
            <el-button
              text
              size="small"
              :loading="overviewLoading"
              :disabled="!canInspect || runLoading"
              @click="refreshOverview()"
            >
              刷新状态
            </el-button>
            <el-button
              type="primary"
              size="small"
              :loading="runLoading"
              :disabled="!canRun"
              @click="runTasksNow"
            >
              立即执行
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="!user.blaEnabled"
          type="info"
          show-icon
          :closable="false"
          title="当前账号未开启自动 BlaBla 任务，但仍可单独查看状态或预先配置兑换方案。"
        />
        <el-alert
          v-else-if="!user.cookie"
          type="warning"
          show-icon
          :closable="false"
          title="当前账号缺少 Cookie，暂时无法查询 BlaBla 任务状态。"
        />
        <el-alert
          v-else-if="overviewError"
          type="warning"
          show-icon
          :closable="false"
          :title="overviewError"
        />

        <div class="overview-grid">
          <div class="overview-card">
            <span class="card-label">今日任务</span>
            <strong class="card-value">{{ taskProgressText }}</strong>
          </div>
          <div class="overview-card">
            <span class="card-label">积分</span>
            <strong class="card-value">{{ totalPointsText }}</strong>
          </div>
          <div class="overview-card">
            <span class="card-label">兑换策略</span>
            <strong class="card-value">{{ effectivePlanShortText }}</strong>
          </div>
          <div class="overview-card">
            <span class="card-label">上次刷新</span>
            <strong class="card-value">{{ overviewTimeText }}</strong>
          </div>
        </div>

        <div class="panel-section compact-section">
          <button
            type="button"
            class="summary-toggle"
            :aria-expanded="taskExpanded"
            @click="taskExpanded = !taskExpanded"
          >
            <div class="summary-main">
              <div class="summary-heading">
                <div class="section-title">任务完成情况</div>
                <span class="section-summary">{{ taskProgressText }}</span>
              </div>
              <el-progress
                :percentage="overviewPercentage"
                :status="progressStatus"
                :stroke-width="6"
                :show-text="false"
              />
              <div class="summary-caption">{{ taskSummaryHint }}</div>
            </div>
            <el-icon class="summary-arrow" :class="{ 'is-open': taskExpanded }">
              <ArrowDown />
            </el-icon>
          </button>
          <div v-if="taskExpanded" class="summary-body">
            <div v-if="taskItems.length" class="task-list">
              <div v-for="task in taskItems" :key="task.id" class="task-row">
                <span class="task-name">{{ task.name }}</span>
                <el-tag :type="getTaskTagType(task)" size="small">{{ task.statusText }}</el-tag>
              </div>
            </div>
            <div v-else class="empty-text">暂无任务状态，点击“刷新状态”后可查看。</div>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-header">
            <div class="section-title">每月兑换配置</div>
            <el-switch v-model="draftConfig.enabled" />
          </div>
          <div class="section-help">
            关闭时继续沿用默认通用购买配置；开启后仅当前账号使用单独的每月兑换商品设置。
            当前提供 {{ monthlyProductOptions.length }} 个固定商品可选。
          </div>
          <el-select
            v-model="draftConfig.items"
            multiple
            filterable
            clearable
            collapse-tags
            collapse-tags-tooltip
            class="config-select"
            :disabled="!draftConfig.enabled"
            placeholder="选择每月兑换的 Global 珠宝商品"
          >
            <el-option
              v-for="option in monthlyProductOptions"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
          <div class="config-actions">
            <el-button size="small" @click="resetDraftToStored">撤销</el-button>
            <el-button size="small" type="primary" :loading="savingConfig" @click="saveConfig">
              保存配置
            </el-button>
          </div>
        </div>

        <div class="panel-section compact-section">
          <button
            type="button"
            class="summary-toggle"
            :aria-expanded="exchangeExpanded"
            @click="exchangeExpanded = !exchangeExpanded"
          >
            <div class="summary-main">
              <div class="summary-heading">
                <div class="section-title">兑换情况</div>
                <span class="section-summary">{{ exchangeSummaryText }}</span>
              </div>
              <el-progress
                :percentage="exchangeProgressPercentage"
                :status="exchangeProgressStatus"
                :stroke-width="6"
                :show-text="false"
              />
              <div class="summary-caption">{{ exchangeSummaryHint }}</div>
            </div>
            <el-icon class="summary-arrow" :class="{ 'is-open': exchangeExpanded }">
              <ArrowDown />
            </el-icon>
          </button>
          <div v-if="exchangeExpanded" class="summary-body">
            <div class="exchange-box">
              <div class="exchange-row">
                <span class="exchange-label">本月兑换状态</span>
                <strong class="exchange-value">{{ monthlyExchangeStatusText }}</strong>
              </div>
              <div class="exchange-row">
                <span class="exchange-label">当前生效策略</span>
                <strong class="exchange-value">{{ effectivePlanText }}</strong>
              </div>
              <div class="exchange-row">
                <span class="exchange-label">本月兑换进度</span>
                <strong class="exchange-value">{{ exchangeProgressDetailText }}</strong>
              </div>
              <div class="exchange-row">
                <span class="exchange-label">已选商品</span>
                <span class="exchange-value">{{ selectedItemsText }}</span>
              </div>
              <div v-if="activeExchangeItems.length" class="exchange-row">
                <span class="exchange-label">本月已兑商品</span>
                <span class="exchange-value">{{ redeemedItemsText }}</span>
              </div>
              <div v-if="activeExchangeItems.length" class="exchange-row">
                <span class="exchange-label">本月待兑商品</span>
                <span class="exchange-value">{{ pendingItemsText }}</span>
              </div>
              <div v-if="hasRecentExchangeMessage" class="exchange-row">
                <span class="exchange-label">最近兑换结果</span>
                <span class="exchange-value">
                  {{ exchangeExecutionMessage }}
                  <span v-if="user.blaLastRedeemAt" class="exchange-time">
                    {{ formatDateTime(user.blaLastRedeemAt) }}
                  </span>
                </span>
              </div>
              <div v-else class="empty-text">暂无兑换记录，后续执行后会在这里显示。</div>
            </div>
          </div>
        </div>

        <div class="panel-section compact-section">
          <button
            type="button"
            class="summary-toggle summary-toggle-plain"
            :aria-expanded="logExpanded"
            @click="logExpanded = !logExpanded"
          >
            <div class="summary-main">
              <div class="summary-heading">
                <div class="section-title">最近执行日志</div>
                <span class="section-summary">{{ logSummaryText }}</span>
              </div>
              <div class="summary-caption">{{ logSummaryHint }}</div>
            </div>
            <el-icon class="summary-arrow" :class="{ 'is-open': logExpanded }">
              <ArrowDown />
            </el-icon>
          </button>
          <div v-if="logExpanded" class="summary-body">
            <div v-if="recentMessages.length" class="log-scroll">
              <div class="log-list">
                <div v-for="(message, index) in recentMessages" :key="index" class="log-line">
                  {{ message }}
                </div>
                <div v-if="user.blaLastRun" class="log-time">
                  最近执行: {{ user.blaLastRun }}
                </div>
              </div>
            </div>
            <div v-else class="empty-text">暂无执行日志，后续执行后会在这里显示。</div>
          </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { showCustomMessage } from '../utils/customMessage'
import { fetchBlaOverview, runBlaTasks } from '../utils/blaSigner'
import { getBlaTodayKey } from '../utils/blaRunState'

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
const taskExpanded = ref(false)
const exchangeExpanded = ref(false)
const logExpanded = ref(false)
const popoverWidth = computed(() => (window.innerWidth <= 768 ? 320 : 380))

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
    return '点击展开可查看明细，刷新状态后会展示当天任务进度。'
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
  return '点击展开可查看各个任务的具体完成情况。'
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
  return Array.isArray(props.user.blaLastMessages) ? props.user.blaLastMessages.slice(0, 8) : []
})

const hasExchangeRunThisMonth = computed(() => {
  if (!props.user.blaLastRedeemAt) return false
  const redeemDate = new Date(props.user.blaLastRedeemAt)
  if (Number.isNaN(redeemDate.getTime())) return false
  const now = new Date()
  return (
    redeemDate.getFullYear() === now.getFullYear() && redeemDate.getMonth() === now.getMonth()
  )
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

const exchangeSummaryHint = computed(() => {
  if (exchangeTargetCount.value > 0 && exchangeCompletedCount.value >= exchangeTargetCount.value) {
    return exchangeExecutionMessage.value || '本月配置商品已全部完成兑换记录。'
  }
  if (hasCustomExchangeConfig.value && !exchangeTargetCount.value) {
    return '已开启单独配置，但当前还没有选择每月兑换商品。'
  }
  if (hasExchangeRunThisMonth.value) {
    return exchangeExecutionMessage.value || '本月已执行过兑换检查，点击展开可查看明细。'
  }
  if (hasCustomExchangeConfig.value) {
    return `已配置 ${exchangeTargetCount.value} 个商品，本月暂无兑换记录。`
  }
  return '当前账号继续沿用通用购买配置，本月暂无单独兑换记录。'
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

const exchangeProgressDetailText = computed(() => {
  if (!hasCustomExchangeConfig.value) return '沿用通用配置'
  if (!exchangeTargetCount.value) return '0/0，待配置'
  return `${exchangeCompletedCount.value}/${exchangeTargetCount.value}`
})

const redeemedItemsText = computed(() => {
  if (!exchangeTargetCount.value) return '暂无'
  return redeemedExchangeItems.value.length ? redeemedExchangeItems.value.join(' / ') : '本月暂无已兑商品'
})

const pendingItemsText = computed(() => {
  if (!exchangeTargetCount.value) return '暂无'
  return pendingExchangeItems.value.length ? pendingExchangeItems.value.join(' / ') : '本月无待兑商品'
})

const logSummaryText = computed(() => {
  if (recentMessages.value.length) return `${recentMessages.value.length} 条`
  return '暂无'
})

const logSummaryHint = computed(() => {
  if (props.user.blaLastRun) {
    return `最近执行时间：${props.user.blaLastRun}`
  }
  return '默认收起，点击后可查看最近一次执行输出。'
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

const resetExpandedSections = () => {
  taskExpanded.value = false
  exchangeExpanded.value = false
  logExpanded.value = false
}

const handleShow = () => {
  resetExpandedSections()
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

    const summaryParts = []
    if (result.overview) {
      summaryParts.push(`任务 ${result.overview.completedCount}/${result.overview.totalCount}`)
    }
    if (result.exchange?.attempted && result.exchange?.lastRedeemMessage) {
      summaryParts.push(result.exchange.lastRedeemMessage)
    }
    const summary = summaryParts.length ? `BlaBla 已执行：${summaryParts.join('，')}` : 'BlaBla 已执行'
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
  () => [props.user.id, props.user.blaCustomExchangeEnabled, props.user.blaMonthlyExchangeItems],
  () => {
    syncDraftFromUser()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.bla-menu-wrapper {
  display: flex;
  justify-content: center;
}

.bla-badge-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;

  .config-indicator {
    margin-left: -2px;
  }

  .trigger-arrow {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    transition: transform 0.2s ease;
  }

  &:hover .trigger-arrow {
    transform: translateY(1px);
  }
}

.bla-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.overview-card {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compact-section {
  gap: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-summary {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-color-primary);
  font-weight: 500;
}

.section-help {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.summary-toggle {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--el-fill-color-light), var(--el-fill-color-blank));
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.summary-toggle:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.summary-toggle-plain {
  background: var(--el-fill-color-light);
}

.summary-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.summary-caption {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.summary-arrow {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  transition: transform 0.2s ease;
}

.summary-arrow.is-open {
  transform: rotate(180deg);
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-list,
.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-scroll {
  max-height: 168px;
  overflow-y: auto;
  padding-right: 4px;
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.task-name {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.config-select {
  width: 100%;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.exchange-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
}

.exchange-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exchange-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.exchange-value {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.exchange-time,
.log-time {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.log-line {
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
  color: var(--el-text-color-regular);
}

.log-scroll::-webkit-scrollbar {
  width: 6px;
}

.log-scroll::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 999px;
}

.log-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.empty-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

:deep(.bla-popover) {
  padding: 12px !important;
  border-radius: 14px;
}

@media screen and (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .panel-actions {
    justify-content: flex-end;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .summary-heading {
    flex-direction: column;
    gap: 4px;
  }

  .task-row {
    flex-direction: column;
    align-items: stretch;
  }

  .config-actions {
    justify-content: stretch;

    .el-button {
      flex: 1;
    }
  }
}
</style>
