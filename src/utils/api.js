import axios from 'axios'

// 创建axios实例
const api = axios.create({
  // baseURL为cloudflare worker的API地址，如担心隐私问题，请自己替换部署
  // baseURL: 'https://nikke-cdk.shunxi.workers.dev/api',
  baseURL: 'https://nikke-cdk.hayasa.org/api',

  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// CDK兑换API
export const exchangeCDK = async (cookie, cdk) => {
  try {
    const response = await api.post('/game/proxy/Game/RecordCdkRedemption', {
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

// 获取兑换历史API
export const getExchangeHistory = async (cookie) => {
  try {
    const response = await api.post('/game/proxy/Game/GetCdkRedemptionHistory', {
      cookie: cookie
    })
    
    const { code, data } = response.data
    if (code === 0 && data) {
      return {
        success: true,
        data: data.map(item => ({
          date: new Date(item.create_time * 1000).toLocaleString(),
          cdk: item.cdkey,
          success: item.status === 1,
          message: item.status === 1 ? '兑换成功' : '兑换失败'
        }))
      }
    }
    
    return {
      success: false,
      message: '获取历史记录失败'
    }
  } catch (error) {
    console.error('获取兑换历史失败:', error)
    return {
      success: false,
      message: error.message || '网络错误，请稍后重试'
    }
  }
} 