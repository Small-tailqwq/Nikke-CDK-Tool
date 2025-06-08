import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userStorage, tutorialStorage } from '../utils/storage'

export const useUserStore = defineStore('user', () => {
  // 状态
  const users = ref(userStorage.loadUsers())
  const loading = ref(false)
  const hasTutorialShown = ref(tutorialStorage.loadTutorialShown())

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
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        const updatedUser = {
          ...users.value[index],
          ...userData,
          id: users.value[index].id,
          createTime: users.value[index].createTime
        }
        users.value[index] = updatedUser
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

  // 设置教程显示状态
  const setTutorialShown = (shown) => {
    hasTutorialShown.value = shown
    tutorialStorage.saveTutorialShown(shown)
  }

  // 获取教程显示状态
  const getTutorialShown = () => {
    return hasTutorialShown.value
  }

  return {
    // 状态
    users,
    loading,
    hasTutorialShown,
    // 计算属性
    userCount,
    userOptions,
    // 方法
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    setTutorialShown,
    getTutorialShown
  }
}) 