import axios from 'axios'

// 创建axios实例
const api = axios.create({
  // baseURL为cloudflare worker的API地址，支持环境变量配置
  // 优先使用环境变量，否则使用默认地址
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://nikke-cdk.hayasa.org',

  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 国际服CDK兑换API
export const exchangeCDK = async (cookie, cdk) => {
  try {
    const response = await api.post('/global/exchange', {
      cdkey: cdk,
      cookie: cookie
    })

    const { code, msg } = response.data
    if (code === 0) {
      return {
        success: true,
        message: '兑换成功'
      }
    }

    const errorMessages = {
      // 代码由AI生成，可能需要维护
      1302009: 'CDK兑换次数已达上限',
      1302015: 'CDK无效',
      1302016: '该账号已兑换过此CDK',
      300001: '游戏未登录或Cookie已过期'
    }

    return {
      success: false,
      message: errorMessages[code] || msg || '兑换失败'
    }
  } catch (error) {
    console.error('CDK兑换失败:', error)
    // 处理超时错误
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        success: false,
        message: '请求超时，请检查网络连接或稍后重试'
      }
    }
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试'
    }
  }
}

// 🇨🇳 国服CDK兑换API (新增)
export const exchangeCDKCN = async (gameParams, cdk, captchaCode) => {
  try {
    // 构建国服兑换请求参数（基于真实请求格式）
    const exchangeData = {
      // 核心配置 - 使用动态获取的Chart ID（Worker会自动处理）
      iChartId: gameParams.iChartId || "372756", // 优先使用用户参数中的值
      iSubChartId: gameParams.iSubChartId || "372756", // 优先使用用户参数中的值
      sIdeToken: gameParams.sIdeToken || "0HzkLt", // 优先使用用户参数中的值

      // CDK和验证码
      sPassword: cdk,
      sCode: captchaCode,

      // 游戏基础信息（必须按真实请求的顺序）
      gameid: gameParams.gameid || "28063",
      os: gameParams.os || "5",
      channelid: gameParams.channelid || "2",
      seq: gameParams.seq,
      ts: gameParams.ts,
      version: gameParams.version,
      source: "",
      sig: gameParams.sig,
      itopencodeparam: gameParams.itopencodeparam,

      // 服务器和角色信息
      sPlatId: "1",
      sArea: gameParams.area_id || "2",
      sPartition: "1",
      sRoleId: gameParams.role_id,
      role_id: gameParams.role_id,
      role_name: gameParams.role_name,
      area_id: gameParams.area_id,
      zone_id: gameParams.zone_id,

      // 编码参数
      lang_type: gameParams.lang_type || "zh-CN",
      algorithm: gameParams.algorithm || "itop",
      encode: gameParams.encode || "2",
      nickname: gameParams.nickname,
      encodeparam: "",

      // 关键：传递验证码会话和完整用户数据
      verifysession: gameParams.verifysession,
      cookie: gameParams.cookie
    }

    // 调用新的国服CDK兑换Worker API
    const response = await api.post('/cn/cdk/exchange', exchangeData)

    const result = response.data

    // 处理国服API响应
    if (result.ret === 0 || result.iRet === 0) {
      return {
        success: true,
        message: '兑换成功'
      }
    }

    // 直接使用官方返回的错误信息，无需前端映射
    return {
      success: false,
      message: result.sMsg || '兑换失败'
    }

  } catch (error) {
    console.error('国服CDK兑换失败:', error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试'
    }
  }
}

// 🇨🇳 获取国服验证码 (新增)
export const getCaptchaCN = async () => {
  try {
    const aid = `210001040.${Math.random().toString().slice(2)}`
    const response = await api.get(`/cn/captcha?aid=${aid}`)

    return {
      success: true,
      captchaUrl: response.data.captchaUrl,
      aid: aid,
      verifysession: response.data.verifysession
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
    return {
      success: false,
      message: '获取验证码失败'
    }
  }
}

// 🇨🇳 解析国服游戏URL参数 (新增)
export const parseGameUrlCN = (gameUrl) => {
  try {
    const url = new URL(gameUrl)
    const params = new URLSearchParams(url.search)

    // 提取所有必要参数
    const parsedParams = {
      role_id: params.get('role_id'),
      role_name: params.get('role_name'), // 保持原始编码，后续再解码
      area_id: params.get('area_id'),
      zone_id: params.get('zone_id'),
      gameid: params.get('gameid'),
      os: params.get('os'),
      channelid: params.get('channelid'),
      ts: params.get('ts'),
      version: params.get('version'),
      seq: params.get('seq'),
      sig: params.get('sig'),
      lang_type: params.get('lang_type'),
      algorithm: params.get('algorithm'),
      encode: params.get('encode'),
      nickname: params.get('nickname'),
      itopencodeparam: params.get('itopencodeparam')
    }

    // 验证必要参数是否存在（只检查最核心的参数）
    const requiredParams = ['role_id', 'role_name', 'area_id']
    const missingParams = requiredParams.filter(param => !parsedParams[param])

    const isValid = missingParams.length === 0

    return {
      isValid,
      params: parsedParams,
      missingParams,
      // 为了向后兼容，也直接返回参数
      ...parsedParams
    }
  } catch (error) {
    console.error('解析游戏URL失败:', error)
    return {
      isValid: false,
      params: {},
      missingParams: [],
      error: error.message
    }
  }
}

// 生成IDE Token (模拟)
const generateIdeToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 生成Milo Tag (模拟)
const generateMiloTag = () => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 12)
  const randomStr = Math.random().toString(36).substr(2, 6)
  return `AMS-nikke-${timestamp}-${randomStr}-0_h2lAPI-0`
}

// 获取兑换历史API
export const getExchangeHistory = async (cookie, page = 1, pageSize = 20) => {
  try {
    console.log(`正在获取第${page}页历史记录，每页${pageSize}条...`)

    // 构建请求负载，确保始终包含page_num和page_size参数
    const payload = {
      cookie: cookie,
      page_num: page,
      page_size: pageSize
    }

    // 添加请求负载日志
    console.log(`发送历史记录请求负载:`, JSON.stringify(payload))

    // 发送请求时始终包含完整负载
    const response = await api.post('/global/history', payload)

    // 添加调试日志，查看返回的数据结构
    console.log(`历史记录API返回数据(页码${page}，每页${pageSize}条):`, response.data)

    // 提取响应数据
    const { code, data, msg } = response.data

    // 格式化时间的辅助函数，确保格式统一为 YYYY-MM-DD HH:mm:ss
    const formatDate = (timestamp) => {
      const date = new Date(timestamp * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // 成功响应处理
    if (code === 0) {
      // 情况1: 官方API格式 - data是对象，包含cdk_redemption_list
      if (data && typeof data === 'object' && data.cdk_redemption_list) {
        const records = data.cdk_redemption_list

        if (Array.isArray(records) && records.length > 0) {
          console.log(`成功获取第${page}页历史记录，共${records.length}条，总计${data.total || "未知"}条`)

          // 计算是否为最后一页
          const isLastPage = data.is_last_page === true ||
            (data.total && records.length + (page - 1) * pageSize >= data.total);

          return {
            success: true,
            data: records.map(item => ({
              date: formatDate(item.timestamp || Math.floor(Date.now() / 1000)),
              cdk: item.cdk,
              success: item.status === true,
              message: item.status === true ? '兑换成功' : '兑换失败',
              source: '云端'
            })),
            total: data.total || records.length,
            isLastPage: isLastPage,
            currentPage: page,
            pageSize: pageSize
          }
        }
      }

      // 情况2: data是数组
      if (Array.isArray(data)) {
        console.log(`成功获取第${page}页历史记录，共${data.length}条`)

        return {
          success: true,
          data: data.map(item => ({
            date: formatDate(item.create_time || item.timestamp || Math.floor(Date.now() / 1000)),
            cdk: item.cdkey || item.cdk,
            success: item.status === 1 || item.status === true,
            message: (item.status === 1 || item.status === true) ? '兑换成功' : '兑换失败',
            source: '云端' // 标记来源为云端
          })),
          total: data.length,
          isLastPage: true, // 对于数组格式，假设只有一页
          currentPage: page
        }
      }

      // 情况3: data是对象，可能包含records或list字段
      if (data && typeof data === 'object') {
        const records = data.records || data.list || data.items || []

        if (Array.isArray(records) && records.length > 0) {
          console.log(`成功获取第${page}页历史记录，共${records.length}条，总计${data.total || "未知"}条`)

          return {
            success: true,
            data: records.map(item => ({
              date: formatDate(item.create_time || item.time || item.timestamp || Math.floor(Date.now() / 1000)),
              cdk: item.cdkey || item.cdk || item.code || '未知CDK',
              success: item.status === 1 || item.success === true,
              message: (item.status === 1 || item.success === true) ? '兑换成功' : '兑换失败',
              source: '云端'
            })),
            total: data.total || records.length,
            isLastPage: data.is_last_page === true || (data.total && records.length >= data.total),
            currentPage: page
          }
        }
      }

      // 情况4: 成功但没有数据
      console.log(`获取第${page}页历史记录成功，但没有数据`)
      return {
        success: true,
        message: '没有历史记录',
        data: [],
        isLastPage: true,
        currentPage: page
      }
    }

    // 失败响应处理
    console.log(`获取第${page}页历史记录失败: ${msg}`)
    return {
      success: false,
      message: msg || '获取历史记录失败',
      data: [],
      isLastPage: true,
      currentPage: page
    }
  } catch (error) {
    console.error(`获取第${page}页历史记录失败:`, error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试',
      data: [],
      isLastPage: true,
      currentPage: page
    }
  }
}

// 同步用户的兑换历史记录
export const syncUserExchangeHistory = async (cookie, userName, userId, options = {}) => {
  try {
    console.log('开始同步用户兑换历史...')

    // 获取选项参数
    const page = options.page || 1
    const pageSize = options.pageSize || 20
    const syncAll = options.syncAll || false
    const user = options.user // 传入用户对象以获取详细服务器信息

    // 获取指定页的历史记录
    const result = await getExchangeHistory(cookie, page, pageSize)

    if (!result.success) {
      return {
        success: false,
        message: result.message || '同步历史记录失败',
        records: []
      }
    }

    // 如果没有记录，直接返回
    if (!result.data || result.data.length === 0) {
      return {
        success: true,
        message: '没有可同步的历史记录',
        records: []
      }
    }

    // 动态导入服务器工具函数
    const { generateHistoryServerInfo } = await import('./serverUtils.js')

    // 生成服务器信息
    const serverInfo = user ? generateHistoryServerInfo(user) : {
      server: 'global',
      serverName: '国际服'
    }

    // 处理当前页数据
    const records = result.data.map(item => ({
      ...item,
      userId,
      userName,
      ...serverInfo
    }))

    // 获取总记录数和当前页数
    const total = result.total || 0
    const currentCount = records.length

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize)

    // 如果需要同步所有页面并且还有更多页
    if (syncAll && !result.isLastPage && page < totalPages) {
      // 提供同步进度信息
      let message = `已同步第${page}页，共${totalPages}页，当前${currentCount}条记录，总计${total}条`

      // 返回当前页数据和分页信息
      return {
        success: true,
        message,
        records,
        total,
        currentPage: page,
        totalPages,
        pageSize,
        hasMorePages: true,
        nextPage: page + 1
      }
    }

    // 提供适当的提示信息
    let message = `成功同步了 ${currentCount} 条历史记录`

    // 如果有更多页但不是同步所有页，提供明确的提示
    if (!result.isLastPage && page < totalPages && !syncAll) {
      message += `（第${page}页，共 ${total} 条记录）`
    }

    return {
      success: true,
      message,
      records,
      total,
      currentPage: page,
      totalPages: totalPages || 1,
      pageSize,
      isLastPage: result.isLastPage || page >= totalPages,
      hasMorePages: !result.isLastPage && page < totalPages
    }

  } catch (error) {
    console.error('同步历史记录失败:', error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试',
      records: []
    }
  }
}

// 🌍 获取国际服角色详细信息 (新增)
export const getUserGamePlayerInfo = async (cookie) => {
  try {
    // 从Cookie中提取必要的参数
    const gameOpenid = cookie.match(/game_openid=([^;]+)/)?.[1]
    const gameGameid = cookie.match(/game_gameid=([^;]+)/)?.[1]

    if (!gameOpenid || !gameGameid) {
      throw new Error('无法从Cookie中提取必要的游戏参数')
    }

    // 构建请求数据
    const requestData = {
      intl_openid: `${gameGameid}-${gameOpenid}`
    }

    // 使用Worker代理请求
    const response = await api.post('/global/player-info', {
      cookie: cookie,
      payload: requestData
    })

    const result = response.data

    if (result.code === 0 && result.data) {
      return {
        success: true,
        data: result.data
      }
    }

    return {
      success: false,
      message: result.msg || '获取角色信息失败'
    }

  } catch (error) {
    console.error('获取角色信息失败:', error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试'
    }
  }
}

// 🌍 获取服务器区域列表 (新增)
export const getRegionList = async (cookie) => {
  try {
    // 使用Worker代理请求
    const response = await api.post('/global/region-list', {
      cookie: cookie,
      game_id: '29080' // Nikke的game_id
    })

    const result = response.data

    if (result.code === 0 && result.data && result.data.area_list) {
      // 构建area_id到区域名的映射
      const regionMap = {}
      result.data.area_list.forEach(area => {
        regionMap[area.area_id] = area.area_name
      })

      return {
        success: true,
        data: result.data.area_list,
        regionMap: regionMap
      }
    }

    return {
      success: false,
      message: result.msg || '获取区域列表失败'
    }

  } catch (error) {
    console.error('获取区域列表失败:', error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试'
    }
  }
}

// 🌍 获取国际服角色完整信息（包含区域信息）(新增)
export const getGlobalUserCompleteInfo = async (cookie) => {
  try {
    // 并行获取角色信息和区域列表
    const [playerInfoResult, regionListResult] = await Promise.all([
      getUserGamePlayerInfo(cookie),
      getRegionList(cookie)
    ])

    if (!playerInfoResult.success) {
      return playerInfoResult
    }

    // 如果区域列表获取失败，仍然返回角色信息，但没有区域名称
    let regionName = '未知区域'
    if (regionListResult.success && regionListResult.regionMap) {
      const areaId = playerInfoResult.data.area_id
      regionName = regionListResult.regionMap[areaId] || `区域${areaId}`
    }

    return {
      success: true,
      data: {
        ...playerInfoResult.data,
        region_name: regionName,
        region_id: playerInfoResult.data.area_id
      }
    }

  } catch (error) {
    console.error('获取完整角色信息失败:', error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试'
    }
  }
} 