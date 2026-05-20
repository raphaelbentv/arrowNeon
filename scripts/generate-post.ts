/**
 * Génère un article de blog dans la voix Arrow, le pousse dans Sanity et le publie.
 *
 * Stratégie :
 * 1. Pioche un sujet dans topicBank (status=ready, priorité puis ancienneté).
 *    Sinon, génération autonome depuis les piliers éditoriaux.
 * 2. Appel Claude avec voice profile en système prompt (cacheable).
 * 3. Parse la sortie structurée : title, slug, excerpt, tags, body markdown.
 * 4. Conversion body → Portable Text.
 * 5. Création du document `post` dans Sanity en publié (publishedAt = now).
 * 6. Mise à jour du topic : status=used, lastUsedAt=now, generatedPost=ref.
 *
 * Usage :
 *   ANTHROPIC_API_KEY=... SANITY_API_TOKEN=... npx tsx scripts/generate-post.ts
 */
import { generateWithVoice } from './lib/anthropic'
import { sanity, pickNextTopic } from './lib/sanity-admin'
import { markdownToPortableText } from './lib/portable-text'
import { slugify, randomId } from './lib/tokens'

interface GeneratedArticle {
  title: string
  excerpt: string
  tags: string[]
  bodyMarkdown: string
}

const PILLARS = [
  { id: 'suivi-etudiant', label: 'Suivi étudiant',    examples: 'fiche étudiant, absences, notes, bulletins, documents' },
  { id: 'intervenants',   label: 'Intervenants',       examples: 'cours, supports, appels, progression' },
  { id: 'administratif',  label: 'Administratif',      examples: 'relances, statuts, pièces manquantes' },
  { id: 'qualite',        label: 'Qualité / Qualiopi', examples: 'preuves, traçabilité, audits, RNCP' },
  { id: 'clarte-chaos',   label: 'Clarté vs chaos',    examples: 'dispersion d\'outils, fichiers partout' },
  { id: 'ia-gouvernee',   label: 'IA gouvernée',       examples: 'RGPD, AI Act, gouvernance IA en éducation' },
]

/** Pioche un pilier en fonction de l'historique récent (évite les répétitions). */
async function pickAutonomousPillar(): Promise<typeof PILLARS[number]> {
  const recent = await sanity.fetch<Array<{ tags?: string[] }>>(
    `*[_type == "post" && defined(publishedAt)] | order(publishedAt desc)[0...4] { tags }`
  )
  const recentPillars = new Set(
    recent.flatMap(p => p.tags ?? []).map(t => t.toLowerCase())
  )
  // On préfère un pilier non utilisé récemment
  const fresh = PILLARS.filter(p => !recentPillars.has(p.id))
  const pool = fresh.length > 0 ? fresh : PILLARS
  return pool[Math.floor(Math.random() * pool.length)]
}

const ARTICLE_PROMPT = (params: {
  topicTitle: string
  pillar: string
  pillarExamples: string
  persona?: string
  angle?: string
  keywords?: string[]
  sources?: string[]
}) => `Écris un article de blog Arrow complet en français.

**Sujet de travail** : ${params.topicTitle}
**Pilier éditorial** : ${params.pillar} (${params.pillarExamples})
${params.persona ? `**Persona cible** : ${params.persona}` : ''}
${params.angle ? `**Angle suggéré** : ${params.angle}` : ''}
${params.keywords?.length ? `**Mots-clés SEO** : ${params.keywords.join(', ')}` : ''}
${params.sources?.length ? `**Sources à pouvoir référencer** :\n${params.sources.map(s => `- ${s}`).join('\n')}` : ''}

**Contraintes strictes** (respect de la ligne éditoriale Arrow) :
- 1800 à 2600 mots
- Suit la structure obligatoire : situation réelle → friction → problème → Arrow → CTA
- 4 à 6 H2, des H3 quand un H2 dépasse 400 mots
- Au moins un tableau Markdown comparatif si pertinent
- Aucune formulation interdite (cf. anti-patterns voice profile)
- Citer les sources si utilisées (CNIL, AI Act, Qualiopi)

**Format de sortie OBLIGATOIRE** — respecte exactement cette structure, sans rien ajouter avant ou après :

---META---
TITLE: <titre SEO 50-65 caractères, sans guillemets>
EXCERPT: <résumé 140-220 caractères, parle au lecteur>
TAGS: <3 à 6 tags séparés par des virgules, en minuscule, sans #>
---ARTICLE---
<le corps complet en Markdown, sans titre H1 — le titre est déjà dans le champ TITLE ci-dessus>
`

function parseStructuredOutput(raw: string): GeneratedArticle {
  const metaMatch = raw.match(/---META---([\s\S]*?)---ARTICLE---/)
  if (!metaMatch) throw new Error('Sortie Claude invalide : bloc META manquant')

  const metaBlock = metaMatch[1]
  const articleBody = raw.split('---ARTICLE---')[1]?.trim() ?? ''
  if (!articleBody) throw new Error('Sortie Claude invalide : corps article manquant')

  const get = (key: string) => {
    const m = metaBlock.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return m?.[1]?.trim() ?? ''
  }

  const title = get('TITLE')
  const excerpt = get('EXCERPT')
  const tags = get('TAGS').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)

  if (!title || !excerpt) throw new Error('Champs META manquants (title/excerpt)')

  return { title, excerpt, tags, bodyMarkdown: articleBody }
}

/** Quality gate : refuse les articles trop courts ou contenant des anti-patterns. */
function passesQualityGate(article: GeneratedArticle): { ok: boolean; reason?: string } {
  const wc = article.bodyMarkdown.split(/\s+/).length
  if (wc < 1500) return { ok: false, reason: `Trop court (${wc} mots, min 1500)` }

  const banned = [
    /à l'ère du/i, /dans un monde où/i, /il est important de noter/i,
    /découvrez comment/i, /boostez votre/i, /optimisez votre/i,
    /révolution(?:n|nez)/i, /plateforme magique/i, /innovation disruptive/i,
    /transformation en 3 clics/i, /en conclusion,/i, /pour conclure,/i,
  ]
  for (const re of banned) {
    if (re.test(article.bodyMarkdown)) {
      return { ok: false, reason: `Anti-pattern détecté : ${re.source}` }
    }
  }

  const h2Count = (article.bodyMarkdown.match(/^##\s+/gm) ?? []).length
  if (h2Count < 3) return { ok: false, reason: `Structure faible (${h2Count} H2, min 3)` }

  return { ok: true }
}

async function run() {
  console.log('🪶  Génération d\'un nouvel article Arrow...')

  // 1. Source du sujet
  let topicDoc = await pickNextTopic()
  let topicTitle: string
  let pillar: typeof PILLARS[number]
  let persona: string | undefined
  let angle: string | undefined
  let keywords: string[] | undefined
  let sources: string[] | undefined

  if (topicDoc) {
    console.log(`📌  Sujet pioché dans topicBank : "${topicDoc.title}"`)
    topicTitle = topicDoc.title
    pillar = PILLARS.find(p => p.id === topicDoc!.pillar) ?? PILLARS[0]
    persona = topicDoc.persona
    angle = topicDoc.angle
    keywords = topicDoc.keywords
    sources = topicDoc.sources
  } else {
    console.log('💭  Pas de sujet dans le topicBank, génération autonome.')
    pillar = await pickAutonomousPillar()
    console.log(`   Pilier choisi : ${pillar.label}`)
    // Demande à Claude de proposer un sujet sur ce pilier (court appel)
    const ideaPrompt = `Propose UN sujet d'article Arrow sur le pilier "${pillar.label}" (${pillar.examples}).
Format : une seule phrase, 15-130 caractères, sans guillemets, qui décrit l'angle de travail.
Évite les sujets déjà traités récemment. Ne réponds RIEN d'autre que la phrase.`
    topicTitle = (await generateWithVoice({ userPrompt: ideaPrompt, maxTokens: 200, temperature: 0.9 }))
      .replace(/^["«»]/g, '').replace(/["«»]$/g, '').trim()
  }

  // 2. Génération de l'article complet
  console.log('✍️  Rédaction en cours (Claude, 1800-2600 mots)...')
  const raw = await generateWithVoice({
    userPrompt: ARTICLE_PROMPT({
      topicTitle,
      pillar: pillar.label,
      pillarExamples: pillar.examples,
      persona, angle, keywords, sources,
    }),
    maxTokens: 8192,
    temperature: 0.65,
  })

  // 3. Parse et quality gate
  const article = parseStructuredOutput(raw)
  const gate = passesQualityGate(article)
  if (!gate.ok) {
    console.error(`❌  Quality gate FAIL : ${gate.reason}`)
    console.error('    Article rejeté, pas publié. Relance manuellement pour réessayer.')
    process.exit(1)
  }
  console.log(`✅  Article OK — ${article.title}`)

  // 4. Vérifie unicité du slug
  const baseSlug = slugify(article.title)
  const existing = await sanity.fetch<number>(
    `count(*[_type == "post" && slug.current match $slug])`,
    { slug: `${baseSlug}*` }
  )
  const finalSlug = existing > 0 ? `${baseSlug}-${randomId().slice(0, 6)}` : baseSlug

  // 5. Push dans Sanity (publié immédiatement → user a demandé full auto)
  const portableBody = markdownToPortableText(article.bodyMarkdown)
  const tags = [...new Set([pillar.id, ...article.tags])]

  const created = await sanity.create({
    _type: 'post',
    title: article.title,
    slug: { current: finalSlug, _type: 'slug' },
    excerpt: article.excerpt,
    publishedAt: new Date().toISOString(),
    body: portableBody,
    tags,
  })
  console.log(`📤  Post publié dans Sanity : ${created._id}`)
  console.log(`   URL : ${process.env.PUBLIC_SITE_URL ?? 'https://arr0w.app'}/blog/${finalSlug}`)

  // 6. Marque le topic comme utilisé
  if (topicDoc) {
    await sanity.patch(topicDoc._id)
      .set({
        status: 'used',
        lastUsedAt: new Date().toISOString(),
        generatedPost: { _type: 'reference', _ref: created._id },
      })
      .commit()
    console.log(`🔁  Topic "${topicDoc.title}" marqué comme utilisé.`)
  }
}

run().catch(err => {
  console.error('💥  Erreur génération article :', err)
  process.exit(1)
})
