import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userStorage } from '../utils/storage'
import { createLogger } from '../utils/logger'

import { autoRenewUserCookie, shouldRenewCookie, getGlobalUserCompleteInfo } from '../utils/api'
import { showCustomMessage } from '../utils/customMessage'

// 创建用户存储模块的日志记录器
const logger = createLogger('UserStore')

export const useUserStore = defineStore('user', () => {
  // 状态
  const users = ref(userStorage.loadUsers())
  const loading = ref(false)

  // 用于跟踪正在进行的Cookie检测，避免竞态条件
  const cookieDetectionMap = new Map()

  // 计算属性
  const userCount = computed(() => users.value.length)
  const userOptions = computed(() => users.value.map(user => ({
    label: user.name,
    value: user.id
  })))



  // 获取用户列表
  const fetchUsers = async () => {
    logger.startOperation('获取用户列表')
    loading.value = true
    try {
      let loadedUsers = userStorage.loadUsers()

      // 🔧 兼容性处理：检查并迁移老版本数据
      let hasUpdates = false
      loadedUsers = loadedUsers.map(user => {
        // 优先判断cookieActualExpireDate字段
        if (user.server !== 'cn' && user.cookie) {
          if (user.cookieActualExpireDate) {
            const expireDate = new Date(user.cookieActualExpireDate)
            const now = new Date()
            if (expireDate > now) {
              // Cookie有效，跳过迁移
              return user
            }
          }
          // 只有没有cookieActualExpireDate或已过期，且cookie不含expires=时才迁移
          if (!user.cookieActualExpireDate && !user.cookie.includes('expires=')) {
            logger.info(`迁移用户${user.name}的Cookie数据`)
            const expireDate = new Date()
            const expireStr = expireDate.toUTCString()
            const migratedUser = {
              ...user,
              cookie: `${user.cookie}; expires=${expireStr}`,
              cookieOriginal: user.cookie,
              cookieExpireDays: 0,
              cookieActualExpireDate: expireDate.toISOString(),
              needsCookieUpdate: true
            }
            hasUpdates = true
            return migratedUser
          }
        }
        // 对于新版本数据，确保有cookieOriginal字段
        if (user.server !== 'cn' && user.cookie && !user.cookieOriginal) {
          return {
            ...user,
            cookieOriginal: user.cookie
          }
        }
        return user
      })

      // 如果有数据更新，保存到本地存储
      if (hasUpdates) {
        logger.info('保存迁移后的用户数据')
        userStorage.saveUsers(loadedUsers)
      }

      users.value = loadedUsers

      // 🔧 数据修复：检测并修正服务器类型
      await detectAndFixServerTypes()

      logger.operationSuccess('获取用户列表', { userCount: loadedUsers.length })
    } catch (error) {
      logger.operationError('获取用户列表', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 添加用户
  const addUser = async (userData) => {
    logger.startOperation('添加用户', { userName: userData.name })
    try {
      const newUser = {
        id: Date.now(),
        ...userData,
        createTime: new Date().toLocaleString()
      }
      if (userStorage.addUser(newUser)) {
        users.value.push(newUser)
        logger.operationSuccess('添加用户', { userId: newUser.id, userName: newUser.name })
        return newUser
      }
      throw new Error('保存失败')
    } catch (error) {
      logger.operationError('添加用户', error, { userData })
      throw error
    }
  }

  // 更新用户
  const updateUser = async (id, userData) => {
    logger.startOperation('更新用户', { userId: id, updateFields: Object.keys(userData) })
    try {
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        const updatedUser = {
          ...users.value[index],
          ...userData,
          id: users.value[index].id,
          createTime: users.value[index].createTime
        }

        // 🔧 修复：如果更新了Cookie，重新检测Cookie状态
        if (userData.cookie && userData.cookie !== users.value[index].cookie) {
          logger.info(`用户 ${updatedUser.name} 的Cookie已更新，重新检测状态`)

          // 重置Cookie状态，让系统重新检测
          updatedUser.cookieExpireDays = undefined
          updatedUser.cookieActualExpireDate = undefined
          updatedUser.needsCookieUpdate = false

          // 从每日检测状态中移除，允许重新检测
          if (dailyCheckStatus.value.checkedUserIds.includes(id)) {
            dailyCheckStatus.value.checkedUserIds = dailyCheckStatus.value.checkedUserIds.filter(uid => uid !== id)
          }
          if (dailyCheckStatus.value.dismissedWarnings.includes(id)) {
            dailyCheckStatus.value.dismissedWarnings = dailyCheckStatus.value.dismissedWarnings.filter(uid => uid !== id)
          }
          saveDailyCheckStatus()

          // 🔧 修复竞态条件：取消之前的检测任务
          if (cookieDetectionMap.has(id)) {
            logger.debug(`取消用户 ${updatedUser.name} 之前的Cookie检测任务`)
            const previousDetection = cookieDetectionMap.get(id)
            if (previousDetection.cancel) {
              previousDetection.cancel()
            }
          }

          // 异步检测新Cookie状态，使用Promise避免setTimeout的问题
          const detectionPromise = (async () => {
            try {
              // 添加取消标志
              let isCancelled = false
              const detection = {
                cancel: () => { isCancelled = true }
              }
              cookieDetectionMap.set(id, detection)

              const result = await getGlobalUserCompleteInfo(userData.cookie)

              // 检查是否被取消
              if (isCancelled) {
                logger.debug(`用户 ${updatedUser.name} 的Cookie检测被取消`)
                return
              }

              if (result.success) {
                logger.operationSuccess('用户 Cookie检测', { userName: updatedUser.name, status: '正常' })
                // 更新Cookie状态为正常，从API响应中获取实际过期时间
                const expireDays = result.data?.expireDays || 30
                await updateUser(id, {
                  cookieExpireDays: expireDays,
                  cookieActualExpireDate: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString()
                })
              } else {
                logger.warn(`用户 ${updatedUser.name} 的新Cookie仍然无效`, { message: result.message })
                // 保持失效状态
                await updateUser(id, {
                  cookieExpireDays: -1,
                  cookieActualExpireDate: new Date().toISOString()
                })
              }
            } catch (error) {
              logger.operationError(`检测用户 ${updatedUser.name} 新Cookie状态`, error)
            } finally {
              // 清理检测记录
              cookieDetectionMap.delete(id)
            }
          })()

          // 存储检测Promise
          cookieDetectionMap.set(id, { ...cookieDetectionMap.get(id), promise: detectionPromise })
        }

        users.value[index] = updatedUser
        if (!userStorage.saveUsers(users.value)) {
          throw new Error('保存到本地存储失败')
        }
        logger.operationSuccess('更新用户', { userId: id, userName: updatedUser.name })
        return true
      }
      throw new Error('用户不存在')
    } catch (error) {
      logger.operationError('更新用户', error, { userId: id, userData })
      throw error
    }
  }

  // 删除用户
  const deleteUser = async (id) => {
    logger.startOperation('删除用户', { userId: id })
    try {
      const user = users.value.find(u => u.id === id)
      const userName = user?.name || `ID:${id}`

      if (userStorage.deleteUser(id)) {
        users.value = users.value.filter(u => u.id !== id)
        logger.operationSuccess('删除用户', { userId: id, userName })
        return true
      }
      throw new Error('删除失败')
    } catch (error) {
      logger.operationError('删除用户', error, { userId: id })
      throw error
    }
  }

  // 获取用户信息
  const getUserById = (id) => {
    // 确保类型匹配，支持字符串和数字类型的ID
    if (id === null || id === undefined) {
      logger.debug('getUserById: 无效的ID，为null或undefined')
      return null
    }

    // 将id转换为字符串进行比较，确保能匹配
    const idStr = String(id)
    logger.debug(`getUserById: 尝试查找ID=${idStr} (类型: ${typeof id})`)

    const user = users.value.find(u => String(u.id) === idStr)
    if (user) {
      logger.debug(`getUserById: 找到用户 ${user.name}, ID=${user.id}`)
      return user
    } else {
      logger.debug(`getUserById: 未找到ID为${idStr}的用户`)
      return null
    }
  }

  // Cookie状态检测相关状态
  const cookieWarnings = ref([]) // 当前显示的Cookie警告
  const dailyCheckStatus = ref({
    lastCheckDate: null,
    checkedUserIds: [], // 今日已检测的用户ID
    dismissedWarnings: [] // 今日已关闭的警告用户ID
  })

  // 初始化每日检测状态
  const initDailyCheckStatus = () => {
    try {
      const stored = localStorage.getItem('nikke_daily_cookie_check')
      if (stored) {
        const parsed = JSON.parse(stored)
        const today = new Date().toDateString()

        // 如果不是今天的数据，重置状态
        if (parsed.lastCheckDate !== today) {
          dailyCheckStatus.value = {
            lastCheckDate: today,
            checkedUserIds: [],
            dismissedWarnings: []
          }
          saveDailyCheckStatus()
          logger.info('每日检测状态已重置为今日')
        } else {
          dailyCheckStatus.value = parsed
          logger.debug('已加载今日的检测状态')
        }
      } else {
        // 首次访问，初始化
        dailyCheckStatus.value = {
          lastCheckDate: new Date().toDateString(),
          checkedUserIds: [],
          dismissedWarnings: []
        }
        saveDailyCheckStatus()
        logger.info('首次访问，已初始化每日检测状态')
      }
    } catch (error) {
      logger.operationError('初始化每日检测状态', error)
      dailyCheckStatus.value = {
        lastCheckDate: new Date().toDateString(),
        checkedUserIds: [],
        dismissedWarnings: []
      }
    }
  }

  // 保存每日检测状态
  const saveDailyCheckStatus = () => {
    try {
      localStorage.setItem('nikke_daily_cookie_check', JSON.stringify(dailyCheckStatus.value))
    } catch (error) {
      logger.operationError('保存每日检测状态失败', error)
    }
  }



  /**
   * 每日首次访问时自动检测所有国际服用户的Cookie状态
   * 检测到问题会显示常驻警告提示
   */
  const performDailyCookieCheck = async () => {
    try {
      console.log('[UserStore] 开始每日Cookie状态检测')

      // 获取所有国际服用户（排除国服和已经是异常状态的用户）
      const globalUsers = users.value.filter(user => {
        // 只检测国际服和港澳台服用户
        if (user.server === 'cn' || !user.cookie) {
          return false
        }

        // 跳过已经标记为异常状态的用户（cookieExpireDays < 0）
        if (user.cookieExpireDays < 0) {
          console.log(`[CookieCheck] 跳过已异常用户: ${user.name} (状态: ${user.cookieExpireDays})`)
          return false
        }

        // 跳过今日已检测的用户
        if (dailyCheckStatus.value.checkedUserIds.includes(user.id)) {
          console.log(`[CookieCheck] 跳过今日已检测用户: ${user.name}`)
          return false
        }

        // 跳过今日已关闭警告的用户
        if (dailyCheckStatus.value.dismissedWarnings.includes(user.id)) {
          console.log(`[CookieCheck] 跳过今日已关闭警告用户: ${user.name}`)
          return false
        }

        return true
      })

      if (globalUsers.length === 0) {
        console.log('[UserStore] 没有需要检测的用户')
        return
      }

      console.log(`[UserStore] 发现${globalUsers.length}个用户需要检测Cookie状态:`,
        globalUsers.map(u => `${u.name}(当前${u.cookieExpireDays}天)`))

      let checkedCount = 0
      let problemUsers = []

      // 检测每个用户的Cookie状态
      for (const user of globalUsers) {
        try {
          console.log(`[CookieCheck] 正在检测用户 ${user.name} 的Cookie状态...`)

          // 调用API检测Cookie有效性
          const result = await getGlobalUserCompleteInfo(user.cookie)

          // 标记为已检测
          dailyCheckStatus.value.checkedUserIds.push(user.id)
          checkedCount++

          if (!result.success) {
            // Cookie失效，添加到问题用户列表
            problemUsers.push({
              user: user,
              problem: 'invalid',
              message: result.message || 'Cookie已失效'
            })

            // 更新用户状态为异常
            await updateUser(user.id, {
              cookieExpireDays: -1,
              cookieActualExpireDate: new Date().toISOString()
            })

            console.log(`[CookieCheck] 用户 ${user.name} Cookie已失效`)
          } else {
            console.log(`[CookieCheck] 用户 ${user.name} Cookie状态正常`)

            // 如果检测成功，可以更新角色信息（可选）
            if (result.playerInfo) {
              await updateUser(user.id, {
                playerInfo: result.playerInfo
              })
            }
          }

        } catch (error) {
          console.warn(`[CookieCheck] 检测用户 ${user.name} 时出错:`, error)

          // 标记为已检测（避免重复检测）
          dailyCheckStatus.value.checkedUserIds.push(user.id)
          checkedCount++

          // 如果是明确的认证错误，标记为问题用户
          if (error.message && (
            error.message.includes('token is invalid') ||
            error.message.includes('无法从Cookie中提取') ||
            error.message.includes('认证失败')
          )) {
            problemUsers.push({
              user: user,
              problem: 'error',
              message: '检测失败，可能已失效'
            })

            // 更新用户状态为异常
            await updateUser(user.id, {
              cookieExpireDays: -1,
              cookieActualExpireDate: new Date().toISOString()
            })
          }
        }
      }

      // 保存检测状态
      saveDailyCheckStatus()

      // 生成警告信息
      if (problemUsers.length > 0) {
        const newWarnings = problemUsers.map(item => ({
          id: `cookie-warning-${item.user.id}`,
          userId: item.user.id,
          userName: item.user.name,
          userServer: item.user.server,
          problem: item.problem,
          message: item.message,
          timestamp: new Date().toISOString()
        }))

        // 添加到警告列表
        cookieWarnings.value.push(...newWarnings)

        console.log(`[CookieCheck] 发现${problemUsers.length}个用户存在Cookie问题，已生成警告`)
      }

      console.log(`[UserStore] 每日Cookie状态检测完成：检测${checkedCount}个用户，发现${problemUsers.length}个问题`)

    } catch (error) {
      console.error('[UserStore] 每日Cookie状态检测异常:', error)
    }
  }

  // 关闭特定的Cookie警告
  const dismissCookieWarning = (warningId, userId) => {
    // 从警告列表中移除
    cookieWarnings.value = cookieWarnings.value.filter(w => w.id !== warningId)

    // 标记为今日已关闭
    if (userId && !dailyCheckStatus.value.dismissedWarnings.includes(userId)) {
      dailyCheckStatus.value.dismissedWarnings.push(userId)
      saveDailyCheckStatus()
    }

    console.log(`[CookieWarning] 已关闭警告: ${warningId}`)
  }

  // 关闭所有Cookie警告
  const dismissAllCookieWarnings = () => {
    const userIds = cookieWarnings.value.map(w => w.userId)

    // 清空警告列表
    cookieWarnings.value = []

    // 标记所有为今日已关闭
    userIds.forEach(userId => {
      if (!dailyCheckStatus.value.dismissedWarnings.includes(userId)) {
        dailyCheckStatus.value.dismissedWarnings.push(userId)
      }
    })

    saveDailyCheckStatus()
    console.log('[CookieWarning] 已关闭所有警告')
  }

  /**
   * 自动检测并续期临近过期的Cookie
   * 页面加载时执行，自动为需要续期的用户进行Cookie续期
   */
  const performAutoRenewal = async () => {
    try {
      console.log('[UserStore] 开始自动Cookie续期检测')

      // 过滤出需要续期的用户（国际服/港澳台服，且Cookie剩余天数≤7天）
      const usersNeedRenewal = users.value.filter(user => {
        if (user.server === 'cn' || !user.cookie) {
          return false
        }
        return shouldRenewCookie(user.cookieExpireDays, 7)
      })

      if (usersNeedRenewal.length === 0) {
        console.log('[UserStore] 没有用户需要自动续期')
        return
      }

      console.log(`[UserStore] 发现${usersNeedRenewal.length}个用户需要自动续期:`,
        usersNeedRenewal.map(u => `${u.name}(${u.cookieExpireDays}天)`))

      let renewedCount = 0
      let failedCount = 0

      // 为每个需要续期的用户执行续期
      for (const user of usersNeedRenewal) {
        try {
          console.log(`[UserStore] 正在为用户 ${user.name} 自动续期Cookie...`)

          const result = await autoRenewUserCookie(user)

          if (result.success) {
            // 🚨 检查是否包含关键的game_token
            if (!result.data.hasGameToken) {
              console.error(`❌ [UserStore] 用户 ${user.name} 自动续期失败：响应中未包含game_token`)
              failedCount++
              continue
            }

            // 计算新的实际过期日期
            const newExpireDate = new Date(Date.now() + result.data.expireDays * 24 * 60 * 60 * 1000)

            // 更新用户信息
            await updateUser(user.id, {
              cookie: result.data.newCookie,
              cookieExpireDays: result.data.expireDays,
              cookieActualExpireDate: newExpireDate.toISOString(),
              needsCookieUpdate: false, // 🔧 清除更新标志
              needsApiValidation: false, // 🔧 清除验证标志
            })

            renewedCount++
            console.log(`[UserStore] 用户 ${user.name} Cookie自动续期成功，新有效期：${result.data.expireDays}天，获取了${result.data.totalCookies}个Cookie，过期日期：${newExpireDate.toISOString()}`)
          } else {
            failedCount++
            console.warn(`[UserStore] 用户 ${user.name} Cookie自动续期失败:`, result.message)
          }
        } catch (error) {
          failedCount++
          console.error(`[UserStore] 用户 ${user.name} Cookie自动续期异常:`, error)
        }
      }

      // 显示续期结果摘要
      if (renewedCount > 0) {
        const message = failedCount > 0
          ? `自动续期完成：成功${renewedCount}个，失败${failedCount}个用户`
          : `自动续期完成：成功为${renewedCount}个用户续期Cookie`

        showCustomMessage(message, failedCount > 0 ? 'warning' : 'success')
      } else if (failedCount > 0) {
        showCustomMessage(`自动续期失败：${failedCount}个用户续期失败`, 'error')
      }

      console.log(`[UserStore] 自动Cookie续期完成：成功${renewedCount}个，失败${failedCount}个`)

    } catch (error) {
      console.error('[UserStore] 自动Cookie续期检测异常:', error)
    }
  }

  // 🔧 检测并修复用户的服务器类型
  const detectAndFixServerTypes = async () => {
    try {
      // 检查是否已经执行过修复（避免重复执行）
      const fixedFlag = localStorage.getItem('server_types_fixed_v1')
      if (fixedFlag === 'true') {
        logger.debug('服务器类型修复已执行过，跳过')
        return
      }

      logger.startOperation('检测并修复服务器类型')
      let hasChanges = false
      const fixedUsers = []

      // 检查每个用户的服务器类型
      for (const user of users.value) {
        if (user.server === 'cn' || !user.cookie) {
          continue // 跳过国服用户和没有Cookie的用户
        }

        // 从Cookie中检测实际的服务器类型
        const detectedServer = detectServerFromCookie(user.cookie)

        if (detectedServer && detectedServer !== user.server) {
          logger.info(`检测到用户 ${user.name} 的服务器类型需要修复: ${user.server} -> ${detectedServer}`)

          // 更新用户的服务器类型
          const updatedUser = {
            ...user,
            server: detectedServer
          }

          // 更新内存中的用户数据
          const userIndex = users.value.findIndex(u => u.id === user.id)
          if (userIndex !== -1) {
            users.value[userIndex] = updatedUser
            hasChanges = true
            fixedUsers.push({
              name: user.name,
              from: user.server,
              to: detectedServer
            })
          }
        }
      }

      // 如果有变更，保存到存储
      if (hasChanges) {
        userStorage.saveUsers(users.value)
        logger.operationSuccess('服务器类型修复完成', {
          fixedCount: fixedUsers.length,
          details: fixedUsers
        })

        // 显示修复结果给用户
        if (fixedUsers.length > 0) {
          const message = `已自动修复 ${fixedUsers.length} 个用户的服务器类型`
          console.log('🔧 服务器类型自动修复完成:', fixedUsers)
        }
      } else {
        logger.info('所有用户的服务器类型都正确，无需修复')
      }

      // 标记修复已完成
      localStorage.setItem('server_types_fixed_v1', 'true')

    } catch (error) {
      logger.operationError('服务器类型修复失败', error)
    }
  }

  // 从Cookie检测服务器类型的辅助函数
  const detectServerFromCookie = (cookieStr) => {
    if (!cookieStr || typeof cookieStr !== 'string') {
      return null
    }

    try {
      // 提取game_channelid
      const channelMatch = cookieStr.match(/game_channelid=([^;]+)/)
      if (!channelMatch) {
        return null
      }

      const channelId = parseInt(channelMatch[1])

      // 根据channelid判断服务器类型
      switch (channelId) {
        case 2:
          return 'global' // 国际服
        case 6:
          return 'tw'     // 港澳台服
        default:
          return 'global' // 默认国际服
      }
    } catch (error) {
      logger.warn('检测服务器类型失败:', error)
      return null
    }
  }

  return {
    // 状态
    users,
    loading,
    // hasTutorialShown, // This line is removed
    cookieWarnings,
    dailyCheckStatus,



    // 计算属性
    userCount,
    userOptions,



    // 方法
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,



    // Cookie检测和管理方法
    initDailyCheckStatus,
    performDailyCookieCheck,
    dismissCookieWarning,
    dismissAllCookieWarnings,

    // 服务器类型修复方法
    detectAndFixServerTypes,

    // Cookie自动续期方法
    performAutoRenewal
  }
}) 