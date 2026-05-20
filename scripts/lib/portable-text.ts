/**
 * Conversion Markdown (sortie Claude) → Sanity Portable Text.
 *
 * Volontairement minimaliste : on supporte ce dont Arrow a besoin :
 * - paragraphes (block normal)
 * - H2, H3
 * - listes à puces / numérotées
 * - liens [texte](url)
 * - emphases **gras** et *italique*
 * - `inline code`
 *
 * Pour les besoins évolués (citations, tableaux), on étendra plus tard.
 */
import { randomUUID } from 'node:crypto'

interface SpanMark { _type: 'span'; _key: string; text: string; marks: string[] }
interface MarkDef { _type: string; _key: string; href?: string }
interface PTBlock {
  _type: 'block'
  _key: string
  style: 'normal' | 'h2' | 'h3'
  listItem?: 'bullet' | 'number'
  level?: number
  children: SpanMark[]
  markDefs: MarkDef[]
}

const k = () => randomUUID().slice(0, 12)

/**
 * Parse une ligne (inline) en spans + markDefs.
 * Gère : **gras**, *italique*, `code`, [lien](url).
 */
function parseInline(line: string): { children: SpanMark[]; markDefs: MarkDef[] } {
  const children: SpanMark[] = []
  const markDefs: MarkDef[] = []

  let i = 0
  let buf = ''
  const stack: string[] = [] // strong / em / code
  const flush = (extraMarks: string[] = []) => {
    if (!buf) return
    children.push({ _type: 'span', _key: k(), text: buf, marks: [...stack, ...extraMarks] })
    buf = ''
  }

  while (i < line.length) {
    const ch = line[i]
    const ahead2 = line.slice(i, i + 2)

    // Lien [texte](url)
    if (ch === '[') {
      const close = line.indexOf(']', i + 1)
      const paren = close >= 0 && line[close + 1] === '(' ? line.indexOf(')', close + 2) : -1
      if (close > 0 && paren > 0) {
        const text = line.slice(i + 1, close)
        const url = line.slice(close + 2, paren)
        flush()
        const linkKey = k()
        markDefs.push({ _type: 'link', _key: linkKey, href: url })
        children.push({ _type: 'span', _key: k(), text, marks: [...stack, linkKey] })
        i = paren + 1
        continue
      }
    }

    // Gras **...**
    if (ahead2 === '**') {
      flush()
      if (stack.includes('strong')) stack.splice(stack.indexOf('strong'), 1)
      else stack.push('strong')
      i += 2
      continue
    }

    // Italique *...* (mais pas la fin d'un gras)
    if (ch === '*' && line[i - 1] !== '*' && line[i + 1] !== '*') {
      flush()
      if (stack.includes('em')) stack.splice(stack.indexOf('em'), 1)
      else stack.push('em')
      i += 1
      continue
    }

    // Code inline `...`
    if (ch === '`') {
      flush()
      if (stack.includes('code')) stack.splice(stack.indexOf('code'), 1)
      else stack.push('code')
      i += 1
      continue
    }

    buf += ch
    i += 1
  }
  flush()
  return { children, markDefs }
}

function makeBlock(style: PTBlock['style'], text: string, listItem?: 'bullet' | 'number'): PTBlock {
  const { children, markDefs } = parseInline(text)
  return {
    _type: 'block',
    _key: k(),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    children,
    markDefs,
  }
}

/**
 * Convertit un markdown Claude en Portable Text.
 */
export function markdownToPortableText(md: string): PTBlock[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: PTBlock[] = []
  let buf: string[] = []

  const flushParagraph = () => {
    if (buf.length === 0) return
    const text = buf.join(' ').trim()
    if (text) blocks.push(makeBlock('normal', text))
    buf = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line.trim()) { flushParagraph(); continue }

    // H2 / H3
    if (line.startsWith('## ')) {
      flushParagraph()
      blocks.push(makeBlock('h2', line.slice(3).trim()))
      continue
    }
    if (line.startsWith('### ')) {
      flushParagraph()
      blocks.push(makeBlock('h3', line.slice(4).trim()))
      continue
    }
    // H1 → on le saute (le titre vit dans le champ "title" du post Sanity)
    if (line.startsWith('# ')) {
      flushParagraph()
      continue
    }

    // Liste à puces
    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      blocks.push(makeBlock('normal', bullet[1], 'bullet'))
      continue
    }
    // Liste numérotée
    const numbered = line.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      blocks.push(makeBlock('normal', numbered[1], 'number'))
      continue
    }

    buf.push(line)
  }
  flushParagraph()
  return blocks
}
