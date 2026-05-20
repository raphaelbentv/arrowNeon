import { defineField, defineType } from 'sanity'

/**
 * Topic bank pour la génération autonome d'articles.
 * Le script generate-post.ts pioche dedans en priorisant : status=ready, oldest lastUsedAt, then priority.
 */
export const topicBank = defineType({
  name: 'topicBank',
  title: 'Sujet (banque)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Sujet / angle de travail',
      type: 'string',
      description: 'Pas le titre final SEO — l\'angle de travail. Ex : "Comment Qualiopi v9 change la traçabilité documentaire en CFA"',
      validation: Rule => Rule.required().min(15).max(160),
    }),
    defineField({
      name: 'pillar',
      title: 'Pilier éditorial',
      type: 'string',
      options: {
        list: [
          { title: 'Suivi étudiant', value: 'suivi-etudiant' },
          { title: 'Intervenants', value: 'intervenants' },
          { title: 'Administratif', value: 'administratif' },
          { title: 'Qualité / Qualiopi', value: 'qualite' },
          { title: 'Clarté vs chaos', value: 'clarte-chaos' },
          { title: 'IA gouvernée', value: 'ia-gouvernee' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'keywords',
      title: 'Mots-clés SEO',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'persona',
      title: 'Persona cible',
      type: 'string',
      options: {
        list: ['Direction', 'Scolarité', 'Pédagogie', 'Qualité', 'Intervenant'],
      },
    }),
    defineField({
      name: 'angle',
      title: 'Angle / accroche envisagée',
      type: 'text',
      rows: 3,
      description: 'Phrase ou deux pour guider la génération. Optionnel — Claude peut combler si vide.',
    }),
    defineField({
      name: 'sources',
      title: 'Sources / refs à citer',
      type: 'array',
      of: [{ type: 'url' }],
      description: 'CNIL, Qualiopi, AI Act, etc. Le script transmettra ces refs à Claude.',
    }),
    defineField({
      name: 'priority',
      title: 'Priorité',
      type: 'number',
      description: '1 = haute, 5 = basse. Le script trie par priorité puis par lastUsedAt.',
      initialValue: 3,
      validation: Rule => Rule.min(1).max(5),
    }),
    defineField({
      name: 'status',
      title: 'Statut',
      type: 'string',
      options: {
        list: [
          { title: 'Idée (pas encore prêt)', value: 'idea' },
          { title: 'Prêt à générer', value: 'ready' },
          { title: 'Généré (lié à un post)', value: 'used' },
          { title: 'Archivé', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'ready',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'lastUsedAt',
      title: 'Dernière utilisation',
      type: 'datetime',
      readOnly: true,
      description: 'Mis à jour automatiquement par le pipeline.',
    }),
    defineField({
      name: 'generatedPost',
      title: 'Article généré',
      type: 'reference',
      to: [{ type: 'post' }],
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'pillar', status: 'status' },
    prepare({ title, subtitle, status }) {
      const icon = status === 'ready' ? '🟢' : status === 'used' ? '✅' : status === 'archived' ? '📦' : '💭'
      return { title, subtitle: `${icon} ${subtitle ?? ''}` }
    },
  },
})
