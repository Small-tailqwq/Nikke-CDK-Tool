import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCdkSource } from '../src/utils/cdkValidation.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SOURCE_LIST_PATH = path.resolve(__dirname, '../public/cdk-list.source.json')

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

  const total = Array.isArray(data?.cdks) ? data.cdks.length : 0
  console.log(`  共 ${total} 个顶层条目\n`)

  const { errors, warnings, codeCount, groupCount } = validateCdkSource(data)

  for (const w of warnings) {
    console.warn(`  ⚠ ${w.path}: ${w.message}`)
  }
  for (const e of errors) {
    console.error(`  ✗ ${e.path}: ${e.message}`)
  }

  console.log('')
  console.log(`📊 统计: ${codeCount} 个 CDK code, ${groupCount} 个组合\n`)

  if (errors.length === 0) {
    const suffix = warnings.length ? `（${warnings.length} 个警告）` : ''
    console.log(`✅ CDK 数据校验通过，所有字段均合法！${suffix}\n`)
    process.exit(0)
  }

  console.log(`❌ 发现 ${errors.length} 个错误，请修正后重试。\n`)
  process.exit(1)
}

main()
