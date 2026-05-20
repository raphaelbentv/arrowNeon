import { defineField, defineType } from 'sanity'

/**
 * Subscriber — liste de diffusion newsletter, stockée dans Sanity.
 * GDPR : double opt-in obligatoire, consentement horodaté, token de désinscription signé.
 * Le pipeline send-newsletter ne filtre QUE status=confirmed.
 */
export const subscriber = defineType({
  name: 'subscriber',
  title: 'Abonné newsletter',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().email().lowercase(),
    }),
    defineField({
      name: 'firstName',
      title: 'Prénom (optionnel)',
      type: 'string',
    }),
    defineField({
      name: 'status',
      title: 'Statut',
      type: 'string',
      options: {
        list: [
          { title: 'En attente de confirmation', value: 'pending' },
          { title: 'Confirmé (double opt-in OK)', value: 'confirmed' },
          { title: 'Désabonné', value: 'unsubscribed' },
          { title: 'Bounce (email invalide)', value: 'bounced' },
          { title: 'Spam complaint', value: 'complained' },
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'D\'où vient l\'inscription : footer, blog, popup, contact, manuel, import.',
      options: {
        list: ['footer', 'blog', 'popup', 'contact', 'manuel', 'import'],
      },
    }),
    defineField({
      name: 'subscribedAt',
      title: 'Inscription (datée à la soumission)',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'confirmedAt',
      title: 'Confirmation double opt-in',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'unsubscribedAt',
      title: 'Désabonnement',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'unsubscribeToken',
      title: 'Token de désinscription',
      type: 'string',
      readOnly: true,
      description: 'HMAC signé, utilisé dans les liens unsubscribe et confirm.',
    }),
    defineField({
      name: 'consent',
      title: 'Consentement RGPD',
      type: 'object',
      fields: [
        { name: 'ip', title: 'IP au moment de l\'inscription', type: 'string' },
        { name: 'userAgent', title: 'User agent', type: 'string' },
        { name: 'consentText', title: 'Texte de consentement affiché', type: 'text' },
      ],
      readOnly: true,
    }),
    defineField({
      name: 'tags',
      title: 'Tags / segments',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'lastSentAt',
      title: 'Dernier envoi reçu',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: 'email', status: 'status', firstName: 'firstName' },
    prepare({ title, status, firstName }) {
      const icon =
        status === 'confirmed' ? '✅' :
        status === 'pending' ? '⏳' :
        status === 'unsubscribed' ? '🚪' :
        status === 'bounced' ? '↩️' : '⚠️'
      return { title, subtitle: `${icon} ${firstName ?? ''}`.trim() }
    },
  },
})
