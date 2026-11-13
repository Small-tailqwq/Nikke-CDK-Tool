<template>
  <section class="reclamation-panel">
    <div class="event-toolbar">
      <strong>第三次地面夺还战</strong>
      <el-button
        size="small"
        :loading="loading"
        :disabled="busy || playing || automatic"
        @click="refresh"
        >刷新进度</el-button
      >
      <a :href="RECLAMATION_URL" target="_blank" rel="noopener noreferrer">官方活动</a>
    </div>
    <el-alert v-if="error" :title="error" type="warning" :closable="false" />
    <p v-if="backgroundRunning" class="battle-result" role="status">正在自动战斗并领奖...</p>
    <template v-if="state">
      <div class="event-stats">
        <span
          >角色 <strong>{{ state.saved_role?.role_name || '未绑定' }}</strong></span
        >
        <span
          >攻击机会 <strong>{{ state.remaining_attempts }}</strong></span
        >
        <span
          >累计伤害 <strong>{{ format(state.total_damage) }}</strong></span
        >
      </div>
      <div v-if="!state.saved_role?.role_id" class="role-binding">
        <el-select v-model="areaId" aria-label="活动区服" :disabled="busy" @change="resetRoles">
          <el-option
            v-for="area in RECLAMATION_AREAS"
            :key="area.id"
            :label="area.name"
            :value="area.id"
          />
        </el-select>
        <el-button :loading="busy" @click="loadRoles">读取角色</el-button>
        <el-select
          v-if="roles.length"
          v-model="roleId"
          aria-label="活动角色"
          :disabled="busy"
          placeholder="选择角色"
        >
          <el-option
            v-for="role in roles"
            :key="role.role_id"
            :value="String(role.role_id)"
            :label="role.role_name"
          />
        </el-select>
        <el-button v-if="roleId" :disabled="busy" @click="bindRole">绑定角色</el-button>
      </div>
      <template v-else>
        <div class="daily-tasks">
          <span v-for="task in state.daily_tasks" :key="task.task_id">
            {{ taskNames[task.task_id] }}：{{ task.completed ? '已完成' : '未完成' }}
          </span>
        </div>
        <div class="battle-controls">
          <el-select
            v-model="bossId"
            aria-label="攻击战区"
            :disabled="playing || busy || automatic || backgroundRunning"
          >
            <el-option
              v-for="boss in bosses"
              :key="boss.boss_id"
              :value="boss.boss_id"
              :label="`${RECLAMATION_BOSSES[boss.boss_id]} · ${boss.hp_percent}%`"
            />
          </el-select>
          <el-button :disabled="!canStart || automatic" @click="startBattle">开始一局</el-button>
          <el-button
            type="primary"
            :loading="automatic"
            :disabled="!canStart || automatic"
            @click="startAutomaticBattles"
            >一键战斗并领奖</el-button
          >
          <el-button v-if="automatic" :disabled="stopRequested" @click="stopRequested = true"
            >本局后停止</el-button
          >
        </div>
        <p class="battle-help">
          30 秒内最多攻击 10 次，指针越接近中央，伤害越高。结算消耗 1 次攻击机会。
        </p>
        <div v-if="playing || shots" class="battle-game">
          <div class="battle-score" aria-live="polite">
            <span>剩余 {{ seconds }} 秒</span><span>攻击 {{ shots }}/10</span
            ><span>本局伤害 {{ format(damage) }}</span>
          </div>
          <div class="aim-track" role="img" aria-label="中央红色区域命中伤害最高">
            <div class="aim-needle" :style="{ left: `${position * 100}%` }"></div>
          </div>
          <el-button
            class="fire-button"
            type="primary"
            :disabled="!playing || automatic"
            @click="fire"
            >发射</el-button
          >
          <strong class="hit-rating" aria-live="polite">{{ rating }}</strong>
        </div>
        <p v-if="result" class="battle-result" role="status">{{ result }}</p>
        <div class="reward-actions">
          <el-button
            :loading="batchAction === 'share'"
            :disabled="
              busy || loading || playing || automatic || backgroundRunning || !shareIds.length
            "
            @click="runRewards('share')"
            >一键分享</el-button
          >
          <el-button
            type="primary"
            :loading="batchAction === 'claim'"
            :disabled="
              busy || loading || playing || automatic || backgroundRunning || !claimIds.length
            "
            @click="runRewards('claim')"
            >一键领取</el-button
          >
        </div>
        <div class="reward-list">
          <div v-for="reward in rewards" :key="reward.reward_id" class="reward-row">
            <span>{{ RECLAMATION_REWARDS[reward.reward_id] }}</span>
            <el-button
              v-if="reward.status === 1"
              size="small"
              :disabled="busy || playing || automatic || backgroundRunning"
              @click="claim(reward.reward_id)"
              >领取</el-button
            >
            <span v-else>{{ reward.status === 2 ? '已领取' : '未达成' }}</span>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { getBlaTodayKey } from '../utils/blaRunState'
import {
  RECLAMATION_AREAS,
  RECLAMATION_BOSSES,
  RECLAMATION_REWARDS,
  RECLAMATION_URL,
  fetchReclamationState,
  getReclamationBosses,
  getReclamationAutoTarget,
  getReclamationClaimIds,
  getReclamationHit,
  getReclamationShareIds,
  requestReclamation,
  runReclamationBattles,
  runReclamationRewards,
  getReclamationAimSpeed,
  reclamationRunning,
} from '../utils/reclamation'

const props = defineProps({ user: { type: Object, required: true } })
const userStore = useUserStore()
let manualReservation = false
const backgroundRunning = computed(
  () => reclamationRunning.has(props.user.cookie) && !automatic.value && !manualReservation
)
const state = ref(null)
const loading = ref(false)
const busy = ref(false)
const batchAction = ref('')
const automatic = ref(false)
const stopRequested = ref(false)
const error = ref('')
const result = ref('')
const areaId = ref(Number(props.user.playerInfo?.area_id) || 84)
const roleId = ref('')
const roles = ref([])
const bossId = ref(null)
const bosses = computed(() => getReclamationBosses(state.value))
const rewards = computed(() =>
  (state.value?.reward_groups || []).filter((reward) => RECLAMATION_REWARDS[reward.reward_id])
)
const shareIds = computed(() => getReclamationShareIds(state.value))
const claimIds = computed(() => getReclamationClaimIds(state.value))
const playing = ref(false)
const position = ref(0)
const seconds = ref(30)
const shots = ref(0)
const damage = ref(0)
const rating = ref('')
const canStart = computed(
  () =>
    !playing.value &&
    !busy.value &&
    !loading.value &&
    !backgroundRunning.value &&
    state.value?.remaining_attempts > 0 &&
    bosses.value.some((boss) => boss.boss_id === bossId.value)
)
const taskNames = { 1: '登录活动', 2: '登录游戏', 3: '日常任务达到100点' }
const format = (value) => Number(value || 0).toLocaleString('zh-CN')
function resetRoles() {
  roles.value = []
  roleId.value = ''
}
let frame = 0
let previousTime = 0
let deadline = 0
let nextShot = 0
let direction = 1
let autoTarget = 0.5
let finishAutoRound = null
let pausedAt = null
let disposed = false

function applyState(data) {
  state.value = data
  if (!bosses.value.some((boss) => boss.boss_id === bossId.value)) {
    bossId.value = bosses.value[0]?.boss_id ?? null
  }
}

async function updateState() {
  applyState(await fetchReclamationState(props.user.cookie))
}

async function refresh() {
  if (loading.value || busy.value || playing.value || automatic.value) return
  loading.value = true
  error.value = ''
  try {
    await updateState()
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const data = await requestReclamation(props.user.cookie, 'roles', { area_id: areaId.value })
    roles.value = data.roles || []
    roleId.value = roles.value.length === 1 ? String(roles.value[0].role_id) : ''
    if (!roles.value.length) error.value = '此区服没有游戏角色'
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}

async function bindRole() {
  if (busy.value || !roleId.value) return
  busy.value = true
  error.value = ''
  try {
    await requestReclamation(props.user.cookie, 'save-role', {
      area_id: areaId.value,
      role_id: roleId.value,
    })
    await updateState()
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}

async function claim(rewardId) {
  if (busy.value || playing.value || automatic.value || backgroundRunning.value) return
  busy.value = true
  error.value = ''
  result.value = ''
  try {
    await requestReclamation(props.user.cookie, 'claim', { reward_id: rewardId })
    result.value = '奖励已申请发放'
    await updateState()
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}

async function runRewards(action) {
  if (busy.value || loading.value || playing.value || automatic.value || backgroundRunning.value)
    return
  busy.value = true
  batchAction.value = action
  error.value = ''
  result.value = ''
  try {
    const completed = await runReclamationRewards(props.user.cookie, action)
    result.value =
      action === 'share' ? `已发放 ${completed} 项分享奖励` : `已领取 ${completed} 项奖励`
  } catch (cause) {
    error.value = cause.message
  }
  try {
    await updateState()
  } catch (cause) {
    state.value = null
    error.value = [error.value, cause.message].filter(Boolean).join('；')
  } finally {
    busy.value = false
    batchAction.value = ''
  }
}

async function startAutomaticBattles() {
  if (!canStart.value || automatic.value) return
  automatic.value = true
  stopRequested.value = false
  error.value = ''
  result.value = ''
  const runDateKey = getBlaTodayKey()
  try {
    const outcome = await runReclamationBattles(props.user.cookie, {
      bossId: bossId.value,
      onState: applyState,
      shouldStop: () => stopRequested.value || disposed,
      playRound: (selectedBoss) =>
        new Promise((resolve) => {
          bossId.value = selectedBoss
          finishAutoRound = resolve
          startBattle()
        }),
    })
    if (outcome.completed) {
      await userStore.updateUser(props.user.id, { reclamationLastRunDateKey: runDateKey })
    }
    if (!disposed) {
      applyState(outcome.state)
      result.value = `自动战斗${outcome.stopped ? '已停止' : '结束'}，完成 ${outcome.rounds} 局，伤害 ${format(outcome.damage)}，已领取 ${outcome.claimed} 项奖励`
    }
  } catch (cause) {
    error.value = cause.message
    state.value = null
  } finally {
    automatic.value = false
    stopRequested.value = false
  }
}

function handleVisibilityChange() {
  if (!automatic.value || !playing.value) return
  if (document.hidden) {
    pausedAt = performance.now()
    cancelAnimationFrame(frame)
  } else if (pausedAt !== null) {
    const now = performance.now()
    const elapsed = now - pausedAt
    deadline += elapsed
    nextShot += elapsed
    previousTime = now
    pausedAt = null
    frame = requestAnimationFrame(tick)
  }
}

function startBattle() {
  if (!canStart.value) return
  if (!automatic.value) {
    manualReservation = true
    reclamationRunning.add(props.user.cookie)
  }
  shots.value = 0
  damage.value = 0
  rating.value = ''
  error.value = ''
  result.value = ''
  position.value = 0
  direction = 1
  previousTime = performance.now()
  deadline = previousTime + 30000
  nextShot = 0
  autoTarget = getReclamationAutoTarget()
  pausedAt = null
  seconds.value = 30
  playing.value = true
  frame = requestAnimationFrame(tick)
  handleVisibilityChange()
}

function tick(now) {
  if (!playing.value) return
  if (automatic.value) {
    const until = Math.min(now, deadline)
    // 固定步长补齐被浏览器限速的动画帧，保持命中与攻击间隔一致。
    while (playing.value && previousTime < until) {
      const stepTime = Math.min(previousTime + 1000 / 60, until)
      advanceAim(stepTime, (stepTime - previousTime) / 1000)
      previousTime = stepTime
    }
  } else {
    advanceAim(now, Math.min((now - previousTime) / 1000, 0.05))
    previousTime = now
  }
  if (!playing.value) return
  if (now >= deadline) {
    settle()
    return
  }
  seconds.value = Math.ceil((deadline - now) / 1000)
  frame = requestAnimationFrame(tick)
}

function advanceAim(now, delta) {
  if (now >= nextShot) {
    const previousPosition = position.value
    const speed = getReclamationAimSpeed(shots.value)
    position.value += direction * speed * delta
    if (position.value >= 1 || position.value <= 0) {
      position.value = Math.max(0, Math.min(1, position.value))
      direction *= -1
    }
    if (automatic.value && (previousPosition - autoTarget) * (position.value - autoTarget) <= 0) {
      fireAt(now)
    }
  }
}

function fire() {
  fireAt(performance.now())
}

function fireAt(now) {
  if (!playing.value || now < nextShot) return
  if (now >= deadline) {
    settle()
    return
  }
  nextShot = now + 400
  const hit = getReclamationHit(position.value)
  rating.value = hit.rating
  damage.value += hit.damage
  shots.value += 1
  autoTarget = getReclamationAutoTarget()
  if (shots.value === 10) settle()
}

async function settle() {
  if (!playing.value) return
  playing.value = false
  cancelAnimationFrame(frame)
  pausedAt = null
  if (finishAutoRound) {
    const resolve = finishAutoRound
    finishAutoRound = null
    resolve(shots.value ? damage.value : null)
    return
  }
  if (!shots.value) {
    releaseManualBattle()
    result.value = '未造成伤害，本局取消'
    return
  }
  busy.value = true
  try {
    const data = await requestReclamation(props.user.cookie, 'settle', {
      boss_id: bossId.value,
      damage: damage.value,
    })
    result.value = `结算成功，本局伤害 ${format(data.damage)}`
    await updateState()
  } catch (cause) {
    error.value = cause.message
    // 请求结果不明确时，先由用户刷新次数和累计伤害，避免重复提交。
    state.value = null
  } finally {
    busy.value = false
    releaseManualBattle()
  }
}

function releaseManualBattle() {
  if (!manualReservation) return
  manualReservation = false
  reclamationRunning.delete(props.user.cookie)
}

watch(backgroundRunning, (running, wasRunning) => {
  if (!running && wasRunning) refresh()
})

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  refresh()
})
onBeforeUnmount(() => {
  disposed = true
  playing.value = false
  cancelAnimationFrame(frame)
  finishAutoRound?.(null)
  finishAutoRound = null
  if (!busy.value) releaseManualBattle()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped lang="scss">
.reclamation-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}
.event-toolbar,
.event-stats,
.role-binding,
.daily-tasks,
.battle-controls,
.battle-score,
.reward-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.event-toolbar a {
  margin-left: auto;
  color: var(--el-color-primary);
}
.event-stats {
  justify-content: space-between;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}
.daily-tasks,
.battle-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.battle-help {
  margin: 0;
  line-height: 1.6;
}
.role-binding .el-select,
.battle-controls .el-select {
  width: 220px;
}
.battle-game {
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  text-align: center;
}
.battle-score {
  justify-content: space-between;
  font-variant-numeric: tabular-nums;
}
.aim-track {
  position: relative;
  height: 28px;
  margin: 24px 8px;
  border-radius: 6px;
  background: linear-gradient(
    to right,
    #64748b 0% 25%,
    #b9c783 25% 39%,
    #f3c956 39% 46%,
    #e85d62 46% 54%,
    #f3c956 54% 61%,
    #b9c783 61% 75%,
    #64748b 75% 100%
  );
}
.aim-needle {
  position: absolute;
  top: -8px;
  bottom: -8px;
  width: 4px;
  background: var(--el-text-color-primary);
  transform: translateX(-50%);
  border: 1px solid var(--el-bg-color);
}
.fire-button {
  min-width: 160px;
}
.hit-rating {
  display: block;
  min-height: 20px;
  margin-top: 12px;
  color: var(--el-color-primary);
}
.battle-result {
  margin: 0;
  color: var(--el-color-success);
}
.reward-row {
  justify-content: space-between;
  min-height: 42px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}
.reward-row > span:last-child {
  color: var(--el-text-color-secondary);
}
@media (max-width: 600px) {
  .event-stats {
    align-items: flex-start;
    flex-direction: column;
  }
  .battle-controls .el-select {
    flex: 1;
    min-width: 160px;
  }
}
</style>
