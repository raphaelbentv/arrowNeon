/**
 * Envoie les newsletters dues (scheduledFor <= now AND status='scheduled') à tous les abonnés confirmés.
 *
 * Resend : envoi un-par-un en série avec rate-limiting modeste (10 req/s soft).
 * Pour un volume > 1000 abonnés, basculer sur Resend Batch API ou un service tiers (Brevo).
 *
 * GDPR :
 * - Filtre status=confirmed uniquement
 * - Chaque email inclut un lien de désinscription en 1 clic (signé HMAC)
 * - List-Unsubscribe header pour boîtes Gmail/Outlook
 */
import { Resend } from 'resend'
import { sanity, getActiveSubscribers } from './lib/sanity-admin'
import { wrapEmail, renderDigest, renderEditorial, portableTextToHtml } from './lib/email-template'
import { env } from './lib/env'
import { makeUnsubscribeToken } from './lib/tokens'

const resend = new Resend(env.resendKey)

interface NewsletterWithRefs {
  _id: string
  subject: string
  preheader?: string
  type: 'digest' | 'editorial'
  intro?: string
  body?: any[]
  featuredPosts?: Array<{ _id: string; title: string; slug: { current: string }; excerpt: string; publishedAt: string }>
  cta?: { label?: string; url?: string }
}

async function getDueNewsletters(): Promise<NewsletterWithRefs[]> {
  return sanity.fetch<NewsletterWithRefs[]>(
    `*[_type == "newsletter" && status == "scheduled" && scheduledFor <= now()] {
      _id, subject, preheader, type, intro, body, cta,
      "featuredPosts": featuredPosts[]-> { _id, title, slug, excerpt, publishedAt }
    }`
  )
}

async function sendOne(newsletter: NewsletterWithRefs, recipient: { _id: string; email: string; firstName?: string; unsubscribeToken: string }) {
  const unsubToken = recipient.unsubscribeToken || makeUnsubscribeToken(recipient._id)
  const unsubscribeUrl = `${env.siteUrl}/api/newsletter-unsubscribe?t=${unsubToken}`

  let inner: string
  if (newsletter.type === 'digest') {
    inner = renderDigest({
      intro: newsletter.intro ?? '',
      posts: (newsletter.featuredPosts ?? []) as any,
      ctaLabel: newsletter.cta?.label,
      ctaUrl: newsletter.cta?.url,
      siteUrl: env.siteUrl,
    })
  } else {
    inner = renderEditorial({
      bodyHtmlFromPortable: portableTextToHtml(newsletter.body ?? []),
      ctaLabel: newsletter.cta?.label,
      ctaUrl: newsletter.cta?.url,
    })
  }

  const html = wrapEmail({
    preheader: newsletter.preheader ?? '',
    bodyHtml: inner,
    unsubscribeUrl,
    recipientEmail: recipient.email,
  })

  await resend.emails.send({
    from: env.resendFrom,
    replyTo: env.resendReplyTo,
    to: recipient.email,
    subject: newsletter.subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}

async function processOne(newsletter: NewsletterWithRefs) {
  console.log(`📤  Envoi : "${newsletter.subject}" (type=${newsletter.type})`)

  // Statut → sending
  await sanity.patch(newsletter._id).set({ status: 'sending' }).commit()

  const subscribers = await getActiveSubscribers()
  console.log(`   ${subscribers.length} abonnés confirmés`)

  let delivered = 0
  let failed = 0
  const errors: string[] = []

  for (const sub of subscribers) {
    try {
      await sendOne(newsletter, sub)
      delivered += 1
      await sanity.patch(sub._id).set({ lastSentAt: new Date().toISOString() }).commit()
    } catch (err: any) {
      failed += 1
      errors.push(`${sub.email}: ${err?.message ?? err}`)
    }
    // Soft rate-limit Resend free tier (2 req/s) → on respire 200ms entre chaque envoi
    await new Promise(r => setTimeout(r, 200))
  }

  await sanity.patch(newsletter._id).set({
    status: failed === subscribers.length && subscribers.length > 0 ? 'failed' : 'sent',
    sentAt: new Date().toISOString(),
    stats: { recipients: subscribers.length, delivered, failed },
  }).commit()

  console.log(`   ✅  ${delivered} délivrés, ❌  ${failed} échecs`)
  if (errors.length > 0 && errors.length < 10) errors.forEach(e => console.log(`      - ${e}`))
}

async function run() {
  const due = await getDueNewsletters()
  if (due.length === 0) {
    console.log('💤  Aucune newsletter due, rien à faire.')
    return
  }
  console.log(`📬  ${due.length} newsletter(s) à envoyer.`)
  for (const n of due) await processOne(n)
}

run().catch(err => {
  console.error('💥  Erreur envoi newsletter :', err)
  process.exit(1)
})
