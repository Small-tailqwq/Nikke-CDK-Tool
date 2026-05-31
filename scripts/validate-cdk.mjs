import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SOURCE_LIST_PATH = path.resolve(__dirname, '../public/cdk-list.source.json')

const VALID_SERVERS = new Set(['global', 'cn', 'tw'])
const VALID_STATUSES = new Set(['可用', '已过期'])
const VALID_TYPES = new Set([undefined, 'group'])

/** @param {string} msg */
function error(msg) {
  console.error(`  ✗ ${msg}`)
}

let exitCode = 0
let errorCount = 0

function addError(msg) {
  error(msg)
  errorCount++
  exitCode = 1
}

async function main() {
  console.log('🔍 正在校验 CDK 数据文件…')
  console.log(`   文件: ${SOURCE_LIST_PATH}\n`)

  let raw
  try {
    raw = await fs.readFile(SOURCE_LIST_PATH, 'utf-8')
  } catch {
    console.error(`  ✗ 无法读取文件: ${SOURCE_LIST_PATH}`)
    process.exit(1)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    console.error(`  ✗ JSON 解析失败: ${e.message}`)
    process.exit(1)
  }

  const cdks = data.cdks
  if (!Array.isArray(cdks)) {
    addError('顶层字段 "cdks" 缺失或不是数组')
    process.exit(1)
  }

  console.log(`  共 ${cdks.length} 个顶层条目\n`)

  const seenCodes = new Set()
  const seenGroupIds = new Set()

  for (let i = 0; i < cdks.length; i++) {
    const item = cdks[i]
    const label = `cdks[${i}]`

    if (item == null || typeof item !== 'object') {
      addError(`${label}: 条目为 null 或非对象`)
      continue
    }

    // 组合
    if (item.type === 'group') {
      if (!item.groupId) {
        addError(`${label}: 组合缺少 groupId`)
      } else {
        if (seenGroupIds.has(item.groupId)) {
          addError(`${label}: groupId "${item.groupId}" 重复`)
        }
        seenGroupIds.add(item.groupId)
      }

      if (!item.groupName) {
        addError(`${label}: 组合缺少 groupName`)
      }

      if (item.cdks !== undefined && !Array.isArray(item.cdks)) {
        addError(`${label}: 组合的 cdks 不是数组`)
      } else if (Array.isArray(item.cdks) && item.cdks.length === 0) {
        addError(`${label}: 组合的 cdks 为空数组（至少需要一个子 CDK）`)
      }

      if (item.cdks && Array.isArray(item.cdks)) {
        for (let j = 0; j < item.cdks.length; j++) {
          const sub = item.cdks[j]
          const subLabel = `${label}.cdks[${j}]`

          if (sub == null || typeof sub !== 'object') {
            addError(`${subLabel}: 子条目为 null 或非对象`)
            continue
          }

          if (sub.type !== undefined && sub.type !== 'group') {
            addError(`${subLabel}: 子条目包含非法的 type 字段`)
          }

          if (!sub.code) {
            addError(`${subLabel}: 子条目缺少 code`)
          } else {
            if (seenCodes.has(sub.code)) {
              addError(`${subLabel}: code "${sub.code}" 重复`)
            }
            seenCodes.add(sub.code)
          }

          if (!sub.name) {
            addError(`${subLabel}: 子条目缺少 name`)
          }

          if (!sub.reward) {
            addError(`${subLabel}: 子条目缺少 reward`)
          }

          if (!Array.isArray(sub.servers) || sub.servers.length === 0) {
            addError(`${subLabel}: 子条目 servers 缺失或为空数组`)
          } else {
            for (const s of sub.servers) {
              if (!VALID_SERVERS.has(s)) {
                addError(`${subLabel}: 非法的服务器值 "${s}"（允许: global, cn, tw）`)
              }
            }
          }

          if (sub.status && !VALID_STATUSES.has(sub.status)) {
            addError(`${subLabel}: 非法的状态值 "${sub.status}"（允许: 可用, 已过期）`)
          }

          if (!sub.created) {
            addError(`${subLabel}: 子条目缺少 created`)
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(sub.created)) {
            addError(`${subLabel}: created "${sub.created}" 格式错误（期望 YYYY-MM-DD）`)
          }

          if (sub.type === 'group') {
            addError(`${subLabel}: 禁止嵌套组合（组合内不可再包含 type: group）`)
          }
        }
      }
    } else {
      // 普通 CDK
      if (item.type !== undefined && !VALID_TYPES.has(item.type)) {
        addError(`${label}: 非法的 type 字段 "${item.type}"`)
      }

      if (!item.code) {
        addError(`${label}: 缺少 code`)
      } else {
        if (seenCodes.has(item.code)) {
          addError(`${label}: code "${item.code}" 重复`)
        }
        seenCodes.add(item.code)
      }

      if (!item.name) {
        addError(`${label}: 缺少 name`)
      }

      if (!item.reward) {
        addError(`${label}: 缺少 reward`)
      }

      if (!Array.isArray(item.servers) || item.servers.length === 0) {
        addError(`${label}: servers 缺失或为空数组`)
      } else {
        for (const s of item.servers) {
          if (!VALID_SERVERS.has(s)) {
            addError(`${label}: 非法的服务器值 "${s}"（允许: global, cn, tw）`)
          }
        }
      }

      if (item.status && !VALID_STATUSES.has(item.status)) {
        addError(`${label}: 非法的状态值 "${item.status}"（允许: 可用, 已过期）`)
      }

      if (!item.created) {
        addError(`${label}: 缺少 created`)
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(item.created)) {
        addError(`${label}: created "${item.created}" 格式错误（期望 YYYY-MM-DD）`)
      }
    }
  }

  const totalCodes = seenCodes.size
  const totalGroups = seenGroupIds.size

  console.log('')
  console.log(`📊 统计: ${totalCodes} 个 CDK code, ${totalGroups} 个组合\n`)

  if (exitCode === 0) {
    console.log('✅ CDK 数据校验通过，所有字段均合法！\n')
  } else {
    console.log(`❌ 发现 ${errorCount} 个错误，请修正后重试。\n`)
  }

  process.exit(exitCode)
}

main()
