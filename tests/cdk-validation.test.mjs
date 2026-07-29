import assert from 'node:assert/strict'
import test from 'node:test'
import { validateCdkSource } from '../src/utils/cdkValidation.mjs'

function validCdk(overrides = {}) {
  return {
    code: 'TESTCDK',
    name: '测试兑换码',
    reward: '珠宝×100',
    servers: ['global'],
    status: '可用',
    created: '2025-02-28',
    ...overrides,
  }
}

test('接受字段类型和日期均有效的 CDK', () => {
  assert.equal(validateCdkSource({ cdks: [validCdk()] }).errors.length, 0)
})

test('拒绝非字符串文本字段', () => {
  const { errors } = validateCdkSource({
    cdks: [validCdk({ code: { value: 'TESTCDK' }, name: ['测试'], reward: 100 })],
  })
  assert.equal(errors.length, 3)
})

test('拒绝不存在的日历日期', () => {
  const { errors } = validateCdkSource({
    cdks: [validCdk({ created: '2025-02-31' })],
  })
  assert.ok(errors.some((problem) => problem.message.includes('不是有效的')))
})

test('拒绝类型错误的组合标识和名称', () => {
  const { errors } = validateCdkSource({
    cdks: [
      {
        type: 'group',
        groupId: 123,
        groupName: {},
        cdks: [validCdk()],
      },
    ],
  })
  assert.equal(errors.length, 2)
})

test('拒绝会导致渲染异常的可选文本字段类型', () => {
  const normal = validateCdkSource({
    cdks: [validCdk({ note: {}, author: [] })],
  })
  assert.equal(normal.errors.length, 2)

  const group = validateCdkSource({
    cdks: [
      {
        type: 'group',
        groupId: 'test-group',
        groupName: '测试组合',
        note: 42,
        cdks: [validCdk()],
      },
    ],
  })
  assert.equal(group.errors.length, 1)
})
