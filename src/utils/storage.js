// 存储键名
const STORAGE_KEYS = {
  USERS: 'nikke_cdk_users',
  HISTORY: 'nikke_cdk_history',
  TUTORIAL: 'nikke_cdk_tutorial'
}

// 简单AES加密（CryptoJS）
import CryptoJS from 'crypto-js'
const SECRET_KEY = 'nikke-cdk-tool-2024' // 可放到.env

// 加密存储
const encrypt = (data) => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString()
  } catch {
    return ''
  }
}

// 解密数据
const decrypt = (data) => {
  try {
    const bytes = CryptoJS.AES.decrypt(data, SECRET_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decrypted)
  } catch {
    return null
  }
}

// 保存数据
const saveData = (key, data) => {
  try {
    const encryptedData = encrypt(data)
    localStorage.setItem(key, encryptedData)
    return true
  } catch {
    return false
  }
}

// 读取数据
const loadData = (key) => {
  try {
    const data = localStorage.getItem(key)
    if (!data) return null
    return decrypt(data)
  } catch {
    return null
  }
}

// 用户数据操作
export const userStorage = {
  // 保存用户列表
  saveUsers: (users) => {
    try {
      const encryptedData = encrypt(users)
      if (!encryptedData) {
        console.error('加密用户数据失败')
        return false
      }
      localStorage.setItem(STORAGE_KEYS.USERS, encryptedData)
      return true
    } catch (error) {
      console.error('保存用户数据失败:', error)
      return false
    }
  },

  // 读取用户列表
  loadUsers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS)
      if (!data) return []
      const decryptedData = decrypt(data)
      return Array.isArray(decryptedData) ? decryptedData : []
    } catch (error) {
      console.error('读取用户数据失败:', error)
      return []
    }
  },

  // 添加用户
  addUser: (user) => {
    try {
      const users = userStorage.loadUsers()
      users.push(user)
      return userStorage.saveUsers(users)
    } catch (error) {
      console.error('添加用户失败:', error)
      return false
    }
  },

  // 更新用户
  updateUser: (id, userData) => {
    try {
      const users = userStorage.loadUsers()
      const index = users.findIndex(u => u.id === id)
      if (index !== -1) {
        users[index] = {
          ...users[index],
          ...userData,
          id: users[index].id, // 确保保留 id
          createTime: users[index].createTime // 确保保留创建时间
        }
        return userStorage.saveUsers(users)
      }
      return false
    } catch (error) {
      console.error('更新用户失败:', error)
      return false
    }
  },

  // 删除用户
  deleteUser: (id) => {
    try {
      const users = userStorage.loadUsers()
      const newUsers = users.filter(u => u.id !== id)
      return userStorage.saveUsers(newUsers)
    } catch (error) {
      console.error('删除用户失败:', error)
      return false
    }
  }
}

// 新增：教程状态操作
export const tutorialStorage = {
  // 保存教程状态
  saveTutorialShown: (shown) => {
    try {
      const encryptedData = encrypt({ shown })
      if (!encryptedData) {
        console.error('加密教程状态失败')
        return false
      }
      localStorage.setItem(STORAGE_KEYS.TUTORIAL, encryptedData)
      return true
    } catch (error) {
      console.error('保存教程状态失败:', error)
      return false
    }
  },

  // 读取教程状态
  loadTutorialShown: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TUTORIAL)
      if (!data) return false
      const decryptedData = decrypt(data)
      return decryptedData?.shown || false
    } catch (error) {
      console.error('读取教程状态失败:', error)
      return false
    }
  }
}

// 兑换历史操作
export const historyStorage = {
  // 保存历史记录
  saveHistory: (history) => saveData(STORAGE_KEYS.HISTORY, history),

  // 读取历史记录
  loadHistory: () => loadData(STORAGE_KEYS.HISTORY) || [],

  // 添加记录
  addRecord: (record) => {
    const history = historyStorage.loadHistory()
    history.unshift(record)
    return historyStorage.saveHistory(history)
  },

  // 批量添加记录
  addRecords: (records) => {
    const history = historyStorage.loadHistory()
    history.unshift(...records)
    return historyStorage.saveHistory(history)
  },

  // 清空历史
  clearHistory: () => historyStorage.saveHistory([])
} 