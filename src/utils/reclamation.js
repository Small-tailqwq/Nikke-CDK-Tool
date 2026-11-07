import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nikke-cdk.hayasa.org'
export const RECLAMATION_URL = 'https://nikke-en.com/events/3rdreclamation/'
export const RECLAMATION_AREAS = [
  { id: 84, name: 'Global' },
  { id: 81, name: '日本' },
  { id: 82, name: '北美' },
  { id: 83, name: '韩国' },
  { id: 85, name: '东南亚' },
]
export const RECLAMATION_BOSSES = {
  1: '艾格维斯塔',
  2: '莉贝雷利奥躯体',
  3: '娜由塔军队',
  4: '奥图露亚',
  5: '安尼希利奥',
  6: '胜利女神像',
  7: 'Ultra',
}
export const RECLAMATION_REWARDS = {
  1: '每次攻击奖励',
  2: '首次分享活动',
  3: '累计伤害30万',
  4: '累计伤害100万',
  5: '累计伤害200万',
  6: '累计伤害300万',
  7: '击败艾格维斯塔',
  8: '击败莉贝雷利奥躯体',
  9: '击败娜由塔军队',
  10: '击败奥图露亚',
  11: '击败安尼希利奥',
  12: '分享艾格维斯塔战绩',
  13: '分享莉贝雷利奥战绩',
  14: '分享娜由塔军队战绩',
  15: '分享奥图露亚战绩',
  16: '分享安尼希利奥战绩',
  17: '击败全部战区',
  18: '击败胜利女神像',
  20: '分享胜利女神像战绩',
}

export async function requestReclamation(cookie, action, payload = {}) {
  let response
  try {
    response = await axios.post(
      `${API_BASE}/global/reclamation/${action}`,
      { cookie, payload },
      {
        timeout: 40000,
        withCredentials: false,
      }
    )
  } catch (cause) {
    throw new Error(cause.response?.data?.msg || '活动请求未确认，请刷新进度后查看结果', { cause })
  }
  const result = response.data
  if (result.code !== 0) {
    if (result.code === 300001)
      throw new Error('登录已过期，请先在用户管理中获取Token，再刷新活动进度')
    throw new Error(`${result.msg || '活动请求失败'} (${result.code})`)
  }
  return result.data
}

export async function fetchReclamationState(cookie) {
  const [battlefield, player] = await Promise.all([
    requestReclamation(cookie, 'public-init'),
    requestReclamation(cookie, 'state'),
  ])
  const rewards = player.saved_role?.role_id
    ? await requestReclamation(cookie, 'rewards')
    : { reward_groups: [] }
  return { ...battlefield, ...player, ...rewards }
}

export function getReclamationBosses(state) {
  if (!state) return []
  const bosses = state.bosses || []
  const defeated = (id) => Boolean(bosses.find((boss) => boss.boss_id === id)?.defeated)
  const firstStageDone = [1, 2, 3, 4, 5].every(defeated)
  const assigned = { 84: 4, 81: 1, 82: 2, 83: 3, 85: 5 }[state.saved_role?.area_id]
  return bosses.filter((boss) => {
    if (boss.defeated) return false
    if (boss.boss_id === 6) return firstStageDone
    if (boss.boss_id === 7) return defeated(6)
    return (
      state.allow_all_boss_attack || !assigned || defeated(assigned) || boss.boss_id === assigned
    )
  })
}

export function getReclamationShareIds(state) {
  const bossRewards = { 12: 1, 13: 2, 14: 3, 15: 4, 16: 5, 20: 6 }
  return (state?.reward_groups || [])
    .filter(
      (reward) =>
        reward.status !== 2 &&
        (reward.reward_id === 2 ||
          state.bosses.some(
            (boss) => boss.boss_id === bossRewards[reward.reward_id] && boss.defeated
          ))
    )
    .map((reward) => reward.reward_id)
}

export function getReclamationClaimIds(state) {
  return (state?.reward_groups || [])
    .filter((reward) => reward.status === 1 && RECLAMATION_REWARDS[reward.reward_id])
    .map((reward) => reward.reward_id)
}

export async function runReclamationRewards(cookie, action) {
  const state = await fetchReclamationState(cookie)
  const ids = action === 'share' ? getReclamationShareIds(state) : getReclamationClaimIds(state)
  let completed = 0
  for (const rewardId of ids) {
    const data = await requestReclamation(cookie, action, { reward_id: rewardId })
    if (action === 'claim' || data.sent) completed += 1
  }
  return completed
}

export function getReclamationHit(position) {
  const distance = Math.abs(position - 0.5)
  if (distance <= 0.04) return { rating: 'PERFECT', damage: 30000 }
  if (distance <= 0.11) return { rating: 'GREAT', damage: 20000 }
  if (distance <= 0.25) return { rating: 'GOOD', damage: 15000 }
  return { rating: 'NORMAL', damage: 10000 }
}
