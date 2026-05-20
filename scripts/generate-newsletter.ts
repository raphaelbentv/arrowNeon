/**
 * Génère une newsletter Arrow (digest ou éditorial selon la cadence).
 *
 * Cadence : bimensuelle.
 *  - Semaines paires de l'année → digest (récap derniers articles)
 *  - Semaines impaires            → éditorial (essai court original)
 *
 * Le doc est créé en `status=scheduled` et programmé pour le mardi 9h prochain.
 * C'est le script send-newsletter.ts qui s'occupera de l'envoi.
 */
import { generateWithVoice } from './lib/anthropic'
import { sanity, getRecentPublishedPosts, type PostDoc } from './lib/sanity-admin'
import { markdownToPortableText } from './lib/portable-text'

function isoWeek(d = new Date()): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7)
}

/** Prochain mardi 9h00 (Europe/Paris). */
function nextTuesday9h(): string {
  const now = new Date()
  const result = new Date(now)
  const dayOfWeek = now.getDay() // 0 dim ... 2 mar
  let daysUntilTuesday = (2 - dayOfWeek + 7) % 7
  if (daysUntilTuesday === 0 && now.getHours() >= 9) daysUntilTuesday = 7
  result.setDate(now.getDate() + daysUntilTuesday)
  result.setHours(9, 0, 0, 0)
  return result.toISOString()
}

async function generateDigest(posts: PostDoc[]) {
  console.log(`📰  Digest : ${posts.length} articles récents`)
  if (posts.length === 0) {
    throw new Error('Aucun article publié récemment, digest impossible. Génère un article d\'abord.')
  }

  const intro = await generateWithVoice({
    userPrompt: `Écris une intro éditoriale courte (4-6 phrases) pour une newsletter Arrow qui présente les articles ci-dessous.

Le but : donner envie de lire en évoquant le fil rouge qui relie ces articles, du point de vue d'une école ou d'un CFA.

Articles à présenter :
${posts.map((p, i) => `${i + 1}. "${p.title}" — ${p.excerpt}`).join('\n')}

Format : pure prose, pas de salutation type "bonjour", pas de signature. Juste l'intro éditoriale. 4 à 6 phrases.`,
    maxTokens: 600,
    temperature: 0.75,
  })

  const subjectAndPreheader = await generateWithVoice({
    userPrompt: `Propose un objet d'email et un préheader pour cette newsletter Arrow (format digest).

Articles à présenter :
${posts.map(p => `- ${p.title}`).join('\n')}

Contraintes :
- OBJET : 35-55 caractères, ton Arrow (clair, direct, pas pub)
- PRÉHEADER : 60-110 caractères, prolonge l'objet (ne le répète pas)

Format de sortie exact (2 lignes) :
OBJET: ...
PREHEADER: ...`,
    maxTokens: 300,
    temperature: 0.85,
  })

  const subjectMatch = subjectAndPreheader.match(/OBJET:\s*(.+)/i)
  const preheaderMatch = subjectAndPreheader.match(/PR[EÉ]HEADER:\s*(.+)/i)

  return {
    subject: subjectMatch?.[1]?.trim() ?? `Les derniers articles Arrow`,
    preheader: preheaderMatch?.[1]?.trim() ?? '',
    intro,
    posts,
  }
}

async function generateEditorial() {
  console.log('🖋️  Newsletter éditoriale (essai original)')

  const themes = [
    'Une situation concrète vue dans une école/CFA cette semaine et ce qu\'elle révèle.',
    'Un détail Qualiopi que tout le monde sous-estime.',
    'Un signal faible dans le pilotage d\'un établissement.',
    'Une fausse bonne pratique d\'archivage administratif.',
    'Le moment où une équipe scolarité bascule du chaos à la clarté.',
    'Ce que l\'IA gouvernée change concrètement pour un responsable pédagogique.',
  ]
  const theme = themes[Math.floor(Math.random() * themes.length)]

  const essay = await generateWithVoice({
    userPrompt: `Écris un essai court pour la newsletter Arrow (format éditorial).

**Thème** : ${theme}

**Contraintes** :
- 400 à 700 mots
- Markdown : 1 à 2 H2 maximum
- Voix Arrow : situation concrète → friction → diagnostic → ouverture
- Pas de "Bonjour", pas de signature
- Termine par une ouverture (PAS de CTA agressif — la CTA viendra en pied de newsletter)

Format de sortie OBLIGATOIRE :
---META---
OBJET: <objet email 35-55 caractères>
PREHEADER: <60-110 caractères>
---ARTICLE---
<l'essai complet en Markdown>`,
    maxTokens: 3000,
    temperature: 0.85,
  })

  const meta = essay.match(/---META---([\s\S]*?)---ARTICLE---/)?.[1] ?? ''
  const body = essay.split('---ARTICLE---')[1]?.trim() ?? ''

  const subject = meta.match(/OBJET:\s*(.+)/i)?.[1]?.trim() ?? 'Édito Arrow de la semaine'
  const preheader = meta.match(/PR[EÉ]HEADER:\s*(.+)/i)?.[1]?.trim() ?? ''

  return { subject, preheader, body }
}

async function run() {
  const weekNumber = isoWeek()
  const isEven = weekNumber % 2 === 0
  const type: 'digest' | 'editorial' = isEven ? 'digest' : 'editorial'
  console.log(`🗓️  Semaine ${weekNumber} → newsletter de type "${type}"`)

  if (type === 'digest') {
    const recentPosts = await getRecentPublishedPosts(4)
    const { subject, preheader, intro, posts } = await generateDigest(recentPosts)
    const created = await sanity.create({
      _type: 'newsletter',
      subject,
      preheader,
      type: 'digest',
      intro,
      featuredPosts: posts.map(p => ({ _type: 'reference', _ref: p._id })),
      cta: { label: 'Voir Arrow en démo', url: `${process.env.PUBLIC_SITE_URL ?? 'https://arr0w.app'}/contact` },
      scheduledFor: nextTuesday9h(),
      status: 'scheduled',
    })
    console.log(`📤  Digest créé : ${created._id} (programmé pour ${nextTuesday9h()})`)
  } else {
    const { subject, preheader, body } = await generateEditorial()
    const created = await sanity.create({
      _type: 'newsletter',
      subject,
      preheader,
      type: 'editorial',
      body: markdownToPortableText(body),
      cta: { label: 'Voir Arrow en démo', url: `${process.env.PUBLIC_SITE_URL ?? 'https://arr0w.app'}/contact` },
      scheduledFor: nextTuesday9h(),
      status: 'scheduled',
    })
    console.log(`📤  Éditorial créé : ${created._id} (programmé pour ${nextTuesday9h()})`)
  }
}

run().catch(err => {
  console.error('💥  Erreur génération newsletter :', err)
  process.exit(1)
})
