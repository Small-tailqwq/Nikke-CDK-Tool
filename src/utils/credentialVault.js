import CryptoJS from 'crypto-js'

const CREDENTIAL_VERSION = 2
const LEGACY_CREDENTIAL_SECRET = 'nikke-cdk-login-credential-v1'
const CREDENTIAL_SECRET_KEY = 'nikke_cdk_login_credential_secret_v2'

const randomSecret = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const getCredentialSecret = () => {
  try {
    let secret = localStorage.getItem(CREDENTIAL_SECRET_KEY)
    if (!secret) {
      secret = randomSecret()
      localStorage.setItem(CREDENTIAL_SECRET_KEY, secret)
    }
    return secret
  } catch {
    return LEGACY_CREDENTIAL_SECRET
  }
}

export function maskCredentialEmail(email) {
  if (!email || typeof email !== 'string') return ''
  const [name, domain] = email.split('@')
  if (!domain) return email.length > 4 ? `${email.slice(0, 2)}***${email.slice(-2)}` : '***'
  const visibleName = name.length <= 2 ? `${name[0] || '*'}*` : `${name.slice(0, 2)}***`
  return `${visibleName}@${domain}`
}

export function createLoginCredentialVault(email, password) {
  if (!email || !password) return null

  const payload = {
    version: CREDENTIAL_VERSION,
    email: String(email).trim(),
    password: String(password),
    savedAt: new Date().toISOString(),
  }

  return {
    version: CREDENTIAL_VERSION,
    emailHint: maskCredentialEmail(payload.email),
    savedAt: payload.savedAt,
    protection: 'local-random-key-v2',
    cipherText: CryptoJS.AES.encrypt(JSON.stringify(payload), getCredentialSecret()).toString(),
  }
}

export function readLoginCredentialVault(vault) {
  if (!vault?.cipherText) return null

  try {
    const secrets = [
      vault.protection === 'local-random-key-v2' ? getCredentialSecret() : null,
      getCredentialSecret(),
      LEGACY_CREDENTIAL_SECRET,
    ].filter(Boolean)

    let parsed = null
    for (const secret of secrets) {
      try {
        const bytes = CryptoJS.AES.decrypt(vault.cipherText, secret)
        const decrypted = bytes.toString(CryptoJS.enc.Utf8)
        if (decrypted) {
          parsed = JSON.parse(decrypted)
          break
        }
      } catch {
        // 继续尝试兼容旧凭证
      }
    }

    if (!parsed?.email || !parsed?.password) return null

    return {
      email: parsed.email,
      password: parsed.password,
      savedAt: parsed.savedAt || vault.savedAt || '',
      source: 'vault',
    }
  } catch (error) {
    console.warn('读取登录凭证失败:', error)
    return null
  }
}

export function getLoginCredential(user) {
  const vaulted = readLoginCredentialVault(user?.loginCredentialVault)
  if (vaulted) return vaulted

  if (user?.loginEmail && user?.loginPassword) {
    return {
      email: user.loginEmail,
      password: user.loginPassword,
      savedAt: user.loginCredentialSavedAt || '',
      source: 'legacy',
    }
  }

  return null
}

export function hasLoginCredential(user) {
  return Boolean(getLoginCredential(user))
}

export function getLoginCredentialHint(user) {
  if (user?.loginCredentialVault?.emailHint) return user.loginCredentialVault.emailHint
  if (user?.loginEmail) return maskCredentialEmail(user.loginEmail)
  return ''
}
