import type { APIRoute } from 'astro'
import { reportOperationalError } from '../../lib/ops'

export const prerender = false

const requiredFields = ['Nom', 'Email', 'Etablissement', 'Fonction', 'Besoin', 'ConsentementRGPD'] as const
const defaultRecipient = 'hey@arr0w.app'

function normalize(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function safeRedirect(value: FormDataEntryValue | null, requestUrl: string, fallback = '/merci-beta') {
  const origin = new URL(requestUrl).origin
  const rawValue = normalize(value) || fallback

  try {
    const url = new URL(rawValue, origin)
    if (url.origin !== origin && url.hostname !== 'arr0w.app') return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

function redirect(location: string, status = 303) {
  return new Response(null, {
    status,
    headers: { Location: location },
  })
}

async function forwardDemoRequest(payload: Record<string, string>) {
  const webhookUrl = import.meta.env.DEMO_REQUEST_WEBHOOK_URL
  const recipient = import.meta.env.DEMO_REQUEST_EMAIL || defaultRecipient
  const url = webhookUrl || `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const responseText = await response.text().catch(() => '')
    throw new Error(`Demo request delivery failed: ${response.status} ${responseText.slice(0, 300)}`)
  }
}

async function forwardNewsletterSignup(payload: Record<string, string>) {
  const newsletterWebhookUrl = import.meta.env.NEWSLETTER_WEBHOOK_URL
  if (!newsletterWebhookUrl || payload.Newsletter !== 'oui') return

  const response = await fetch(newsletterWebhookUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.Email,
      name: payload.Nom,
      organization: payload.Etablissement,
      role: payload.Fonction,
      source: payload.Source,
      rgpdConsent: payload.ConsentementRGPD === 'oui',
      newsletterConsent: true,
      consentedAt: payload.ConsentementDate,
    }),
  })

  if (!response.ok) {
    const responseText = await response.text().catch(() => '')
    throw new Error(`Newsletter signup failed: ${response.status} ${responseText.slice(0, 300)}`)
  }
}

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData()
  const nextUrl = safeRedirect(formData.get('_next'), request.url)
  const sourceUrl = normalize(formData.get('Source')) || new URL(request.url).pathname
  const newsletterConsent = formData.getAll('Newsletter').some((value) => normalize(value) === 'oui')
  const rgpdConsent = formData.getAll('ConsentementRGPD').some((value) => normalize(value) === 'oui')

  if (normalize(formData.get('_honey'))) {
    return redirect(nextUrl)
  }

  const payload: Record<string, string> = {
    _subject: normalize(formData.get('_subject')) || 'Nouvelle demande de démo Arrow',
    _template: normalize(formData.get('_template')) || 'table',
    Source: sourceUrl,
    Newsletter: newsletterConsent ? 'oui' : 'non',
    ConsentementRGPD: rgpdConsent ? 'oui' : 'non',
    ConsentementDate: new Date().toISOString(),
  }

  const missingFields = requiredFields.filter((field) => {
    const value = field === 'ConsentementRGPD'
        ? payload.ConsentementRGPD
        : normalize(formData.get(field))
    payload[field] = value
    return !value
  })

  if (missingFields.length > 0) {
    return redirect(`/contact?form=missing&fields=${encodeURIComponent(missingFields.join(','))}`, 303)
  }

  if (!rgpdConsent) {
    return redirect('/contact?form=rgpd', 303)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.Email)) {
    return redirect('/contact?form=email', 303)
  }

  try {
    await forwardDemoRequest(payload)
    try {
      await forwardNewsletterSignup(payload)
    } catch (newsletterError) {
      await reportOperationalError('newsletter', 'Impossible d’inscrire un contact à la newsletter', newsletterError, {
        source: sourceUrl,
        emailDomain: payload.Email.split('@')[1] ?? null,
      })
    }
    return redirect(nextUrl)
  } catch (error) {
    await reportOperationalError('demo-request', 'Impossible de transmettre une demande de démo', error, {
      source: sourceUrl,
      emailDomain: payload.Email.split('@')[1] ?? null,
      hasWebhook: Boolean(import.meta.env.DEMO_REQUEST_WEBHOOK_URL),
    })

    return redirect('/contact?form=error', 303)
  }
}
