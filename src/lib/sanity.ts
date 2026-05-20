import { createClient } from '@sanity/client'
import type { PortableTextBlock } from '@portabletext/types'
import { reportOperationalError, reportOperationalWarning } from './ops'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset   = import.meta.env.PUBLIC_SANITY_DATASET || 'production'
const token     = import.meta.env.SANITY_API_TOKEN
const configured = projectId && projectId !== 'your-project-id'
const failBuildOnError = import.meta.env.SANITY_FAIL_BUILD_ON_ERROR === 'true'
let warnedMissingConfig = false

export const client = createClient({
  projectId: projectId || 'placeholder',
  dataset,
  useCdn: false,
  apiVersion: '2025-01-01',
  token,
  perspective: 'published',
})

export interface BlogPostPreview {
  _id: string
  title: string
  slug: { current: string }
  excerpt: string
  publishedAt: string
  coverImage: string | null
  author: string | null
  tags: string[] | null
}

export interface BlogPost extends BlogPostPreview {
  body: PortableTextBlock[]
}

function hasSanityConfig(scope: string) {
  if (configured) return true

  if (!warnedMissingConfig) {
    warnedMissingConfig = true
    reportOperationalWarning('sanity', 'Configuration Sanity absente ou placeholder', {
      scope,
      hasProjectId: Boolean(projectId),
      dataset,
    })
  }

  return false
}

async function handleSanityError(scope: string, error: unknown, fallbackMessage: string) {
  await reportOperationalError('sanity', fallbackMessage, error, {
    scope,
    dataset,
    hasProjectId: Boolean(projectId),
    failBuildOnError,
  })

  if (failBuildOnError) {
    throw error
  }
}

export async function getBlogPosts(): Promise<BlogPostPreview[]> {
  if (!hasSanityConfig('getBlogPosts')) return []
  try {
    return await client.fetch(`*[
      _type == "post" &&
      defined(slug.current) &&
      defined(excerpt) &&
      defined(publishedAt) &&
      defined(body)
    ] | order(publishedAt desc) {
      _id, title, slug, excerpt, publishedAt,
      "coverImage": coverImage.asset->url,
      "author": author->name, tags
    }`)
  } catch (error) {
    await handleSanityError('getBlogPosts', error, 'Impossible de charger les articles Sanity')
    return []
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (!hasSanityConfig('getBlogPost')) return null
  try {
    return await client.fetch(
      `*[
        _type == "post" &&
        slug.current == $slug &&
        defined(excerpt) &&
        defined(publishedAt) &&
        defined(body)
      ][0] {
        _id, title, slug, body, publishedAt,
        "coverImage": coverImage.asset->url,
        "author": author->name, tags, excerpt
      }`,
      { slug }
    )
  } catch (error) {
    await handleSanityError('getBlogPost', error, 'Impossible de charger un article Sanity')
    return null
  }
}
