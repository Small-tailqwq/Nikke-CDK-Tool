/// <reference types="vite/client" />

// -------------------------------------
// 类型定义
// -------------------------------------

// 基础CDK类型
export interface BaseCDK {
  code: string;
  name?: string;
  status: '可用' | '已过期';
  servers: Array<'global' | 'tw' | 'cn'>;
  reward?: string;
  note?: string;
}

// 单个CDK类型
export interface SingleCDK extends BaseCDK {
  type?: 'single';
  author?: string;
  image?: string;
}

// CDK组合类型
export interface CDKGroup {
  type: 'group';
  groupId: string;
  groupName: string;
  image?: string;
  note?: string;
  author?: string;
  cdks: BaseCDK[];
}

// 通用CDK类型（向后兼容）
export type CDK = SingleCDK | CDKGroup;

// 检查是否为CDK组合
export function isCDKGroup(cdk: CDK): cdk is CDKGroup {
  return cdk.type === 'group';
}

// 检查是否为单个CDK
export function isSingleCDK(cdk: CDK): cdk is SingleCDK {
  return !cdk.type || cdk.type === 'single';
}

// 获取CDK组合的总奖励
export function getGroupTotalReward(group: CDKGroup): string {
  if (group.cdks.length === 0) return '';
  return group.cdks
    .map(cdk => cdk.reward || '')
    .filter(reward => reward)
    .join(', ');
}

// 获取CDK组合中的所有CDK代码
export function getGroupCodes(group: CDKGroup): string[] {
  return group.cdks.map(cdk => cdk.code);
}

// 计算CDK组合的状态
export function getGroupStatus(group: CDKGroup): '可用' | '已过期' | '部分可用' {
  if (group.cdks.length === 0) return '已过期';
  
  const availableCount = group.cdks.filter(cdk => cdk.status === '可用').length;
  const totalCount = group.cdks.length;
  
  if (availableCount === totalCount) {
    return '可用';
  } else if (availableCount === 0) {
    return '已过期';
  } else {
    return '部分可用';
  }
}

// 计算CDK组合支持的服务器（取所有子CDK的并集）
export function getGroupServers(group: CDKGroup): Array<'global' | 'tw' | 'cn'> {
  const serverSet = new Set<'global' | 'tw' | 'cn'>();
  
  group.cdks.forEach(cdk => {
    cdk.servers.forEach(server => {
      serverSet.add(server);
    });
  });
  
  return Array.from(serverSet);
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
