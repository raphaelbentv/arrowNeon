/**
 * Client Sanity côté scripts (Node) avec token d'écriture.
 * À NE PAS exposer côté front — c'est un token de mutation complet.
 */
import { createClient } from '@sanity/client'
import { env } from './env'

export const sanity = createClient({
  projectId: env.sanityProjectId,
  dataset:   env.sanityDataset,
  apiVersion: '2025-01-01',
  token:     env.sanityToken,
  useCdn:    false,
})

export interface TopicBankDoc {
  _id: string
  title: string
  pillar: string
  keywords?: string[]
  persona?: string
  angle?: string
  sources?: string[]
  priority: number
  status: 'idea' | 'ready' | 'used' | 'archived'
  lastUsedAt?: string
}

export interface PostDoc {
  _id: string
  title: string
  slug: { current: string }
  excerpt: string
  publishedAt: string
  tags?: string[]
}

export interface SubscriberDoc {
  _id: string
  email: string
  firstName?: string
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced' | 'complained'
  unsubscribeToken: string
}

export interface NewsletterDoc {
  _id: string
  subject: string
  preheader?: string
  type: 'digest' | 'editorial'
  intro?: string
  body?: any[]
  featuredPosts?: Array<{ _ref: string }>
  cta?: { label?: string; url?: string }
  scheduledFor: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
}

/** Pioche le prochain sujet à générer : ready, priority asc, lastUsedAt asc. */
export async function pickNextTopic(): Promise<TopicBankDoc | null> {
  return sanity.fetch<TopicBankDoc | null>(
    `*[_type == "topicBank" && status == "ready"] | order(priority asc, lastUsedAt asc)[0]`
  )
}

/** Liste des N derniers posts publiés. */
export async function getRecentPublishedPosts(limit = 4): Promise<PostDoc[]> {
  return sanity.fetch<PostDoc[]>(
    `*[_type == "post" && defined(publishedAt) && publishedAt <= now()]
       | order(publishedAt desc)[0...$limit]
       { _id, title, slug, excerpt, publishedAt, tags }`,
    { limit }
  )
}

/** Liste des abonnés actifs (confirmés et non désinscrits). */
export async function getActiveSubscribers(): Promise<SubscriberDoc[]> {
  return sanity.fetch<SubscriberDoc[]>(
    `*[_type == "subscriber" && status == "confirmed"]
       { _id, email, firstName, status, unsubscribeToken }`
  )
}
