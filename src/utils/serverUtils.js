// 统一的服区映射工具函数

// 国际服区域映射表（英文 -> 中文）
export const regionMapping = {
  Global: '全球区',
  Japan: '日区',
  Korea: '韩区',
  NA: '北美区',
  SEA: '东南亚区',
  // 支持中文区域名称的映射（可能API直接返回中文）
  全球区: '全球区',
  日区: '日区',
  韩区: '韩区',
  北美区: '北美区',
  东南亚区: '东南亚区',
}

// 服务器选项配置
export const serverOptions = [
  { label: '国际服', value: 'global' },
  { label: '港澳台服', value: 'tw' },
  { label: '国服', value: 'cn' },
  { label: '未知', value: 'unknown' },
]

// 获取服务器名称（基础大区）
export const getServerName = (server) => {
  const option = serverOptions.find((opt) => opt.value === server)
  return option ? option.label : '未知'
}

// 获取服务器标签类型
export const getServerTagType = (server) => {
  switch (server) {
    case 'global':
      return 'primary'
    case 'tw':
      return 'warning'
    case 'cn':
      return 'success'
    default:
      return 'info'
  }
}

// 解析国服用户的游戏参数
export const parseCnUserData = (user) => {
  if (user.server !== 'cn' || !user.cookie) {
    return null
  }

  try {
    const gameParams = JSON.parse(user.cookie)
    return {
      role_id: gameParams.role_id,
      role_name: gameParams.role_name,
      area_id: gameParams.area_id,
      zone_id: gameParams.zone_id,
    }
  } catch (error) {
    console.warn('解析国服用户数据失败:', error)
    return null
  }
}

// 获取国服平台类型（微信/QQ）
export const getCnPlatformType = (user) => {
  const cnData = parseCnUserData(user)
  if (!cnData) return 'qq' // 默认QQ

  // area_id: '1' = 微信, '2' = QQ
  return cnData.area_id === '1' ? 'wechat' : 'qq'
}

// 获取国服平台显示文本
export const getCnPlatformText = (user) => {
  const platformType = getCnPlatformType(user)
  return platformType === 'wechat' ? '微信区' : 'QQ区'
}

// 获取详细服务器信息（包含小区信息）
export const getDetailedServerInfo = (user) => {
  if (!user) return { serverName: '未知', subRegion: null }

  if (user.server === 'cn') {
    // 国服：服务器 + 平台区
    return {
      serverName: '国服',
      subRegion: getCnPlatformText(user),
    }
  } else if (user.server === 'global' || user.server === 'tw') {
    // 国际服/港澳台服：主服务器 + 具体区域
    const serverName = getServerName(user.server)
    let subRegion = null

    if (user.playerInfo && user.playerInfo.region_name) {
      subRegion = regionMapping[user.playerInfo.region_name] || user.playerInfo.region_name
    }

    return {
      serverName,
      subRegion,
    }
  } else {
    // 其他情况
    return {
      serverName: user.serverName || getServerName(user.server),
      subRegion: null,
    }
  }
}

// 格式化完整的服务器显示名称
export const getFullServerDisplayName = (user) => {
  const { serverName, subRegion } = getDetailedServerInfo(user)

  if (subRegion) {
    return `${serverName} | ${subRegion}`
  }

  return serverName
}

// 根据用户信息生成历史记录的服务器字段
export const generateHistoryServerInfo = (user) => {
  const { serverName, subRegion } = getDetailedServerInfo(user)

  return {
    server: user.server,
    serverName: subRegion ? `${serverName} | ${subRegion}` : serverName,
  }
}
