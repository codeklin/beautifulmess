export const ADMIN_SESSION_COOKIE = 'beautifulmess_admin_session'
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

async function getSigningKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createAdminSession(password: string, now = Date.now()): Promise<string> {
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_SECONDS
  const payload = `beautifulmess-admin:${expiresAt}`
  const signature = await crypto.subtle.sign(
    'HMAC',
    await getSigningKey(password),
    new TextEncoder().encode(payload),
  )
  return `${expiresAt}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function isValidAdminSession(
  token: string | undefined,
  password: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false

  const [expiresAtText, signatureText, ...extra] = token.split('.')
  const expiresAt = Number(expiresAtText)
  const currentTime = Math.floor(now / 1000)
  if (
    extra.length > 0 ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= currentTime ||
    expiresAt > currentTime + ADMIN_SESSION_SECONDS + 60 ||
    !signatureText
  ) {
    return false
  }

  try {
    const signature = base64UrlDecode(signatureText)
    if (signature.length !== 32) return false
    return await crypto.subtle.verify(
      'HMAC',
      await getSigningKey(password),
      signature,
      new TextEncoder().encode(`beautifulmess-admin:${expiresAt}`),
    )
  } catch {
    return false
  }
}
