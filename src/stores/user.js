import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userStorage, tutorialStorage } from '../utils/storage'
import { blablaLinkAuth } from '../utils/blablalink-auth'

export const useUserStore = defineStore('user', () => {
  // 状态
  const users = ref(userStorage.loadUsers())
  const loading = ref(false)
  const hasTutorialShown = ref(tutorialStorage.loadTutorialShown())

  // 新增：BlablaLink认证状态
  const blablaAuthStatus = ref('unknown') // unknown, checking, authenticated, expired
  const blablaUserInfo = ref(null)
  const blablaLastCheck = ref(null)

  // 计算属性
  const userCount = computed(() => users.value.length)
  const userOptions = computed(() => users.value.map(user => ({
    label: user.name,
    value: user.id
  })))

  // 新增：BlablaLink认证状态计算属性
  const isBlablaAuthenticated = computed(() => blablaAuthStatus.value === 'authenticated')
  const blablaAuthSummary = computed(() => ({
    status: blablaAuthStatus.value,
    userInfo: blablaUserInfo.value,
    lastCheck: blablaLastCheck.value,
    isExpired: blablaAuthStatus.value === 'expired'
  }))

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
    // 确保类型匹配，支持字符串和数字类型的ID
    if (id === null || id === undefined) {
      console.log('getUserById: 无效的ID，为null或undefined');
      return null;
    }

    // 将id转换为字符串进行比较，确保能匹配
    const idStr = String(id);
    console.log(`getUserById: 尝试查找ID=${idStr} (类型: ${typeof id})`);

    const user = users.value.find(u => String(u.id) === idStr);
    if (user) {
      console.log(`getUserById: 找到用户 ${user.name}, ID=${user.id}`);
      return user;
    } else {
      console.log(`getUserById: 未找到ID为${idStr}的用户`);
      return null;
    }
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

  // ========== 新增：BlablaLink认证管理方法 ==========

  /**
   * 初始化BlablaLink认证管理
   */
  const initBlablaAuth = async () => {
    try {
      // 监听认证过期事件
      if (typeof window !== 'undefined') {
        window.addEventListener('blablalink-auth-expired', handleBlablaAuthExpiry)
      }

      // 初始化认证管理器
      await blablaLinkAuth.init()

      // 更新状态
      updateBlablaAuthStatus()

      console.log('[UserStore] BlablaLink认证管理初始化完成')

    } catch (error) {
      console.error('[UserStore] BlablaLink认证管理初始化失败:', error)
    }
  }

  /**
   * 更新认证状态到store
   */
  const updateBlablaAuthStatus = () => {
    const status = blablaLinkAuth.getStatus()
    blablaAuthStatus.value = status.authStatus
    blablaUserInfo.value = status.userInfo
    blablaLastCheck.value = new Date().toISOString()
  }

  /**
   * 手动检查BlablaLink认证状态
   */
  const checkBlablaAuth = async () => {
    try {
      blablaAuthStatus.value = 'checking'
      const isValid = await blablaLinkAuth.checkAuthStatus()
      updateBlablaAuthStatus()
      return isValid
    } catch (error) {
      console.error('[UserStore] 检查BlablaLink认证失败:', error)
      blablaAuthStatus.value = 'unknown'
      return false
    }
  }

  /**
   * 手动刷新BlablaLink认证
   */
  const refreshBlablaAuth = async () => {
    try {
      const isValid = await blablaLinkAuth.refresh()
      updateBlablaAuthStatus()
      return isValid
    } catch (error) {
      console.error('[UserStore] 刷新BlablaLink认证失败:', error)
      return false
    }
  }

  /**
   * 确保BlablaLink认证有效（在需要时调用）
   */
  const ensureBlablaAuth = async () => {
    // 如果状态未知或已过期，先检查
    if (['unknown', 'expired'].includes(blablaAuthStatus.value)) {
      const isValid = await checkBlablaAuth()
      if (!isValid) {
        throw new Error('BlablaLink认证已过期，请重新登录')
      }
    }

    // 如果是已认证状态，直接返回
    if (blablaAuthStatus.value === 'authenticated') {
      return true
    }

    throw new Error('BlablaLink认证状态异常')
  }

  /**
   * 处理认证过期事件
   */
  const handleBlablaAuthExpiry = (event) => {
    console.warn('[UserStore] BlablaLink认证已过期:', event.detail)
    blablaAuthStatus.value = 'expired'
    blablaUserInfo.value = null
    blablaLastCheck.value = new Date().toISOString()

    // 可以在这里触发用户界面的过期提示
    // 例如显示Element Plus消息
    if (typeof window !== 'undefined' && window.ElMessage) {
      window.ElMessage.warning({
        message: 'BlablaLink登录已过期，请重新登录',
        duration: 5000,
        showClose: true
      })
    }
  }

  /**
   * 获取BlablaLink认证状态摘要
   */
  const getBlablaAuthSummary = () => {
    return {
      ...blablaAuthSummary.value,
      manager: blablaLinkAuth.getStatus()
    }
  }

  /**
   * 销毁BlablaLink认证管理（组件卸载时调用）
   */
  const destroyBlablaAuth = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('blablalink-auth-expired', handleBlablaAuthExpiry)
    }
    blablaLinkAuth.destroy()
    blablaAuthStatus.value = 'unknown'
    blablaUserInfo.value = null
    blablaLastCheck.value = null
  }

  return {
    // 状态
    users,
    loading,
    hasTutorialShown,

    // 新增：BlablaLink认证状态
    blablaAuthStatus,
    blablaUserInfo,
    blablaLastCheck,

    // 计算属性
    userCount,
    userOptions,

    // 新增：BlablaLink认证计算属性
    isBlablaAuthenticated,
    blablaAuthSummary,

    // 方法
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    setTutorialShown,
    getTutorialShown,

    // 新增：BlablaLink认证管理方法
    initBlablaAuth,
    checkBlablaAuth,
    refreshBlablaAuth,
    ensureBlablaAuth,
    getBlablaAuthSummary,
    destroyBlablaAuth
  }
}) 