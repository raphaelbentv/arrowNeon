/**
 * GET ou POST /api/newsletter-unsubscribe?t=<token>
 *
 * Désinscription en 1 clic. Le token est stable (généré à l'inscription, stocké sur le doc).
 * Conforme RFC 8058 (List-Unsubscribe-Post one-click).
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

function verify(token: string): { sid: string; p: string } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadStr, sig] = parts
  const expected = createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('base64url')
  if (expected !== sig) return null
  try {
    return JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'))
  } catch { return null }
}

async function processUnsubscribe(token: string | null) {
  if (!token) return { ok: false, code: 400, msg: 'Lien invalide.' }
  const decoded = verify(token)
  if (!decoded || decoded.p !== 'unsubscribe') {
    return { ok: false, code: 400, msg: 'Lien invalide.' }
  }
  await sanity.patch(decoded.sid).set({
    status: 'unsubscribed',
    unsubscribedAt: new Date().toISOString(),
  }).commit()
  return { ok: true }
}

export const GET: APIRoute = async ({ url }) => {
  const r = await processUnsubscribe(url.searchParams.get('t'))
  if (!r.ok) return new Response(r.msg, { status: r.code })
  return new Response(
    `<!doctype html><html><body style="font-family:-apple-system,sans-serif;padding:48px;text-align:center;color:#1a1a2e;">
     <p style="color:#3d9bff;font-weight:800;letter-spacing:0.15em;">ARR0W</p>
     <h1>Désinscription confirmée</h1>
     <p>Vous ne recevrez plus la newsletter Arrow. À bientôt peut-être !</p>
     <p><a href="/" style="color:#3d9bff;">Retour à arr0w.app</a></p>
     </body></html>`,
    { status: 200, headers: { 'content-type': 'text/html' } }
  )
}

// RFC 8058 — Gmail/Outlook envoient un POST sans interaction utilisateur
export const POST: APIRoute = async ({ url }) => {
  const r = await processUnsubscribe(url.searchParams.get('t'))
  return new Response(null, { status: r.ok ? 200 : 400 })
}
