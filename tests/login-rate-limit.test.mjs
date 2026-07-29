import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'

async function loadRateLimitHelpers() {
  const workerSource = await readFile('cloudflare-worker/Nikke-CDK-Combined.js', 'utf8')
  const start = workerSource.indexOf('const LOGIN_FAILURE_COOLDOWN_SECONDS')
  const end = workerSource.indexOf('// CORS响应头', start)
  assert.ok(start >= 0 && end > start, '无法定位登录失败限制实现')

  const values = new Map()
  const context = {
    crypto: webcrypto,
    TextEncoder,
    Response,
    console,
    corsHeaders: () => ({}),
    env: {
      TOKEN_KV: {
        async get(key) {
          return values.get(key) ?? null
        },
        async put(key, value) {
          values.set(key, value)
        },
        async delete(key) {
          values.delete(key)
        },
      },
    },
  }
  vm.createContext(context)
  vm.runInContext(
    `${workerSource.slice(start, end)}
globalThis.rateLimit = {
  getLoginFailureRecord,
  enforceLoginFailureLimit,
  recordLoginFailure,
  clearLoginFailures
}`,
    context
  )
  return { ...context.rateLimit, env: context.env }
}

const request = {
  headers: {
    get(name) {
      return name === 'Origin' ? 'https://small-tailqwq.github.io' : null
    },
  },
}

test('不同邮箱使用独立的失败记录', async () => {
  const helpers = await loadRateLimitHelpers()
  await helpers.recordLoginFailure('first@example.com', helpers.env)
  await helpers.recordLoginFailure('FIRST@example.com ', helpers.env)

  const firstResponse = await helpers.enforceLoginFailureLimit(
    'first@example.com',
    request,
    helpers.env
  )
  const secondResponse = await helpers.enforceLoginFailureLimit(
    'second@example.com',
    request,
    helpers.env
  )

  assert.equal(firstResponse.status, 429)
  assert.equal(firstResponse.headers.get('Retry-After'), '30')
  assert.equal(secondResponse, null)
})

test('五次失败后最多封禁十分钟，成功可清除记录', async () => {
  const helpers = await loadRateLimitHelpers()
  const email = 'blocked@example.com'
  for (let i = 0; i < 5; i++) {
    await helpers.recordLoginFailure(email, helpers.env)
  }

  const blocked = await helpers.enforceLoginFailureLimit(email, request, helpers.env)
  const retryAfter = Number(blocked.headers.get('Retry-After'))
  assert.equal(blocked.status, 429)
  assert.ok(retryAfter > 0 && retryAfter <= 600)

  await helpers.clearLoginFailures(email, helpers.env)
  assert.equal(await helpers.enforceLoginFailureLimit(email, request, helpers.env), null)
})
