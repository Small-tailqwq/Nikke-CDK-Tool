<template>
  <section v-if="openCount" class="event-panel">
    <button class="event-toggle" type="button" :aria-expanded="expanded" @click="toggle">
      <strong>4周年 · 女神的轨迹</strong>
      <span>{{ state ? `${state.completed.length}/13` : '查看活动' }}</span>
    </button>
    <div v-if="expanded" class="event-content">
      <div class="event-actions">
        <el-button size="small" :loading="loading" :disabled="busy" @click="refresh"
          >刷新</el-button
        >
        <el-button size="small" :disabled="busy || !state" @click="share">领取分享奖励</el-button>
        <el-button
          size="small"
          type="primary"
          :loading="busy"
          :disabled="!state || loading"
          @click="run()"
        >
          执行活动任务
        </el-button>
      </div>
      <el-alert v-if="error" :title="error" type="warning" :closable="false" />
      <div v-if="state" class="event-status">
        <span>{{ state.role?.role_name || '执行时绑定已保存角色' }}</span>
        <span>招募券：{{ state.shareReward ? '已发放' : '待分享' }}</span>
      </div>
      <div class="event-tasks">
        <div v-for="task in tasks" :key="task.id" class="event-task">
          <div class="event-heading">
            <span>{{ task.name }}</span>
            <span v-if="done(task.id)">已完成</span>
            <span v-else-if="task.id > openCount">10月25日 10:00开放</span>
            <span v-else>{{ taskLabels[task.type] }}</span>
          </div>
          <template v-if="task.id <= openCount && !done(task.id)">
            <el-input
              v-if="task.type === 'comment'"
              v-model="comments[task.id]"
              type="textarea"
              :rows="2"
              maxlength="1000"
              :aria-label="`${task.name}留言`"
              :placeholder="task.prompt"
              :disabled="busy"
            />
            <el-select
              v-else-if="task.type === 'vote' && polls[task.id]"
              v-model="votes[task.id]"
              :aria-label="`${task.name}投票`"
              placeholder="选择投票选项"
              :disabled="busy || Boolean(Number(polls[task.id].is_voted))"
              :teleported="false"
            >
              <el-option
                v-for="option in polls[task.id].options"
                :key="option.id"
                :value="option.id"
                :label="option.value"
              />
            </el-select>
          </template>
        </div>
      </div>
      <div class="event-help">执行时公开发布已填写的留言，并提交已选择的投票。空白项跳过。</div>
      <div class="event-help">积分、气泡和徽章从10月27日起发放。</div>
      <div v-if="messages.length" class="event-log" aria-live="polite">
        <div v-for="(message, index) in messages" :key="index">{{ message }}</div>
      </div>
      <a :href="eventUrl" target="_blank" rel="noopener noreferrer">官方活动</a>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useUserStore } from '../stores/user'
import {
  NIKKE4TH_TASKS,
  NIKKE4TH_URL,
  fetchNikke4thPoll,
  fetchNikke4thState,
  getNikke4thOpenCount,
  runNikke4thTasks,
} from '../utils/nikke4th'

const props = defineProps({ user: { type: Object, required: true } })
const userStore = useUserStore()
const tasks = NIKKE4TH_TASKS
const eventUrl = NIKKE4TH_URL
const openCount = getNikke4thOpenCount()
const taskLabels = {
  comment: '留言',
  vote: '投票',
  browse: '浏览5秒',
  answer: '娜由塔的回答',
  share: '分享',
}
const expanded = ref(false)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const state = computed(() => props.user.nikke4thState || null)
const comments = reactive({})
const votes = reactive({})
const polls = reactive({})
const messages = ref([])
const done = (id) => Boolean(state.value?.completed.includes(id))

async function refresh() {
  if (!props.user.cookie || loading.value || busy.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await fetchNikke4thState(props.user.cookie)
    await userStore.updateUser(props.user.id, { nikke4thState: result })
    for (const task of tasks.filter(
      (task) => task.type === 'vote' && task.id <= openCount && !done(task.id)
    )) {
      polls[task.id] = await fetchNikke4thPoll(props.user.cookie, task.id)
      const selected = polls[task.id].options?.find((option) => Number(option.is_selected))
      if (selected) votes[task.id] = selected.id
    }
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
}

function toggle() {
  expanded.value = !expanded.value
  if (expanded.value) refresh()
}

async function run(options = {}) {
  if (busy.value || !props.user.cookie) return
  busy.value = true
  error.value = ''
  messages.value = []
  try {
    const result = await runNikke4thTasks(props.user.cookie, {
      comments,
      votes,
      onMessage: (message) => messages.value.push(message),
      onComment: (id) => {
        comments[id] = ''
      },
      ...options,
    })
    await userStore.updateUser(props.user.id, { nikke4thState: result })
  } catch (cause) {
    error.value = cause.message
    try {
      const result = await fetchNikke4thState(props.user.cookie)
      await userStore.updateUser(props.user.id, { nikke4thState: result })
    } catch (refreshError) {
      error.value += `；状态刷新失败：${refreshError.message}`
    }
  } finally {
    busy.value = false
  }
}

function share() {
  run({ comments: {}, votes: {}, shared: true, basic: false })
}
</script>

<style scoped lang="scss">
.event-panel {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}
.event-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 0;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  cursor: pointer;
  text-align: left;
}
.event-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  font-size: 12px;
}
.event-actions,
.event-heading,
.event-status {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.event-tasks {
  max-height: 320px;
  overflow-y: auto;
}
.event-task {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}
.event-help {
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.event-log {
  max-height: 110px;
  overflow-y: auto;
  line-height: 1.6;
}
</style>
