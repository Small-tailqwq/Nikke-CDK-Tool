import axios from 'axios'
import { reactive } from 'vue'
import { getBlaTodayKey } from './blaRunState'

export const reclamationRunning = reactive(new Set())

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

export function getReclamationAutoTarget() {
  return 0.5 + (Math.random() + Math.random() - 1) * 0.14
}

export function getReclamationAimSpeed(shots) {
  return (20 * (1.2 ** (7 / 9)) ** Math.min(shots, 9) * 2) / 60
}

export async function playReclamationAutoRound() {
  let position = 0
  let direction = 1
  let shots = 0
  let damage = 0
  let elapsed = 0
  let nextShot = 0
  let target = getReclamationAutoTarget()
  while (shots < 10 && elapsed < 30000) {
    const step = Math.min(1000 / 60, 30000 - elapsed)
    elapsed += step
    if (elapsed < nextShot) continue
    const previousPosition = position
    position += (direction * getReclamationAimSpeed(shots) * step) / 1000
    if (position >= 1 || position <= 0) {
      position = Math.max(0, Math.min(1, position))
      direction *= -1
    }
    if ((previousPosition - target) * (position - target) <= 0) {
      damage += getReclamationHit(position).damage
      shots += 1
      target = getReclamationAutoTarget()
      nextShot = elapsed + 400
    }
  }
  // 后台任务沿用界面的瞄准和攻击间隔，完成一局后再提交结算。
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(elapsed)))
  return damage || null
}

export async function runReclamationBattles(cookie, options = {}) {
  if (reclamationRunning.has(cookie)) throw new Error('该账号的地面夺还战正在运行')
  reclamationRunning.add(cookie)
  try {
    return await performReclamationBattles(cookie, options)
  } finally {
    reclamationRunning.delete(cookie)
  }
}

async function performReclamationBattles(
  cookie,
  { bossId, playRound = playReclamationAutoRound, onState = () => {}, shouldStop = () => false }
) {
  let state = await fetchReclamationState(cookie)
  onState(state)
  if (!state.saved_role?.role_id) throw new Error('请先在地面夺还战中绑定角色')
  const initialAttempts = state.remaining_attempts
  let rounds = 0
  let damage = 0
  for (let index = 0; index < initialAttempts; index += 1) {
    if (shouldStop() || state.remaining_attempts <= 0) break
    const bosses = getReclamationBosses(state)
    const boss = bosses.find((item) => item.boss_id === bossId) || bosses[0]
    if (!boss) break
    const score = await playRound(boss.boss_id)
    if (score === null)
      return { rounds, damage, claimed: 0, stopped: true, completed: false, state }
    const remaining = state.remaining_attempts
    const settled = await requestReclamation(cookie, 'settle', {
      boss_id: boss.boss_id,
      damage: score,
    })
    rounds += 1
    damage += settled.damage
    state = await fetchReclamationState(cookie)
    onState(state)
    if (state.remaining_attempts >= remaining) {
      throw new Error('结算后攻击次数未减少，自动战斗已停止，请刷新进度确认')
    }
  }
  const stopped = shouldStop()
  let claimed = 0
  if (!stopped) {
    claimed = await runReclamationRewards(cookie, 'claim')
    state = await fetchReclamationState(cookie)
    onState(state)
  }
  const completed =
    !stopped && (state.remaining_attempts <= 0 || getReclamationBosses(state).length === 0)
  return { rounds, damage, claimed, stopped, completed, state }
}

export async function runDailyReclamation(userStore, onProgress = () => {}) {
  const today = getBlaTodayKey()
  const users = userStore.users.filter(
    (user) =>
      user.blaEnabled &&
      user.cookie &&
      user.server === 'global' &&
      user.reclamationLastRunDateKey !== today
  )
  const results = []
  for (const [index, user] of users.entries()) {
    onProgress(user, index, users.length)
    try {
      const outcome = await runReclamationBattles(user.cookie)
      if (!outcome.completed) throw new Error('战斗尚未完成，请刷新活动进度')
      await userStore.updateUser(user.id, { reclamationLastRunDateKey: today })
      results.push({ name: user.name, success: true })
    } catch (error) {
      results.push({ name: user.name, success: false, message: error.message })
    }
  }
  return results
}

export function getReclamationHit(position) {
  const distance = Math.abs(position - 0.5)
  if (distance <= 0.04) return { rating: 'PERFECT', damage: 30000 }
  if (distance <= 0.11) return { rating: 'GREAT', damage: 20000 }
  if (distance <= 0.25) return { rating: 'GOOD', damage: 15000 }
  return { rating: 'NORMAL', damage: 10000 }
}
