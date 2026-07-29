import test from 'node:test'
import assert from 'node:assert/strict'

import { getCookieExpireDays } from '../src/utils/dateUtils.js'

test('新获取的 30 天 Cookie 会从 30 天开始倒计时', () => {
  const now = new Date('2026-07-06T00:00:00.000Z')
  const expireAt = new Date('2026-08-05T00:00:00.000Z')

  assert.equal(getCookieExpireDays(expireAt, now), 30)
})

test('重新打开应用时会根据实际过期时间重算剩余天数', () => {
  const now = new Date('2026-07-08T12:00:00.000Z')
  const expireAt = new Date('2026-08-05T00:00:00.000Z')

  assert.equal(getCookieExpireDays(expireAt, now), 28)
})

test('过期后返回 0 天，避免继续显示旧的静态天数', () => {
  const now = new Date('2026-08-06T00:00:00.000Z')
  const expireAt = new Date('2026-08-05T00:00:00.000Z')

  assert.equal(getCookieExpireDays(expireAt, now), 0)
})
