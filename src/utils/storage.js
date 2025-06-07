// 存储键名
const STORAGE_KEYS = {
  USERS: 'nikke_cdk_users',
  HISTORY: 'nikke_cdk_history'
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
  saveUsers: (users) => saveData(STORAGE_KEYS.USERS, users),
  
  // 读取用户列表
  loadUsers: () => loadData(STORAGE_KEYS.USERS) || [],
  
  // 添加用户
  addUser: (user) => {
    const users = userStorage.loadUsers()
    users.push(user)
    return userStorage.saveUsers(users)
  },
  
  // 更新用户
  updateUser: (id, userData) => {
    const users = userStorage.loadUsers()
    const index = users.findIndex(u => u.id === id)
    if (index !== -1) {
      users[index] = { ...users[index], ...userData }
      return userStorage.saveUsers(users)
    }
    return false
  },
  
  // 删除用户
  deleteUser: (id) => {
    const users = userStorage.loadUsers()
    const newUsers = users.filter(u => u.id !== id)
    return userStorage.saveUsers(newUsers)
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