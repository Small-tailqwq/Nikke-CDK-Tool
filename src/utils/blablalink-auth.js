/**
 * BlablaLink Cookie管理和认证状态监控
 * 适用于Vue + GitHub Pages纯前端架构
 */

class BlablaLinkAuthManager {
  constructor() {
    this.isInitialized = false
    this.authStatus = 'unknown' // unknown, checking, authenticated, expired
    this.userInfo = null
    this.lastActivity = Date.now()
    this.checkInterval = null
    this.renewInterval = null

    // 配置参数
    this.config = {
      checkFrequency: 15 * 60 * 1000, // 15分钟检查一次
      renewFrequency: 6 * 60 * 60 * 1000, // 6小时主动续期一次
      inactiveThreshold: 30 * 60 * 1000, // 30分钟无活动暂停续期
      apiTimeout: 10000 // 10秒API超时
    }

    // 活跃度监听事件
    this.activityEvents = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart']

    // 绑定方法
    this.handleActivity = this.handleActivity.bind(this)
  }

  /**
   * 初始化认证管理器
   */
  async init() {
    if (this.isInitialized) return

    try {
      // 检查当前登录状态
      await this.checkAuthStatus()

      // 启动活跃度监听
      this.startActivityMonitoring()

      // 启动定期检查（仅在浏览器环境）
      if (typeof window !== 'undefined') {
        this.startPeriodicChecks()
      }

      this.isInitialized = true
      console.log('[BlablaLink Auth] 认证管理器初始化完成')

    } catch (error) {
      console.error('[BlablaLink Auth] 初始化失败:', error)
    }
  }

  /**
   * 检查当前认证状态
   */
  async checkAuthStatus() {
    this.authStatus = 'checking'

    try {
      // 检查登录状态
      const loginResponse = await this.callAPI('/api/user/CheckHasLipAccount', {})

      if (loginResponse && loginResponse.code === 0) {
        // 获取用户信息
        const userResponse = await this.callAPI('/api/ugc/proxy/standalonesite/User/GetUserInfoNew', {})

        if (userResponse && userResponse.code === 0) {
          this.authStatus = 'authenticated'
          this.userInfo = userResponse.data
          return true
        }
      }

      this.authStatus = 'expired'
      this.userInfo = null
      return false

    } catch (error) {
      console.error('[BlablaLink Auth] 认证状态检查失败:', error)
      this.authStatus = 'unknown'
      return false
    }
  }

  /**
   * 主动续期认证
   */
  async renewAuth() {
    if (this.authStatus !== 'authenticated') {
      return false
    }

    try {
      // 检查用户活跃度
      const inactiveTime = Date.now() - this.lastActivity
      if (inactiveTime > this.config.inactiveThreshold) {
        console.log('[BlablaLink Auth] 用户不活跃，跳过续期')
        return true
      }

      // 调用用户信息API来续期
      const response = await this.callAPI('/api/ugc/proxy/standalonesite/User/GetUserInfoNew', {})

      if (response && response.code === 0) {
        this.userInfo = response.data
        console.log('[BlablaLink Auth] 认证续期成功')
        return true
      } else {
        this.authStatus = 'expired'
        return false
      }

    } catch (error) {
      console.error('[BlablaLink Auth] 认证续期失败:', error)
      return false
    }
  }

  /**
   * 调用BlablaLink API
   */
  async callAPI(endpoint, data = {}) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.apiTimeout)

    try {
      // 使用代理服务器地址替代直接访问BlablaLink API
      const baseUrl = 'https://nikke-cdk.hayasa.org'
      const proxyUrl = `${baseUrl}/blablalink${endpoint}`

      // 获取当前存储的所有Cookie
      const cookieStr = document.cookie

      console.log(`[BlablaLink Auth] 通过代理调用API: ${proxyUrl}`)
      console.log(`[BlablaLink Auth] 当前Cookie长度: ${cookieStr.length}`)

      const response = await fetch(proxyUrl, {
        method: 'POST',
        credentials: 'include', // 重要：包含Cookie
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Cookie': cookieStr, // 显式传递Cookie作为头部
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()

    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new Error('API请求超时')
      }

      throw error
    }
  }

  /**
   * 启动活跃度监听
   */
  startActivityMonitoring() {
    if (typeof window === 'undefined') return

    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true })
    })
  }

  /**
   * 停止活跃度监听
   */
  stopActivityMonitoring() {
    if (typeof window === 'undefined') return

    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity)
    })
  }

  /**
   * 处理用户活跃度
   */
  handleActivity() {
    this.lastActivity = Date.now()
  }

  /**
   * 启动定期检查
   */
  startPeriodicChecks() {
    // 定期认证状态检查
    this.checkInterval = setInterval(async () => {
      if (this.authStatus === 'authenticated') {
        const isValid = await this.checkAuthStatus()

        if (!isValid) {
          this.handleAuthExpiry()
        }
      }
    }, this.config.checkFrequency)

    // 定期主动续期
    this.renewInterval = setInterval(async () => {
      if (this.authStatus === 'authenticated') {
        await this.renewAuth()
      }
    }, this.config.renewFrequency)
  }

  /**
   * 停止定期检查
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    if (this.renewInterval) {
      clearInterval(this.renewInterval)
      this.renewInterval = null
    }
  }

  /**
   * 处理认证过期
   */
  handleAuthExpiry() {
    console.warn('[BlablaLink Auth] 认证已过期')

    // 触发自定义事件，让Vue组件可以监听
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('blablalink-auth-expired', {
        detail: {
          lastUserInfo: this.userInfo,
          expiredAt: new Date().toISOString()
        }
      }))
    }

    this.userInfo = null
  }

  /**
   * 手动刷新认证状态
   */
  async refresh() {
    console.log('[BlablaLink Auth] 手动刷新认证状态')
    return await this.checkAuthStatus()
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      authStatus: this.authStatus,
      userInfo: this.userInfo,
      lastActivity: this.lastActivity,
      isActive: (Date.now() - this.lastActivity) < this.config.inactiveThreshold
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.stopPeriodicChecks()
    this.stopActivityMonitoring()
    this.isInitialized = false
    this.authStatus = 'unknown'
    this.userInfo = null
    console.log('[BlablaLink Auth] 认证管理器已销毁')
  }
}

// 创建单例实例
const blablaLinkAuth = new BlablaLinkAuthManager()

export { blablaLinkAuth }
export default BlablaLinkAuthManager

// 新增：模拟访问CDK页面来续签会话
export async function renewBlablaLinkSession(user) {
  try {
    // 1. 设置当前用户Cookie
    await setBlablaLinkCookies(user.cookie);

    // 2. 模拟访问CDK页面触发续签
    const response = await axios.get('/blablalink/proxy/cdk-page', {
      headers: {
        'X-Proxy-Target': 'https://www.blablalink.com/cdk',
        'X-Original-Referer': 'https://www.blablalink.com/'
      }
    });

    // 3. 从响应中获取更新的Cookie
    const updatedCookies = response.headers['set-cookie'];
    if (updatedCookies) {
      const newCookieString = updatedCookies.join('; ');

      // 4. 更新用户存储
      userStore.updateUser(user.id, {
        cookie: newCookieString,
        cookieExpireDays: 365
      });

      return true;
    }
  } catch (error) {
    console.error(`[${user.name}续签失败]`, error);
  }
  return false;
}

// 修改多账号续签函数
export async function renewAllBlablaLinkSessions() {
  const globalUsers = userStore.users.filter(u =>
    u.server === 'global' || u.server === 'tw'
  );

  const results = [];

  for (const user of globalUsers) {
    const success = await renewBlablaLinkSession(user);
    results.push({
      userId: user.id,
      name: user.name,
      success
    });
  }

  return results;
} 