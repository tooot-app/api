import { Context, Env } from '..'

const sha256 = async (message: string) => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
  return hashHex
}

const checkCache = async (
  request: Request,
  _e: Env,
  context: Context
): Promise<Response | void> => {
  const cache = caches.default

  const hash = await sha256(
    JSON.stringify({
      source: context.incoming.source,
      target: context.incoming.target,
      text: context.incoming.text
    })
  )
  const cacheUrl = new URL(request.url)
  cacheUrl.pathname = '/cache/translate' + '/' + hash

  const cacheKey = cacheUrl.toString()
  const cacheHit = await cache.match(cacheKey)

  if (cacheHit) {
    const cacheHitHeaders = new Headers(cacheHit.headers)
    cacheHitHeaders.set('tooot-Cache', 'HIT')
    return new Response(cacheHit.body, {
      headers: cacheHitHeaders
    })
  } else {
    context.cacheKey = cacheKey
  }
}

export default checkCache
