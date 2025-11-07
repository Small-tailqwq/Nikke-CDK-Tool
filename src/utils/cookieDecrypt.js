/**
 * Cookie 解密工具
 * 用于解密 Worker 在登录响应中注入的加密 Cookie 数据
 * 
 * 安全特性：
 * - 三重密钥派生：SID + Token + Salt
 * - 使用 PBKDF2 生成强密钥（100000次迭代）
 * - AES-GCM 256位加密
 * - 每次加密使用不同的随机盐和IV
 */

/**
 * 使用 SID + Token + Salt 派生强加密密钥
 * @param {string} sid - 会话ID
 * @param {string} token - 认证令牌
 * @param {Uint8Array} salt - 随机盐（16字节）
 * @returns {Promise<CryptoKey>} 派生的AES-GCM密钥
 */
async function deriveKey(sid, token, salt) {
  const encoder = new TextEncoder()

  // 组合 SID 和 Token 作为密码材料
  const password = encoder.encode(`${sid}:${token}`)

  // 导入密码材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    password,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  // 使用 PBKDF2 派生密钥
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,  // 10万次迭代，增强安全性
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return key
}

/**
 * 使用三重密钥（SID + Token + Salt）解密 Cookie 数据
 * @param {string} encryptedBase64 - Base64 编码的加密数据包
 * @param {string} sid - 会话 ID
 * @param {string} token - 认证令牌
 * @returns {Promise<string>} 解密后的 Cookie 字符串
 */
export async function decryptCookieData(encryptedBase64, sid, token) {
  try {
    // Base64 解码
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

    // 数据结构: [Salt(16字节)] + [IV(12字节)] + [加密数据]
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encrypted = combined.slice(28)

    console.log('[Cookie解密] 开始解密:', {
      saltLength: salt.length,
      ivLength: iv.length,
      encryptedLength: encrypted.length
    })

    // 使用 SID + Token + Salt 派生密钥
    const key = await deriveKey(sid, token, salt)

    // 解密数据
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    // 转换为字符串
    const decoder = new TextDecoder()
    const result = decoder.decode(decrypted)

    console.log('[Cookie解密] 解密成功，Cookie长度:', result.length)
    return result

  } catch (error) {
    console.error('[Cookie解密] 失败:', error)
    throw new Error('Cookie 解密失败: ' + error.message)
  }
}

/**
 * 兼容旧版：使用单一密钥（SID）解密
 * @param {string} encryptedBase64 - Base64 编码的加密数据
 * @param {string} sid - 会话 ID
 * @returns {Promise<string>} 解密后的 Cookie 字符串
 * @deprecated 仅用于向后兼容旧版本加密数据
 */
export async function decryptCookieDataLegacy(encryptedBase64, sid) {
  try {
    // Base64 解码
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

    // 旧版结构: [IV(12字节)] + [加密数据]
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    // 使用 SID 派生密钥（旧方法）
    const encoder = new TextEncoder()
    const keyData = encoder.encode(sid.padEnd(32, '0').substring(0, 32))

    // 导入密钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // 解密数据
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    // 转换为字符串
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('[Cookie解密-旧版] 失败:', error)
    throw new Error('Cookie 解密失败（旧版格式）')
  }
}

/**
 * 从响应数据中提取并解密 Cookie（支持新旧版本）
 * @param {object} responseData - API 响应数据
 * @param {string} sid - 会话 ID
 * @param {string} token - 认证令牌（新版必需）
 * @returns {Promise<string|null>} 解密后的 Cookie 字符串，如果没有则返回 null
 */
export async function extractEncryptedCookies(responseData, sid, token = null) {
  if (!responseData || !responseData._encrypted_cookie) {
    return null
  }

  try {
    let decrypted

    // 尝试新版三重加密解密（需要token）
    if (token) {
      try {
        decrypted = await decryptCookieData(responseData._encrypted_cookie, sid, token)
        console.log('[Cookie提取] 使用三重加密解密成功')
      } catch (error) {
        console.warn('[Cookie提取] 三重加密解密失败，尝试旧版格式:', error.message)
        // 回退到旧版单密钥解密
        decrypted = await decryptCookieDataLegacy(responseData._encrypted_cookie, sid)
        console.log('[Cookie提取] 使用旧版格式解密成功')
      }
    } else {
      // 没有token，只能使用旧版解密
      decrypted = await decryptCookieDataLegacy(responseData._encrypted_cookie, sid)
      console.log('[Cookie提取] 使用旧版格式解密（无token）')
    }

    console.log('[Cookie提取] 成功解密，Cookie长度:', decrypted.length)
    return decrypted

  } catch (error) {
    console.error('[Cookie提取] 所有解密方法均失败:', error)
    return null
  }
}
