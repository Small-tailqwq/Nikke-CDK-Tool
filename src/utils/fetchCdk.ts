/// <reference types="vite/client" />

// -------------------------------------
// 类型定义
// -------------------------------------
export interface CDK {
  code: string;
  name?: string;
  status: '可用' | '已过期';
  servers: Array<'global' | 'tw' | 'cn'>;
  reward?: string;
  note?: string;
  author?: string;
  image?: string;
}

// -------------------------------------
// 主函数
// -------------------------------------
/**
 * 从预构建生成的 cdk-list.json 文件中获取公告列表。
 * 这个文件应该位于应用的根目录下，路径由 Vite 的 base 配置决定。
 */
export async function fetchCdkList(): Promise<{ cdks: CDK[] }> {
  // 使用 import.meta.env.BASE_URL 来确保我们总是从正确的相对路径获取数据
  const listUrl = `${import.meta.env.BASE_URL}cdk-list.json`.replace('//', '/');

  try {
    console.debug(`[CDK] Fetching announcements from: ${listUrl}`);
    const response = await fetch(listUrl, {
      cache: 'no-cache', // 确保获取最新版本
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    if (!json || !Array.isArray(json.cdks)) {
      throw new Error('Invalid CDK list data structure.');
    }

    return json;
  } catch (error) {
    console.error(`[CDK] Failed to fetch or parse CDK list from ${listUrl}:`, error);
    // 抛出错误，让调用方（Vue组件）来处理UI上的失败状态
    throw new Error('Failed to load CDK announcements.');
  }
}
