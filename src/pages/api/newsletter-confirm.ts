/**
 * GET /api/newsletter-confirm?t=<token>
 *
 * Active l'abonnement après vérification du token signé HMAC.
 * Redirige ensuite vers /newsletter/confirmation pour un retour visuel.
 */
import type { APIRoute } from 'astro'
import { createClient } from '@sanity/client'
import { createHmac } from 'node:crypto'

export const prerender = false

const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset:   import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2025-01-01',
  token:     import.meta.env.SANITY_API_TOKEN,
  useCdn:    false,
})

const TOKEN_SECRET = import.meta.env.NEWSLETTER_TOKEN_SECRET

function verify(token: string): { sid: string; p: string; iat: number } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadStr, sig] = parts
  const expected = createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('base64url')
  if (expected !== sig) return null
  try {
    const decoded = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'))
    if (decoded.p === 'confirm' && (Date.now() / 1000 - decoded.iat) > 7 * 86400) return null
    return decoded
  } catch { return null }
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('t')
  if (!token) return new Response('Lien invalide.', { status: 400 })

  const decoded = verify(token)
  if (!decoded || decoded.p !== 'confirm') {
    return new Response(
      `<!doctype html><html><body style="font-family:-apple-system,sans-serif;padding:48px;text-align:center;">
       <h1>Lien invalide ou expiré</h1>
       <p>Réinscrivez-vous depuis <a href="/" style="color:#3d9bff;">arr0w.app</a>.</p>
       </body></html>`,
      { status: 400, headers: { 'content-type': 'text/html' } }
    )
  }

  await sanity.patch(decoded.sid).set({
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
  }).commit()

  return new Response(null, {
    status: 303,
    headers: { Location: '/newsletter/confirmation' },
  })
}
