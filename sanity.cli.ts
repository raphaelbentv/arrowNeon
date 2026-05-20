import { defineCliConfig } from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  throw new Error('Missing Sanity project id. Set SANITY_STUDIO_PROJECT_ID or PUBLIC_SANITY_PROJECT_ID.')
}

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
})
