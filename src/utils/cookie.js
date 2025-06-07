/**
 * 从当前页面获取NIKKE相关的Cookie
 * @returns {string} 格式化后的Cookie字符串
 */
export const getNikkeCookie = () => {
  const cookies = document.cookie.split(';')
    .map(cookie => cookie.trim())
    .filter(cookie => 
      cookie.startsWith('game_') || 
      cookie.includes('token') || 
      cookie.includes('uid')
    );
  
  return cookies.join('; ');
}

/**
 * 验证Cookie是否包含所需字段
 * @param {string} cookieStr Cookie字符串
 * @returns {{isValid: boolean, missingFields: string[]}} 验证结果
 */
export const validateNikkeCookie = (cookieStr) => {
  const requiredFields = [
    'game_token',
    'game_gameid',
    'game_openid',
    'game_uid',
    'game_channelid',
    'game_user_name'
  ];

  const missingFields = requiredFields.filter(field => !cookieStr.includes(field));
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * 从Cookie字符串中提取用户信息
 * @param {string} cookieStr Cookie字符串
 * @returns {{uid: string, userName: string}} 用户信息
 */
export const extractUserInfo = (cookieStr) => {
  const uid = cookieStr.match(/game_uid=([^;]+)/)?.[1] || '';
  const userName = cookieStr.match(/game_user_name=([^;]+)/)?.[1] || '';
  
  return { uid, userName };
}

/**
 * 检查Cookie是否过期
 * @param {string} cookieStr Cookie字符串
 * @returns {boolean} 是否过期
 */
export const isCookieExpired = (cookieStr) => {
  // 检查token是否存在
  if (!cookieStr.includes('game_token=')) {
    return true;
  }

  // 如果Cookie中包含expires字段，检查是否过期
  const expires = cookieStr.match(/expires=([^;]+)/)?.[1];
  if (expires) {
    const expiresDate = new Date(expires);
    return expiresDate < new Date();
  }

  return false;
}

/**
 * 计算Cookie剩余有效天数
 * @param {string} cookieStr Cookie字符串
 * @returns {number} 剩余天数，如果无法确定则返回-1
 */
export const getCookieRemainingDays = (cookieStr) => {
  const expires = cookieStr.match(/expires=([^;]+)/)?.[1];
  if (!expires) return -1;

  const expiresDate = new Date(expires);
  const now = new Date();
  const diffTime = expiresDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * 格式化Cookie字符串
 * @param {string} cookieStr Cookie字符串
 * @returns {string} 格式化后的Cookie字符串
 */
export const formatCookie = (cookieStr) => {
  return cookieStr
    .split(';')
    .map(cookie => cookie.trim())
    .filter(cookie => cookie)
    .join('; ');
} 