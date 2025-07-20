/**
 * 统一的日志记录工具
 * 提供标准化的日志记录和错误处理方法
 */

// 日志级别枚举
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// 当前日志级别配置（生产环境可设置为INFO或WARN）
const currentLogLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO

/**
 * 格式化日志前缀
 * @param {string} module - 模块名称
 * @param {string} level - 日志级别
 * @returns {string} 格式化后的前缀
 */
const formatLogPrefix = (module, level) => {
  const timestamp = new Date().toLocaleTimeString()
  return `[${timestamp}] [${module}] ${level}:`
}

/**
 * 通用日志记录函数
 * @param {number} level - 日志级别
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 * @param {...any} args - 额外参数
 */
const log = (level, module, message, ...args) => {
  if (level < currentLogLevel) return

  const prefix = formatLogPrefix(module, getLevelName(level))

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(prefix, message, ...args)
      break
    case LogLevel.INFO:
      console.log(prefix, message, ...args)
      break
    case LogLevel.WARN:
      console.warn(prefix, message, ...args)
      break
    case LogLevel.ERROR:
      console.error(prefix, message, ...args)
      break
  }
}

/**
 * 获取日志级别名称
 * @param {number} level - 日志级别
 * @returns {string} 级别名称
 */
const getLevelName = (level) => {
  switch (level) {
    case LogLevel.DEBUG: return 'DEBUG'
    case LogLevel.INFO: return 'INFO'
    case LogLevel.WARN: return 'WARN'
    case LogLevel.ERROR: return 'ERROR'
    default: return 'UNKNOWN'
  }
}

/**
 * 创建模块专用的日志记录器
 * @param {string} moduleName - 模块名称
 * @returns {object} 日志记录器对象
 */
export const createLogger = (moduleName) => {
  return {
    debug: (message, ...args) => log(LogLevel.DEBUG, moduleName, message, ...args),
    info: (message, ...args) => log(LogLevel.INFO, moduleName, message, ...args),
    warn: (message, ...args) => log(LogLevel.WARN, moduleName, message, ...args),
    error: (message, ...args) => log(LogLevel.ERROR, moduleName, message, ...args),

    /**
     * 记录操作开始
     * @param {string} operation - 操作名称
     * @param {object} context - 操作上下文
     */
    startOperation: (operation, context = {}) => {
      log(LogLevel.INFO, moduleName, `🚀 开始操作: ${operation}`, context)
    },

    /**
     * 记录操作成功
     * @param {string} operation - 操作名称
     * @param {object} result - 操作结果
     */
    operationSuccess: (operation, result = {}) => {
      log(LogLevel.INFO, moduleName, `✅ 操作成功: ${operation}`, result)
    },

    /**
     * 记录操作失败
     * @param {string} operation - 操作名称
     * @param {Error|string} error - 错误信息
     * @param {object} context - 错误上下文
     */
    operationError: (operation, error, context = {}) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      log(LogLevel.ERROR, moduleName, `❌ 操作失败: ${operation}`, {
        error: errorMessage,
        stack: errorStack,
        context
      })
    },

    /**
     * 记录API调用
     * @param {string} api - API名称
     * @param {object} params - 调用参数
     * @param {object} response - 响应结果
     * @param {boolean} success - 是否成功
     */
    apiCall: (api, params, response, success) => {
      const symbol = success ? '✅' : '❌'
      const level = success ? LogLevel.INFO : LogLevel.ERROR

      log(level, moduleName, `${symbol} API调用: ${api}`, {
        params,
        response: success ? response : (response?.message || response),
        success
      })
    }
  }
}

/**
 * 全局错误处理器
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 */
export const handleGlobalError = (error, context = 'Unknown') => {
  const logger = createLogger('GlobalErrorHandler')
  logger.operationError(context, error, {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  })
}

// 默认导出一个通用日志记录器
export default createLogger('App')
