import { defineField, defineType } from 'sanity'

export const post = defineType({
  name: 'post',
  title: 'Article de blog',
  type: 'document',
  initialValue: () => ({
    publishedAt: new Date().toISOString()
  }),
  fields: [
    defineField({ name: 'title', title: 'Titre', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: Rule => Rule.required() }),
    defineField({
      name: 'excerpt',
      title: 'Résumé',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.required().min(40).max(240)
    }),
    defineField({ name: 'coverImage', title: 'Image de couverture', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'author', title: 'Auteur', type: 'reference', to: [{ type: 'author' }] }),
    defineField({
      name: 'publishedAt',
      title: 'Date de publication',
      type: 'datetime',
      validation: Rule => Rule.required()
    }),
    defineField({ name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } }),
    defineField({ name: 'body', title: 'Contenu', type: 'array', of: [
      { type: 'block' },
      { type: 'image', options: { hotspot: true } },
      { type: 'code' }
    ], validation: Rule => Rule.required().min(1)}),
  ],
  preview: { select: { title: 'title', media: 'coverImage' } }
})
