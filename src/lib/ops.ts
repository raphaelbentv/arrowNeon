type OperationalContext = Record<string, string | number | boolean | null | undefined>

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
  }
}

export async function reportOperationalError(
  scope: string,
  message: string,
  error: unknown,
  context: OperationalContext = {}
) {
  const payload = {
    scope,
    message,
    context,
    error: serializeError(error),
    timestamp: new Date().toISOString(),
  }

  console.error(`[${scope}] ${message}`, payload)

  const alertWebhookUrl = import.meta.env.OPERATIONS_ALERT_WEBHOOK_URL
  if (!alertWebhookUrl) return

  try {
    await fetch(alertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (webhookError) {
    console.error('[ops] Impossible d’envoyer l’alerte opérationnelle', serializeError(webhookError))
  }
}

export function reportOperationalWarning(scope: string, message: string, context: OperationalContext = {}) {
  console.warn(`[${scope}] ${message}`, {
    scope,
    message,
    context,
    timestamp: new Date().toISOString(),
  })
}
