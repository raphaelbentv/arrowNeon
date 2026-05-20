import { defineField, defineType } from 'sanity'

/**
 * Newsletter — chaque édition est un document.
 * Cadence : bimensuelle, alternance digest / éditorial.
 */
export const newsletter = defineType({
  name: 'newsletter',
  title: 'Newsletter',
  type: 'document',
  fields: [
    defineField({
      name: 'subject',
      title: 'Objet (sujet de l\'email)',
      type: 'string',
      validation: Rule => Rule.required().max(70).warning('Idéalement 35-50 caractères.'),
    }),
    defineField({
      name: 'preheader',
      title: 'Préheader',
      type: 'string',
      description: 'Texte gris affiché à côté de l\'objet dans la boîte de réception. Prolonge, ne répète pas.',
      validation: Rule => Rule.max(120),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Digest (récap articles récents)', value: 'digest' },
          { title: 'Éditorial (essai court original)', value: 'editorial' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro éditoriale',
      type: 'text',
      rows: 6,
      description: 'Pour le digest : 4-6 phrases. Pour l\'éditorial : laisser vide (le corps suffit).',
    }),
    defineField({
      name: 'body',
      title: 'Corps (uniquement type=editorial)',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'featuredPosts',
      title: 'Articles mis en avant (type=digest)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      validation: Rule => Rule.max(4),
    }),
    defineField({
      name: 'cta',
      title: 'CTA en bas',
      type: 'object',
      fields: [
        { name: 'label', title: 'Label', type: 'string' },
        { name: 'url', title: 'URL', type: 'url' },
      ],
    }),
    defineField({
      name: 'scheduledFor',
      title: 'Date d\'envoi prévue',
      type: 'datetime',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Statut',
      type: 'string',
      options: {
        list: [
          { title: 'Brouillon', value: 'draft' },
          { title: 'Planifié', value: 'scheduled' },
          { title: 'En cours d\'envoi', value: 'sending' },
          { title: 'Envoyé', value: 'sent' },
          { title: 'Erreur', value: 'failed' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'sentAt',
      title: 'Envoyé le',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'stats',
      title: 'Statistiques d\'envoi',
      type: 'object',
      readOnly: true,
      fields: [
        { name: 'recipients', title: 'Destinataires', type: 'number' },
        { name: 'delivered', title: 'Délivrés', type: 'number' },
        { name: 'failed', title: 'Échecs', type: 'number' },
      ],
    }),
  ],
  preview: {
    select: { title: 'subject', subtitle: 'type', status: 'status', date: 'scheduledFor' },
    prepare({ title, subtitle, status, date }) {
      const icon = status === 'sent' ? '✅' : status === 'failed' ? '❌' : status === 'scheduled' ? '🕒' : '📝'
      const when = date ? new Date(date).toLocaleDateString('fr-FR') : 'pas de date'
      return { title, subtitle: `${icon} ${subtitle} · ${when}` }
    },
  },
})
