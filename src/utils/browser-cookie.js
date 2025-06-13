/**
 * 浏览器Cookie管理工具
 * 用于设置和清除BlablaLink相关的Cookie
 */

/**
 * 设置BlablaLink相关的Cookie到浏览器
 * @param {string} cookieStr Cookie字符串
 * @param {number} expiryDays Cookie过期天数
 */
export const setBlablaLinkCookies = (cookieStr, expiryDays = 365) => {
  if (!cookieStr) return false;

  try {
    // 解析Cookie字符串
    const cookies = parseCookieString(cookieStr);

    // 计算过期时间
    const expires = new Date();
    expires.setDate(expires.getDate() + expiryDays);

    // 设置每个Cookie
    let success = false;
    cookies.forEach(cookie => {
      // 只设置关键Cookie，避免污染浏览器
      if (isKeyBlablaLinkCookie(cookie.name)) {
        document.cookie = `${cookie.name}=${cookie.value}; path=/; expires=${expires.toUTCString()}; SameSite=None; Secure`;
        success = true;
      }
    });

    console.log(`[Browser Cookie] 设置了${cookies.length}个BlablaLink Cookie，过期时间: ${expires.toUTCString()}`);
    return success;
  } catch (error) {
    console.error('[Browser Cookie] 设置Cookie失败:', error);
    return false;
  }
};

/**
 * 清除所有BlablaLink相关的Cookie
 */
export const clearBlablaLinkCookies = () => {
  try {
    const cookies = document.cookie.split(';');

    cookies.forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();

      if (isKeyBlablaLinkCookie(name)) {
        // 通过设置过期时间为过去来删除Cookie
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
      }
    });

    console.log('[Browser Cookie] 已清除所有BlablaLink Cookie');
    return true;
  } catch (error) {
    console.error('[Browser Cookie] 清除Cookie失败:', error);
    return false;
  }
};

/**
 * 解析Cookie字符串为对象数组
 * @param {string} cookieStr Cookie字符串
 * @returns {Array<{name: string, value: string}>} Cookie对象数组
 */
const parseCookieString = (cookieStr) => {
  const result = [];

  // 处理从Application面板复制的格式
  if (cookieStr.includes('\t')) {
    const lines = cookieStr.split('\n');

    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        result.push({
          name: parts[0].trim(),
          value: parts[1].trim()
        });
      }
    });
  } else {
    // 处理标准Cookie字符串
    const pairs = cookieStr.split(';');

    pairs.forEach(pair => {
      const parts = pair.split('=');
      if (parts.length >= 2) {
        result.push({
          name: parts[0].trim(),
          value: parts.slice(1).join('=').trim()
        });
      }
    });
  }

  return result;
};

/**
 * 判断是否为关键的BlablaLink Cookie
 * @param {string} name Cookie名称
 * @returns {boolean} 是否为关键Cookie
 */
const isKeyBlablaLinkCookie = (name) => {
  const keyNames = [
    'lip_session',
    'blablalink_session',
    'game_token',
    'game_uid',
    'game_openid',
    'game_gameid',
    'game_channelid',
    'game_user_name'
  ];

  return keyNames.some(key => name.includes(key));
};
