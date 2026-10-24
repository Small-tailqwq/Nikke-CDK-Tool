import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nikke-cdk.hayasa.org'
export const NIKKE4TH_URL = 'https://www.blablalink.com/events/nikke4th/index.html?language=TW'
const SHARE_GROUP_IDS = [
  'cc7d81c4-7e50-45dd-a761-283ed3fd169b',
  '89652eee-8ef8-4bb0-a5df-c947b1b05f1f',
]
const END_TIME = Date.parse('2026-11-18T22:59:59+08:00')
const ANSWERS = [
  '时机已经成熟……',
  '现在还不到时候……',
  '不如换个角度思考？',
  '顺其自然即可。',
  '这可能是一次考验。',
  '值得一试。',
  '大侠只是需要勇气。',
  '相信大侠的直觉。',
  '今天不宜决定。',
  '请再问一次。',
  '明天再说如何？',
  '大侠心里已有答案。',
]

export const NIKKE4TH_TASKS = [
  { id: 1, name: '玛丽安', type: 'share' },
  {
    id: 2,
    name: '拉毗',
    type: 'comment',
    post: '8954202691772335354',
    prompt: '以“拉毗……”开头留言',
  },
  {
    id: 3,
    name: '拉普拉斯',
    type: 'comment',
    post: '3515066326134291677',
    prompt: '你心中的方舟英雄',
  },
  {
    id: 4,
    name: '桃乐丝',
    type: 'comment',
    post: '9273265776915595620',
    prompt: '桃乐丝怎样才能获得幸福',
  },
  {
    id: 5,
    name: '尼希利斯塔',
    type: 'vote',
    post: '3434668313183140250',
    poll: 'ce3646c57672492cb6b9dc39c0628fc8',
  },
  {
    id: 6,
    name: '小红帽',
    type: 'comment',
    post: '2793966714153415497',
    prompt: '想对小红帽说的话',
  },
  { id: 7, name: '皇冠', type: 'comment', post: '3684348911554589110', prompt: '妮姬的理想国度' },
  {
    id: 8,
    name: '灰姑娘',
    type: 'vote',
    post: '2879557975022775031',
    poll: '2ef5b35916604281bb8f8d28a2e5ee50',
  },
  { id: 9, name: '四兽部队', type: 'browse' },
  { id: 10, name: '娜由塔', type: 'answer' },
  {
    id: 11,
    name: '尼恩',
    type: 'comment',
    post: '6910455841156388661',
    prompt: '印象深刻的剧情或对话',
  },
  {
    id: 12,
    name: '指挥官',
    type: 'comment',
    post: '5811994104895781914',
    prompt: '对即将奔赴战场的妮姬说的话',
  },
  { id: 13, name: '最终章', type: 'share' },
]

export function getNikke4thOpenCount(now = Date.now()) {
  if (now < Date.parse('2026-10-21T10:00:00+08:00') || now > END_TIME) return 0
  const day = Math.floor((now - Date.parse('2026-10-21T10:00:00+08:00')) / 86400000)
  return day >= 4 ? 13 : Math.min((day + 1) * 3, 12)
}

async function request(cookie, action, payload = {}) {
  // 留言和投票不自动重试，避免响应丢失时重复发布。
  const { data } = await axios.post(
    `${API_BASE}/global/bla/${action}`,
    { cookie, payload },
    {
      timeout: 40000,
      withCredentials: false,
    }
  )
  if (data.code !== 0) {
    const error = new Error(`${data.msg || data.message || '活动请求失败'} (${data.code})`)
    error.code = data.code
    throw error
  }
  return data.data
}

export async function fetchNikke4thState(cookie) {
  let data
  try {
    data = await request(cookie, 'nikke4th/state')
  } catch (error) {
    if (error.code !== 601004) throw error
    data = {}
  }
  const completed = (data.mission_done_list || [])
    .filter((mission) => mission.mission_has_done)
    .map((mission) => Number(mission.tag_id))
    .filter((id) => id >= 1 && id <= 13)
  return {
    role: data.get_saved_role_info || null,
    completed: [...new Set(completed)],
    shareReward: (data.user_has_present_group_id_list || []).some((id) =>
      SHARE_GROUP_IDS.includes(id)
    ),
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchNikke4thPoll(cookie, taskId) {
  const task = NIKKE4TH_TASKS.find((item) => item.id === taskId && item.type === 'vote')
  const data = await request(cookie, 'nikke4th/poll', {
    post_uuid: task.post,
    post_language: 'zh-TW',
    poll_uuid: [task.poll],
    reset_poll_uuid: true,
  })
  const poll = data.poll_list?.[0]
  if (!poll?.poll_uuid) throw new Error(`${task.name}投票未开放`)
  return poll
}

const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  )

export async function runNikke4thTasks(
  cookie,
  {
    comments = {},
    votes = {},
    shared = false,
    basic = true,
    onMessage = () => {},
    onComment = async () => {},
  } = {}
) {
  const openCount = getNikke4thOpenCount()
  if (!openCount) throw new Error('活动未开放或已结束')
  let state = await fetchNikke4thState(cookie)
  if (!state.role) {
    const data = await request(cookie, 'role-info')
    const role = data.role_info
    if (!role?.area_id || !role?.role_id) throw new Error('请先在 BlaBlaLink 绑定游戏角色')
    await request(cookie, 'nikke4th/save-role', { area_id: role.area_id, role_id: role.role_id })
    state = await fetchNikke4thState(cookie)
    if (!state.role) throw new Error('活动角色绑定失败')
  }
  for (const task of NIKKE4TH_TASKS) {
    if (task.id > openCount || state.completed.includes(task.id)) continue
    if (task.type === 'comment') {
      const text = String(comments[task.id] || '').trim()
      if (!text) continue
      const result = await request(cookie, 'nikke4th/comment', {
        content: `<div>${escapeHtml(text)}</div>`,
        pic_urls: [],
        users: [],
        type: 1,
        post_uuid: task.post,
        comment_bubble_id: 0,
      })
      if (!result.comment?.comment_uuid) throw new Error(`${task.name}留言未返回评论记录`)
      await onComment(task.id, result.comment.comment_uuid)
    } else if (task.type === 'vote') {
      if (!votes[task.id]) continue
      const poll = await fetchNikke4thPoll(cookie, task.id)
      if (!Number(poll.is_voted)) {
        if (!poll.options?.some((option) => String(option.id) === String(votes[task.id]))) {
          throw new Error(`${task.name}投票选项已变化，请刷新`)
        }
        await request(cookie, 'nikke4th/vote', {
          poll_uuid: poll.poll_uuid,
          option_id: [votes[task.id]],
        })
      }
    } else if (task.type === 'share') {
      if (!shared) continue
    } else {
      if (!basic) continue
      if (task.type === 'browse') await new Promise((resolve) => setTimeout(resolve, 5000))
      if (task.type === 'answer')
        onMessage(`娜由塔的回答：${ANSWERS[Math.floor(Math.random() * ANSWERS.length)]}`)
    }
    await request(cookie, 'nikke4th/complete', { tag_id: String(task.id) })
    onMessage(`${task.name}：印记已登记`)
  }
  if (shared && !state.shareReward) {
    await request(cookie, 'nikke4th/share-gift')
    onMessage('分享奖励已申请发放')
  }
  state = await fetchNikke4thState(cookie)
  onMessage(`官方进度：${state.completed.length}/13`)
  return state
}
