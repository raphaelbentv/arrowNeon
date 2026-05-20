/**
 * Tokens HMAC pour les flux subscriber :
 * - confirmation double opt-in
 * - désinscription en 1 clic
 *
 * Format : base64url(payload).base64url(hmac).
 * Le secret est dans NEWSLETTER_TOKEN_SECRET (.env).
 */
import { createHmac, randomBytes } from 'node:crypto'
import { env } from './env'

const enc = (buf: Buffer) => buf.toString('base64url')
const dec = (s: string) => Buffer.from(s, 'base64url')

function hmac(payload: string): string {
  return enc(createHmac('sha256', env.tokenSecret).update(payload).digest())
}

interface TokenPayload {
  /** Sanity document id de l'abonné */
  sid: string
  /** purpose : 'confirm' ou 'unsubscribe' */
  p: 'confirm' | 'unsubscribe'
  /** issued at (timestamp en secondes) */
  iat: number
}

export function signToken(payload: Omit<TokenPayload, 'iat'>): string {
  const body: TokenPayload = { ...payload, iat: Math.floor(Date.now() / 1000) }
  const payloadStr = enc(Buffer.from(JSON.stringify(body)))
  const sig = hmac(payloadStr)
  return `${payloadStr}.${sig}`
}

/**
 * Vérifie et décode un token. Renvoie null si invalide ou expiré.
 * Confirm : expire après 7 jours. Unsubscribe : ne périme jamais.
 */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadStr, sig] = parts
  if (hmac(payloadStr) !== sig) return null
  try {
    const decoded = JSON.parse(dec(payloadStr).toString('utf-8')) as TokenPayload
    if (decoded.p === 'confirm') {
      const ageDays = (Date.now() / 1000 - decoded.iat) / 86400
      if (ageDays > 7) return null
    }
    return decoded
  } catch {
    return null
  }
}

/** Génère un token de désinscription stable (stocké sur le doc subscriber). */
export function makeUnsubscribeToken(subscriberId: string): string {
  return signToken({ sid: subscriberId, p: 'unsubscribe' })
}

export function makeConfirmToken(subscriberId: string): string {
  return signToken({ sid: subscriberId, p: 'confirm' })
}

/** Slugifie un titre français en slug propre. */
export function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // retire les accents combinants
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export function randomId(prefix = ''): string {
  return `${prefix}${randomBytes(8).toString('hex')}`
}
