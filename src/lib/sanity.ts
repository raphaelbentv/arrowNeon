import { createClient } from '@sanity/client'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset   = import.meta.env.PUBLIC_SANITY_DATASET || 'production'
const configured = projectId && projectId !== 'your-project-id'

export const client = createClient({
  projectId: projectId || 'placeholder',
  dataset,
  useCdn: true,
  apiVersion: '2024-01-01',
})

export async function getBlogPosts(): Promise<any[]> {
  if (!configured) return []
  try {
    return await client.fetch(`*[_type == "post"] | order(publishedAt desc) {
      _id, title, slug, excerpt, publishedAt,
      "coverImage": coverImage.asset->url,
      "author": author->name, tags
    }`)
  } catch {
    return []
  }
}

export async function getBlogPost(slug: string): Promise<any | null> {
  if (!configured) return null
  try {
    return await client.fetch(
      `*[_type == "post" && slug.current == $slug][0] {
        _id, title, slug, body, publishedAt,
        "coverImage": coverImage.asset->url,
        "author": author->name, tags, excerpt
      }`,
      { slug }
    )
  } catch {
    return null
  }
}
