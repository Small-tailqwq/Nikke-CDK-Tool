import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { computed, reactive, ref, watch } from 'vue'

const cookie =
  'game_openid=OPENID_PLACEHOLDER; game_token=TOKEN_PLACEHOLDER; game_channelid=131; game_gameid=29080; unrelated=SECRET_PLACEHOLDER'

async function createRunner({
  networkError = false,
  rewardGroups = [{ reward_id: 1, status: 1 }],
  failRewardId = null,
  random = Math.random,
  settlementError = false,
  consumeAttempts = true,
  roleBound = true,
  today = () => new Date().toDateString(),
} = {}) {
  const requests = []
  const waits = []
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
          saved_role: roleBound ? { area_id: '81', role_id: 'ROLE_PLACEHOLDER' } : {},
        }
      } else if (action === 'rewardRecords') {
        data = { reward_groups: rewards }
      } else if (action === 'claimReward' || action === 'shareReward') {
        rewards.find((reward) => reward.reward_id === payload.reward_id).status = 2
        data = { sent: true }
      } else if (action === 'battleSettlement') {
        damage += payload.damage
        if (consumeAttempts) attempts -= 1
        if (settlementError) throw new Error('SETTLEMENT_NETWORK_ERROR_PLACEHOLDER')
        for (const reward of rewards) {
          const threshold = { 3: 300000, 4: 1000000, 5: 2000000, 6: 3000000 }[reward.reward_id]
          if (threshold && reward.status === 0 && damage >= threshold) reward.status = 1
        }
        data = { damage: payload.damage, remaining_attempts: attempts }
      } else {
        data = {}
      }
      return Response.json({ code: 0, data })
    },
  })
  const apiSource = (await readFile('src/utils/reclamation.js', 'utf8'))
    .replace(/^import .+ from .+\r?\n/gm, '')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined')
    .replaceAll('export ', '')
  const client = vm.runInNewContext(
    `${apiSource}\n;({ requestReclamation, fetchReclamationState, getReclamationHit, getReclamationBosses, getReclamationShareIds, getReclamationClaimIds, runReclamationRewards, getReclamationAutoTarget, getReclamationAimSpeed, playReclamationAutoRound, reclamationRunning, runReclamationBattles, runDailyReclamation })`,
    {
      reactive,
      getBlaTodayKey: today,
      setTimeout(callback, delay) {
        waits.push(delay)
        callback()
      },
      Math: Object.assign(Object.create(Math), { random }),
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
  return { ...client, worker, requests, waits }
}

async function createBattleView(api) {
  const updates = []
  let now = 0
  let frame = null
  let frameId = 0
  let unmount
  const document = { hidden: false, addEventListener() {}, removeEventListener() {} }
  const source = (await readFile('src/components/ReclamationEvent.vue', 'utf8'))
    .split('<script setup>')[1]
    .split('</script>')[0]
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]/g, '')
  const view = vm.runInNewContext(
    `${source}\n;({ refresh, startBattle, startAutomaticBattles, handleVisibilityChange, canStart, automatic, playing, shots, damage, seconds, error, state })`,
    {
      ...api,
      computed,
      ref,
      watch,
      getBlaTodayKey: () => new Date().toDateString(),
      useUserStore: () => ({ updateUser: async (id, fields) => updates.push({ id, ...fields }) }),
      defineProps: () => ({ user: { id: 'TEST_USER', cookie } }),
      onMounted() {},
      onBeforeUnmount: (handler) => {
        unmount = handler
      },
      document,
      performance: { now: () => now },
      requestAnimationFrame: (callback) => {
        frame = callback
        return ++frameId
      },
      cancelAnimationFrame: () => {
        frame = null
      },
    }
  )
  await view.refresh()
  return {
    ...view,
    updates,
    unmount: () => unmount(),
    setHidden(hidden) {
      document.hidden = hidden
      view.handleVisibilityChange()
    },
    async advance(milliseconds) {
      now += milliseconds
      const callback = frame
      frame = null
      callback?.(now)
      await new Promise(setImmediate)
    },
  }
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

test('自动瞄准偏向中心，并保留随机偏移与不同命中等级', async () => {
  let seed = 20261107
  const api = await createRunner({
    random: () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    },
  })
  const targets = Array.from({ length: 500 }, () => api.getReclamationAutoTarget())
  assert.ok(targets.every((target) => target >= 0.36 && target <= 0.64))
  const center = targets.filter((target) => Math.abs(target - 0.5) < 0.07).length
  assert.ok(center > targets.length - center)
  const ratings = new Set(targets.map((target) => api.getReclamationHit(target).rating))
  assert.ok(ratings.has('PERFECT'))
  assert.ok(ratings.has('GREAT'))
  assert.ok(ratings.has('GOOD'))
})

test('自动战斗逐局回查剩余次数，用完后领取新达成的伤害奖励', async () => {
  const api = await createRunner({
    rewardGroups: [
      { reward_id: 3, status: 0 },
      { reward_id: 7, status: 1 },
    ],
  })
  let remaining
  const playAttempts = []
  const scores = [225000, 235000]
  const outcome = await api.runReclamationBattles(cookie, {
    bossId: 6,
    shouldStop: () => false,
    onState: (state) => {
      remaining = state.remaining_attempts
    },
    playRound: async (bossId) => {
      assert.equal(bossId, 6)
      playAttempts.push(remaining)
      return scores[playAttempts.length - 1]
    },
  })
  assert.deepEqual(playAttempts, [2, 1])
  assert.equal(outcome.rounds, 2)
  assert.equal(outcome.damage, 460000)
  assert.equal(outcome.claimed, 2)
  assert.equal(outcome.state.remaining_attempts, 0)
  assert.equal(outcome.state.total_damage, 560000)
  assert.ok(outcome.state.reward_groups.every((reward) => reward.status === 2))
  assert.deepEqual(
    api.requests
      .filter(({ action }) => ['battleSettlement', 'claimReward'].includes(action))
      .map(({ action }) => action),
    ['battleSettlement', 'battleSettlement', 'claimReward', 'claimReward']
  )
})

test('请求停止时完成当前局，关闭进行中的小游戏时不提交结算', async () => {
  const api = await createRunner()
  let stopped = false
  const outcome = await api.runReclamationBattles(cookie, {
    bossId: 6,
    shouldStop: () => stopped,
    onState: () => {},
    playRound: async () => {
      stopped = true
      return 200000
    },
  })
  assert.equal(outcome.rounds, 1)
  assert.equal(outcome.stopped, true)
  assert.equal(outcome.state.remaining_attempts, 1)
  assert.equal(api.requests.filter(({ action }) => action === 'claimReward').length, 0)

  const cancelled = await createRunner()
  const result = await cancelled.runReclamationBattles(cookie, {
    bossId: 6,
    shouldStop: () => false,
    onState: () => {},
    playRound: async () => null,
  })
  assert.equal(result.stopped, true)
  assert.equal(result.rounds, 0)
  assert.equal(cancelled.requests.filter(({ action }) => action === 'battleSettlement').length, 0)
})

test('结算成功但响应丢失时停止自动战斗，不重试或提前领奖', async () => {
  const api = await createRunner({ settlementError: true })
  await assert.rejects(
    api.runReclamationBattles(cookie, {
      bossId: 6,
      shouldStop: () => false,
      onState: () => {},
      playRound: async () => 200000,
    }),
    /活动请求未确认/
  )
  assert.equal(api.requests.filter(({ action }) => action === 'battleSettlement').length, 1)
  assert.equal(api.requests.filter(({ action }) => action === 'claimReward').length, 0)
  const state = await api.fetchReclamationState(cookie)
  assert.equal(state.remaining_attempts, 1)
  assert.equal(state.total_damage, 300000)
})

test('结算后次数未减少时停止，不继续消耗或自动领奖', async () => {
  const api = await createRunner({ consumeAttempts: false })
  await assert.rejects(
    api.runReclamationBattles(cookie, {
      bossId: 6,
      shouldStop: () => false,
      onState: () => {},
      playRound: async () => 200000,
    }),
    /攻击次数未减少/
  )
  assert.equal(api.requests.filter(({ action }) => action === 'battleSettlement').length, 1)
  assert.equal(api.requests.filter(({ action }) => action === 'claimReward').length, 0)
})

test('实际小游戏在正常帧率和每秒一帧时都完成十次攻击，再自动结算领奖', async () => {
  for (const frameInterval of [1000 / 60, 1000]) {
    let seed = 20261107
    const api = await createRunner({
      random: () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 0x100000000
      },
    })
    const view = await createBattleView(api)
    const completed = view.startAutomaticBattles()
    for (let index = 0; index < 4000 && view.automatic.value; index += 1) {
      await view.advance(frameInterval)
    }
    assert.equal(view.automatic.value, false, `动画间隔 ${frameInterval}ms 应完成自动战斗`)
    await completed
    assert.equal(view.error.value, '')
    assert.equal(view.state.value.remaining_attempts, 0)
    assert.equal(view.shots.value, 10)
    assert.equal(view.updates.length, 1)
    assert.equal(view.updates[0].reclamationLastRunDateKey, new Date().toDateString())
    const settlements = api.requests.filter(({ action }) => action === 'battleSettlement')
    assert.equal(settlements.length, 2)
    assert.ok(
      settlements.every(({ payload }) => payload.damage >= 150000 && payload.damage <= 300000)
    )
    assert.equal(api.requests.filter(({ action }) => action === 'claimReward').length, 1)
    view.unmount()
  }
})

test('页面隐藏时暂停自动小游戏，卸载页面后不提交未结束的战斗', async () => {
  const api = await createRunner()
  const view = await createBattleView(api)
  const completed = view.startAutomaticBattles()
  for (let index = 0; index < 10 && !view.playing.value; index += 1) await view.advance(0)
  assert.equal(view.playing.value, true)
  await view.advance(1000)
  view.setHidden(true)
  const remaining = view.seconds.value
  const shots = view.shots.value
  await view.advance(60000)
  assert.equal(view.seconds.value, remaining)
  assert.equal(view.shots.value, shots)
  view.setHidden(false)
  await view.advance(1000)
  assert.ok(view.seconds.value >= remaining - 1)
  view.unmount()
  await completed
  assert.equal(api.requests.filter(({ action }) => action === 'battleSettlement').length, 0)
})

test('后台自动战斗使用瞄准规则和真实攻击间隔，无需挂载小游戏', async () => {
  const api = await createRunner({ random: () => 0.5 })
  const outcome = await api.runReclamationBattles(cookie)
  assert.equal(outcome.completed, true)
  assert.equal(outcome.rounds, 2)
  assert.equal(outcome.claimed, 1)
  assert.equal(api.waits.length, 2)
  assert.ok(api.waits.every((duration) => duration >= 4000 && duration <= 30000))
  assert.ok(outcome.damage >= 300000 && outcome.damage <= 600000)
})

test('每日自动战斗独立于 BlaBla 完成日期，仅处理启用自动任务的国际服账号', async () => {
  let day = 'Fri Nov 13 2026'
  const api = await createRunner({ today: () => day })
  const eligible = { id: 1, name: '测试账号', server: 'global', cookie, blaEnabled: true, blaLastRunDateKey: day }
  const updates = []
  const store = {
    users: [
      eligible,
      { ...eligible, id: 2, server: 'cn' },
      { ...eligible, id: 3, server: 'hmt' },
      { ...eligible, id: 4, blaEnabled: false },
      { ...eligible, id: 5, cookie: '' },
      { ...eligible, id: 6, reclamationLastRunDateKey: day },
    ],
    async updateUser(id, fields) {
      updates.push(id)
      Object.assign(this.users.find((user) => user.id === id), fields)
    },
  }
  const results = await api.runDailyReclamation(store)
  assert.equal(results.length, 1)
  assert.equal(results[0].success, true)
  assert.deepEqual(updates, [1])
  assert.equal(eligible.reclamationLastRunDateKey, day)
  const requestCount = api.requests.length
  assert.equal((await api.runDailyReclamation(store)).length, 0)
  assert.equal(api.requests.length, requestCount)
  day = 'Sat Nov 14 2026'
  store.users = [eligible]
  assert.equal((await api.runDailyReclamation(store))[0].success, true)
  assert.equal(eligible.reclamationLastRunDateKey, day)
})

test('领奖失败不标记每日完成，再次打开时回查剩余次数并继续领奖', async () => {
  const api = await createRunner({ failRewardId: 1 })
  const updates = []
  const store = {
    users: [{ id: 1, name: '测试账号', server: 'global', cookie, blaEnabled: true }],
    updateUser: async (id, fields) => updates.push({ id, fields }),
  }
  const first = await api.runDailyReclamation(store)
  assert.equal(first[0].success, false)
  assert.match(first[0].message, /TEST_FAILURE_PLACEHOLDER/)
  assert.equal(updates.length, 0)
  const settlements = api.requests.filter(({ action }) => action === 'battleSettlement').length
  await api.runDailyReclamation(store)
  assert.equal(api.requests.filter(({ action }) => action === 'battleSettlement').length, settlements)
  assert.equal(api.requests.filter(({ action }) => action === 'claimReward').length, 2)
  assert.equal(api.reclamationRunning.size, 0)
})

test('未绑定角色时提示绑定，不战斗、不领奖、不标记每日完成', async () => {
  const api = await createRunner({ roleBound: false })
  const results = await api.runDailyReclamation({
    users: [{ id: 1, name: '测试账号', server: 'global', cookie, blaEnabled: true }],
    updateUser: () => assert.fail('未绑定角色不应保存完成日期'),
  })
  assert.equal(results[0].success, false)
  assert.match(results[0].message, /绑定角色/)
  assert.equal(api.requests.filter(({ action }) => ['battleSettlement', 'claimReward'].includes(action)).length, 0)
})

test('后台战斗期间禁用手动战斗，重复执行不产生第二次结算', async () => {
  const api = await createRunner()
  let finishRound
  const running = api.runReclamationBattles(cookie, {
    playRound: () => new Promise((resolve) => { finishRound = resolve }),
  })
  while (!finishRound) await new Promise((resolve) => setImmediate(resolve))
  const view = await createBattleView(api)
  assert.equal(view.canStart.value, false)
  view.startBattle()
  assert.equal(view.playing.value, false)
  await assert.rejects(api.runReclamationBattles(cookie), /正在运行/)
  finishRound(null)
  await running
  assert.equal(api.reclamationRunning.size, 0)
  assert.equal(api.requests.filter(({ action }) => action === 'battleSettlement').length, 0)
  view.unmount()
})
