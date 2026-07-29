import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { validateCdkSource } from '../src/utils/cdkValidation.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SOURCE_PATH = path.resolve(ROOT_DIR, 'public/cdk-list.source.json')
// 备份放在 node_modules/.cache 下，天然被 git 忽略，不会污染 public/
const BACKUP_DIR = path.resolve(ROOT_DIR, 'node_modules/.cache/nikke-cdk-admin')
const MAX_BACKUPS = 15

/** 请求路径匹配（base 前缀可能存在，用 endsWith 判断） */
const API_PATH = '/__cdk-admin/source'

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      // 源文件是纯文本 JSON，10MB 足够，超出直接拒绝，避免内存被打爆
      if (size > 10 * 1024 * 1024) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function isSameOrigin(req) {
  const origin = req.headers.origin
  const host = req.headers.host
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function isSafeRead(req) {
  if (req.headers.origin) return isSameOrigin(req)
  const fetchSite = req.headers['sec-fetch-site']
  return !fetchSite || fetchSite === 'same-origin'
}

function isLoopback(req) {
  const address = req.socket.remoteAddress || ''
  return address === '::1' || address === '127.0.0.1' || address.startsWith('::ffff:127.')
}

async function getMtime() {
  try {
    const stat = await fs.stat(SOURCE_PATH)
    return stat.mtimeMs
  } catch {
    return 0
  }
}

async function writeBackup(text) {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await fs.writeFile(path.join(BACKUP_DIR, `cdk-list.source.${stamp}.json`), text, 'utf-8')

    const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort()
    for (const stale of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
      await fs.rm(path.join(BACKUP_DIR, stale), { force: true })
    }
  } catch (e) {
    // 备份失败不阻断保存
    console.warn('[cdk-admin] 备份失败:', e.message)
  }
}

/**
 * 仅在 `vite dev` 下启用的本地 CDK 数据读写接口。
 *
 *   GET  /__cdk-admin/source  -> { ok, data, mtime }
 *   POST /__cdk-admin/source  -> { data, mtime } -> { ok, mtime }
 *
 * 只允许读写固定的 public/cdk-list.source.json，不接受任何路径参数。
 * 写入前会做结构校验 + 原文备份，并使用「写临时文件再 rename」保证原子性。
 */
export default function cdkAdminPlugin() {
  const csrfToken = randomUUID()
  let writeQueue = Promise.resolve()

  function serializeWrite(task) {
    const result = writeQueue.then(task, task)
    writeQueue = result.catch(() => {})
    return result
  }

  return {
    name: 'nikke-cdk-admin-api',
    apply: 'serve',
    configureServer(server) {
      // public/ 下的文件变更会触发整页刷新，保存后刷新会打断正在编辑的界面。
      // 该文件在 dev 期间只被管理页通过接口读取，取消监听是安全的。
      server.watcher.unwatch(SOURCE_PATH)

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (!url.endsWith(API_PATH)) return next()

        try {
          if (!isLoopback(req)) {
            sendJSON(res, 403, { ok: false, error: '写入接口仅允许本机访问' })
            return
          }

          if (req.method === 'GET') {
            if (!isSafeRead(req)) {
              sendJSON(res, 403, { ok: false, error: '仅允许同源请求' })
              return
            }
            const text = await fs.readFile(SOURCE_PATH, 'utf-8')
            sendJSON(res, 200, {
              ok: true,
              data: JSON.parse(text),
              mtime: await getMtime(),
              file: path.relative(ROOT_DIR, SOURCE_PATH).replace(/\\/g, '/'),
              csrfToken,
            })
            return
          }

          if (req.method === 'POST' || req.method === 'PUT') {
            if (!isSameOrigin(req)) {
              sendJSON(res, 403, { ok: false, error: '仅允许同源请求' })
              return
            }
            if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
              sendJSON(res, 415, { ok: false, error: '请求体必须使用 application/json' })
              return
            }
            if (req.headers['x-cdk-admin-csrf'] !== csrfToken) {
              sendJSON(res, 403, { ok: false, error: 'CSRF 校验失败，请重新加载管理页' })
              return
            }

            const raw = await readBody(req)
            let payload
            try {
              payload = JSON.parse(raw)
            } catch (e) {
              sendJSON(res, 400, { ok: false, error: `请求体不是合法 JSON: ${e.message}` })
              return
            }

            const data = payload?.data
            if (!data || typeof data !== 'object' || !Array.isArray(data.cdks)) {
              sendJSON(res, 400, { ok: false, error: '数据结构非法：缺少 cdks 数组' })
              return
            }

            const { errors } = validateCdkSource(data)
            if (errors.length > 0) {
              sendJSON(res, 422, {
                ok: false,
                error: `数据校验失败，共 ${errors.length} 个错误`,
                errors,
              })
              return
            }

            if (!Number.isFinite(payload.mtime)) {
              sendJSON(res, 400, { ok: false, error: '缺少有效的源文件版本信息，请重新加载' })
              return
            }

            const result = await serializeWrite(async () => {
              const currentMtime = await getMtime()
              if (currentMtime !== payload.mtime) {
                return {
                  status: 409,
                  payload: {
                    ok: false,
                    error: '源文件已被其他程序修改，请重新加载后再保存',
                    mtime: currentMtime,
                  },
                }
              }

              const text = JSON.stringify(data, null, 2) + '\n'
              const previous = await fs.readFile(SOURCE_PATH, 'utf-8').catch(() => null)
              if (previous !== null) await writeBackup(previous)

              const tmpPath = `${SOURCE_PATH}.tmp-${process.pid}-${randomUUID()}`
              try {
                await fs.writeFile(tmpPath, text, 'utf-8')
                await fs.rename(tmpPath, SOURCE_PATH)
              } finally {
                await fs.rm(tmpPath, { force: true }).catch(() => {})
              }

              return {
                status: 200,
                payload: {
                  ok: true,
                  mtime: await getMtime(),
                  bytes: Buffer.byteLength(text),
                },
              }
            })
            sendJSON(res, result.status, result.payload)
            return
          }

          sendJSON(res, 405, { ok: false, error: `不支持的方法: ${req.method}` })
        } catch (e) {
          sendJSON(res, 500, { ok: false, error: e.message })
        }
      })
    },
  }
}
