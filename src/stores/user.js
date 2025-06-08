import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userStorage } from '../utils/storage'

export const useUserStore = defineStore('user', () => {
  // 状态
  const users = ref(userStorage.loadUsers())
  const loading = ref(false)

  // 计算属性
  const userCount = computed(() => users.value.length)
  const userOptions = computed(() => users.value.map(user => ({
    label: user.name,
    value: user.id
  })))

  // 获取用户列表
  const fetchUsers = async () => {
    loading.value = true
    try {
      users.value = userStorage.loadUsers()
    } catch (error) {
      console.error('获取用户列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 添加用户
  const addUser = async (userData) => {
    try {
      const newUser = {
        id: Date.now(),
        ...userData,
        createTime: new Date().toLocaleString()
      }
      if (userStorage.addUser(newUser)) {
        users.value.push(newUser)
        return newUser
      }
      throw new Error('保存失败')
    } catch (error) {
      console.error('添加用户失败:', error)
      throw error
    }
  }

  // 更新用户
  const updateUser = async (id, userData) => {
    try {
      // 先更新 store 中的数据
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        // 创建新的用户对象，保留原有数据
        const updatedUser = {
          ...users.value[index],
          ...userData,
          // 确保保留 id 和 createTime
          id: users.value[index].id,
          createTime: users.value[index].createTime
        }
        // 更新 store
        users.value[index] = updatedUser
        // 保存到 localStorage
        if (!userStorage.saveUsers(users.value)) {
          throw new Error('保存到本地存储失败')
        }
        return true
      }
      throw new Error('用户不存在')
    } catch (error) {
      console.error('更新用户失败:', error)
      throw error
    }
  }

  // 删除用户
  const deleteUser = async (id) => {
    try {
      if (userStorage.deleteUser(id)) {
        users.value = users.value.filter(u => u.id !== id)
        return true
      }
      throw new Error('删除失败')
    } catch (error) {
      console.error('删除用户失败:', error)
      throw error
    }
  }

  // 获取用户信息
  const getUserById = (id) => {
    return users.value.find(u => u.id === id)
  }

  return {
    // 状态
    users,
    loading,
    // 计算属性
    userCount,
    userOptions,
    // 方法
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById
  }
}) 