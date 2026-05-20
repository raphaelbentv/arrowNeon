/**
 * POST /api/newsletter-subscribe
 *
 * Inscription à la newsletter avec double opt-in.
 * Body : email, firstName?, source?, consentText.
 *
 * Flow :
 * 1. Validation email + consentement
 * 2. Crée (ou met à jour) un doc subscriber status=pending dans Sanity
 * 3. Envoie un email de confirmation via Resend
 * 4. L'utilisateur clique sur le lien → /api/newsletter-confirm?t=...
 */
import type { APIRoute } from 'astro'
import { createClient } from '@sanity/client'
import { Resend } from 'resend'
import { createHmac, randomBytes } from 'node:crypto'

export const prerender = false

const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset:   import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2025-01-01',
  token:     import.meta.env.SANITY_API_TOKEN,
  useCdn:    false,
})

const resend = new Resend(import.meta.env.RESEND_API_KEY)

const TOKEN_SECRET = import.meta.env.NEWSLETTER_TOKEN_SECRET
const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? 'https://arr0w.app').replace(/\/$/, '')
const RESEND_FROM = import.meta.env.RESEND_FROM ?? 'Arrow <hey@arr0w.app>'

function sign(payload: string) {
  return createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
}
function signToken(sid: string, purpose: 'confirm' | 'unsubscribe') {
  const body = Buffer.from(JSON.stringify({ sid, p: purpose, iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  return `${body}.${sign(body)}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const isJson = request.headers.get('content-type')?.includes('application/json')
  let email = '', firstName = '', source = 'unknown', consentText = ''
  try {
    if (isJson) {
      const body = await request.json()
      email = String(body.email ?? '').trim().toLowerCase()
      firstName = String(body.firstName ?? '').trim()
      source = String(body.source ?? 'unknown')
      consentText = String(body.consentText ?? '')
    } else {
      const form = await request.formData()
      email = String(form.get('email') ?? '').trim().toLowerCase()
      firstName = String(form.get('firstName') ?? '').trim()
      source = String(form.get('source') ?? 'unknown')
      consentText = String(form.get('consentText') ?? '')
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid-payload' }), { status: 400 })
  }

  if (!email || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid-email' }), { status: 400 })
  }
  if (!consentText) {
    return new Response(JSON.stringify({ ok: false, error: 'consent-required' }), { status: 400 })
  }

  // Cherche un abonné existant
  const existing = await sanity.fetch<{ _id: string; status: string } | null>(
    `*[_type == "subscriber" && email == $email][0] { _id, status }`,
    { email }
  )

  let subscriberId: string
  if (existing) {
    if (existing.status === 'confirmed') {
      // Déjà inscrit → on renvoie OK sans envoyer un nouveau mail (anti-spam)
      return new Response(JSON.stringify({ ok: true, alreadySubscribed: true }), { status: 200 })
    }
    subscriberId = existing._id
    await sanity.patch(subscriberId).set({
      status: 'pending',
      firstName: firstName || undefined,
      source,
      subscribedAt: new Date().toISOString(),
    }).commit()
  } else {
    // Token de désinscription stable, généré une fois et stocké
    const tempId = `subscriber.${randomBytes(8).toString('hex')}`
    const unsubToken = signToken(tempId, 'unsubscribe')
    const created = await sanity.create({
      _type: 'subscriber',
      _id: tempId,
      email,
      firstName: firstName || undefined,
      status: 'pending',
      source,
      subscribedAt: new Date().toISOString(),
      unsubscribeToken: unsubToken,
      consent: {
        ip: clientAddress ?? '',
        userAgent: request.headers.get('user-agent') ?? '',
        consentText,
      },
    })
    subscriberId = created._id
  }

  // Envoi mail de confirmation
  const confirmToken = signToken(subscriberId, 'confirm')
  const confirmUrl = `${SITE_URL}/api/newsletter-confirm?t=${confirmToken}`

  const greeting = firstName ? `Bonjour ${escape(firstName)},` : `Bonjour,`
  const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;color:#1a1a2e;line-height:1.6;background:#f5f7fb;padding:32px;">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;">
<p style="color:#3d9bff;font-weight:800;letter-spacing:0.15em;margin:0 0 24px;">ARR0W</p>
<p>${greeting}</p>
<p>Merci pour votre inscription à la newsletter Arrow.</p>
<p>Pour finaliser, confirmez votre adresse en un clic :</p>
<p style="margin:24px 0;"><a href="${escape(confirmUrl)}" style="display:inline-block;background:#3d9bff;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Confirmer mon inscription</a></p>
<p style="font-size:13px;color:#5b6b82;">Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>
<p style="font-size:13px;color:#5b6b82;">Lien direct : <a href="${escape(confirmUrl)}" style="color:#3d9bff;word-break:break-all;">${escape(confirmUrl)}</a></p>
</div></body></html>`

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: 'Confirmez votre inscription à la newsletter Arrow',
      html,
    })
  } catch (err) {
    // Si Resend échoue, on garde le doc (sera renvoyé manuellement) mais on signale
    return new Response(JSON.stringify({ ok: false, error: 'email-send-failed' }), { status: 502 })
  }

  return new Response(JSON.stringify({ ok: true, requiresConfirmation: true }), { status: 200 })
}
