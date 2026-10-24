import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const COOKIE = 'game_token=TOKEN_PLACEHOLDER'
const now = Date.parse('2026-10-24T12:00:00+08:00')

async function createRunner({ completed = [], commentError = false, voted = false } = {}) {
  const requests = []
  let shareReward = false
  let role = null
  const workerSource = await readFile('cloudflare-worker/Nikke-CDK-Combined.js', 'utf8')
  const worker = vm.runInNewContext(
    workerSource.replace('export default {', 'globalThis.worker = {'),
    {
      URL,
      Request,
      Response,
      crypto: { randomUUID },
      console,
      async fetch(request) {
        assert.equal(request.headers.get('Cookie'), COOKIE)
        const url = new URL(request.url)
        const path = url.pathname.split('/').at(-1)
        const payload = await request.json()
        requests.push({ path, payload })
        let data = {}
        if (path.startsWith('Wand-')) {
          assert.equal(request.headers.get('X-Gameid'), '29080')
          assert.equal(request.headers.get('x-language'), 'zh-tw')
          const signature = url.searchParams.get('s')
          url.searchParams.delete('s')
          assert.equal(
            signature,
            createHash('md5')
              .update(`${url.pathname}${url.search}&appkey=intel#!2022$act`)
              .digest('hex')
          )
        }
        if (path.includes('155307')) {
          if (!role) return Response.json({ code: 601004, msg: 'No saved role' })
          data = {
            get_saved_role_info: role,
            mission_done_list: completed.map((id) => ({
              tag_id: String(id),
              mission_has_done: true,
            })),
            user_has_present_group_id_list: shareReward
              ? ['89652eee-8ef8-4bb0-a5df-c947b1b05f1f']
              : [],
          }
        } else if (path === 'GetSavedRoleInfo') {
          data = { role_info: { area_id: '84', role_id: 'ROLE_PLACEHOLDER' } }
        } else if (path.includes('160757')) {
          role = payload
        } else if (path.includes('173319')) {
          completed.push(Number(payload.tag_id))
        } else if (path.includes('194050')) {
          shareReward = true
        } else if (path === 'PostComment') {
          if (commentError)
            return Response.json({ code: 500, msg: 'upstream unavailable' }, { status: 500 })
          data = { comment: { comment_uuid: `COMMENT_${requests.length}` } }
        } else if (path === 'GetPollDetail') {
          data = {
            poll_list: [
              {
                poll_uuid: payload.poll_uuid[0],
                is_voted: voted,
                options: [{ id: 'option-3', value: '选项三' }],
              },
            ],
          }
        } else {
          assert.equal(path, 'UserSelectPollOption')
          assert.deepEqual(payload.option_id, ['option-3'])
        }
        return Response.json({ code: 0, data })
      },
    }
  )
  const source = (await readFile('src/utils/nikke4th.js', 'utf8'))
    .replace(/^import axios from 'axios'\r?\n/, '')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined')
    .replaceAll('export ', '')
  const api = vm.runInNewContext(`${source}\n;({ runNikke4thTasks, getNikke4thOpenCount })`, {
    Date: class extends Date {
      static now() {
        return now
      }
    },
    setTimeout: (callback) => callback(),
    axios: {
      async post(url, body) {
        const response = await worker.fetch(
          new Request(url, { method: 'POST', body: JSON.stringify(body) }),
          {},
          {}
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return { data: await response.json() }
      },
    },
  })
  return { ...api, requests, completed }
}

test('活动任务经 Worker 签名代理绑定角色、留言、投票，再回查十二个已开放印记', async () => {
  const api = await createRunner()
  const savedComments = []
  const result = await api.runNikke4thTasks(COOKIE, {
    comments: {
      2: '拉毗……<平安>&',
      3: '英雄',
      4: '幸福',
      6: '小红帽',
      7: '理想',
      11: '火力',
      12: '平安',
    },
    votes: { 5: 'option-3', 8: 'option-3' },
    shared: true,
    onComment: (id, uuid) => savedComments.push({ id, uuid }),
  })
  assert.equal(result.completed.length, 12)
  assert.equal(result.shareReward, true)
  assert.equal(savedComments.length, 7)
  assert.equal(
    api.requests.find(({ path }) => path === 'PostComment').payload.content,
    '<div>拉毗……&lt;平安&gt;&amp;</div>'
  )
  const commentIndex = api.requests.findIndex(({ path }) => path === 'PostComment')
  assert.equal(api.requests[commentIndex + 1].payload.tag_id, '2')
  assert.ok(!api.completed.includes(13))
  const writesBefore = api.requests.filter(
    ({ path }) => !['GetPollDetail'].includes(path) && !path.includes('155307')
  ).length
  await api.runNikke4thTasks(COOKIE, { comments: { 2: '不应重复' }, shared: true })
  assert.equal(
    api.requests.filter(({ path }) => !['GetPollDetail'].includes(path) && !path.includes('155307'))
      .length,
    writesBefore
  )
})

test('空白留言和未选择的投票跳过，已投票的章节不再次投票', async () => {
  const api = await createRunner({ voted: true })
  const result = await api.runNikke4thTasks(COOKIE, { votes: { 5: 'option-3' } })
  assert.deepEqual(Array.from(result.completed), [5, 9, 10])
  assert.ok(
    !api.requests.some(({ path }) => ['PostComment', 'UserSelectPollOption'].includes(path))
  )
})

test('留言响应失败时不自动重试，也不登记该章印记', async () => {
  const api = await createRunner({ commentError: true })
  await assert.rejects(api.runNikke4thTasks(COOKIE, { comments: { 2: '拉毗……' } }), /HTTP 500/)
  assert.equal(api.requests.filter(({ path }) => path === 'PostComment').length, 1)
  assert.equal(api.completed.length, 0)
})

test('按活动开放时间限制章节，最终章在北京时间10月25日10点开放', async () => {
  const api = await createRunner()
  assert.equal(api.getNikke4thOpenCount(Date.parse('2026-10-21T09:59:59+08:00')), 0)
  assert.equal(api.getNikke4thOpenCount(Date.parse('2026-10-23T10:00:00+08:00')), 9)
  assert.equal(api.getNikke4thOpenCount(Date.parse('2026-10-25T09:59:59+08:00')), 12)
  assert.equal(api.getNikke4thOpenCount(Date.parse('2026-10-25T10:00:00+08:00')), 13)
  assert.equal(api.getNikke4thOpenCount(Date.parse('2026-11-18T23:00:00+08:00')), 0)
})
