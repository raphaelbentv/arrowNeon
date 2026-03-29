import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware((_context, next) => {
  return next().then((response) => {
    // Ne pas écraser les headers sur les assets statiques
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return response

    const headers = new Headers(response.headers)

    headers.set('X-Frame-Options', 'SAMEORIGIN')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-src https://calendly.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; ')
    )

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  })
})
