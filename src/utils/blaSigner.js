import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nikke-cdk.hayasa.org'
const TIMEOUT = 15000
const REQUEST_RETRY_COUNT = 2
const REQUEST_RETRY_DELAY_MS = 600
const TASK_REPEAT_DELAY_RANGE = {
  min: 800,
  max: 1500,
}

const HEADERS = {
  'Content-Type': 'application/json',
}

const BLA_TASK_TYPE = {
  DAILY_CHECKIN: 1,
  MANUAL_IN_GAME: 2,
  AUTO_REPEAT_A: 13,
  AUTO_REPEAT_B: 14,
}

const BLA_MONTHLY_LIMIT_CODE = 1100010

const DIRECT_COMPLETE_NAME_PATTERNS = [/遊玩遊戲/i, /游玩游戏/i, /play\s*game/i, /launch\s*game/i]

const normalizeExchangeItems = (items) => {
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

const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getRandomDelay = (min, max) => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return Math.max(min || 0, 0)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function req(path, cookie, payload = null) {
  const url = `${API_BASE}${path}`
  for (let attempt = 0; attempt <= REQUEST_RETRY_COUNT; attempt++) {
    try {
      const resp = await axios.post(url, payload === null ? { cookie } : { cookie, payload }, {
        headers: HEADERS,
        timeout: TIMEOUT,
        withCredentials: false,
      })
      return resp.data
    } catch (e) {
      const status = e.response?.status
      const shouldRetry =
        attempt < REQUEST_RETRY_COUNT &&
        (!status || status === 429 || (status >= 500 && status < 600))

      if (shouldRetry) {
        await sleep(REQUEST_RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      const msg = e.response?.data?.msg || e.response?.data?.message || e.message || '请求异常'
      return { code: -1, msg: `请求异常: ${msg}` }
    }
  }
  return { code: -1, msg: '请求异常: 未知错误' }
}

const normalizeNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const getTaskName = (task) => {
  if (task?.task_name) return task.task_name
  if (task?.title) return task.title
  if (task?.task_id) return `任务 ${task.task_id}`
  return '未命名任务'
}

const isDirectCompleteTask = (
  task,
  taskName = getTaskName(task),
  taskType = task?.task_type ?? null
) => {
  if (!task?.task_id) return false

  if (taskType === BLA_TASK_TYPE.AUTO_REPEAT_A || taskType === BLA_TASK_TYPE.AUTO_REPEAT_B) {
    return true
  }

  if (taskType === BLA_TASK_TYPE.MANUAL_IN_GAME) {
    return DIRECT_COMPLETE_NAME_PATTERNS.some((pattern) => pattern.test(taskName))
  }

  return false
}

const summarizeTask = (task) => {
  const rewards = Array.isArray(task?.reward_infos) ? task.reward_infos : []
  const rewardNeeds = rewards
    .map((reward) =>
      normalizeNumber(
        reward.need_completed_times,
        reward.need_times,
        reward.target_times,
        reward.total_times
      )
    )
    .filter((value) => value !== null)
  const rewardCurrent = rewards
    .map((reward) =>
      normalizeNumber(
        reward.completed_times,
        reward.current_completed_times,
        reward.completed_count,
        reward.current_count,
        reward.finish_times
      )
    )
    .filter((value) => value !== null)

  const fallbackNeed =
    normalizeNumber(task?.need_completed_times, task?.need_times, task?.target_times) ||
    (task?.task_type === BLA_TASK_TYPE.DAILY_CHECKIN ? 1 : 0)
  const fallbackCurrent = normalizeNumber(
    task?.completed_times,
    task?.current_completed_times,
    task?.progress_times,
    task?.current_count
  )

  const needTimes = Math.max(...rewardNeeds, fallbackNeed, 0)
  const rawCurrent = Math.max(...rewardCurrent, fallbackCurrent, 0)

  const completedByReward = rewards.length > 0 && rewards.every((reward) => reward.is_completed)
  const completedByFlag = Boolean(task?.is_completed || task?.is_finished || task?.completed)
  const completed = completedByReward || completedByFlag
  const requiresManual =
    task?.task_type === BLA_TASK_TYPE.MANUAL_IN_GAME &&
    !isDirectCompleteTask(task, getTaskName(task), task?.task_type ?? null)
  const currentTimes = completed ? Math.max(rawCurrent, needTimes || 1) : rawCurrent

  let statusText = '待完成'
  if (completed) {
    statusText = '已完成'
  } else if (requiresManual) {
    statusText = '需游戏内完成'
  } else if (needTimes > 1) {
    statusText = `${currentTimes}/${needTimes}`
  }

  return {
    id: task?.task_id || task?.id || `${task?.task_type || 'unknown'}-${getTaskName(task)}`,
    name: getTaskName(task),
    taskType: task?.task_type ?? null,
    completed,
    requiresManual,
    currentTimes,
    needTimes,
    statusText,
  }
}

const buildOverview = (tasks = [], totalPoints = null, meta = {}) => {
  const taskSummaries = tasks.map(summarizeTask)
  const totalCount = taskSummaries.length
  const completedCount = taskSummaries.filter((task) => task.completed).length
  const pendingCount = taskSummaries.filter((task) => !task.completed).length
  const manualPendingCount = taskSummaries.filter(
    (task) => !task.completed && task.requiresManual
  ).length
  const autoPendingCount = taskSummaries.filter(
    (task) => !task.completed && !task.requiresManual
  ).length

  return {
    fetchedAt: new Date().toISOString(),
    totalPoints: Number.isFinite(totalPoints) ? totalPoints : null,
    totalCount,
    completedCount,
    pendingCount,
    manualPendingCount,
    autoPendingCount,
    completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    tasks: taskSummaries,
    ...meta,
  }
}

async function checkLogin(cookie) {
  const res = await req('/global/bla/check-login', cookie)
  return {
    success: res.code === 0,
    message: res.msg || (res.code === 0 ? '登录状态正常' : 'Cookie 已失效'),
  }
}

async function getTaskList(cookie) {
  const res = await req('/global/bla/task-list', cookie, {
    get_top: 'false',
    intl_game_id: '29080',
  })
  if (res.code !== 0) {
    return {
      success: false,
      message: res.msg || '获取任务列表失败',
      tasks: [],
    }
  }
  return {
    success: true,
    message: '获取任务列表成功',
    tasks: Array.isArray(res.data?.tasks) ? res.data.tasks : [],
  }
}

async function submitDailyCheckin(cookie) {
  const res = await req('/global/bla/daily-checkin', cookie, { task_id: '15' })
  if (res.code === 0) return { success: true, msg: '签到成功' }
  const normalizedMessage = String(res.msg || '').toLowerCase()
  if (normalizedMessage.includes('already') || normalizedMessage.includes('重复')) {
    return { success: true, msg: '今日已签到' }
  }
  return { success: false, msg: res.msg || '签到失败' }
}

async function submitCompleteTask(cookie, taskId) {
  const res = await req('/global/bla/complete-task', cookie, {
    task_id: taskId,
    intl_game_id: '29080',
  })
  const normalizedMessage = String(res.msg || '').toLowerCase()
  if (normalizedMessage.includes('already') || normalizedMessage.includes('重复')) {
    return {
      success: true,
      message: '已完成',
    }
  }
  return {
    success: res.code === 0,
    message: res.msg || (res.code === 0 ? '处理成功' : '处理失败'),
  }
}

async function fetchTotalPoints(cookie) {
  const res = await req('/global/bla/total-points', cookie)
  if (res.code === 0) return normalizeNumber(res.data?.total_points)
  return null
}

async function fetchRoleInfo(cookie) {
  const res = await req('/global/bla/role-info', cookie, {})
  if (res.code !== 0) {
    return {
      success: false,
      message: res.msg || '获取角色信息失败',
      roleInfo: null,
    }
  }

  return {
    success: true,
    message: '获取角色信息成功',
    roleInfo: res.data?.role_info || null,
  }
}

async function fetchCommodityList(cookie) {
  const res = await req('/global/bla/commodity-list', cookie, {
    page_num: 1,
    page_size: 20,
    game_id_list: ['29080'],
    is_bind_lip: true,
  })
  if (res.code !== 0) {
    return {
      success: false,
      message: res.msg || '获取商品列表失败',
      commodityList: [],
    }
  }

  return {
    success: true,
    message: '获取商品列表成功',
    commodityList: Array.isArray(res.data?.commodity_list) ? res.data.commodity_list : [],
  }
}

async function exchangeCommodity(cookie, exchangeCommodityId, exchangeCommodityPrice, roleInfo) {
  const res = await req('/global/bla/exchange-commodity', cookie, {
    exchange_commodity_id: exchangeCommodityId,
    exchange_commodity_price: exchangeCommodityPrice,
    role_info: {
      area_id: roleInfo?.area_id || '',
      game_id: roleInfo?.game_id || '29080',
      game_name: roleInfo?.game_name || 'nikke_global',
      plat_id: roleInfo?.plat_id || '0',
      role_id: roleInfo?.role_id || '',
      role_name: roleInfo?.role_name || '',
      zone_id: roleInfo?.zone_id || '0',
    },
    save_role: false,
  })

  return {
    success: res.code === 0,
    limitReached: res.code === BLA_MONTHLY_LIMIT_CODE,
    code: res.code,
    message: res.msg || (res.code === 0 ? '兑换成功' : '兑换失败'),
  }
}

async function redeemMonthlyRewards(cookie, options = {}) {
  const {
    exchangeEnabled = false,
    exchangeItems = [],
    exchangeRecord = {},
    addMsg = () => {},
    onProgress,
  } = options

  const monthKey = getMonthKey()
  const normalizedItems = normalizeExchangeItems(exchangeItems)
  const nextRecord = normalizeExchangeRecord(exchangeRecord)
  const baseSummary = {
    attempted: exchangeEnabled,
    success: true,
    monthKey,
    record: nextRecord,
    targetCount: normalizedItems.length,
    redeemedCount: 0,
    limitReachedCount: 0,
    insufficientCount: 0,
    missingCount: 0,
    failedCount: 0,
    completedCountThisMonth: 0,
    totalPoints: null,
    lastRedeemAt: exchangeEnabled ? new Date().toISOString() : null,
    lastRedeemMessage: exchangeEnabled ? '本次未执行兑换' : '',
  }

  if (!exchangeEnabled) {
    return {
      ...baseSummary,
      attempted: false,
      lastRedeemAt: null,
      lastRedeemMessage: '',
    }
  }

  if (!normalizedItems.length) {
    const message = '未配置每月兑换商品，跳过兑换'
    addMsg(message)
    onProgress?.({
      taskName: '每月兑换',
      detail: message,
    })
    return {
      ...baseSummary,
      success: true,
      lastRedeemMessage: message,
    }
  }

  const commodityResult = await fetchCommodityList(cookie)
  if (!commodityResult.success) {
    addMsg(commodityResult.message)
    onProgress?.({
      taskName: '每月兑换',
      detail: commodityResult.message,
    })
    return {
      ...baseSummary,
      success: false,
      lastRedeemMessage: commodityResult.message,
    }
  }

  const roleInfoResult = await fetchRoleInfo(cookie)
  if (!roleInfoResult.success || !roleInfoResult.roleInfo) {
    const message = roleInfoResult.message || '未找到角色信息，跳过兑换'
    addMsg(message)
    onProgress?.({
      taskName: '每月兑换',
      detail: message,
    })
    return {
      ...baseSummary,
      success: false,
      lastRedeemMessage: message,
    }
  }

  const commodityMap = new Map(
    commodityResult.commodityList.map((commodity) => [commodity?.commodity_name, commodity])
  )

  let totalPoints = await fetchTotalPoints(cookie)
  if (!Number.isFinite(totalPoints)) {
    totalPoints = 0
  }
  baseSummary.totalPoints = totalPoints

  for (const target of normalizedItems) {
    const item = commodityMap.get(target)
    if (!item) {
      baseSummary.missingCount += 1
      baseSummary.success = false
      addMsg(`[${target}] 未找到商品`)
      continue
    }

    if (nextRecord[target] === monthKey) {
      baseSummary.limitReachedCount += 1
      addMsg(`[${target}] 本月已兑换，跳过`)
      continue
    }

    const price = normalizeNumber(item?.commodity_price) || 0
    if (totalPoints < price) {
      baseSummary.insufficientCount += 1
      addMsg(`[${target}] 积分不足 (${totalPoints}<${price})，跳过`)
      continue
    }

    onProgress?.({
      taskName: '每月兑换',
      detail: `正在兑换 ${target}`,
    })

    const exchangeResult = await exchangeCommodity(
      cookie,
      item?.exchange_commodity_id,
      price,
      roleInfoResult.roleInfo
    )

    if (exchangeResult.success) {
      nextRecord[target] = monthKey
      totalPoints = Math.max(totalPoints - price, 0)
      baseSummary.totalPoints = totalPoints
      baseSummary.redeemedCount += 1
      addMsg(`✅ 兑换成功: ${target}`)
      continue
    }

    if (exchangeResult.limitReached) {
      nextRecord[target] = monthKey
      baseSummary.totalPoints = totalPoints
      baseSummary.limitReachedCount += 1
      addMsg(`[${target}] 已达领取上限，跳过`)
      continue
    }

    baseSummary.failedCount += 1
    baseSummary.success = false
    addMsg(`❌ 兑换失败: ${target}`)
  }

  baseSummary.completedCountThisMonth = normalizedItems.filter(
    (item) => nextRecord[item] === monthKey
  ).length
  baseSummary.record = nextRecord
  baseSummary.lastRedeemMessage =
    normalizedItems.length > 0
      ? `本月已兑换 ${baseSummary.completedCountThisMonth}/${normalizedItems.length} 项`
      : '未配置每月兑换商品'

  return baseSummary
}

export async function fetchBlaOverview(cookie, options = {}) {
  const { skipLoginCheck = false } = options

  if (!cookie) {
    return {
      success: false,
      message: '缺少 Cookie，无法获取 BlaBla 状态',
      overview: null,
      messages: ['缺少 Cookie，无法获取 BlaBla 状态'],
    }
  }

  if (!skipLoginCheck) {
    const loginResult = await checkLogin(cookie)
    if (!loginResult.success) {
      return {
        success: false,
        message: loginResult.message,
        overview: null,
        messages: ['Cookie 已失效'],
      }
    }
  }

  const taskResult = await getTaskList(cookie)
  if (!taskResult.success) {
    return {
      success: false,
      message: taskResult.message,
      overview: null,
      messages: [taskResult.message],
    }
  }

  const totalPoints = await fetchTotalPoints(cookie)
  const overview = buildOverview(taskResult.tasks, totalPoints)

  return {
    success: true,
    message:
      overview.totalCount > 0
        ? `今日任务 ${overview.completedCount}/${overview.totalCount}`
        : '未获取到任务列表',
    overview,
    messages: overview.tasks.map((task) => `[${task.name}] ${task.statusText}`),
  }
}

export async function runBlaTasks(cookie, options = {}) {
  const { onProgress, exchangeEnabled = false, exchangeItems = [], exchangeRecord = {} } = options
  const messages = []
  let allSuccess = true

  const addMsg = (msg) => {
    messages.push(msg)
  }

  try {
    const loginResult = await checkLogin(cookie)
    if (!loginResult.success) {
      addMsg('Cookie 已失效')
      return { success: false, messages, overview: null }
    }
    addMsg('Cookie 有效')

    const taskResult = await getTaskList(cookie)
    if (!taskResult.success) {
      addMsg(taskResult.message)
      return { success: false, messages, overview: null }
    }

    const tasks = taskResult.tasks
    if (tasks.length === 0) {
      const totalPoints = await fetchTotalPoints(cookie)
      addMsg('未获取到任务列表')
      addMsg(`当前总积分: ${Number.isFinite(totalPoints) ? totalPoints : '未知'}`)
      return {
        success: true,
        messages,
        overview: buildOverview([], totalPoints),
      }
    }

    const totalTasks = tasks.length

    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index]
      const taskSummary = summarizeTask(task)
      const name = taskSummary.name
      const taskType = taskSummary.taskType
      const taskId = task?.task_id

      if (taskSummary.completed) {
        addMsg(`[${name}] 已完成`)
        onProgress?.({
          current: index + 1,
          total: totalTasks,
          taskName: name,
          detail: '已完成',
        })
        continue
      }

      if (taskType === BLA_TASK_TYPE.DAILY_CHECKIN) {
        const result = await submitDailyCheckin(cookie)
        addMsg(`[${name}] ${result.msg}`)
        if (!result.success) allSuccess = false
        onProgress?.({
          current: index + 1,
          total: totalTasks,
          taskName: name,
          detail: result.msg,
        })
      } else if (
        (taskType === BLA_TASK_TYPE.AUTO_REPEAT_A ||
          taskType === BLA_TASK_TYPE.AUTO_REPEAT_B ||
          isDirectCompleteTask(task, name, taskType)) &&
        taskId
      ) {
        const need = Math.max(taskSummary.needTimes || 0, 1)
        const remainingTimes = Math.max(need - (taskSummary.currentTimes || 0), 1)
        let done = 0
        for (let repeatIndex = 0; repeatIndex < remainingTimes; repeatIndex++) {
          const result = await submitCompleteTask(cookie, taskId)
          if (result.success) done++
          if (repeatIndex < remainingTimes - 1) {
            await sleep(getRandomDelay(TASK_REPEAT_DELAY_RANGE.min, TASK_REPEAT_DELAY_RANGE.max))
          }
        }
        const finalDone = Math.min((taskSummary.currentTimes || 0) + done, need)
        const repeatMessage = `${finalDone}/${need}`
        addMsg(`[${name}] ${repeatMessage}`)
        if (done < remainingTimes) allSuccess = false
        onProgress?.({
          current: index + 1,
          total: totalTasks,
          taskName: name,
          detail: repeatMessage,
        })
      } else if (taskType === BLA_TASK_TYPE.MANUAL_IN_GAME) {
        addMsg(`[${name}] 需游戏内完成，跳过`)
        onProgress?.({
          current: index + 1,
          total: totalTasks,
          taskName: name,
          detail: '需手动完成',
        })
      } else {
        addMsg(`[${name}] 未知任务类型，跳过`)
        onProgress?.({
          current: index + 1,
          total: totalTasks,
          taskName: name,
          detail: '未知任务类型',
        })
      }
    }

    const exchangeResult = await redeemMonthlyRewards(cookie, {
      exchangeEnabled,
      exchangeItems,
      exchangeRecord,
      addMsg,
      onProgress,
    })

    if (!exchangeResult.success) {
      allSuccess = false
    }

    const refreshedTaskResult = await getTaskList(cookie)
    const latestTasks = refreshedTaskResult.success ? refreshedTaskResult.tasks : tasks
    const overviewTotalPoints = Number.isFinite(exchangeResult?.totalPoints)
      ? exchangeResult.totalPoints
      : await fetchTotalPoints(cookie)
    const overview = buildOverview(latestTasks, overviewTotalPoints, {
      stale: !refreshedTaskResult.success,
    })

    addMsg(
      `任务概览: ${overview.completedCount}/${overview.totalCount}${
        overview.manualPendingCount > 0 ? `，${overview.manualPendingCount} 项需手动` : ''
      }`
    )
    addMsg(`当前总积分: ${Number.isFinite(overview.totalPoints) ? overview.totalPoints : '未知'}`)

    if (overview.autoPendingCount > 0) {
      allSuccess = false
    }

    return {
      success: allSuccess,
      messages,
      overview,
      exchange: exchangeResult,
    }
  } catch (e) {
    addMsg(`执行异常: ${e.message}`)
    return {
      success: false,
      messages,
      overview: null,
      exchange: null,
    }
  }
}
