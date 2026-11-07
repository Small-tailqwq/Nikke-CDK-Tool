import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const cookie =
  'game_openid=OPENID_PLACEHOLDER; game_token=TOKEN_PLACEHOLDER; game_channelid=131; game_gameid=29080; unrelated=SECRET_PLACEHOLDER'

async function createRunner({
  networkError = false,
  rewardGroups = [{ reward_id: 1, status: 1 }],
  failRewardId = null,
} = {}) {
  const requests = []
  let damage = 100000
  let attempts = 2
  const rewards = rewardGroups.map((reward) => ({ ...reward }))
  const source = await readFile('cloudflare-worker/Nikke-CDK-Combined.js', 'utf8')
  const worker = vm.runInNewContext(source.replace('export default {', 'globalThis.worker = {'), {
    URL,
    Request,
    Response,
    Headers,
    crypto: { randomUUID },
    console,
    async fetch(input, init) {
      const request = new Request(input, init)
      const url = new URL(request.url)
      assert.equal(url.origin, 'https://nex-4k09c8-run-app-api.playerinfinite.com')
      assert.equal(request.headers.get('Cookie'), null)
      assert.equal(request.headers.get('Origin'), 'https://nikke-en.com')
      const action = url.pathname.split('/').at(-1)
      if (action !== 'publicInit') {
        assert.equal(url.searchParams.get('openid'), 'OPENID_PLACEHOLDER')
        assert.equal(url.searchParams.get('token'), 'TOKEN_PLACEHOLDER')
        assert.equal(url.searchParams.get('channel'), '131')
        assert.equal(url.searchParams.get('game_id'), '29080')
        assert.equal(url.searchParams.get('account_type'), '1')
      }
      const signature = url.searchParams.get('s')
      url.searchParams.delete('s')
      assert.equal(
        signature,
        createHash('md5')
          .update(`${url.pathname}?${decodeURI(url.search.slice(1))}&appkey=intel#!2022$act`)
          .digest('hex')
      )
      const payload = await request.json()
      requests.push({ action, payload })
      if (networkError) throw new Error('Failed URL with TOKEN_PLACEHOLDER')
      if (payload.reward_id === failRewardId) {
        return Response.json({ code: 300003, msg: 'TEST_FAILURE_PLACEHOLDER' })
      }
      let data
      if (action === 'publicInit') {
        data = {
          bosses: [1, 2, 3, 4, 5, 6].map((id) => ({
            boss_id: id,
            defeated: id < 6,
            hp_percent: id < 6 ? 0 : 80,
          })),
          allow_all_boss_attack: false,
        }
      } else if (action === 'init') {
        data = {
          total_damage: damage,
          remaining_attempts: attempts,
          saved_role: { area_id: '81', role_id: 'ROLE_PLACEHOLDER' },
        }
      } else if (action === 'rewardRecords') {
        data = { reward_groups: rewards }
      } else if (action === 'claimReward' || action === 'shareReward') {
        rewards.find((reward) => reward.reward_id === payload.reward_id).status = 2
        data = { sent: true }
      } else if (action === 'battleSettlement') {
        damage += payload.damage
        attempts -= 1
        data = { damage: payload.damage, remaining_attempts: attempts }
      } else {
        data = {}
      }
      return Response.json({ code: 0, data })
    },
  })
  const apiSource = (await readFile('src/utils/reclamation.js', 'utf8'))
    .replace(/^import axios from 'axios'\r?\n/, '')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined')
    .replaceAll('export ', '')
  const client = vm.runInNewContext(
    `${apiSource}\n;({ requestReclamation, fetchReclamationState, getReclamationHit, getReclamationBosses, getReclamationShareIds, getReclamationClaimIds, runReclamationRewards })`,
    {
      axios: {
        async post(url, body) {
          const response = await worker.fetch(
            new Request(url, { method: 'POST', body: JSON.stringify(body) }),
            {},
            {}
          )
          const data = await response.json()
          if (!response.ok) throw Object.assign(new Error('HTTP error'), { response: { data } })
          return { data }
        },
      },
    }
  )
  return { ...client, worker, requests }
}

test('活动经 Worker 转换游戏凭据、签名，领奖和结算后回查次数与伤害', async () => {
  const api = await createRunner()
  const initial = await api.fetchReclamationState(cookie)
  assert.equal(initial.total_damage, 100000)
  assert.equal(initial.remaining_attempts, 2)
  assert.equal(api.getReclamationBosses(initial)[0].boss_id, 6)
  await api.requestReclamation(cookie, 'claim', { reward_id: 1, token: 'IGNORED_PLACEHOLDER' })
  assert.equal((await api.fetchReclamationState(cookie)).reward_groups[0].status, 2)
  assert.deepEqual(api.requests.find((request) => request.action === 'claimReward').payload, {
    reward_id: 1,
  })
  await api.requestReclamation(cookie, 'settle', { boss_id: 6, damage: 175000 })
  const settled = await api.fetchReclamationState(cookie)
  assert.equal(settled.total_damage, 275000)
  assert.equal(settled.remaining_attempts, 1)
  assert.equal(api.getReclamationHit(0.5).damage, 30000)
  assert.equal(api.getReclamationHit(0.42).damage, 20000)
  assert.equal(api.getReclamationHit(0.3).damage, 15000)
  assert.equal(api.getReclamationHit(0.1).damage, 10000)
})

test('一键分享与领取跳过已领取及未击破项目，重复执行不再次发奖', async () => {
  const api = await createRunner({
    rewardGroups: [
      { reward_id: 2, status: 0 },
      { reward_id: 7, status: 2 },
      { reward_id: 8, status: 1 },
      { reward_id: 9, status: 1 },
      { reward_id: 12, status: 0 },
      { reward_id: 13, status: 0 },
      { reward_id: 14, status: 2 },
      { reward_id: 15, status: 0 },
      { reward_id: 16, status: 0 },
      { reward_id: 18, status: 0 },
      { reward_id: 19, status: 1 },
      { reward_id: 20, status: 0 },
    ],
  })
  const initial = await api.fetchReclamationState(cookie)
  initial.bosses.find((boss) => boss.boss_id === 4).defeated = false
  assert.deepEqual([...api.getReclamationShareIds(initial)], [2, 12, 13, 16])
  assert.equal(
    api.getReclamationBosses({
      bosses: initial.bosses.map((boss) => ({ ...boss, defeated: false })),
      saved_role: initial.saved_role,
    })[0].boss_id,
    1
  )
  assert.equal(await api.runReclamationRewards(cookie, 'share'), 5)
  assert.equal(await api.runReclamationRewards(cookie, 'claim'), 2)
  assert.equal(await api.runReclamationRewards(cookie, 'share'), 0)
  assert.equal(await api.runReclamationRewards(cookie, 'claim'), 0)
  assert.deepEqual(
    api.requests
      .filter((request) => request.action === 'shareReward')
      .map(({ payload }) => payload.reward_id),
    [2, 12, 13, 15, 16]
  )
  assert.deepEqual(
    api.requests
      .filter((request) => request.action === 'claimReward')
      .map(({ payload }) => payload.reward_id),
    [8, 9]
  )
  const final = await api.fetchReclamationState(cookie)
  assert.equal(final.total_damage, initial.total_damage)
  assert.equal(final.remaining_attempts, initial.remaining_attempts)
  await assert.rejects(
    api.requestReclamation(cookie, 'share', { reward_id: 1 }),
    /分享奖励编号错误/
  )
})

test('批量领奖失败后停止，回查保留已成功项目，不重发失败请求', async () => {
  const api = await createRunner({
    rewardGroups: [7, 8, 9].map((reward_id) => ({ reward_id, status: 1 })),
    failRewardId: 8,
  })
  await assert.rejects(api.runReclamationRewards(cookie, 'claim'), /TEST_FAILURE_PLACEHOLDER/)
  const refreshed = await api.fetchReclamationState(cookie)
  assert.deepEqual([...api.getReclamationClaimIds(refreshed)], [8, 9])
  assert.deepEqual(
    api.requests
      .filter((request) => request.action === 'claimReward')
      .map(({ payload }) => payload.reward_id),
    [7, 8]
  )
})

test('无效结算参数在本地拒绝，网络异常不重试也不返回带凭据的 URL', async () => {
  const api = await createRunner({ networkError: true })
  await assert.rejects(
    api.requestReclamation(cookie, 'settle', { boss_id: 6, damage: 310000 }),
    /结算参数错误/
  )
  assert.equal(api.requests.length, 0)
  await assert.rejects(
    api.requestReclamation(cookie, 'settle', { boss_id: 6, damage: 100000 }),
    /活动请求未确认/
  )
  assert.equal(api.requests.length, 1)
  const response = await api.worker.fetch(
    new Request('https://example.com/global/reclamation/state', { method: 'POST', body: '{}' }),
    {},
    {}
  )
  assert.equal(response.status, 400)
})
