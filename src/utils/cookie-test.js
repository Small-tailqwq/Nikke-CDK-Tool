/**
 * Cookie测试工具
 * 在浏览器控制台中执行以测试Cookie设置功能
 */

import { setBlablaLinkCookies, clearBlablaLinkCookies } from './browser-cookie';

/**
 * 测试设置Cookie功能
 * @param {string} cookieStr Cookie字符串
 * @param {number} days 过期天数
 */
export const testSetCookie = async (cookieStr, days = 365) => {
  console.log('===== 开始测试设置Cookie =====');
  console.log('设置前Cookie数量:', document.cookie.split(';').filter(c => c.trim()).length);

  const success = setBlablaLinkCookies(cookieStr, days);

  console.log('设置结果:', success ? '成功' : '失败');
  console.log('设置后Cookie数量:', document.cookie.split(';').filter(c => c.trim()).length);
  console.log('当前所有Cookie:', document.cookie);
};

/**
 * 测试清除Cookie功能
 */
export const testClearCookie = async () => {
  console.log('===== 开始测试清除Cookie =====');
  console.log('清除前Cookie数量:', document.cookie.split(';').filter(c => c.trim()).length);

  const success = clearBlablaLinkCookies();

  console.log('清除结果:', success ? '成功' : '失败');
  console.log('清除后Cookie数量:', document.cookie.split(';').filter(c => c.trim()).length);
  console.log('当前所有Cookie:', document.cookie);
};

/**
 * 测试从用户存储中获取Cookie并设置
 */
export const testSetCookieFromUserStore = async () => {
  console.log('===== 开始测试从用户存储设置Cookie =====');

  try {
    // 获取Vue应用实例
    const vueElements = Array.from(document.querySelectorAll('*')).filter(el => el.__vue_app__);
    if (vueElements.length === 0) {
      console.error('未找到Vue应用实例');
      return;
    }

    const app = vueElements[0].__vue_app__;
    if (!app.config?.globalProperties?.$pinia) {
      console.error('未找到Pinia实例');
      return;
    }

    const pinia = app.config.globalProperties.$pinia;
    const userStore = pinia._s.get('user');

    if (!userStore) {
      console.error('未找到userStore');
      return;
    }

    // 获取国际服和港澳台服用户
    const users = userStore.users;
    const globalUsers = users.filter(user => user.server === 'global' || user.server === 'tw');

    console.log(`找到${globalUsers.length}个国际服/港澳台服用户`);

    if (globalUsers.length === 0) {
      console.warn('没有找到国际服或港澳台服用户');
      return;
    }

    // 选择第一个用户的Cookie进行设置
    const user = globalUsers[0];
    console.log('选择用户:', user.name, user.serverName);

    // 设置Cookie
    const success = setBlablaLinkCookies(user.cookie, user.cookieExpireDays);

    console.log('设置结果:', success ? '成功' : '失败');
    console.log('设置后Cookie数量:', document.cookie.split(';').filter(c => c.trim()).length);
    console.log('当前所有Cookie:', document.cookie);

    // 尝试检查认证状态
    console.log('正在检查认证状态...');
    const result = await userStore.checkBlablaAuth();
    console.log('认证检查结果:', result);
    console.log('认证状态:', userStore.blablaAuthStatus);

  } catch (error) {
    console.error('测试过程中出错:', error);
  }
};

// 导出测试函数
export { setBlablaLinkCookies, clearBlablaLinkCookies };

// 在控制台中显示使用说明
console.log('Cookie测试工具已加载，可以通过以下方式测试:');
console.log('1. 测试设置Cookie: testSetCookie(cookieStr, days)');
console.log('2. 测试清除Cookie: testClearCookie()');
console.log('3. 测试从用户存储设置Cookie: testSetCookieFromUserStore()'); 