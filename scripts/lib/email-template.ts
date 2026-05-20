/**
 * Templates HTML email Arrow (minimaliste, conforme RGPD).
 * - Couleurs Arrow respectées (#3d9bff primary, dark background optionnel)
 * - Lien désinscription OBLIGATOIRE en pied
 * - Responsive simple (tableaux)
 */
import type { PostDoc, NewsletterDoc } from './sanity-admin'

const BRAND_BLUE = '#3d9bff'
const TEXT = '#1a1a2e'
const MUTED = '#5b6b82'

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface EmailLayoutParams {
  preheader: string
  bodyHtml: string
  unsubscribeUrl: string
  recipientEmail: string
}

export function wrapEmail({ preheader, bodyHtml, unsubscribeUrl, recipientEmail }: EmailLayoutParams) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arrow</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${TEXT};line-height:1.6;">
<span style="display:none;font-size:1px;color:transparent;max-height:0;overflow:hidden;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.04);">
      <tr><td style="padding:32px 40px 8px 40px;">
        <a href="https://arr0w.app" style="text-decoration:none;color:${BRAND_BLUE};font-weight:800;letter-spacing:0.15em;font-size:14px;">ARR0W</a>
      </td></tr>
      <tr><td style="padding:8px 40px 32px 40px;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:24px 40px;background:#fafbfd;border-top:1px solid #eef1f6;font-size:12px;color:${MUTED};">
        Vous recevez cet email parce que vous vous êtes abonné·e à la newsletter Arrow (${escape(recipientEmail)}).<br>
        <a href="${escape(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Se désabonner en 1 clic</a> ·
        <a href="https://arr0w.app" style="color:${MUTED};text-decoration:underline;">arr0w.app</a>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:${MUTED};">Arrow — Suivi étudiant centralisé pour écoles supérieures privées.</p>
  </td></tr>
</table>
</body></html>`
}

export function renderDigest(params: {
  intro: string
  posts: PostDoc[]
  ctaLabel?: string
  ctaUrl?: string
  siteUrl: string
}): string {
  const introHtml = params.intro
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 16px;">${escape(p)}</p>`)
    .join('')

  const postsHtml = params.posts.map(p => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;">
      <tr><td style="border-left:3px solid ${BRAND_BLUE};padding:4px 0 4px 16px;">
        <a href="${params.siteUrl}/blog/${escape(p.slug.current)}" style="color:${TEXT};text-decoration:none;font-weight:700;font-size:18px;line-height:1.3;display:block;margin-bottom:6px;">
          ${escape(p.title)}
        </a>
        <p style="margin:0 0 10px;color:${MUTED};font-size:14px;">${escape(p.excerpt)}</p>
        <a href="${params.siteUrl}/blog/${escape(p.slug.current)}" style="color:${BRAND_BLUE};text-decoration:none;font-size:14px;font-weight:600;">Lire l'article →</a>
      </td></tr>
    </table>
  `).join('')

  const ctaHtml = params.ctaLabel && params.ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 0;">
         <tr><td style="background:${BRAND_BLUE};border-radius:8px;">
           <a href="${escape(params.ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">${escape(params.ctaLabel)}</a>
         </td></tr>
       </table>`
    : ''

  return introHtml + postsHtml + ctaHtml
}

export function renderEditorial(params: {
  bodyHtmlFromPortable: string
  ctaLabel?: string
  ctaUrl?: string
}): string {
  const ctaHtml = params.ctaLabel && params.ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 0;">
         <tr><td style="background:${BRAND_BLUE};border-radius:8px;">
           <a href="${escape(params.ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">${escape(params.ctaLabel)}</a>
         </td></tr>
       </table>`
    : ''
  return params.bodyHtmlFromPortable + ctaHtml
}

/** Convertit du Portable Text Sanity → HTML email simple. */
export function portableTextToHtml(blocks: any[]): string {
  if (!Array.isArray(blocks)) return ''
  return blocks.map(b => {
    if (b._type !== 'block') return ''
    const text = (b.children ?? [])
      .map((c: any) => {
        let t = escape(c.text ?? '')
        const marks = c.marks ?? []
        for (const m of marks) {
          const def = (b.markDefs ?? []).find((d: any) => d._key === m)
          if (def?._type === 'link') {
            t = `<a href="${escape(def.href)}" style="color:${BRAND_BLUE};">${t}</a>`
          } else if (m === 'strong') t = `<strong>${t}</strong>`
          else if (m === 'em') t = `<em>${t}</em>`
          else if (m === 'code') t = `<code style="background:#f0f3f8;padding:2px 4px;border-radius:3px;font-size:13px;">${t}</code>`
        }
        return t
      })
      .join('')
    if (b.style === 'h2') return `<h2 style="margin:32px 0 12px;font-size:22px;line-height:1.3;color:${TEXT};">${text}</h2>`
    if (b.style === 'h3') return `<h3 style="margin:24px 0 8px;font-size:18px;line-height:1.3;color:${TEXT};">${text}</h3>`
    if (b.listItem === 'bullet') return `<p style="margin:6px 0 6px 20px;">• ${text}</p>`
    if (b.listItem === 'number') return `<p style="margin:6px 0 6px 20px;">— ${text}</p>`
    return `<p style="margin:0 0 14px;">${text}</p>`
  }).join('')
}

/** Email de confirmation double opt-in. */
export function renderDoubleOptIn(params: {
  confirmUrl: string
  firstName?: string
  recipientEmail: string
}) {
  const greeting = params.firstName ? `Bonjour ${escape(params.firstName)},` : `Bonjour,`
  const body = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 16px;">Merci pour votre inscription à la newsletter Arrow.</p>
    <p style="margin:0 0 24px;">Pour finaliser, confirmez votre adresse en un clic :</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr><td style="background:${BRAND_BLUE};border-radius:8px;">
        <a href="${escape(params.confirmUrl)}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Confirmer mon inscription</a>
      </td></tr>
    </table>
    <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message.</p>
    <p style="margin:0;font-size:13px;color:${MUTED};">Lien direct : <a href="${escape(params.confirmUrl)}" style="color:${BRAND_BLUE};word-break:break-all;">${escape(params.confirmUrl)}</a></p>
  `
  return wrapEmail({
    preheader: 'Confirmez votre inscription à la newsletter Arrow.',
    bodyHtml: body,
    unsubscribeUrl: 'https://arr0w.app', // l'opt-in n'a pas encore de token unsub, on renvoie vers le site
    recipientEmail: params.recipientEmail,
  })
}
