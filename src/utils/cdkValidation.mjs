/**
 * cdk-list.source.json 的校验规则。
 *
 * 这里是唯一的规则来源：`scripts/validate-cdk.mjs`（CI / npm run validate）与
 * 本地管理后台 `src/views/CdkAdmin.vue` 都引用本文件，避免两边判定标准漂移。
 * 因此本文件必须保持纯 JS：不能引入 Vue、浏览器 API 或 Node API。
 */

export const VALID_SERVERS = ['global', 'cn', 'tw']
export const VALID_STATUSES = ['可用', '已过期']

export const SERVER_LABELS = {
  global: '国际服',
  cn: '国服',
  tw: '港澳台服',
}

const SERVER_SET = new Set(VALID_SERVERS)
const STATUS_SET = new Set(VALID_STATUSES)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isRealDate(value) {
  if (!isNonEmptyString(value) || !DATE_RE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * @typedef {Object} CdkProblem
 * @property {'error'|'warning'} level
 * @property {string} path      形如 `cdks[3].cdks[1]`
 * @property {string} message
 * @property {number} index     顶层条目下标，便于 UI 定位
 * @property {number} subIndex  组合内子条目下标，非组合为 -1
 */

/**
 * 校验整份 CDK 源数据。
 * @param {any} data
 * @returns {{ errors: CdkProblem[], warnings: CdkProblem[], codeCount: number, groupCount: number }}
 */
export function validateCdkSource(data) {
  const errors = []
  const warnings = []

  const add = (level, index, subIndex, path, message) => {
    ;(level === 'error' ? errors : warnings).push({ level, index, subIndex, path, message })
  }

  if (!data || typeof data !== 'object' || !Array.isArray(data.cdks)) {
    add('error', -1, -1, 'cdks', '顶层字段 "cdks" 缺失或不是数组')
    return { errors, warnings, codeCount: 0, groupCount: 0 }
  }

  const seenCodes = new Map() // code -> 首次出现的 path
  const seenGroupIds = new Map()
  const today = new Date().toISOString().slice(0, 10)

  /** 普通 CDK / 组合子 CDK 的公共字段校验 */
  function checkCdkFields(cdk, index, subIndex, path) {
    if (!isNonEmptyString(cdk.code)) {
      add('error', index, subIndex, path, 'code 缺失或不是非空字符串')
    } else if (seenCodes.has(cdk.code.trim())) {
      add(
        'error',
        index,
        subIndex,
        path,
        `code "${cdk.code.trim()}" 与 ${seenCodes.get(cdk.code.trim())} 重复`
      )
    } else {
      seenCodes.set(cdk.code.trim(), path)
    }

    if (!isNonEmptyString(cdk.name)) {
      add('error', index, subIndex, path, 'name 缺失或不是非空字符串')
    }
    if (!isNonEmptyString(cdk.reward)) {
      add('error', index, subIndex, path, 'reward 缺失或不是非空字符串')
    }
    if (cdk.note !== undefined && typeof cdk.note !== 'string') {
      add('error', index, subIndex, path, 'note 必须是字符串')
    }
    if (cdk.author !== undefined && typeof cdk.author !== 'string') {
      add('error', index, subIndex, path, 'author 必须是字符串')
    }

    if (!Array.isArray(cdk.servers) || cdk.servers.length === 0) {
      add('error', index, subIndex, path, 'servers 缺失或为空数组')
    } else {
      for (const s of cdk.servers) {
        if (typeof s !== 'string' || !SERVER_SET.has(s)) {
          add(
            'error',
            index,
            subIndex,
            path,
            `非法的服务器值 "${s}"（允许: ${VALID_SERVERS.join(', ')}）`
          )
        }
      }
    }

    if (cdk.status !== undefined && (!isNonEmptyString(cdk.status) || !STATUS_SET.has(cdk.status))) {
      add(
        'error',
        index,
        subIndex,
        path,
        `非法的状态值 "${cdk.status}"（允许: ${VALID_STATUSES.join(', ')}）`
      )
    } else if (!cdk.status) {
      add('warning', index, subIndex, path, '未设置 status，展示端会按未知状态处理')
    }

    if (!isNonEmptyString(cdk.created)) {
      add('error', index, subIndex, path, 'created 缺失或不是非空字符串')
    } else if (!isRealDate(cdk.created)) {
      add('error', index, subIndex, path, `created "${cdk.created}" 不是有效的 YYYY-MM-DD 日期`)
    } else if (cdk.created > today) {
      add('warning', index, subIndex, path, `created "${cdk.created}" 是未来日期`)
    }
  }

  data.cdks.forEach((item, index) => {
    const path = `cdks[${index}]`

    if (item == null || typeof item !== 'object') {
      add('error', index, -1, path, '条目为 null 或非对象')
      return
    }

    if (item.type === 'group') {
      if (!isNonEmptyString(item.groupId)) {
        add('error', index, -1, path, '组合 groupId 缺失或不是非空字符串')
      } else if (seenGroupIds.has(item.groupId.trim())) {
        add(
          'error',
          index,
          -1,
          path,
          `groupId "${item.groupId.trim()}" 与 ${seenGroupIds.get(item.groupId.trim())} 重复`
        )
      } else {
        seenGroupIds.set(item.groupId.trim(), path)
      }

      if (!isNonEmptyString(item.groupName)) {
        add('error', index, -1, path, '组合 groupName 缺失或不是非空字符串')
      }
      if (item.note !== undefined && typeof item.note !== 'string') {
        add('error', index, -1, path, '组合 note 必须是字符串')
      }

      if (item.cdks !== undefined && !Array.isArray(item.cdks)) {
        add('error', index, -1, path, '组合的 cdks 不是数组')
        return
      }

      const subs = Array.isArray(item.cdks) ? item.cdks : []
      if (subs.length === 0) {
        add('error', index, -1, path, '组合至少需要一个子 CDK')
        return
      }

      subs.forEach((sub, subIndex) => {
        const subPath = `${path}.cdks[${subIndex}]`
        if (sub == null || typeof sub !== 'object') {
          add('error', index, subIndex, subPath, '子条目为 null 或非对象')
          return
        }
        if (sub.type === 'group') {
          add('error', index, subIndex, subPath, '禁止嵌套组合（组合内不可再包含 type: group）')
        } else if (sub.type !== undefined) {
          add('error', index, subIndex, subPath, `子条目包含非法的 type 字段 "${sub.type}"`)
        }
        checkCdkFields(sub, index, subIndex, subPath)
      })
      return
    }

    if (item.type !== undefined) {
      add('error', index, -1, path, `非法的 type 字段 "${item.type}"`)
    }
    checkCdkFields(item, index, -1, path)
  })

  return {
    errors,
    warnings,
    codeCount: seenCodes.size,
    groupCount: seenGroupIds.size,
  }
}

/**
 * 收集所有 code 的出现位置，用于表单里的实时重复检测。
 * @returns {Map<string, Array<{ index: number, subIndex: number }>>}
 */
export function collectCodeLocations(data) {
  const map = new Map()
  const push = (code, index, subIndex) => {
    if (!code) return
    if (!map.has(code)) map.set(code, [])
    map.get(code).push({ index, subIndex })
  }

  if (!data || !Array.isArray(data.cdks)) return map
  data.cdks.forEach((item, index) => {
    if (item?.type === 'group') {
      ;(Array.isArray(item.cdks) ? item.cdks : []).forEach((sub, subIndex) => {
        push(sub?.code, index, subIndex)
      })
    } else {
      push(item?.code, index, -1)
    }
  })
  return map
}
