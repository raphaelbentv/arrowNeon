import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { codeInput } from '@sanity/code-input'
import { schemaTypes } from './sanity/schemas'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  throw new Error('Missing Sanity project id. Set SANITY_STUDIO_PROJECT_ID or PUBLIC_SANITY_PROJECT_ID.')
}

export default defineConfig({
  name: 'arrow-marketing',
  title: 'Arrow — Blog',

  projectId,
  dataset,

  plugins: [structureTool(), visionTool(), codeInput()],

  schema: {
    types: schemaTypes,
  },
})
