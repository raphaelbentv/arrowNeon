/**
 * Client Anthropic + helper de prompt caching pour la voix Arrow.
 *
 * Le voice profile est mis en cache (système prompt avec cache_control)
 * pour économiser ~90% des tokens d'entrée sur les générations successives.
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { env } from './env'

export const anthropic = new Anthropic({ apiKey: env.anthropicKey })

const VOICE_PATH = resolve(process.cwd(), 'scripts/voice/arrow-voice.md')

let cachedVoice: string | null = null
export function loadVoiceProfile(): string {
  if (cachedVoice) return cachedVoice
  cachedVoice = readFileSync(VOICE_PATH, 'utf-8')
  return cachedVoice
}

/**
 * Génère du texte via Claude avec le voice profile en système prompt cacheable.
 */
export async function generateWithVoice({
  userPrompt,
  maxTokens = 4096,
  temperature = 0.7,
  extraSystem,
}: {
  userPrompt: string
  maxTokens?: number
  temperature?: number
  extraSystem?: string
}): Promise<string> {
  const voice = loadVoiceProfile()

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text:
        'Tu es un rédacteur senior pour Arrow, plateforme française de suivi étudiant. ' +
        'Tu écris EXCLUSIVEMENT en français, en respectant absolument la ligne éditoriale qui suit. ' +
        'Tu ne sors jamais du ton Arrow : clair, direct, concret, professionnel, légère touche d\'humour. ' +
        'Tu refuses les tournures IA-génériques listées dans les anti-patterns.\n\n' +
        '======= LIGNE ÉDITORIALE ARROW (référence) =======\n\n' +
        voice,
      cache_control: { type: 'ephemeral' },
    },
  ]

  if (extraSystem) {
    systemBlocks.push({ type: 'text', text: extraSystem })
  }

  const response = await anthropic.messages.create({
    model: env.anthropicModel,
    max_tokens: maxTokens,
    temperature,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // On agrège tous les blocs de texte
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}
