/**
 * 格式化Cookie过期时间为本地时区的友好显示
 * @param {string|Date} expireDate - 过期时间（ISO字符串或Date对象）
 * @returns {string} 格式化后的时间字符串
 */
export function formatCookieExpireTime(expireDate) {
  if (!expireDate) return '未知'

  try {
    const date = typeof expireDate === 'string' ? new Date(expireDate) : expireDate

    if (isNaN(date.getTime())) {
      return '时间格式错误'
    }

    // 使用浏览器本地时区格式化
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }

    return date.toLocaleDateString('zh-CN', options)
  } catch (error) {
    console.warn('格式化过期时间失败:', error)
    return '时间解析失败'
  }
}

/**
 * 计算Cookie剩余时间的描述
 * @param {string|Date} expireDate - 过期时间
 * @returns {string} 剩余时间描述
 */
export function getCookieTimeRemaining(expireDate) {
  if (!expireDate) return '未知'

  try {
    const date = typeof expireDate === 'string' ? new Date(expireDate) : expireDate
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()

    if (diffMs <= 0) {
      return '已过期'
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `剩余${diffDays}天${diffHours > 0 ? `${diffHours}小时` : ''}`
    } else if (diffHours > 0) {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `剩余${diffHours}小时${diffMinutes > 0 ? `${diffMinutes}分钟` : ''}`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `剩余${diffMinutes}分钟`
    }
  } catch (error) {
    console.warn('计算剩余时间失败:', error)
    return '计算失败'
  }
}

/**
 * 获取Cookie过期状态的标签类型
 * @param {string|Date} expireDate - 过期时间
 * @returns {string} Element Plus标签类型
 */
export function getCookieExpireTagType(expireDate) {
  if (!expireDate) return 'info'

  try {
    const date = typeof expireDate === 'string' ? new Date(expireDate) : expireDate
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs <= 0) return 'danger'
    if (diffDays <= 3) return 'danger'
    if (diffDays <= 7) return 'warning'
    if (diffDays <= 20) return 'primary'
    return 'success'
  } catch (error) {
    return 'info'
  }
} 