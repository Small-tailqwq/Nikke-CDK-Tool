import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { syncUserExchangeHistory } from '../utils/api'
import { useUserStore } from './user'

export const useExchangeStore = defineStore('exchange', () => {
  const history = ref([])
  const loading = ref(false)

  // 获取最近10条兑换记录
  const recentHistory = computed(() => {
    return history.value.slice(0, 10)
  })

  // 获取历史记录
  const fetchHistory = async () => {
    loading.value = true
    try {
      const storedHistory = localStorage.getItem('exchange_history')
      if (storedHistory) {
        history.value = JSON.parse(storedHistory)
      }
    } catch (error) {
      console.error('获取历史记录失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 添加单条兑换记录
  const addExchangeRecord = async (record) => {
    try {
      // 创建新记录，添加ID和默认值
      const newRecord = {
        id: `${record.userId || 'unknown'}-${record.cdk || 'unknown'}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        date: record.date || new Date().toLocaleString(),
        server: record.server || 'unknown',
        serverName: record.serverName || '未知',
        source: record.source || '本地', // 标记来源：本地-本地兑换, 云端-云端同步
        ...record
      }

      // 添加到内存中
      history.value.unshift(newRecord)

      // 保存到本地存储
      localStorage.setItem('exchange_history', JSON.stringify(history.value))

      return newRecord
    } catch (error) {
      console.error('添加兑换记录失败:', error)
      throw error
    }
  }

  // 添加多条兑换记录
  const addExchangeRecords = async (records) => {
    if (!Array.isArray(records) || records.length === 0) return

    // 为每条记录添加唯一ID
    const recordsWithId = records.map((record) => ({
      ...record,
      id: record.id || `${record.userId}-${record.cdk}-${record.date}-${Math.random().toString(36).substring(2, 10)}`
    }))

    // 智能融合记录
    const mergedRecords = mergeRecords(recordsWithId, history.value)

    // 合并记录并按时间倒序排序
    history.value = mergedRecords.sort((a, b) => {
      return new Date(b.date) - new Date(a.date)
    })

    // 保存到本地存储
    try {
      localStorage.setItem('exchange_history', JSON.stringify(history.value))
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }

  // 智能融合记录
  const mergeRecords = (newRecords, existingRecords) => {
    // 如果没有现有记录，直接返回新记录
    if (!existingRecords.length) return [...newRecords]

    // 创建现有记录的副本和新记录的处理状态跟踪
    const result = [...existingRecords]
    const processedNewRecords = new Set()

    // 处理每条新记录
    for (const newRecord of newRecords) {
      // 查找可能的重复记录
      const similarRecords = existingRecords.filter(record =>
        // 相同CDK码
        record.cdk === newRecord.cdk &&
        // 相同用户
        record.userId === newRecord.userId &&
        // 时间接近（5分钟内）
        Math.abs(new Date(record.date) - new Date(newRecord.date)) < 5 * 60 * 1000
      )

      if (similarRecords.length > 0) {
        // 找到可能的重复记录，进行融合
        // 按时间排序，找到最接近的记录
        const closestRecord = similarRecords.sort((a, b) =>
          Math.abs(new Date(a.date) - new Date(newRecord.date)) -
          Math.abs(new Date(b.date) - new Date(newRecord.date))
        )[0]

        const index = result.findIndex(r => r.id === closestRecord.id)
        if (index !== -1) {
          // 智能融合规则：
          const isLocalRecord = closestRecord.source === '本地'
          const isCloudRecord = newRecord.source === '云端'
          const isLocalNewRecord = newRecord.source === '本地'
          const isCloudOldRecord = closestRecord.source === '云端'

          // 融合条件检查：只有当一个记录是本地来源，另一个是云端来源时才进行融合
          const shouldMerge = (isLocalRecord && isCloudRecord) || (isLocalNewRecord && isCloudOldRecord)

          if (shouldMerge) {
            console.log(`融合记录: ${closestRecord.source} + ${newRecord.source} (CDK: ${newRecord.cdk})`)

            // 识别云端和本地记录
            const cloudRecord = isCloudRecord ? newRecord : (isCloudOldRecord ? closestRecord : null)
            const localRecord = isLocalRecord ? closestRecord : (isLocalNewRecord ? newRecord : null)

            // 融合记录
            result[index] = {
              ...closestRecord,
              // 1. 时间选择：优先使用云端时间（更精确）
              date: cloudRecord ? cloudRecord.date : localRecord.date,

              // 2. 结果信息：优先使用本地信息（更详细）
              message: localRecord ? localRecord.message : cloudRecord.message,

              // 3. 成功状态：如果有一个成功，则认为成功
              success: closestRecord.success || newRecord.success,

              // 4. 服务器信息：保留更详细的
              serverName: closestRecord.serverName || newRecord.serverName,

              // 标记为已融合
              merged: true,

              // 记录融合来源
              mergedFrom: `${closestRecord.source}+${newRecord.source}`,

              // 记录融合时间
              mergedAt: new Date().toISOString()
            }

            // 标记为已处理
            processedNewRecords.add(newRecord.id)
          } else {
            // 相同来源的重复记录，跳过新记录，避免重复
            console.log(`跳过重复记录: ${closestRecord.source} = ${newRecord.source} (CDK: ${newRecord.cdk})`)
            processedNewRecords.add(newRecord.id)
          }
        }
      }
    }

    // 添加未处理的新记录
    for (const newRecord of newRecords) {
      if (!processedNewRecords.has(newRecord.id)) {
        result.push(newRecord)
      }
    }

    return result
  }

  // 清空历史记录
  const clearHistory = async () => {
    history.value = []
    try {
      localStorage.removeItem('exchange_history')
    } catch (error) {
      console.error('清空历史记录失败:', error)
    }
  }

  // 替换历史记录
  const replaceHistory = async (newRecords) => {
    if (!Array.isArray(newRecords)) {
      console.error('替换历史记录失败: 提供的记录不是数组')
      return
    }

    // 为每条记录添加唯一ID（如果没有的话）
    const recordsWithId = newRecords.map((record) => {
      if (!record.id) {
        return {
          ...record,
          id: `${record.userId || 'unknown'}-${record.cdk || 'unknown'}-${record.date || new Date().toISOString()}-${Math.random().toString(36).substring(2, 10)}`
        }
      }
      return record
    })

    // 替换历史记录
    history.value = recordsWithId

    // 保存到本地存储
    try {
      localStorage.setItem('exchange_history', JSON.stringify(history.value))
    } catch (error) {
      console.error('保存替换的历史记录失败:', error)
    }
  }

  // 同步用户历史记录
  const syncUserHistory = async (user, options = {}) => {
    if (!user || !user.cookie || user.server === 'cn') {
      return {
        success: false,
        message: '只支持同步国际服用户的历史记录',
        count: 0
      }
    }

    // 🔧 修复：检查Cookie有效性，如果Cookie已失效，直接返回失败
    if (user.cookieExpireDays < 0) {
      console.log(`用户 ${user.name} 的Cookie已失效，跳过历史记录同步`)
      return {
        success: false,
        message: 'Cookie已失效，无法同步历史记录。请更新Cookie后重试。',
        count: 0
      }
    }

    loading.value = true
    try {
      // 获取选项参数
      const page = options.page || 1
      const pageSize = options.pageSize || 20
      const syncAll = options.syncAll || false
      let allRecords = []

      // 如果是同步所有页面，则循环获取所有页面的数据
      if (syncAll) {
        let currentPage = page
        let hasMorePages = true
        let totalPages = 1
        let totalRecords = 0
        let maxAttempts = 10 // 最大尝试页数，防止无限循环

        // 循环获取所有页面的数据
        while (hasMorePages && currentPage <= maxAttempts) {
          // 使用API函数获取当前页数据
          const result = await syncUserExchangeHistory(user.cookie, user.name, user.id, {
            page: currentPage,
            pageSize: pageSize,
            syncAll: false // 每次只获取一页
          })

          if (!result.success || !result.records || result.records.length === 0) {
            // 如果获取失败或没有数据，退出循环
            if (currentPage === page) {
              // 如果是第一页就失败，直接返回错误
              return {
                success: false,
                message: result.message || '同步历史记录失败',
                count: 0
              }
            }
            break
          }

          // 收集当前页的记录
          allRecords = [...allRecords, ...result.records]
          totalRecords = result.total || allRecords.length
          totalPages = result.totalPages || Math.ceil(totalRecords / pageSize)

          // 同步进度由调用方的ProgressMessage显示，这里不再重复显示
          console.log(`已同步第${currentPage}页，共${totalPages}页，当前${allRecords.length}条记录，总计${totalRecords}条`)

          // 判断是否还有更多页面
          hasMorePages = result.hasMorePages && currentPage < totalPages

          // 如果有更多页面，继续获取下一页
          if (hasMorePages) {
            currentPage++
          }
        }

        // 所有页面获取完成，添加到历史记录
        if (allRecords.length > 0) {
          await addExchangeRecords(allRecords)

          return {
            success: true,
            message: `成功同步了 ${allRecords.length} 条历史记录`,
            count: allRecords.length,
            total: totalRecords,
            currentPage: totalPages,
            totalPages: totalPages,
            pageSize: pageSize,
            hasMorePages: false,
            isComplete: true
          }
        }
      } else {
        // 只同步单页数据
        const result = await syncUserExchangeHistory(user.cookie, user.name, user.id, {
          page,
          pageSize,
          syncAll: false
        })

        if (result.success && result.records && result.records.length > 0) {
          // 添加同步的历史记录
          await addExchangeRecords(result.records)

          return {
            success: true,
            message: result.message,
            count: result.records.length,
            total: result.total,
            currentPage: page,
            totalPages: result.totalPages,
            pageSize: result.pageSize,
            hasMorePages: result.hasMorePages,
            isComplete: !result.hasMorePages
          }
        }

        return {
          success: result.success,
          message: result.message || '没有新的历史记录',
          count: 0,
          currentPage: page,
          totalPages: result.totalPages || 1,
          pageSize: result.pageSize,
          hasMorePages: result.hasMorePages || false,
          isComplete: !result.hasMorePages
        }
      }

      return {
        success: true,
        message: '没有新的历史记录',
        count: 0,
        currentPage: page,
        totalPages: 1,
        pageSize: pageSize,
        hasMorePages: false,
        isComplete: true
      }
    } catch (error) {
      console.error('同步历史记录失败:', error)
      return {
        success: false,
        message: error.message || '同步历史记录失败',
        count: 0
      }
    } finally {
      loading.value = false
    }
  }

  // 同步所有用户的历史记录
  const syncAllHistory = async (options = {}) => {
    loading.value = true
    try {
      const userStore = useUserStore()
      const globalUsers = userStore.users.filter(user => user.server !== 'cn')

      if (globalUsers.length === 0) {
        return {
          success: false,
          message: '没有可同步的国际服用户',
          count: 0
        }
      }

      // 获取选项参数
      const pageSize = options.pageSize || 20

      let totalSynced = 0
      let successCount = 0
      let failCount = 0

      // 依次同步每个用户的所有历史记录
      for (const user of globalUsers) {
        try {
          console.log(`正在同步用户 ${user.name} 的历史记录...`)
          const result = await syncUserHistory(user, {
            syncAll: true,
            pageSize: pageSize
          })

          if (result.success) {
            successCount++
            totalSynced += result.count
            console.log(`用户 ${user.name} 同步完成，共 ${result.count} 条记录`)
          } else {
            failCount++
            console.warn(`用户 ${user.name} 同步失败: ${result.message}`)
          }
        } catch (error) {
          failCount++
          console.error(`同步用户 ${user.name} 的历史记录失败:`, error)
          console.error(`用户 ${user.name} 同步失败`)
        }
      }

      // 返回同步结果
      if (successCount === 0) {
        return {
          success: false,
          message: '所有用户同步失败',
          count: 0
        }
      }

      return {
        success: true,
        message: `成功同步了 ${successCount} 个用户的历史记录，共 ${totalSynced} 条`,
        count: totalSynced,
        successUsers: successCount,
        failUsers: failCount
      }
    } catch (error) {
      console.error('同步所有历史记录失败:', error)
      return {
        success: false,
        message: error.message || '同步历史记录失败',
        count: 0
      }
    } finally {
      loading.value = false
    }
  }

  return {
    history,
    loading,
    recentHistory,
    fetchHistory,
    addExchangeRecord,
    addExchangeRecords,
    clearHistory,
    replaceHistory,
    syncUserHistory,
    syncAllHistory
  }
}) 