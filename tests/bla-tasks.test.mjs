import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const COOKIE = 'game_token=TOKEN_PLACEHOLDER'

const task = (id, name, type, current, need) => ({
  task_id: id,
  task_name: name,
  task_type: type,
  reward_infos: [
    { completed_times: current, need_completed_times: need, is_completed: current >= need },
  ],
})

async function createRunner({
  browse = 2,
  likes = 3,
  gameCompleted = true,
  gameCredit = true,
  gameError,
  likeError,
  credit = true,
} = {}) {
  const requests = []
  const browsed = new Set()
  const liked = new Set(['post-1', 'post-2'])
  const pages = {
    '': ['post-1', 'post-1', 'post-2', 'post-3'],
    next: ['post-3', 'post-4', 'post-5'],
  }
  const workerSource = await readFile('cloudflare-worker/Nikke-CDK-Combined.js', 'utf8')
  const worker = vm.runInNewContext(
    workerSource.replace('export default {', 'globalThis.worker = {'),
    {
      URL,
      Request,
      Response,
      console: { error() {} },
      async fetch(request) {
        assert.equal(request.headers.get('Cookie'), COOKIE)
        assert.equal(request.headers.get('x-language'), 'zh-TW')
        const path = new URL(request.url).pathname.split('/').at(-1)
        const payload = request.method === 'POST' ? await request.json() : null
        requests.push({ path, payload })
        let data = {}
        if (path === 'GetTaskListWithStatusV2') {
          data = {
            tasks: [
              task('15', '每日簽到', 1, 1, 1),
              task('14', '【每日】遊玩遊戲', 2, gameCompleted ? 1 : 0, 1),
              task('72', '瀏覽5個貼文', 13, browse, 5),
              task('73', '按讚5個貼文', 14, likes, 5),
            ],
          }
        } else if (path === 'GetUserTotalPoints') {
          data = { total_points: 5252 }
        } else if (path === 'CompleteTaskAddPoint') {
          assert.equal(payload.task_id, '14')
          assert.equal(payload.intl_game_id, '29080')
          if (gameError)
            return Response.json(gameError, { status: gameError.status || 200 })
          if (gameCredit) gameCompleted = true
        } else if (path === 'GetPostListNew') {
          assert.equal(payload.limit, '20')
          data = {
            list: pages[payload.nextPageCursor].map((post_uuid) => ({ post_uuid })),
            page_info: {
              is_finish: Boolean(payload.nextPageCursor),
              next_page_cursor: payload.nextPageCursor ? '' : 'next',
            },
          }
        } else if (path === 'GetPost') {
          assert.equal(payload.original_content, 0)
          if (payload.browse_post === 1 && !browsed.has(payload.post_uuid)) {
            browsed.add(payload.post_uuid)
            if (credit) browse++
          }
          data = { my_upvote: { is_star: liked.has(payload.post_uuid) } }
        } else if (path === 'PostStar') {
          assert.equal(payload.type, 1)
          assert.equal(payload.like_type, 1)
          if (likeError)
            return new Response(JSON.stringify(likeError), { status: likeError.status || 200 })
          assert.ok(!liked.has(payload.post_uuid), '不能再次提交已点赞帖子')
          liked.add(payload.post_uuid)
          if (credit) likes++
        } else {
          assert.equal(path, 'CheckLogin')
        }
        return new Response(JSON.stringify({ code: 0, data }))
      },
    }
  )

  const signerSource = (await readFile('src/utils/blaSigner.js', 'utf8'))
    .replace(/^import axios from 'axios'\r?\n/, '')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined')
    .replaceAll('export async function', 'async function')
  const signer = vm.runInNewContext(`${signerSource}\n;({ runBlaTasks })`, {
    setTimeout: (callback) => callback(),
    axios: {
      async post(url, body) {
        const response = await worker.fetch(
          new Request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
          {},
          {}
        )
        const data = await response.json()
        if (!response.ok)
          throw Object.assign(new Error(data.msg), { response: { status: response.status, data } })
        return { data }
      },
    },
  })
  return { run: () => signer.runBlaTasks(COOKIE), requests }
}

test('帖子任务经 Worker 代理补足剩余次数，分页去重并跳过已点赞帖子', async () => {
  const runner = await createRunner()
  const result = await runner.run()

  assert.equal(result.success, true)
  assert.equal(result.overview.completedCount, 4)
  assert.deepEqual(
    runner.requests
      .filter(({ path, payload }) => path === 'GetPost' && payload.browse_post === 1)
      .map(({ payload }) => payload.post_uuid),
    ['post-1', 'post-2', 'post-3']
  )
  assert.deepEqual(
    runner.requests
      .filter(({ path }) => path === 'PostStar')
      .map(({ payload }) => payload.post_uuid),
    ['post-3', 'post-4']
  )
})

test('上游拒绝点赞时保留错误码和原因，并停止当前任务', async () => {
  const runner = await createRunner({ browse: 5, likeError: { code: 1200070, msg: '操作频繁' } })
  const result = await runner.run()

  assert.equal(result.success, false)
  assert.ok(result.messages.some((message) => message.includes('操作频繁 (1200070)')))
  assert.equal(runner.requests.filter(({ path }) => path === 'PostStar').length, 1)
})

test('点赞接口发生 HTTP 错误时不重试切换操作', async () => {
  const runner = await createRunner({
    browse: 5,
    likeError: { code: 500, msg: 'upstream unavailable', status: 500 },
  })
  const result = await runner.run()

  assert.equal(result.success, false)
  assert.ok(result.messages.some((message) => message.includes('upstream unavailable')))
  assert.equal(runner.requests.filter(({ path }) => path === 'PostStar').length, 1)
})

test('操作返回成功但官方进度未增加时，执行结果仍为异常', async () => {
  const runner = await createRunner({ credit: false })
  const result = await runner.run()

  assert.equal(result.success, false)
  assert.equal(result.overview.autoPendingCount, 2)
  assert.equal(result.overview.completedCount, 2)
})

test('任务已完成时不再请求帖子和点赞接口', async () => {
  const runner = await createRunner({ browse: 5, likes: 5 })
  const result = await runner.run()

  assert.equal(result.success, true)
  assert.equal(
    runner.requests.filter(({ path }) => ['GetPostListNew', 'GetPost', 'PostStar'].includes(path))
      .length,
    0
  )
})

test('游玩游戏先尝试官方登记，回查完成后显示已完成', async () => {
  const runner = await createRunner({ browse: 5, likes: 5, gameCompleted: false })
  const result = await runner.run()

  assert.equal(result.success, true)
  assert.equal(result.overview.completedCount, 4)
  assert.equal(result.overview.manualPendingCount, 0)
  assert.equal(runner.requests.filter(({ path }) => path === 'CompleteTaskAddPoint').length, 1)
  assert.ok(result.messages.some((message) => message.includes('官方进度已确认完成')))
})

test('游玩游戏登记返回成功但未计入时，保留未完成状态并提示自行启动游戏', async () => {
  const runner = await createRunner({
    browse: 5,
    likes: 5,
    gameCompleted: false,
    gameCredit: false,
  })
  const result = await runner.run()

  assert.equal(result.success, true)
  assert.equal(result.overview.completedCount, 3)
  assert.equal(result.overview.manualPendingCount, 1)
  assert.equal(result.overview.autoPendingCount, 0)
  const gameTask = result.overview.tasks.find((item) => item.id === '14')
  assert.equal(gameTask.completed, false)
  assert.equal(gameTask.requiresManual, true)
  assert.equal(gameTask.statusText, '需游戏内完成')
  assert.ok(result.messages.some((message) => message.includes('请自行启动游戏后刷新状态')))
  assert.equal(runner.requests.filter(({ path }) => path === 'CompleteTaskAddPoint').length, 1)
})

test('游玩游戏登记报错时只尝试一次，提示手动且不影响其他自动任务', async () => {
  const runner = await createRunner({
    gameCompleted: false,
    gameError: { code: 500, msg: 'system error', status: 500 },
  })
  const result = await runner.run()

  assert.equal(result.success, true)
  assert.equal(result.overview.completedCount, 3)
  assert.equal(result.overview.manualPendingCount, 1)
  assert.equal(result.overview.autoPendingCount, 0)
  assert.equal(runner.requests.filter(({ path }) => path === 'CompleteTaskAddPoint').length, 1)
  assert.ok(result.messages.some((message) => message.includes('请自行启动游戏后刷新状态')))
})
