/**
 * Centralise le chargement et la validation des variables d'environnement
 * pour tous les scripts du pipeline (génération, newsletter, etc).
 */
import { config } from 'node:process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Chargement manuel de .env (les scripts ne passent pas par Astro)
function loadDotenv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}
loadDotenv()

function required(key: string): string {
  const v = process.env[key]
  if (!v || v.startsWith('your-') || v.startsWith('sk-XXX')) {
    throw new Error(`Variable d'environnement manquante ou placeholder : ${key}`)
  }
  return v
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const env = {
  // Sanity
  get sanityProjectId() { return required('PUBLIC_SANITY_PROJECT_ID') },
  get sanityDataset()   { return required('PUBLIC_SANITY_DATASET') },
  get sanityToken()     { return required('SANITY_API_TOKEN') },

  // Anthropic
  get anthropicKey()    { return required('ANTHROPIC_API_KEY') },
  get anthropicModel()  { return optional('ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929') },

  // Resend
  get resendKey()       { return required('RESEND_API_KEY') },
  get resendFrom()      { return optional('RESEND_FROM', 'Arrow <hey@arr0w.app>') },
  get resendReplyTo()   { return optional('RESEND_REPLY_TO', 'hey@arr0w.app') },

  // Site
  get siteUrl()         { return optional('PUBLIC_SITE_URL', 'https://arr0w.app').replace(/\/$/, '') },

  // Sécurité (HMAC pour les tokens de désinscription / confirmation)
  get tokenSecret()     { return required('NEWSLETTER_TOKEN_SECRET') },

  // Alerting
  get opsWebhook()      { return optional('OPERATIONS_ALERT_WEBHOOK_URL') },
}
