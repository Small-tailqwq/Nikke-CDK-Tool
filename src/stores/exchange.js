import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { historyStorage } from '../utils/storage'

export const useExchangeStore = defineStore('exchange', () => {
  // 状态
  const history = ref(historyStorage.loadHistory())
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(history.value.length)

  // 计算属性
  const recentHistory = computed(() => {
    return history.value.slice(0, 5) // 只返回最近5条记录
  })

  const paginatedHistory = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return history.value.slice(start, end)
  })

  // 获取兑换历史
  const fetchHistory = async () => {
    loading.value = true
    try {
      history.value = historyStorage.loadHistory()
      total.value = history.value.length
    } catch (error) {
      console.error('获取兑换历史失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 添加兑换记录
  const addExchangeRecord = async (record) => {
    try {
      const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        ...record
      }
      if (historyStorage.addRecord(newRecord)) {
        history.value.unshift(newRecord)
        total.value++
        return newRecord
      }
      throw new Error('保存失败')
    } catch (error) {
      console.error('添加兑换记录失败:', error)
      throw error
    }
  }

  // 批量添加兑换记录
  const addExchangeRecords = async (records) => {
    try {
      const newRecords = records.map(record => ({
        id: Date.now() + Math.random(),
        date: new Date().toLocaleString(),
        ...record
      }))
      if (historyStorage.addRecords(newRecords)) {
        history.value.unshift(...newRecords)
        total.value += newRecords.length
        return newRecords
      }
      throw new Error('保存失败')
    } catch (error) {
      console.error('批量添加兑换记录失败:', error)
      throw error
    }
  }

  // 清空历史记录
  const clearHistory = async () => {
    try {
      if (historyStorage.clearHistory()) {
        history.value = []
        total.value = 0
        currentPage.value = 1
        return true
      }
      throw new Error('清空失败')
    } catch (error) {
      console.error('清空历史记录失败:', error)
      throw error
    }
  }

  return {
    // 状态
    history,
    loading,
    currentPage,
    pageSize,
    total,
    // 计算属性
    recentHistory,
    paginatedHistory,
    // 方法
    fetchHistory,
    addExchangeRecord,
    addExchangeRecords,
    clearHistory
  }
}) 